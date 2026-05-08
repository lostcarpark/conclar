#!/usr/bin/env python3
"""
Apply institution-deduplication decisions to people.json.

Two passes:

  HIGH merge:    For every HIGH group (variants identical after normalizing
                 case / diacritics / whitespace / punctuation / common
                 abbreviations) replace every variant with the most-used
                 spelling.  This is a true merge — the variant tags are
                 gone after this pass.

  CORE umbrella: For every CORE group (variants that share a "core"
                 institution after stripping department prefixes and
                 location suffixes) ADD the most-used variant as an extra
                 tag on every person who has any variant from the group,
                 unless they already have it.

                 The original department-specific tags are preserved.  The
                 net effect: filtering by "Yale University" surfaces every
                 person at any Yale department, but each person still shows
                 their specific affiliation in their detail view.

TRUNC-flagged entries (truncated parser artefacts, single generic words
like "University", etc.) are excluded from both passes to avoid blasting
real affiliations with garbage canonicals.

Run:
    python3 dedup_institutions.py             # apply
    python3 dedup_institutions.py --dry-run   # show what would change

Writes a timestamped backup at people.json.before-dedup.<TIMESTAMP> before
modifying people.json.  Mirrors the result to ../public/2026/people.json
when that path exists, matching the parser's deploy mirroring.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import shutil
import sys
from collections import defaultdict
from pathlib import Path

# Reuse the normalization helpers we already calibrated.
from find_duplicate_institutions import (
    _PRIMARY_INST_INDICATORS,
    _SECONDARY_INST_INDICATORS,
    STOP_WORDS,
    core,
    normalize,
    tokenize,
    trunc_looks_bad,
)


def canonical_chunk(s: str) -> str:
    """Extract just the institution-name chunk from a sloppy string.
    "Department of Linguistics, Aarhus University" -> "Aarhus University".
    Used so the CORE umbrella canonical is the bare institution name, not a
    department-prefixed variant that happens to be common."""
    chunks = [c.strip() for c in s.split(",") if c.strip()]
    if not chunks:
        return s.strip()

    def chunk_score(ch: str) -> tuple[int, int]:
        if _PRIMARY_INST_INDICATORS.search(ch):
            tier = 2
        elif _SECONDARY_INST_INDICATORS.search(ch):
            tier = 1
        else:
            tier = 0
        toks = [t for t in tokenize(ch) if t not in STOP_WORDS]
        return (tier, len(toks))

    return max(chunks, key=chunk_score)

HERE = Path(__file__).resolve().parent
PEOPLE = HERE / "people.json"
DEPLOY_PEOPLE = HERE.parent / "public" / "2026" / "people.json"


def load_people() -> list[dict]:
    return json.loads(PEOPLE.read_text(encoding="utf-8"))


def save_people(ppl: list[dict]) -> None:
    """Write to parse-vss-data/ and mirror to public/2026/.  The mirror is
    best-effort: on FUSE-mounted filesystems large file writes can return
    EDEADLK transiently, so we retry a few times and warn if it still
    fails — the local file is already correct, so the user can copy it
    themselves if needed."""
    import time
    text = json.dumps(ppl, ensure_ascii=False, indent=2)
    PEOPLE.write_text(text, encoding="utf-8")
    if not DEPLOY_PEOPLE.parent.exists():
        return
    last_err = None
    for attempt in range(5):
        try:
            DEPLOY_PEOPLE.write_text(text, encoding="utf-8")
            return
        except OSError as e:
            last_err = e
            time.sleep(0.5 * (attempt + 1))
    print(
        f"WARNING: could not write deploy mirror at {DEPLOY_PEOPLE}\n"
        f"         {last_err}\n"
        f"         The local copy at {PEOPLE} is correct; copy it to the\n"
        f"         deploy path manually:\n"
        f"             cp {PEOPLE} {DEPLOY_PEOPLE}",
        file=sys.stderr,
    )


def index_uses(ppl: list[dict]) -> dict[str, list[str]]:
    out: dict[str, list[str]] = defaultdict(list)
    for p in ppl:
        for t in p.get("tags", []):
            out[t].append(p["id"])
    return out


_TITLE_CASE_STOP_WORDS = {
    "Of", "The", "And", "For", "In", "At", "To", "A", "An", "On", "By",
}


def quality_score(s: str) -> tuple:
    """Higher = cleaner-looking. Used to pick canonicals so trivial
    typographic noise (trailing punct, double spaces, all-caps,
    awkwardly-capitalized stop words like 'Of') doesn't win even when more
    people happen to have typed it that way."""
    rstripped = s.rstrip()
    not_trailing_punct = 1 if not rstripped.endswith((",", ".", ";", ":")) else 0
    no_double_space = 1 if "  " not in s else 0
    not_all_caps = 1 if s != s.upper() else 0
    not_all_lower = 1 if s != s.lower() else 0
    not_leading_trailing_ws = 1 if s == rstripped.lstrip() else 0
    # Penalize mid-string capitalized stop words: "Department Of" vs the
    # idiomatic "Department of". The first word is allowed to be capitalized.
    words = s.split()
    no_cap_stops = 1
    for w in words[1:]:
        cleaned = w.strip(",.;:")
        if cleaned in _TITLE_CASE_STOP_WORDS:
            no_cap_stops = 0
            break
    return (
        not_trailing_punct,
        no_double_space,
        not_leading_trailing_ws,
        not_all_caps,
        not_all_lower,
        no_cap_stops,
    )


def pick_canonical(variants: list[str], uses: dict[str, list[str]]) -> str:
    """Highest quality first, then most-used, then shortest string."""
    return max(variants, key=lambda v: (quality_score(v), len(uses[v]), -len(v)))


def build_high_remap(uses: dict[str, list[str]],
                     skip: set[str]) -> dict[str, str]:
    """variant -> canonical for HIGH groups (normalized exact match)."""
    buckets: dict[str, list[str]] = defaultdict(list)
    for inst in uses:
        if inst in skip:
            continue
        buckets[normalize(inst)].append(inst)
    remap: dict[str, str] = {}
    for variants in buckets.values():
        if len(variants) <= 1:
            continue
        canonical = pick_canonical(variants, uses)
        for v in variants:
            if v != canonical:
                remap[v] = canonical
    return remap


def build_core_umbrellas(uses: dict[str, list[str]],
                         skip: set[str]) -> dict[str, str]:
    """core_form -> canonical institution-name umbrella tag.

    Only emits entries where multiple variants share a core (otherwise
    there's nothing to umbrella).  The umbrella we generate is the bare
    institution-name chunk (department prefixes / location suffixes
    stripped) — so people tagged "Department of X, Yale University" get an
    additional clean "Yale University" tag they can be filtered on.

    Algorithm:
      1. Group variants by core form.
      2. For each variant, compute its "canonical chunk" — the institution
         chunk with department/location noise stripped away.
      3. Among the candidate chunks, pick the one with the most aggregate
         person-uses (which usually surfaces the cleanest spelling people
         actually type).  Tie-break by quality_score then shorter length.
    """
    buckets: dict[str, list[str]] = defaultdict(list)
    for inst in uses:
        if inst in skip:
            continue
        c = core(inst)
        if not c:
            continue
        buckets[c].append(inst)

    out: dict[str, str] = {}
    for c, variants in buckets.items():
        if len(variants) <= 1:
            continue
        # Build candidate chunks from each variant, weighted by that
        # variant's user count.
        chunk_uses: dict[str, int] = defaultdict(int)
        for v in variants:
            ch = canonical_chunk(v)
            chunk_uses[ch] += len(uses[v])
        # Pick best chunk: highest aggregate uses, then quality, then shorter.
        best = max(chunk_uses,
                   key=lambda ch: (chunk_uses[ch], quality_score(ch), -len(ch)))
        out[c] = best
    return out


def apply_high(ppl: list[dict], remap: dict[str, str]) -> int:
    """Replace each variant with its canonical in-place. Returns # changes."""
    n_replaced = 0
    for p in ppl:
        old = p.get("tags", [])
        new: list[str] = []
        seen: set[str] = set()
        for t in old:
            new_t = remap.get(t, t)
            if new_t in seen:
                # The canonical is already in this person's tags — drop the
                # variant entirely to avoid duplicate canonical entries.
                if new_t != t:
                    n_replaced += 1
                continue
            new.append(new_t)
            seen.add(new_t)
            if new_t != t:
                n_replaced += 1
        p["tags"] = new
    return n_replaced


def apply_core_umbrella(ppl: list[dict],
                         core_canon: dict[str, str]) -> int:
    """Add the canonical for any matching core to each person's tags.
    Returns the number of additions."""
    n_added = 0
    for p in ppl:
        tags = p.get("tags", [])
        existing = set(tags)
        # Which core groups does this person belong to?
        cores_here: set[str] = set()
        for t in tags:
            c = core(t)
            if c in core_canon:
                cores_here.add(c)
        for c in cores_here:
            canonical = core_canon[c]
            if canonical not in existing:
                tags.append(canonical)
                existing.add(canonical)
                n_added += 1
        p["tags"] = tags
    return n_added


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true",
                    help="show what would change without writing")
    ap.add_argument("--verbose", "-v", action="store_true",
                    help="print every remap and umbrella add")
    args = ap.parse_args()

    if not PEOPLE.exists():
        print(f"Could not find {PEOPLE}", file=sys.stderr)
        return 2

    ppl = load_people()
    print(f"loaded {len(ppl)} people")

    uses = index_uses(ppl)
    skip = {i for i in uses if trunc_looks_bad(i)}
    print(f"  {len(uses)} distinct institution tags ({sum(len(v) for v in uses.values())} uses)")
    print(f"  excluding {len(skip)} TRUNC-looking entries from merges")

    # ---- HIGH merge --------------------------------------------------------
    high_remap = build_high_remap(uses, skip)
    print(f"\nHIGH: {len(high_remap)} variant -> canonical replacements "
          f"across {len({c for c in high_remap.values()})} canonical strings")
    if args.verbose:
        # Sort by canonical so all variants for one institution group together
        for v, c in sorted(high_remap.items(), key=lambda kv: (kv[1], kv[0])):
            print(f"    {v!r}\n       -> {c!r}")

    if args.dry_run:
        # Simulate HIGH merge on a copy so the CORE preview is accurate.
        import copy
        sim = copy.deepcopy(ppl)
        n_replaced = apply_high(sim, high_remap)
        print(f"  would replace: {n_replaced} tag occurrences across {len(ppl)} people")
        uses = index_uses(sim)
        skip = {i for i in uses if trunc_looks_bad(i)}
    else:
        n_replaced = apply_high(ppl, high_remap)
        print(f"  applied: {n_replaced} tag replacements across {len(ppl)} people")
        uses = index_uses(ppl)
        skip = {i for i in uses if trunc_looks_bad(i)}

    # ---- CORE umbrella -----------------------------------------------------
    core_canon = build_core_umbrellas(uses, skip)
    print(f"\nCORE: {len(core_canon)} canonical institutions to umbrella-tag")
    if args.verbose:
        for c, canon in sorted(core_canon.items()):
            n_uses_canon = len(uses.get(canon, []))
            print(f"    core={c!r}\n       canonical={canon!r}  ({n_uses_canon} uses)")

    if not args.dry_run:
        n_added = apply_core_umbrella(ppl, core_canon)
        print(f"  applied: {n_added} canonical-tag additions")

        # ---- Save ---------------------------------------------------------
        ts = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = PEOPLE.with_name(f"people.json.before-dedup.{ts}")
        shutil.copy(PEOPLE, backup)
        save_people(ppl)
        print(f"\nbackup -> {backup}")
        print(f"wrote   -> {PEOPLE}")
        if DEPLOY_PEOPLE.parent.exists():
            print(f"mirror  -> {DEPLOY_PEOPLE}")
        else:
            print(f"(deploy mirror skipped: {DEPLOY_PEOPLE.parent} does not exist)")
    else:
        print("\n--dry-run: no changes written")

    return 0


if __name__ == "__main__":
    sys.exit(main())
