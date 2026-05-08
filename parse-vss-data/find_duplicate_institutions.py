#!/usr/bin/env python3
"""
Scan people.json for likely-duplicate institution tags.

Each person's `tags` list contains free-text institution strings.  The data
is messy: department prefixes, city/state suffixes, acronym/full-name pairs,
typos, and inconsistent punctuation all produce strings that look distinct
but refer to the same place.

This script reports candidate duplicate groups, organized by confidence:

  HIGH:    normalized-form collision (case/diacritics/punctuation/abbr).
           "MIT", "M.I.T.", "M I T" -> all collide.
  ACRONYM: short token plausibly the acronym of a longer string.
           "UCSD" + "University of California San Diego".
           "UC Berkeley" + "University of California, Berkeley".
  CORE:    same "core" institution after stripping department prefixes,
           location suffixes, and stop words.
           "Department of Psychology, Stanford University, Stanford, CA, USA"
              -> core "stanford university"
           "Stanford University"
              -> core "stanford university"
  TYPO:    high string-similarity (Levenshtein-style) on either the full
           string or the core form.
           "Smith Kettlewell Eye Research Institue"
              ~ "Smith-Kettlewell Eye Research Institute"
  TRUNC:   suspiciously truncated strings ("University of" with no body).

Output is sorted by combined usage count so the highest-impact dupes
surface first.

Run from the parse-vss-data folder:
    python3 find_duplicate_institutions.py
or, with full pairwise output (including singletons):
    python3 find_duplicate_institutions.py --all
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
PEOPLE = HERE / "people.json"


# --- Vocabulary ------------------------------------------------------------

# Common academic abbreviations -> canonical form.  Used during tokenization
# so "Univ." and "University" normalize identically.
ABBREVIATIONS: dict[str, str] = {
    "u":      "university",
    "univ":   "university",
    "univer": "university",
    "uni":    "university",
    "inst":   "institute",
    "instit": "institute",
    "coll":   "college",
    "dept":   "department",
    "depart": "department",
    "med":    "medical",
    "sch":    "school",
    "tech":   "technology",
    "calif":  "california",
    "natl":   "national",
    "intl":   "international",
    "lab":    "laboratory",
    "labs":   "laboratory",
    "ctr":    "center",
    "center": "center",
    "centre": "center",
    "soc":    "society",
    "hosp":   "hospital",
    "co":     "company",
    "corp":   "corporation",
    "ltd":    "limited",
    "amp":    "and",          # from "&" decoded as HTML entity
}

# Tokens that don't carry institution identity. Used for *core* matching:
# stripped from a string before comparing.  We KEEP medical / school / etc.
# because "Harvard Medical School" and "Harvard University" are distinct.
STOP_WORDS: set[str] = {
    # Articles and prepositions
    "the", "of", "for", "and", "in", "at", "to", "a", "an", "on", "by",
    # Department / programme wrapper words: "Department of Psychology, X"
    # collapses to just "X".
    "department", "departments", "div", "division",
    "program", "programme",
    "graduate", "undergraduate",
    "office",
    # Corporate suffixes
    "inc", "llc",
    # Country/state codes are handled separately as suffix strippers, not
    # general content stop words, so they're NOT in this set.
    # "research", "laboratory", "lab", "center", "school", etc. are part
    # of legitimate institution names ("Cold Spring Harbor Laboratory",
    # "Marcus Autism Center", "Harvard Medical School") and so are also
    # NOT in this set.
}

# Country / region suffix tokens we strip from the end of a string when
# computing the core.  Two-letter US state codes added below.
US_STATES: set[str] = {
    "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in",
    "ia","ks","ky","la","me","md","ma","mi","mn","ms","mo","mt","ne","nv",
    "nh","nj","nm","ny","nc","nd","oh","ok","or","pa","ri","sc","sd","tn",
    "tx","ut","vt","va","wa","wv","wi","wy","dc",
    # Canadian provinces (treated like US states for trailing-strip purposes)
    "ab","bc","mb","nb","nl","ns","nt","nu","on","pe","qc","sk","yt",
}
COUNTRY_HINTS: set[str] = {
    # Common country names — note that tokenization splits multi-word
    # countries into individual words, so we list each token separately.
    "usa","us","united","states","america",
    "uk","kingdom","england","scotland","wales",
    "canada","germany","france","italy","spain","netherlands","switzerland",
    "japan","china","korea","australia","brazil","mexico","israel","austria",
    "denmark","sweden","norway","finland","ireland","portugal","greece",
    "russia","india","singapore","taiwan","belgium","poland","czechia",
    "zealand","kong",
}


# --- Helpers ---------------------------------------------------------------

def strip_diacritics(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s)
                   if not unicodedata.combining(c))


_TOKEN_SPLIT = re.compile(r"[^a-z0-9]+")


def tokenize(s: str) -> list[str]:
    """Lowercase, strip diacritics, split on non-alphanumeric, expand abbrs."""
    s = strip_diacritics(s).lower()
    raw = _TOKEN_SPLIT.split(s)
    out: list[str] = []
    for tok in raw:
        if not tok:
            continue
        out.append(ABBREVIATIONS.get(tok, tok))
    return out


def normalize(s: str) -> str:
    """Fully-normalized form for HIGH-confidence equality."""
    return " ".join(tokenize(s))


# Words that signal a chunk IS a real institution name. Split into two
# tiers because a chunk with "University" should always beat a chunk with
# "Center" — the latter is usually a sub-unit (e.g., "Center for Vision
# Research, York University" -> York University is the institution).
_PRIMARY_INST_INDICATORS = re.compile(
    r"\b(university|universidad|universite|universitat|universita|"
    r"universiteit|universitaet|"
    r"college|institute|hospital|foundation|academy|academia|"
    r"polytechnic|polytech|conservatory)\b",
    re.IGNORECASE,
)
_SECONDARY_INST_INDICATORS = re.compile(
    r"\b(school|center|centre|laboratory|labs?|"
    r"company|corporation|ltd|llc|inc)\b",
    re.IGNORECASE,
)
# Backwards-compatible alias used by trunc detection: matches either tier.
_INST_INDICATORS = re.compile(
    _PRIMARY_INST_INDICATORS.pattern + r"|" + _SECONDARY_INST_INDICATORS.pattern,
    re.IGNORECASE,
)


def core(s: str) -> str:
    """
    Return a "core" form for a sloppy institution string.  The goal is to
    collapse variants like "Department of Psychology, Stanford University,
    Stanford, CA, USA" down to "stanford university", while keeping
    "University of California, Berkeley" and "University of California,
    Davis" distinct (different campuses).

    Strategy:
      1. Split on commas into chunks.
      2. Pick the chunk that *looks like* an institution (contains a noun
         like university/college/institute/etc.); break ties by content
         length.  If none match, take the longest chunk.
      3. Optionally append the immediately-following chunk if it's a single
         non-stop word that isn't already in the chosen chunk and isn't a
         US-state / country token (this preserves campus names like
         "Berkeley", "Davis" that sit after the parent name in the comma
         list).
      4. Strip trailing US-state / country tokens and drop stop words.
    """
    chunks = [c.strip() for c in s.split(",") if c.strip()]
    if not chunks:
        return ""

    def score(ch: str) -> tuple[int, int]:
        # Tier 2: contains a primary institution word (university/college/...)
        # Tier 1: contains a secondary one (center/lab/school/...)
        # Tier 0: no indicator
        if _PRIMARY_INST_INDICATORS.search(ch):
            tier = 2
        elif _SECONDARY_INST_INDICATORS.search(ch):
            tier = 1
        else:
            tier = 0
        toks = [t for t in tokenize(ch) if t not in STOP_WORDS]
        return (tier, len(toks))

    chosen_idx = max(range(len(chunks)), key=lambda i: score(chunks[i]))
    chosen_toks = tokenize(chunks[chosen_idx])
    # Drop trailing US-state / country tokens, then stop words.
    while chosen_toks and (chosen_toks[-1] in US_STATES
                           or chosen_toks[-1] in COUNTRY_HINTS):
        chosen_toks.pop()
    chosen_content = [t for t in chosen_toks if t not in STOP_WORDS]
    chosen_set = set(chosen_content)

    extra: list[str] = []
    if chosen_idx + 1 < len(chunks):
        next_toks = tokenize(chunks[chosen_idx + 1])
        while next_toks and (next_toks[-1] in US_STATES
                             or next_toks[-1] in COUNTRY_HINTS):
            next_toks.pop()
        next_content = [t for t in next_toks if t not in STOP_WORDS]
        # Append a single-word campus suffix, but only if it adds new info.
        if (len(next_content) == 1
                and next_content[0] not in chosen_set
                and next_content[0] not in US_STATES
                and next_content[0] not in COUNTRY_HINTS):
            extra = next_content

    return " ".join(chosen_content + extra)


def acronym_letters(s: str) -> str:
    """Return the first letter of each meaningful (non-stop) token."""
    toks = [t for t in tokenize(s) if t not in STOP_WORDS]
    return "".join(t[0] for t in toks if t)


def acronym_letters_from_core(s: str) -> str:
    """First letters of each token in the core form.  Used for acronym
    matching so that 'Department of Neuroscience, Yale University' has its
    department prefix stripped (acronym = 'yu', not 'nyu')."""
    c = core(s)
    return "".join(t[0] for t in c.split() if t)


def short_letters(s: str) -> str:
    """Strip everything but letters (case-insensitive)."""
    return re.sub(r"[^a-z]", "", strip_diacritics(s).lower())


def is_acronym_pair(short: str, long: str) -> bool:
    """Plausibility check: is `short` the acronym of `long`?

    Acronym is computed from the *core* form of `long` so that department
    prefixes (e.g. 'Department of Neuroscience, Yale University') don't
    contribute letters that produce false positives like NYU = N(euro) +
    Y(ale) + U(niversity).
    """
    s = short_letters(short)
    if not s or len(s) > 8:
        return False
    a = acronym_letters_from_core(long)
    if not a or len(a) < 2:
        return False
    if s == a:
        return True
    # Allow "<acronym-of-prefix><last-tokens>" patterns like "UC Berkeley"
    # for "University of California Berkeley" (acronym "ucb" but written as
    # "ucberkeley").  Use the core form for the same reason as above.
    long_content = core(long).split()
    if len(long_content) >= 2 and len(s) >= 3:
        for split in range(2, len(long_content)):
            prefix_acro = "".join(t[0] for t in long_content[:split])
            tail = "".join(long_content[split:])
            if s == prefix_acro + tail:
                return True
    return False


_GENERIC_INST_WORDS = {
    "university", "universities",
    "college", "colleges",
    "institute", "institutes",
    "school", "schools",
    "department", "departments",
    "hospital", "hospitals",
    "center", "centers",
}


def trunc_looks_bad(s: str) -> bool:
    """Detect strings that are obviously truncated/incomplete."""
    n = normalize(s)
    if not n:
        return True
    parts = n.split()
    # Strip trailing tokens that are clearly suffix noise: country names,
    # state codes, articles, and stop words like "of"/"the". We strip
    # iteratively so "United States of America" or "the Netherlands" gets
    # peeled down to the institution proper.
    SUFFIX_NOISE = COUNTRY_HINTS | US_STATES | STOP_WORDS | {"the", "a", "an"}
    while parts and parts[-1] in SUFFIX_NOISE:
        parts.pop()
    if not parts:
        return True
    if sum(len(p) for p in parts) <= 2:
        return True
    if sum(len(p) for p in parts) <= 2:
        return True
    # The whole string reduces to a single generic institution-type word
    # ("University", "Institute", etc.) carrying no proper-noun identity.
    if len(parts) == 1 and parts[0] in _GENERIC_INST_WORDS:
        return True
    # Or the core form is purely generic words.
    c = core(s)
    c_parts = c.split() if c else []
    if c_parts and all(p in _GENERIC_INST_WORDS for p in c_parts):
        return True
    return False


# --- Main ------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true",
                    help="also print pairs that look unique")
    ap.add_argument("--typo-cutoff", type=float, default=0.88,
                    help="similarity threshold for TYPO pairs (default 0.88)")
    args = ap.parse_args()

    if not PEOPLE.exists():
        print(f"Could not find {PEOPLE}", file=sys.stderr)
        return 2

    ppl = json.loads(PEOPLE.read_text(encoding="utf-8"))
    print(f"loaded {len(ppl)} people")

    inst_uses: dict[str, list[str]] = defaultdict(list)
    for p in ppl:
        for tag in p.get("tags", []):
            inst_uses[tag].append(p["id"])

    institutions = sorted(inst_uses.keys())
    print(f"{len(institutions)} distinct institution tags "
          f"({sum(len(v) for v in inst_uses.values())} total uses)\n")

    # Precompute per-institution metadata once.
    norms = {i: normalize(i) for i in institutions}
    cores = {i: core(i) for i in institutions}

    reported: set[str] = set()  # institutions already shown in a higher-conf group

    def total(group: list[str]) -> int:
        return sum(len(inst_uses[g]) for g in group)

    # ----- TRUNC: probably-broken/truncated strings (run first so they ----
    # don't pollute the CORE buckets with generic "university" cores) ------
    trunc = [i for i in institutions if trunc_looks_bad(i)]
    if trunc:
        print(f"=== TRUNC ({len(trunc)} suspicious entries: looks truncated, "
              f"shown first so they don't muddy later groups) ===")
        for i in sorted(trunc, key=lambda i: -len(inst_uses[i])):
            print(f"      [{len(inst_uses[i]):3d}]  {i!r}")
            reported.add(i)
        print()

    # ----- HIGH: normalized exact match ------------------------------------
    high_buckets: dict[str, list[str]] = defaultdict(list)
    for i in institutions:
        high_buckets[norms[i]].append(i)
    high = [(k, v) for k, v in high_buckets.items() if len(v) > 1]

    if high:
        print(f"=== HIGH ({len(high)} groups: normalized exact match) ===")
        for _, group in sorted(high, key=lambda x: -total(x[1])):
            print(f"  ({total(group)} uses, {len(group)} variants)")
            for g in sorted(group, key=lambda g: -len(inst_uses[g])):
                print(f"      [{len(inst_uses[g]):3d}]  {g!r}")
                reported.add(g)
        print()

    # ----- CORE: same canonical core form ----------------------------------
    core_buckets: dict[str, list[str]] = defaultdict(list)
    for i in institutions:
        if i in reported:
            continue
        c = cores[i]
        if not c:
            continue
        core_buckets[c].append(i)
    core_groups = [(k, v) for k, v in core_buckets.items() if len(v) > 1]

    if core_groups:
        print(f"=== CORE ({len(core_groups)} groups: same core after stripping "
              f"department prefixes / location suffixes) ===")
        for c, group in sorted(core_groups, key=lambda x: -total(x[1])):
            print(f"  core={c!r}  ({total(group)} uses, {len(group)} variants)")
            for g in sorted(group, key=lambda g: -len(inst_uses[g])):
                print(f"      [{len(inst_uses[g]):3d}]  {g!r}")
                reported.add(g)
        print()

    # ----- ACRONYM: short string ~ acronym of long string ------------------
    # Bucket matches by (short, core_of_long) so a single acronym paired with
    # many variants of the same institution shows as one entry, not N.
    short_candidates = [
        i for i in institutions
        if i not in reported and 2 <= len(short_letters(i)) <= 8
    ]
    # Long candidates: anything (reported in CORE OK) with letters > 8.
    long_candidates = [i for i in institutions if len(short_letters(i)) > 8]

    # (short, core_of_long) -> list of long variants with that core
    by_short_and_core: dict[tuple[str, str], list[str]] = defaultdict(list)
    for s in short_candidates:
        for l in long_candidates:
            if s == l:
                continue
            if not is_acronym_pair(s, l):
                continue
            key = (s, cores[l] or norms[l])
            by_short_and_core[key].append(l)

    if by_short_and_core:
        # Sort by total usage of (short + all matching long variants).
        def acro_uses(item: tuple[tuple[str, str], list[str]]) -> int:
            (short, _core), longs = item
            return len(inst_uses[short]) + sum(len(inst_uses[l]) for l in longs)

        print(f"=== ACRONYM ({len(by_short_and_core)} groups: "
              f"short ~ acronym of long, deduped by core) ===")
        for (short, core_str), longs in sorted(by_short_and_core.items(),
                                                key=acro_uses, reverse=True):
            members = [short] + longs
            n_variants = len(longs)
            print(f"  {short!r} ~ core {core_str!r}  "
                  f"({total(members)} uses, {n_variants} long variants)")
            print(f"      [{len(inst_uses[short]):3d}]  {short!r}  (acronym)")
            for l in sorted(longs, key=lambda l: -len(inst_uses[l])):
                print(f"      [{len(inst_uses[l]):3d}]  {l!r}")
            reported.add(short)
        print()

    # ----- TYPO: high string similarity on either form ---------------------
    typo_pairs: list[tuple[str, str, float]] = []
    remaining = [i for i in institutions if i not in reported]
    for i, a in enumerate(remaining):
        a_n = norms[a]
        a_c = cores[a]
        if not a_n:
            continue
        for b in remaining[i + 1:]:
            b_n = norms[b]
            if not b_n:
                continue
            r = difflib.SequenceMatcher(None, a_n, b_n).ratio()
            # boost using core similarity if available
            if a_c and cores[b]:
                r = max(r, difflib.SequenceMatcher(None, a_c, cores[b]).ratio())
            if r >= args.typo_cutoff:
                typo_pairs.append((a, b, r))

    if typo_pairs:
        print(f"=== TYPO ({len(typo_pairs)} pairs: similarity >= {args.typo_cutoff}) ===")
        for a, b, r in sorted(typo_pairs, key=lambda x: (-total([x[0], x[1]]), -x[2])):
            print(f"  ({total([a, b])} uses, similarity {r:.2f})")
            print(f"      [{len(inst_uses[a]):3d}]  {a!r}")
            print(f"      [{len(inst_uses[b]):3d}]  {b!r}")
            reported.add(a)
            reported.add(b)
        print()

    print("Notes:")
    print(" - HIGH and ACRONYM groups are usually safe to merge.")
    print(" - CORE groups handle 'Department of X, Y University, City, ST'")
    print(" - TYPO groups need eyeballing — high similarity on a short string")
    print("   can be coincidence (e.g. 'Sussex' / 'Sydney').")
    print(" - TRUNC entries are likely parser artefacts; consider re-parsing")
    print("   the source pdf for those people.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
