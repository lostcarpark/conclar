#!/usr/bin/env python3
"""
Parse VSS_2026 abstracts into konopas-format program.json and people.json.

Konopas data format spec: https://konopas.github.io/data-fmt

Inputs (in the same folder as this script):
  - VSS_2026_Abstracts.pdf  (original)
  - VSS_2026_Abstracts.txt  (already produced via `pdftotext -layout VSS_2026_Abstracts.pdf`)

Outputs (also written into the same folder):
  - program.json  (every symposium talk, session talk, poster, and schedule item)
  - people.json   (deduplicated author roster with prog[] back-references)

Usage:
  python3 parse_vss_to_konopas.py [--debug] [--limit N]
                                  [--no-merge] [--aliases path]

Notes:
  - Standard library only (no pip installs needed).
  - The script is tolerant: anything it can't parse is reported via stderr but
    does not abort the run. Stats are printed at the end.
  - If you want to reparse after editing this file, just re-run the command.

Duplicate person handling:
  After parsing, the script auto-merges person records that are obviously the
  same individual: case/diacritic/punct collisions (`Émilie` vs `Emilie`),
  middle-initial variations (`Bevil R. Conway` vs `Bevil Conway`), and known
  nickname pairs (`Andy` vs `Andrew`).

  For one-off merges that aren't safe to do automatically (typos like
  `Marsia` vs `Marisa`, uncommon nicknames like `Cate` vs `Caterina`, spelling
  variants like `Phillip` vs `Philip`), drop an `aliases.json` next to this
  script (or pass `--aliases <path>`) with the shape:

      {
        "marsia-carrasco":   "marisa-carrasco",
        "phillip-guan":      "philip-guan",
        "cate-trentin":      "caterina-trentin"
      }

  Each entry is `{dup_id: canonical_id}` using the person ids found in
  people.json after a run.  The aliases pass runs after auto-merge and walks
  through any auto-merge remaps, so you can use the pre-auto-merge ids and
  they'll still resolve.  Pass `--no-merge` to disable both passes.
"""

from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
import unicodedata
from collections import OrderedDict, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Optional

HERE = Path(__file__).resolve().parent
TXT_PATH = HERE / "VSS_2026_Abstracts.txt"
PROGRAM_PATH = HERE / "program.json"
PEOPLE_PATH = HERE / "people.json"
# Mirror outputs into the deployed location so a parser run is self-sufficient.
# The site reads from public/2026/ — without these copies, a fresh program.json
# stays in parse-vss-data/ and never reaches the build.
DEPLOY_DIR = HERE.parent / "public" / "2026"
DEPLOY_PROGRAM_PATH = DEPLOY_DIR / "program.json"
DEPLOY_PEOPLE_PATH = DEPLOY_DIR / "people.json"

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

argp = argparse.ArgumentParser()
argp.add_argument("--debug", action="store_true", help="print extra diagnostics")
argp.add_argument("--limit", type=int, default=0, help="cap items written (0 = no cap)")
argp.add_argument("--no-merge", action="store_true",
                  help="skip the duplicate-people merge pass")
argp.add_argument("--aliases",
                  help="path to a JSON aliases file mapping {dup_id: canonical_id} "
                       "for manual person merges (default: aliases.json next to script)")
args = argp.parse_args()
DEBUG = args.debug


def warn(*msg):
    print("[warn]", *msg, file=sys.stderr)


def dbg(*msg):
    if DEBUG:
        print("[dbg]", *msg, file=sys.stderr)


# ---------------------------------------------------------------------------
# Step 1. Load and column-split the layout-extracted text.
# ---------------------------------------------------------------------------

if not TXT_PATH.exists():
    print(
        f"Could not find {TXT_PATH}. Run:\n"
        f"  pdftotext -layout VSS_2026_Abstracts.pdf VSS_2026_Abstracts.txt\n"
        f"in this folder first.",
        file=sys.stderr,
    )
    sys.exit(2)

raw = TXT_PATH.read_text(encoding="utf-8", errors="replace")
# Pages are separated by form feed when pdftotext -layout was used.
pages = raw.split("\f")
dbg(f"loaded {len(pages)} pages, {len(raw):,} chars")


def detect_column_boundary(lines: list[str], min_gap: int = 4) -> Optional[int]:
    """Return the median column-gap midpoint for a page, or None if 1-column."""
    candidates: list[int] = []
    for line in lines:
        if not line.strip():
            continue
        # Look for a wide whitespace gap with non-space content on both sides.
        m = re.search(r"\S(\s{%d,})\S" % min_gap, line)
        if not m:
            continue
        gap_start = m.start(1)
        gap_end = m.end(1)
        candidates.append((gap_start + gap_end) // 2)
    if len(candidates) < 5:
        return None
    return int(statistics.median(candidates))


def reorder_columns(page_text: str) -> str:
    """Reconstruct reading-order text from a -layout-extracted page.

    Strategy:
      - Compute the page-wide median column boundary as a soft hint.
      - For each line, decide which column it belongs to:
        * Whole line is whitespace -> blank.
        * All content sits past the boundary -> right-only.
        * Has a wide internal gap -> split at the LARGEST per-line gap (this
          avoids the page-wide boundary truncating a wide left-column line
          like a long author/affiliation row).
        * Otherwise -> treat as left-column wide line.
    """
    lines = page_text.split("\n")
    boundary = detect_column_boundary(lines)
    if boundary is None:
        return "\n".join(line.rstrip() for line in lines)

    left: list[str] = []
    right: list[str] = []
    # Some pages pack the columns tightly (3-space inter-column gap).  Use
    # a permissive threshold but break ties by closeness to the page-wide
    # boundary so a normal mid-sentence pause never gets picked over a real
    # column gap.
    GAP_RE = re.compile(r"\S(\s{3,})\S")

    def pick_gap(line: str) -> Optional[tuple[int, int]]:
        """Choose the most likely column gap on this line.

        Strategy (in order):
          (1) If any gap straddles the page-wide boundary, pick the widest
              such gap.  This is the typical case.
          (2) Otherwise, pick the gap whose MIDPOINT is closest to the
              boundary (with a 10-char distance cap).  Closeness beats
              width here, because a wide intra-author gap is often farther
              from the boundary than the narrow real column gap.
        """
        cands = [(m.start(1), m.end(1)) for m in GAP_RE.finditer(line)]
        if not cands:
            return None
        containing = [(gs, ge) for gs, ge in cands if gs <= boundary <= ge]
        if containing:
            return max(containing, key=lambda g: g[1] - g[0])
        best: Optional[tuple[int, int]] = None
        best_dist = float("inf")
        for gs, ge in cands:
            if (ge - gs) < 3:
                continue
            mid = (gs + ge) / 2
            dist = abs(mid - boundary)
            # Reject gaps whose nearest edge is far from the boundary.
            edge_d = (boundary - ge) if ge < boundary else (gs - boundary if gs > boundary else 0)
            if edge_d > 10:
                continue
            if dist < best_dist:
                best_dist = dist
                best = (gs, ge)
        return best

    for line in lines:
        if not line.strip():
            left.append("")
            continue
        # Right-only: nothing in the LEFT column at all (every char before
        # the page boundary is whitespace).  Using a fixed `boundary - N`
        # threshold misclassifies wide-left-column lines whose content
        # starts a few chars before the boundary (e.g. "...Elisa" at char
        # 62 with boundary 71) as right-only.
        if not line[:boundary].strip():
            right.append(line.strip())
            continue
        # Wide-left-only: the line is mostly left content, with at most a
        # short tail extending past the boundary (e.g. an author affil
        # "1;" hanging two chars past).  Keep it intact in the left column
        # to avoid splitting on an internal whitespace gap.
        # EXCEPTION: a short ALL-CAPS alphabetic token (optionally with a
        # trailing number, e.g. "PAVILION" or "TALK 5") is most likely a
        # right-column running-header / talk-marker, not part of the L
        # column body.  Splitting it off to the right column keeps these
        # markers intact for downstream session/topic/talk detection.
        trailing = line[boundary:].strip() if boundary < len(line) else ""
        trailing_is_running_header = bool(
            re.fullmatch(r"[A-Z]{2,12}(?:\s+\d{1,3})?", trailing)
        )
        if len(trailing) <= 8 and not trailing_is_running_header:
            left.append(line.rstrip())
            continue
        best_gap = pick_gap(line)
        if best_gap is None:
            left.append(line.rstrip())
            continue
        l_part = line[: best_gap[0]].rstrip()
        r_part = line[best_gap[1]:].rstrip()
        if not l_part and r_part:
            right.append(r_part.lstrip())
        elif l_part and not r_part:
            left.append(l_part)
        elif l_part and r_part:
            left.append(l_part)
            right.append(r_part.lstrip())
        else:
            left.append("")
    return "\n".join(left + [""] + right)


reading_pages = [reorder_columns(p) for p in pages]
reading_text = "\n".join(reading_pages)
# Keep the un-reordered layout text too: the schedule overview is a wide
# table whose rows the column-reorder pass mangles, but which parses fine
# from the original layout output.
layout_text = "\n".join(p.replace("\r", "") for p in pages)
dbg(f"reading text: {len(reading_text):,} chars, {reading_text.count(chr(10)):,} lines")


# ---------------------------------------------------------------------------
# Step 2. Strip page-footer noise.
# ---------------------------------------------------------------------------

# pdftotext sometimes inserts soft hyphens or weird spacing inside the running
# header "Vis ion Sc ienc es Society | <pagenum>" (each character spaced).
# We just nuke any line that's mostly that footer pattern.
def is_footer(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    # The PDF's running footer renders with weirdly spaced character runs:
    #   "Vis ion Sc ienc es           Society       | 12"
    #   "11 | Vis ion Sc ienc es           Soc iet y"
    # Comparing against the *whitespace-collapsed lowercase* form is the
    # only reliable way to catch every variant we've seen in the wild.
    flat = re.sub(r"\s+", "", s).lower()
    if "visionsciencessociety" in flat or "visionsciencessoc" in flat[:60]:
        return True
    return False


reading_text = "\n".join(line for line in reading_text.split("\n") if not is_footer(line))


# ---------------------------------------------------------------------------
# Step 3. Slice into the four major regions.
# ---------------------------------------------------------------------------

def find_section_start(text: str, header: str) -> int:
    """Return the offset of `header` as a standalone line, or -1."""
    pat = re.compile(rf"(?m)^{re.escape(header)}\s*$")
    m = pat.search(text)
    return m.start() if m else -1


sym_off = find_section_start(reading_text, "Symposium Sessions")
talk_off = find_section_start(reading_text, "Talk Sessions")
poster_off = find_section_start(reading_text, "Poster Sessions")
# Author index marks the end of abstract content.
ai_off = -1
for marker in ("Author Index", "AUTHOR INDEX", "Index of Authors"):
    ai_off = reading_text.find(marker)
    if ai_off != -1:
        break
end_off = ai_off if ai_off != -1 else len(reading_text)

if sym_off == -1 or talk_off == -1 or poster_off == -1:
    warn(f"section offsets: symp={sym_off}, talk={talk_off}, poster={poster_off}")

front_text = reading_text[: max(sym_off, 0)]
# For schedule overview parsing, use the raw layout text (its wide table
# rows survive intact only without our column-reorder).
layout_sym_off = layout_text.find("Symposium Sessions")
front_layout = layout_text[: max(layout_sym_off, 0)] if layout_sym_off != -1 else layout_text[:30000]
sym_text = reading_text[sym_off:talk_off] if sym_off != -1 else ""
talk_text = reading_text[talk_off:poster_off] if talk_off != -1 else ""
poster_text = reading_text[poster_off:end_off] if poster_off != -1 else ""

dbg(f"section sizes  front={len(front_text):,}  symp={len(sym_text):,}  "
    f"talk={len(talk_text):,}  poster={len(poster_text):,}")


# ---------------------------------------------------------------------------
# Step 4. Front-matter / Schedule Overview parser.
#
# The schedule overview lists every session-block (workshops, breaks, talk
# sessions, poster sessions, socials...) with day/time/room. We use it to:
#   (a) emit konopas items for non-abstract program rows (workshops, breaks),
#   (b) build a fallback (date, time, room) lookup for abstract sessions.
# ---------------------------------------------------------------------------

DAY_HEADER_RE = re.compile(
    r"^(Wednesday|Thursday|Friday|Saturday|Sunday|Monday|Tuesday),\s+"
    r"([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})\s*$",
    re.MULTILINE,
)

# A schedule row begins with a time range like "8:00 - 10:00 am" or
# "10:30 am - 12:30 pm".  The remainder of the line has columns (title, type, room).
ROW_RE = re.compile(
    r"^(?P<start>\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–]\s*"
    r"(?P<end>\d{1,2}(?::\d{2})?\s*(?:am|pm))\s+"
    r"(?P<rest>\S.*)$",
    re.IGNORECASE,
)


def normalize_time(token: str, fallback_ampm: Optional[str] = None) -> Optional[tuple[int, int]]:
    """Parse '4:15 pm' / '8:00' into (hour, minute) 24h, or None.

    If `fallback_ampm` is supplied (e.g. inherited from the end-of-range
    token), it's used when the input has no explicit am/pm marker.
    """
    s = token.strip().lower().replace(".", "")
    m = re.match(r"^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$", s)
    if not m:
        return None
    h = int(m.group(1))
    mi = int(m.group(2) or 0)
    suf = m.group(3) or (fallback_ampm.lower() if fallback_ampm else None)
    if suf == "pm" and h != 12:
        h += 12
    elif suf == "am" and h == 12:
        h = 0
    return (h, mi)


def parse_time_range(start_tok: str, end_tok: str) -> Optional[tuple[tuple[int,int], tuple[int,int]]]:
    """Parse a "8:00 - 10:00 am" / "4:15 - 5:45 pm" / "10:30 am - 12:30 pm" range.

    Handles AM/PM inheritance in both directions, then bumps the start by 12h
    if needed so end >= start within the same day.
    """
    end_ampm_m = re.search(r"(am|pm)", end_tok, re.IGNORECASE)
    end_ampm = end_ampm_m.group(1).lower() if end_ampm_m else None
    start_ampm_m = re.search(r"(am|pm)", start_tok, re.IGNORECASE)
    start_ampm = start_ampm_m.group(1).lower() if start_ampm_m else None
    start = normalize_time(start_tok, fallback_ampm=end_ampm)
    end = normalize_time(end_tok, fallback_ampm=start_ampm)
    if start is None or end is None:
        return None
    # If the range crosses noon implicitly (start AM but no marker, end PM): the
    # fallback above already makes start = end's PM, so the comparison below
    # only kicks in for genuinely overnight events.
    s_min = start[0] * 60 + start[1]
    e_min = end[0] * 60 + end[1]
    if e_min < s_min:
        end = ((end[0] + 12) % 24, end[1])
    return start, end


def fmt_time(hm: tuple[int, int]) -> str:
    return f"{hm[0]:02d}:{hm[1]:02d}"


MONTH_NUM = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11,
    "december": 12,
}


def fmt_date(month_name: str, day: int, year: int) -> str:
    return f"{year:04d}-{MONTH_NUM[month_name.lower()]:02d}-{day:02d}"


@dataclass
class ScheduleEntry:
    date: str
    start: tuple[int, int]
    end: tuple[int, int]
    title: str
    kind: str  # "Symposium" / "Talk Session" / "Poster Session" / "Workshop" / etc.
    room: str
    sub_topics: list[str] = field(default_factory=list)


def parse_schedule_overview(text: str) -> list[ScheduleEntry]:
    """Walk the front-matter table and yield ScheduleEntry rows."""
    entries: list[ScheduleEntry] = []
    current_date: Optional[str] = None

    # The table is column-formatted; after our column-reorder pass it should
    # mostly read top-to-bottom, but sub-topics under a poster session are
    # indented with no leading time. We track the last entry to attach them.
    lines = text.split("\n")
    last_entry: Optional[ScheduleEntry] = None

    for raw_line in lines:
        line = raw_line.rstrip()
        # Skip blank lines and page footers WITHOUT clearing last_entry,
        # so a sub-topic that wraps onto the next page can still attach
        # to the row started on the previous page.
        if not line.strip():
            continue
        if is_footer(line):
            continue
        # Page-number-only line like "5 |   Vis ion Sc..." caught above; a
        # bare page number "5" sometimes appears alone too.
        if re.fullmatch(r"\s*\d+\s*", line):
            continue

        m = DAY_HEADER_RE.match(line.strip())
        if m:
            try:
                current_date = fmt_date(m.group(2), int(m.group(3)), int(m.group(4)))
            except KeyError:
                current_date = None
            last_entry = None
            continue

        if current_date is None:
            continue

        m = ROW_RE.match(line.strip())
        if not m:
            # Continuation line / sub-topic. Attach to last entry if indented.
            if last_entry is not None and (raw_line.startswith(" " * 6)
                                           or line.lstrip() != line):
                txt = line.strip()
                if txt and not txt.startswith("Sponsored by"):
                    # Merge with the previous sub-topic if it's a visual
                    # wrap of the same topic, e.g.:
                    #   "Functional Organization of Visual Pathways: Retinotopy, population"
                    #   "receptive fields"
                    # OR a trailing-comma wrap:
                    #   "Perceptual Training, Learning and Plasticity: Neuroimaging,"
                    #   "neurostimulation"
                    if last_entry.sub_topics:
                        prev = last_entry.sub_topics[-1].rstrip()
                        merge = False
                        if prev.endswith(","):
                            merge = True
                        elif txt and txt[0].islower():
                            merge = True
                        if merge:
                            last_entry.sub_topics[-1] = prev + " " + txt
                            continue
                    last_entry.sub_topics.append(txt)
            continue

        rng = parse_time_range(m.group("start"), m.group("end"))
        if rng is None:
            continue
        start, end = rng
        rest = m.group("rest")
        # rest looks like:
        #   "Computational and Mathematical Models in Vision (MODVIS)   Satellite   Blue Heron"
        # Try to peel off the trailing kind+room. Known kinds:
        kinds = (
            "Satellite", "Registration", "Lounge", "Symposium", "Break",
            "Workshop", "Poster Session", "Talk Session", "Social", "Keynote",
            "Networking", "Award", "Student", "Other", "Exhibits", "Business",
        )
        # Greedy: scan from right for a kind word.
        rest_clean = re.sub(r"\s+", " ", rest).strip()
        kind = ""
        room = ""
        for k in kinds:
            idx = rest_clean.rfind(k)
            if idx > 0 and rest_clean[idx - 1] == " ":
                kind = k
                title = rest_clean[:idx].strip()
                room = rest_clean[idx + len(k):].strip()
                break
        else:
            # Fallback: last two whitespace-separated tokens are room.
            parts = rest_clean.rsplit("  ", 2)
            title = parts[0].strip()
            kind = ""
            room = parts[-1].strip() if len(parts) > 1 else ""

        entry = ScheduleEntry(
            date=current_date, start=start, end=end,
            title=title, kind=kind, room=room,
        )
        entries.append(entry)
        last_entry = entry

    return entries


schedule = parse_schedule_overview(front_layout)
dbg(f"schedule rows parsed: {len(schedule)}")


# ---------------------------------------------------------------------------
# Step 5. Helpers for parsing abstract bodies (shared across symp/talk/poster).
# ---------------------------------------------------------------------------

# An author block looks like:
#   "Jane Doe1, John Smith2,3; 1Some University, 2Other Institute, 3Third Place"
# Email addresses sometimes appear in parens: "jane doe1 (jane@x.edu), ...".
# Some lines split awkwardly across columns; we work on a single joined string.

AUTHORS_RE = re.compile(
    r"^(?P<authors>[^;]+);\s*(?P<affils>.+)$"
)

EMAIL_RE = re.compile(r"\s*\([^)]*@[^)]*\)")
# Matches a single author's affiliation indices at end of name e.g. "Jane Doe1,2"
AUTHOR_AFFIL_RE = re.compile(r"^(?P<name>.+?)([\d\s,]+)$")


def clean_author_token(tok: str) -> tuple[str, list[str]]:
    """From 'Jane Doe1,2 (jane@x.edu)' return ('Jane Doe', ['1','2']).

    Also normalizes CJK full-width punctuation (e.g. `，` `；`) into the
    ASCII equivalents the trailing-affil regex understands, and strips a
    stray space-period at the end ("Akshi ." -> "Akshi") which appears in
    a few source records.

    Strips presenter-marker characters (* # † ‡) that some abstracts
    append after the affiliation indices ("Gal Vishne1,*"), so the
    affiliation regex sees a clean "...1," tail.
    """
    s = EMAIL_RE.sub("", tok).strip().rstrip(",;")
    s = re.sub(r"\s+", " ", s)
    # Normalize full-width CJK punctuation.
    s = s.translate(str.maketrans({"，": ",", "；": ";", "：": ":", "、": ","}))
    # Strip presenter-marker punctuation that trails the affil indices.
    # Some abstracts mark presenters/corresponding authors with `*`, `#`,
    # `†`, `‡`; these are sometimes wedged between the name and indices
    # ("Jane Doe1,*") or at the very end ("Selma Akarsu1*").  Iterate
    # because both forms can co-occur.
    while True:
        s2 = re.sub(r"[*#†‡]+\s*$", "", s).rstrip(",;. ")
        if s2 == s:
            break
        s = s2
    # Trailing affiliation indices, possibly mixed with commas / spaces.
    # Allow `.` between digits too — the source occasionally renders the
    # comma between affil indices as a period ("Nejad1.2" instead of
    # "Nejad1,2"), and we still want both indices captured.
    m = re.match(r"^(.*?)([0-9](?:[0-9]|,|\.|\s)*)$", s)
    if m:
        name = m.group(1).strip(" ,.")
        idx_part = re.findall(r"\d+", m.group(2))
    else:
        name = s
        idx_part = []
    # Strip a stray ` .` tail (e.g. "Akshi ." in the source).  Keep
    # trailing initials like "K." intact — those have no leading space.
    name = re.sub(r"\s+\.+\s*$", "", name).rstrip(",")
    # Final guard: if any digits remain in the name, the affil parse
    # didn't consume them (e.g. interleaved column-reorder noise like
    # "Jon 1 1 1 Campbell" -> indices floating mid-name).  Strip them.
    if re.search(r"\d", name):
        name = re.sub(r"\s+\d+(?=\s|$)", "", name)
        name = re.sub(r"\s{2,}", " ", name).strip()
    # Normalize all-caps names to Title Case.  A few abstracts render their
    # authors ALL CAPS ("ANKIT MAURYA", "MATTHIAS GAMER") while the rest
    # of the corpus is mixed case — keeping them all-caps would split a
    # person across two records.  Skip names with any lowercase letter
    # (already mixed case) and skip very short tokens (initials).
    if name and any(c.isalpha() for c in name) and not any(c.islower() for c in name):
        def _cap(w: str) -> str:
            if not w:
                return w
            # Preserve single-letter initials with period ("K.").
            if len(w) <= 2 and w.endswith("."):
                return w
            return w[0].upper() + w[1:].lower()
        out_words = []
        for w in name.split():
            parts = re.split(r"([-'])", w)
            out = "".join(_cap(p) if i % 2 == 0 else p
                          for i, p in enumerate(parts))
            out_words.append(out)
        name = " ".join(out_words)
    return name, idx_part


def parse_authors_line(line: str) -> tuple[list[tuple[str, list[str]]], list[str]]:
    """Split 'authors; affils' into ([(name, [idx,...]), ...], [affil, ...]).

    Per-author affiliation indices are preserved so callers can look up which
    institutions a given person belongs to on this paper.
    """
    m = AUTHORS_RE.match(line.strip())
    if not m:
        return [], []
    authors_txt = m.group("authors").strip()
    affils_txt = m.group("affils").strip()

    # Split authors on commas, but only those followed by a letter — this
    # avoids breaking 'Author Two1,2' (multi-affil indices) into two tokens.
    # `\w` covers Latin-1 only by default; the wider ranges below catch
    # Latin Extended (Polish), Turkish (İğüşçö), CJK, Cyrillic, etc.
    _NAME_LEAD = (
        r"A-Za-z"
        r"À-ÖØ-öø-ÿ"        # Latin-1 Supplement letters
        r"Ā-ɏ"    # Latin Extended-A & -B
        r"Ͱ-Ͽ"    # Greek
        r"Ѐ-ӿ"    # Cyrillic
        r"一-鿿"    # CJK Unified
    )
    raw_tokens = [t.strip() for t in re.split(rf",(?=\s*[{_NAME_LEAD}])", authors_txt) if t.strip()]
    # Rejoin name suffix tokens (Jr., Sr., II, III, IV, PhD, MD) with their
    # preceding author so "Smith, Jr.1" doesn't become two separate people.
    # Strip a trailing affiliation index (and any periods/commas) before
    # checking against the suffix set so "Jr.1" / "Jr." / "Jr" all match.
    _SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "phd", "ph.d", "md", "esq"}
    merged: list[str] = []
    for tok in raw_tokens:
        core = re.sub(r"[\s\d]+$", "", tok).rstrip(".,").lower()
        if merged and core in _SUFFIXES:
            merged[-1] = merged[-1] + ", " + tok
        else:
            merged.append(tok)
    out: list[tuple[str, list[str]]] = []
    for tok in merged:
        name, idxs = clean_author_token(tok)
        if name:
            out.append((name, idxs))

    # Affiliations are numbered: "1Univ A, 2Univ B, 3Univ C"
    affils = re.split(r",\s*(?=\d)", affils_txt)
    affils = [a.strip() for a in affils if a.strip()]
    return out, affils


def affil_lookup(affils: list[str]) -> dict[str, str]:
    """Map index string -> affiliation text (with leading digit stripped)."""
    out: dict[str, str] = {}
    for a in affils:
        m = re.match(r"^(\d+)\s*(.+)$", a)
        if m:
            out[m.group(1)] = m.group(2).strip()
    return out


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = s.encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return s or "anon"


# ---------- Title-case conversion for ALL-CAPS source titles -----------------
#
# Abstract titles in the VSS booklet are typeset in ALL CAPS.  We convert
# them to title case while preserving:
#   * Common scientific acronyms (EEG, fMRI, V1, ANOVA, ...).
#   * "Small" connector words in the middle of the title (in, of, the, and,
#     to, by, for, ...) — but capitalize them at the start, end, or after a
#     colon / question mark / exclamation point.
#   * Internal hyphens get both halves capitalized ("Top-Down").
# Mixed-case input is returned unchanged so this is safe to apply broadly.

_TITLE_SMALL_WORDS = frozenset({
    "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into",
    "is", "nor", "of", "on", "onto", "or", "the", "to", "upon", "via", "vs",
    "with",
})

# Acronyms preserved as-is when the all-caps title is converted.  Stored in
# uppercase for fast comparison; emitted exactly as written here.
_TITLE_ACRONYMS = frozenset({
    # AI / computing
    "AI", "ML", "DL", "DNN", "CNN", "RNN", "GAN", "VAE", "LLM", "GPT",
    "GPU", "CPU", "ASIC", "FPGA", "API", "URL", "JSON", "XML", "HTML", "CSS",
    "RGB", "HSV", "HDR", "CIE", "LMS", "QR", "OK",
    # Imaging / electrophysiology
    "EEG", "MEG", "MRI", "FMRI", "SMRI", "DMRI", "PET", "TMS", "TDCS",
    "ECOG", "ERP", "BOLD", "MEG-FMRI", "EEG-FMRI", "OCT",
    # Brain regions
    "V1", "V2", "V3", "V4", "V5", "V6", "MT", "MST", "FFA", "PPA", "EBA",
    "LO", "LOC", "ATL", "PFC", "IPS", "FEF", "SC", "LGN", "IT", "STS",
    # Vision / cognition / methods
    "VR", "AR", "XR", "MNREAD", "RVF", "LVF", "FOV", "RSVP", "SOA", "ISI",
    "TLM", "AFC", "2AFC", "3AFC", "4AFC", "ANOVA", "ANCOVA",
    "RT", "DV", "IV", "ORCA", "TSP", "WM", "LTM", "STM", "VSTM", "VWM", "STM",
    # Geographic / orgs
    "US", "USA", "UK", "EU", "EEA", "UAE",
    "NIH", "NSF", "NEI", "BBSRC", "EPSRC", "ERC", "CIHR", "DFG", "JSPS",
    "VSS", "ARVO", "OSA", "SFN", "CNS", "CSHL",
    # Biology / chem
    "DNA", "RNA", "ATP", "GABA", "NMDA", "AMPA",
    "ADHD", "ASD", "OCD", "PTSD", "AD", "PD", "MCI", "TBI",
    # Stats / methods
    "FFT", "PCA", "ICA", "LDA", "SVM", "GLM", "BIC", "AIC",
    # Time / units / display
    "AM", "PM", "HZ", "MS", "HD", "UHD", "LCD", "OLED",
    # Spatial / shape
    "2D", "3D", "4D",
})


def _cap_word(word: str) -> str:
    """Capitalize a single token, recursing into hyphenated parts."""
    if not word:
        return word
    if "-" in word:
        return "-".join(_cap_word(p) for p in word.split("-"))
    # Python's str.capitalize lowercases the rest, which is what we want
    # for an all-caps source word.  E.g. "WORLD'S" -> "World's".
    return word.capitalize()


def smart_title_case(s: str) -> str:
    """Convert an ALL-CAPS title to title case, preserving common acronyms.

    If the input is already mixed-case (less than 70% of letters uppercase)
    it's returned unchanged — so this is safe to run on schedule overview
    titles that are already typeset correctly.
    """
    if not s or not s.strip():
        return s
    letters = [c for c in s if c.isalpha()]
    if not letters:
        return s
    upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
    if upper_ratio < 0.7:
        return s

    tokens = s.split()
    n = len(tokens)
    out: list[str] = []
    for i, tok in enumerate(tokens):
        m = re.match(r"^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$", tok)
        if not m:
            out.append(tok.lower())
            continue
        prefix, word, suffix = m.groups()
        if not word:
            out.append(tok)
            continue

        upper = word.upper()
        # Acronym: keep as-is in upper form.
        if upper in _TITLE_ACRONYMS:
            out.append(prefix + upper + suffix)
            continue

        # First word of the title or the start of a new clause (the previous
        # token ended in : ! ? .) is always capitalized.
        prev = out[-1].rstrip() if out else ""
        prev_ends_clause = bool(prev) and prev[-1:] in ":!?."
        is_first = i == 0 or prev_ends_clause
        is_last = i == n - 1

        if word.lower() in _TITLE_SMALL_WORDS and not is_first and not is_last:
            out.append(prefix + word.lower() + suffix)
            continue
        out.append(prefix + _cap_word(word.lower()) + suffix)
    return " ".join(out)


# ----- Duplicate-person merging -------------------------------------------
# Common English-language nickname mappings (nick -> canonical full form).
# Used to merge "Tom Smith" with "Thomas Smith" etc. when the surname matches.
_NICKNAMES: dict[str, str] = {}
for _full, _nicks in [
    ("Thomas",     ["Tom", "Tommy"]),
    ("William",    ["Will", "Bill", "Billy"]),
    ("Robert",     ["Bob", "Bobby", "Rob", "Robby"]),
    ("Michael",    ["Mike", "Mick", "Mikey"]),
    ("David",      ["Dave", "Davy"]),
    ("Stephen",    ["Steve", "Stevie"]),
    ("Steven",     ["Steve"]),
    ("Christopher", ["Chris", "Christo"]),
    ("Daniel",     ["Dan", "Danny"]),
    ("James",      ["Jim", "Jimmy", "Jamie"]),
    ("Richard",    ["Rich", "Rick", "Dick"]),
    ("Nicholas",   ["Nick", "Nicky"]),
    ("Andrew",     ["Andy", "Drew"]),
    ("Kenneth",    ["Ken", "Kenny"]),
    ("Samuel",     ["Sam", "Sammy"]),
    ("Peter",      ["Pete"]),
    ("Joseph",     ["Joe", "Joey"]),
    ("Matthew",    ["Matt", "Matty"]),
    ("Anthony",    ["Tony"]),
    ("Benjamin",   ["Ben", "Benny"]),
    ("Edward",     ["Ed", "Eddie", "Ned", "Ted"]),
    ("Theodore",   ["Ted", "Teddy"]),
    ("Charles",    ["Charlie", "Chuck", "Chip"]),
    ("Henry",      ["Hank", "Harry"]),
    ("Jonathan",   ["Jon", "Jonny"]),
    ("Alexander",  ["Alex", "Alec", "Sasha", "Xander"]),
    ("Patrick",    ["Pat", "Paddy"]),
    ("Vincent",    ["Vince", "Vinny"]),
    ("Frederick",  ["Fred", "Freddy"]),
    ("Gregory",    ["Greg"]),
    ("Timothy",    ["Tim", "Timmy"]),
    ("Lawrence",   ["Larry"]),
    ("Russell",    ["Russ"]),
    ("Donald",     ["Don", "Donny"]),
    ("Ronald",     ["Ron", "Ronnie"]),
    ("Jeffrey",    ["Jeff"]),
    ("Bradley",    ["Brad"]),
    ("Cameron",    ["Cam"]),
    ("Joshua",     ["Josh"]),
    ("Jacob",      ["Jake"]),
    ("Zachary",    ["Zach", "Zack"]),
    ("Elizabeth",  ["Liz", "Lizzy", "Beth", "Betty", "Bess", "Eliza", "Betsy"]),
    ("Jennifer",   ["Jen", "Jenny", "Jenn"]),
    ("Susan",      ["Sue", "Suzy", "Susie"]),
    ("Katherine",  ["Kate", "Katie", "Kathy", "Kay"]),
    ("Catherine",  ["Cathy", "Cat"]),
    ("Margaret",   ["Maggie", "Meg", "Peggy", "Marge"]),
    ("Patricia",   ["Patty", "Trish", "Tricia"]),
    ("Rebecca",    ["Becca", "Becky"]),
    ("Stephanie",  ["Steph"]),
    ("Samantha",   ["Sammy"]),
    ("Jessica",    ["Jess", "Jessie"]),
    ("Barbara",    ["Barb", "Barbie"]),
    ("Deborah",    ["Deb", "Debbie", "Debby"]),
    ("Cynthia",    ["Cindy"]),
    ("Pamela",     ["Pam"]),
    ("Victoria",   ["Vicky", "Vic", "Tori"]),
    ("Sarah",      ["Sara"]),
    ("Nicole",     ["Niki", "Nikki"]),
    ("Alexandra",  ["Lexi"]),
    ("Olivia",     ["Liv", "Livvy"]),
]:
    for _n in _nicks:
        _NICKNAMES[_n.lower()] = _full.lower()


def _strip_diacritics(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def _norm_name_part(s: str) -> str:
    """Lowercase, ASCII, treat any non-letter run as a single space.

    This is intentionally aggressive so that "Bat-Sheva" / "Bat Sheva",
    "Hsin-Hung" / "Hsin- Hung", "Zoe (Jing)" / "Zoe(Jing)", and "Shao-Min"
    / "Shao- Min (Sean)" all collapse to the same canonical form.
    """
    s = _strip_diacritics(s).lower()
    s = re.sub(r"[^a-z]+", " ", s).strip()
    return s


def _first_token(s: str) -> str:
    """Return the first-name lookup key.

    Handles initials-style tokens specially: "I.M.", "J.-P.", and "B."
    all collapse to a single-letter form so they're treated as initials
    rather than concatenated multi-letter strings.
    """
    s = _strip_diacritics(s).lower()
    parts = s.split()
    if not parts:
        return ""
    head = parts[0]
    # Initials-style token (contains a period): keep only the first letter.
    if "." in head:
        m = re.search(r"[a-z]", head)
        return m.group(0) if m else ""
    return re.sub(r"[^a-z]", "", head)


def _first_is_compatible(a: str, b: str) -> bool:
    """True if these two first-name strings likely refer to the same person."""
    na = _norm_name_part(a)
    nb = _norm_name_part(b)
    if na == nb:
        return True
    a_tok = _first_token(a)
    b_tok = _first_token(b)
    if not a_tok or not b_tok:
        return False
    if a_tok == b_tok:
        return True
    # Initial vs full name (e.g. "b" matches "bevil")
    if len(a_tok) == 1 and b_tok.startswith(a_tok):
        return True
    if len(b_tok) == 1 and a_tok.startswith(b_tok):
        return True
    # Nickname pair (Tom <-> Thomas, Andy <-> Andrew, etc.)
    canon_a = _NICKNAMES.get(a_tok, a_tok)
    canon_b = _NICKNAMES.get(b_tok, b_tok)
    if canon_a == canon_b:
        return True
    return False


# ---------------------------------------------------------------------------
# Step 6. People registry (shared across all program items).
# ---------------------------------------------------------------------------

class People:
    def __init__(self) -> None:
        self._by_id: OrderedDict[str, dict] = OrderedDict()

    def ref(self, name: str) -> dict:
        """Return {id, name} for a person, registering them if new."""
        clean = re.sub(r"\s+", " ", name).strip().rstrip(",")
        slug = slugify(clean)
        # Disambiguate duplicate slugs.
        candidate = slug
        i = 2
        while candidate in self._by_id and self._by_id[candidate]["display"] != clean:
            candidate = f"{slug}-{i}"
            i += 1
        if candidate not in self._by_id:
            self._by_id[candidate] = {
                "display": clean,
                "name_parts": split_name(clean),
                "prog": [],
                "affils": [],  # ordered, deduplicated
            }
        return {"id": candidate, "name": clean}

    def add_prog(self, person_id: str, prog_id: str) -> None:
        if person_id in self._by_id and prog_id not in self._by_id[person_id]["prog"]:
            self._by_id[person_id]["prog"].append(prog_id)

    def add_affils(self, person_id: str, affils: Iterable[str]) -> None:
        if person_id not in self._by_id:
            return
        existing = self._by_id[person_id]["affils"]
        for a in affils:
            a = a.strip()
            if a and a not in existing:
                existing.append(a)

    def merge_duplicates(self) -> dict[str, str]:
        """Merge likely-duplicate person records.

        Returns a mapping `{old_id: surviving_id}` so callers can update
        cross-references in `program.json`.

        Rules:
          - Same surname (after diacritic/case/punct normalization) AND same
            first initial AND first names are compatible (identical first
            tokens, or one is an initial of the other, or a known nickname
            pair such as Tom/Thomas).
          - For each cluster, the surviving record is the one with the
            longest first-name string (most informative); ties broken by
            most prog refs, then most affils, then earliest registration.
          - The surviving record absorbs prog ids and affiliations from the
            others; the others are removed.
        """
        # Bucket by (normalized surname, first initial)
        buckets: dict[tuple[str, str], list[str]] = defaultdict(list)
        for pid, info in self._by_id.items():
            first, last, _, _ = info["name_parts"]
            last_norm = _norm_name_part(last)
            first_norm = _norm_name_part(first)
            init = first_norm[:1]
            if not last_norm or not init:
                continue
            buckets[(last_norm, init)].append(pid)

        remap: dict[str, str] = {}

        for (last_norm, init), pids in buckets.items():
            if len(pids) < 2:
                continue
            # Greedy clustering using _first_is_compatible.
            clusters: list[list[str]] = []
            for pid in pids:
                first = self._by_id[pid]["name_parts"][0]
                placed = False
                for cluster in clusters:
                    rep_first = self._by_id[cluster[0]]["name_parts"][0]
                    if _first_is_compatible(first, rep_first):
                        cluster.append(pid)
                        placed = True
                        break
                if not placed:
                    clusters.append([pid])
            for cluster in clusters:
                if len(cluster) < 2:
                    continue
                # Pick the surviving record. Prefer:
                #   (1) longest first-name string (most informative spelling),
                #   (2) most prog refs, (3) most affils, (4) earliest id.
                def _cap_score(name_parts: tuple[str, str, str, str]) -> int:
                    """Higher = nicer capitalization (Title Case > all-caps/lower)."""
                    score = 0
                    for tok in (name_parts[0] + " " + name_parts[1]).split():
                        if tok and tok[0].isupper() and not tok.isupper():
                            score += 1
                    return score
                cluster_sorted = sorted(
                    cluster,
                    key=lambda p: (
                        -_cap_score(self._by_id[p]["name_parts"]),
                        -len(self._by_id[p]["name_parts"][0]),
                        -len(self._by_id[p]["prog"]),
                        -len(self._by_id[p]["affils"]),
                        list(self._by_id).index(p),
                    ),
                )
                survivor = cluster_sorted[0]
                for other in cluster_sorted[1:]:
                    o_info = self._by_id[other]
                    s_info = self._by_id[survivor]
                    for prog_id in o_info["prog"]:
                        if prog_id not in s_info["prog"]:
                            s_info["prog"].append(prog_id)
                    for a in o_info["affils"]:
                        if a and a not in s_info["affils"]:
                            s_info["affils"].append(a)
                    remap[other] = survivor
                    del self._by_id[other]
        return remap

    def apply_aliases(self, aliases: dict[str, str]) -> dict[str, str]:
        """Apply a hand-curated `{dup_id: canonical_id}` alias map.

        Each entry merges `dup_id` into `canonical_id` using the same
        absorb-prog-and-affils logic as the auto-merge pass.  Missing ids
        are reported via stderr but never abort the run.

        Returns the actual remap (`{dup_id: surviving_id}`).
        """
        remap: dict[str, str] = {}
        for dup_id, canonical_id in aliases.items():
            if not dup_id or not canonical_id or dup_id == canonical_id:
                continue
            if dup_id not in self._by_id:
                warn(f"alias source id not found: {dup_id!r}")
                continue
            if canonical_id not in self._by_id:
                warn(f"alias target id not found: {canonical_id!r}")
                continue
            d_info = self._by_id[dup_id]
            c_info = self._by_id[canonical_id]
            for prog_id in d_info["prog"]:
                if prog_id not in c_info["prog"]:
                    c_info["prog"].append(prog_id)
            for a in d_info["affils"]:
                if a and a not in c_info["affils"]:
                    c_info["affils"].append(a)
            del self._by_id[dup_id]
            remap[dup_id] = canonical_id
        return remap

    def display(self, person_id: str) -> str:
        """Return the canonical display name for a (possibly merged) id."""
        info = self._by_id.get(person_id)
        return info["display"] if info else ""

    def to_konopas(self) -> list[dict]:
        out = []
        for pid, info in self._by_id.items():
            first, last, prefix, suffix = info["name_parts"]
            out.append({
                "id": pid,
                "name": [first, last, prefix, suffix],
                "tags": list(info["affils"]),
                "prog": info["prog"],
                "links": {},
                "bio": "",
            })
        return out


def split_name(full: str) -> tuple[str, str, str, str]:
    """Best-effort '[first, last, prefix, suffix]' as konopas wants it."""
    s = full.strip()
    suffix = ""
    sm = re.search(r",\s*(Jr\.?|Sr\.?|II|III|IV|PhD|Ph\.D\.?|MD)\s*$", s)
    if sm:
        suffix = sm.group(1)
        s = s[: sm.start()].rstrip(",")
    prefix = ""
    pm = re.match(r"^(Dr\.?|Prof\.?|Sir|Dame)\s+(.*)$", s)
    if pm:
        prefix = pm.group(1)
        s = pm.group(2)
    parts = s.split()
    if len(parts) == 1:
        return parts[0], "", prefix, suffix
    if len(parts) == 0:
        return "", "", prefix, suffix
    return " ".join(parts[:-1]), parts[-1], prefix, suffix


people = People()


# ---------------------------------------------------------------------------
# Step 7. Block-level abstract iterators.
# ---------------------------------------------------------------------------

@dataclass
class Abstract:
    id: str
    title: str
    authors: list[str]
    affils: list[str]
    body: str
    track: str = ""
    kind: str = ""  # "symposium", "talk", "poster"
    date: str = ""
    time: str = ""
    mins: int = 0
    room: str = ""
    # Per-author affiliation indices (parallel to `authors`).  When present,
    # author_indices[i] holds the list of affil-index strings for authors[i].
    author_indices: list[list[str]] = field(default_factory=list)
    # For child items, the start time of the parent session (HH:MM).  Used
    # to look up the schedule overview row this item belongs to.  May differ
    # from `time` for talk-session talks (which have their own start times).
    parent_session_time: str = ""
    # Explicit parent override.  If set, abstract_to_program uses this id
    # directly as the `parent:<id>` tag instead of looking up via the
    # date+time+room session_lookup.  Used for posters whose direct parent
    # is a poster-topic item (which itself is a child of the sched row).
    parent_id_explicit: str = ""


def split_at_caps_boundary(s: str) -> tuple[str, str]:
    """Split a fused 'TITLE WORDS AuthorName LastName1; ...' line.

    Walks tokens left-to-right.  Allows up to two leading 1-2 character
    lowercase fragments (column-reorder noise like "g", "ng", "n").  Then
    keeps ALL-uppercase tokens (or numeric / punctuation-only tokens) as
    title.  The first mixed-case word starts the author segment.

    Returns (title_part, author_part); either may be "".  If no transition is
    found the function returns (s, "") so the caller can leave the line
    untouched.
    """
    tokens = s.split()
    title_tokens: list[str] = []
    i = 0
    skipped = 0
    # Step 1 - eat up to 2 short lowercase fragments at the front.
    while i < len(tokens) and skipped < 2:
        tok = tokens[i]
        letters = [c for c in tok if c.isalpha()]
        if letters and len(letters) <= 2 and not all(c.isupper() for c in letters):
            # Only skip if the next token is all-uppercase (i.e. we're really
            # looking at a fused title and not a normal mixed-case author).
            if i + 1 < len(tokens):
                next_letters = [c for c in tokens[i + 1] if c.isalpha()]
                if next_letters and all(c.isupper() for c in next_letters):
                    i += 1
                    skipped += 1
                    continue
        break
    # Step 2 - collect title tokens.
    while i < len(tokens):
        tok = tokens[i]
        letters = [c for c in tok if c.isalpha()]
        if letters and not all(c.isupper() for c in letters):
            break
        title_tokens.append(tok)
        i += 1
    if not title_tokens or i >= len(tokens):
        return s, ""
    return " ".join(title_tokens), " ".join(tokens[i:])


_AFFIL_KEYWORDS = (
    "University", "Universit", "Institute", "Institut", "Department",
    "School", "Center", "Centre", "Laboratory", "Lab,", "Hospital",
    "College", "Faculty", "Division", "Academy", "Inc.", "Ltd", "GmbH",
    "Corp.", "Foundation", "Research", "Universidad", "Università",
    "Universiteit", "Universidade", "Hochschule",
)


def _looks_titley(line: str) -> bool:
    """Returns True if the line looks like part of an ALL-CAPS title block."""
    s = line.strip()
    if not s:
        return False
    letters = [c for c in s if c.isalpha()]
    if not letters:
        return False  # no letters - column-reorder fragment, not a title
    upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
    return upper_ratio >= 0.7


def _looks_affil(line: str) -> bool:
    """True if the line looks like an affiliation row or its continuation."""
    s = line.strip()
    if not s:
        return False
    if s[0].isdigit():
        return True  # numbered affil marker like '1Cognitive Clinical...'
    if any(k in s for k in _AFFIL_KEYWORDS):
        return True
    # A continuation tail (e.g. 'Beijing, China') is short and full of commas.
    if len(s) < 60 and s.count(",") >= 1 and "." not in s:
        return True
    return False


def _looks_bodyish(line: str) -> bool:
    """True if the line looks like the start of a normal sentence."""
    s = line.strip()
    if len(s) < 40:
        return False
    if s[0].isdigit():
        return False
    if not s[0].isupper():
        return False
    if _looks_affil(s):
        return False
    letters = [c for c in s if c.isalpha()]
    if not letters:
        return False
    lower_ratio = sum(1 for c in letters if c.islower()) / len(letters)
    return lower_ratio >= 0.6


def parse_talk_block(lines: list[str]) -> tuple[str, str, list[str]]:
    """Split a talk's text into (title, authors_line, body_lines).

    Strategy
    --------
    1. Locate the first line that contains a ';'.  That ';' separates author
       names from affiliation text - but column-reorder may have parked it on
       its own line, with the actual author names on PREVIOUS lines and the
       affiliations on NEXT lines.
    2. Walk BACK from the ';' line to find the start of the authors block:
       stop at a blank line or at a line that looks like the title (>=70%
       uppercase).
    3. Walk FORWARD past the ';' line to absorb affiliation continuations,
       which start with digits or short tokens.  Stop at a blank line or a
       sentence-shaped body line.
    4. Concatenate the resulting span as authors_line.  If the LAST title
       line has a CAPS->mixed transition (the "MONKEY AVATARS WITH NATURALISTIC
       MOTION Lucas Martini" pattern), peel the mixed-case tail back into
       authors_line.
    """
    # Find the first ';' line that's NOT all-uppercase.  Some posters use a
    # stylistic 'TITLE; SUBTITLE' pattern where the ';' lands inside the title
    # itself; the real author/affil ';' is on a later mixed-case line.
    #
    # Cap the search at ~10 non-empty lines: if the abstract has no proper
    # author/affil line, deeper ';' occurrences (e.g. inside a citation or
    # mid-sentence body text) shouldn't be promoted to "the author line".
    sem_idx = -1
    nonempty_seen = 0
    for i, line in enumerate(lines):
        s = line.strip()
        if not s:
            continue
        nonempty_seen += 1
        if nonempty_seen > 10:
            break
        if ";" not in s:
            continue
        letters = [c for c in s if c.isalpha()]
        if letters:
            upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
            if upper_ratio >= 0.7:
                continue
        sem_idx = i
        break
    if sem_idx == -1:
        return " ".join(l.strip() for l in lines if l.strip()), "", []

    # Walk back to find the start of the authors block.  pdftotext sometimes
    # inserts a SINGLE blank line in the middle of an author block (visible
    # at e.g. abstract 56.306, where "...Angela" / "" / "Shen1, ..." is the
    # rendered structure), so allow one blank line through before treating a
    # blank as a real boundary.
    auth_start = sem_idx
    seen_blank = False
    while auth_start > 0:
        prev = lines[auth_start - 1]
        if not prev.strip():
            if seen_blank:
                break
            seen_blank = True
            auth_start -= 1
            continue
        if _looks_titley(prev):
            break
        auth_start -= 1
        if sem_idx - auth_start > 14:  # safety
            break

    # Walk forward through affiliation continuation lines.  Same single-
    # blank-line tolerance applies; affil text occasionally wraps past a
    # blank in the layout output.
    auth_end = sem_idx + 1
    seen_blank_fwd = False

    # When the affiliation line wraps mid-name ("...; 1University of\nRochester"),
    # the trailing fragment ("Rochester") is short and has no commas or
    # affil keywords, so _looks_affil rejects it and we'd cut the
    # institution name in half.  If the previous line ended on a small
    # connector word (of/the/for/and/&/at), accept the next short line as
    # a continuation regardless of the usual heuristics.
    _DANGLE_TAIL_WORDS = frozenset(
        ("of", "the", "for", "and", "&", "at", "in", "de", "la", "y")
    )

    def _ends_dangling(prev_line: str) -> bool:
        ps = prev_line.strip()
        if not ps:
            return False
        # A trailing comma signals the affil-string continues onto the
        # next line — and that "next line" is sometimes a single word
        # like "Davis" or "Rochester" that no other heuristic catches.
        if ps.endswith(","):
            return True
        ps2 = ps.rstrip(",;. ")
        toks = ps2.rsplit(None, 1)
        if not toks:
            return False
        last = toks[-1].lower()
        return last in _DANGLE_TAIL_WORDS

    def _last_nonempty_before(idx: int) -> str:
        """Return the most recent non-empty line at or before `idx-1`."""
        j = idx - 1
        while j >= 0 and not lines[j].strip():
            j -= 1
        return lines[j] if j >= 0 else ""

    while auth_end < len(lines):
        line = lines[auth_end]
        s = line.strip()
        if not s:
            # Permit additional blanks if the affil string is mid-name
            # (previous non-empty line ended with a connector word or a
            # trailing comma).  Some abstracts have 3-4 blank lines
            # injected by column-reorder between an affil's first and
            # second halves.
            if _ends_dangling(_last_nonempty_before(auth_end)):
                auth_end += 1
                if auth_end - sem_idx > 20:
                    break
                continue
            if seen_blank_fwd:
                break
            seen_blank_fwd = True
            auth_end += 1
            continue
        # Dangling continuation overrides the body/affil checks: a real
        # sentence rarely ends mid-word with a connector like
        # "of"/"the"/"for"/"and" or with a trailing comma, so when the
        # previous non-empty line ends that way we absorb the next
        # short line as the institution-name tail.  Cap at ~120 chars
        # to avoid swallowing a wrapped paragraph.
        if _ends_dangling(_last_nonempty_before(auth_end)) and len(s) < 120:
            auth_end += 1
            if auth_end - sem_idx > 20:
                break
            continue
        if _looks_bodyish(s):
            break
        if not _looks_affil(s):
            break
        auth_end += 1
        if auth_end - sem_idx > 20:
            break

    title_lines = [l.strip() for l in lines[:auth_start] if l.strip()]
    auth_lines = [l.strip() for l in lines[auth_start:auth_end] if l.strip()]
    body_lines = lines[auth_end:]
    authors_line = " ".join(auth_lines)

    # Title-author fusion on the LAST title line (e.g. "...NETWORK Vasiliki").
    if title_lines:
        last = title_lines[-1]
        letters = [c for c in last if c.isalpha()]
        if letters:
            upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
            if upper_ratio < 0.95:
                t_part, a_part = split_at_caps_boundary(last)
                if a_part:
                    title_lines[-1] = t_part
                    authors_line = (a_part + " " + authors_line).strip()

    title = " ".join(title_lines)
    title = re.sub(r"\s+", " ", title).strip()
    return title, authors_line, body_lines


def normalize_paragraph(lines: Iterable[str]) -> str:
    """Join wrapped lines into paragraphs separated by blank-line gaps."""
    paras: list[str] = []
    cur: list[str] = []
    for line in lines:
        s = line.rstrip()
        if not s.strip():
            if cur:
                paras.append(" ".join(cur))
                cur = []
            continue
        cur.append(s.strip())
    if cur:
        paras.append(" ".join(cur))
    out: list[str] = []
    for p in paras:
        # Glue hyphenation: "fronto-\nparietal" -> "fronto-parietal" (already
        # joined by space above, so collapse "- " in the middle of words).
        p = re.sub(r"(\w)-\s+(\w)", r"\1\2", p)
        p = re.sub(r"\s+", " ", p).strip()
        out.append(p)
    return "\n".join(out)


# ---------------------------------------------------------------------------
# Step 8a. Symposium parser.
# ---------------------------------------------------------------------------

# NOTE: column-reordered text often fractures the header across several lines
# and may inject 1–2-character stray fragments (e.g. "e", "r", "ight") between
# the year comma and the time range. We tolerate up to 200 chars of such junk
# in the gap and ignore line-anchoring entirely.
SYMP_HEADER_RE = re.compile(
    r"SYMPOSIUM:\s+(?P<day>\w+),\s+(?P<month>\w+)\s+(?P<dom>\d+),\s+"
    r"(?P<year>\d{4}),[\s\S]{0,200}?"
    r"(?P<sh>\d{1,2}):(?P<sm>\d{2})\s*(?P<sa>AM|PM)?\s*[\s\S]{0,40}?[-–]\s*[\s\S]{0,40}?"
    r"(?P<eh>\d{1,2}):(?P<em>\d{2})\s*(?P<ampm>AM|PM)\s*,\s*(?P<room>[^\n]+)",
    re.IGNORECASE,
)
TALK_MARK_RE = re.compile(r"^TALK\s+(\d+)\s*$")


# Per-symposium talk overrides.  The booklet doesn't print individual talk
# durations or staggered start times, so by default symposium talks all
# inherit the symposium's start time and emit with mins=0.  Add entries
# here for symposia that have a known structure.
#
# Each value is a dict with optional keys:
#   "mins":  per-talk duration in minutes (also used as the stagger step
#            so successive talks start at start + i*mins)
#   "start": HH:MM start time of the FIRST talk (defaults to the
#            symposium start when omitted)
#
# Keys are substrings matched against the symposium title, case-insensitive.
_SYMPOSIUM_TALK_OVERRIDES: dict[str, dict] = {
    "Intuitive physical reasoning in brains": {"mins": 23},
    "Rhythms of vision":                      {"mins": 20},
    "What makes a task naturalistic":         {"mins": 17, "start": "10:33"},
    "Reimagining the binding problem":        {"mins": 20},
    "Beyond Prediction":                      {"mins": 20},
    "The quest for 'the average person'":     {"mins": 20},
}


def _symposium_override(sym_title: str) -> dict:
    t = (sym_title or "").lower()
    for keyword, cfg in _SYMPOSIUM_TALK_OVERRIDES.items():
        if keyword.lower() in t:
            return cfg
    return {}


def iter_symposia(text: str) -> Iterable[Abstract]:
    blocks = re.split(r"(?=^SYMPOSIUM:)", text, flags=re.MULTILINE)
    for blk in blocks:
        if not blk.lstrip().startswith("SYMPOSIUM:"):
            continue
        m = SYMP_HEADER_RE.search(blk)
        if not m:
            warn("symposium header not parsed:", blk[:120].replace("\n", " | "))
            continue
        try:
            date = fmt_date(m.group("month"), int(m.group("dom")), int(m.group("year")))
        except KeyError:
            warn("unknown month in symposium header:", m.group("month"))
            continue
        sh = int(m.group("sh")); sm_ = int(m.group("sm"))
        eh = int(m.group("eh")); em_ = int(m.group("em"))
        ampm = m.group("ampm").upper()
        sa = (m.group("sa") or "").upper()  # explicit start AM/PM, may be empty
        # End AM/PM is always present.
        if ampm == "PM" and eh != 12:
            eh += 12
        elif ampm == "AM" and eh == 12:
            eh = 0
        # Now apply start AM/PM: explicit if given, otherwise inherit such that
        # start <= end within the same day.
        if sa == "PM" and sh != 12:
            sh += 12
        elif sa == "AM" and sh == 12:
            sh = 0
        elif not sa:
            # Inherit end's AM/PM only if doing so keeps start <= end.
            cand_sh = sh + 12 if (ampm == "PM" and sh != 12) else sh
            if cand_sh * 60 + sm_ <= eh * 60 + em_:
                sh = cand_sh
        if eh * 60 + em_ < sh * 60 + sm_:
            eh += 12
        start_t = (sh, sm_)
        end_t = (eh, em_)
        room = m.group("room").strip()

        body_after_header = blk[m.end():].lstrip("\n")
        # Title runs until "Organizers:" line.
        org_idx = body_after_header.find("\nOrganizers:")
        if org_idx == -1:
            org_idx = body_after_header.find("Organizers:")
        if org_idx == -1:
            warn("symp without Organizers: line at", blk[:80])
            continue
        sym_title = re.sub(r"\s+", " ", body_after_header[:org_idx]).strip()
        rest = body_after_header[org_idx:]

        # Identify the start of the first TALK block.
        talk_split = re.split(r"^TALK\s+(\d+)\s*$", rest, flags=re.MULTILINE)
        # talk_split = [overview_text, '1', talk1_body, '2', talk2_body, ...]
        overview_text = talk_split[0]
        # Stop at the next labelled section ("Presenters:" / "Organizers:")
        # or at a blank line — but NOT at any `\nA-Z` line, since presenters
        # often wrap mid-name onto a continuation line that starts with a
        # capitalized surname (e.g. "Luca\nRonconi", "Caroline\nRobertson").
        # Read Organizers/Presenters as multi-line lists.  Each list extends
        # across line breaks (and possibly a stray blank line that the column
        # reorder lost) until we hit a line that LOOKS LIKE BODY TEXT (rich
        # in function words like "the", "of", "in", "is").  This handles all
        # of:
        #   * Single-line lists ("Presenters: A, B, C")
        #   * Lists wrapping with a trailing comma ("...A,\n B, C")
        #   * Lists wrapping a single name ("Luca\nRonconi")
        #   * Nested labelled section / blank line / next overview paragraph.
        _BODY_WORDS = frozenset({
            "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "by",
            "for", "with", "from", "is", "are", "was", "were", "has", "have",
            "had", "be", "been", "being", "do", "does", "did", "this", "that",
            "these", "those", "it", "they", "them", "we", "us", "our", "as",
            "but", "not", "than", "into", "onto", "within", "between",
        })

        def _looks_body_line(s: str) -> bool:
            words = [w.lower().strip(".,;:!?()[]") for w in s.split()]
            words = [w for w in words if w]
            if not words:
                return False
            body_count = sum(1 for w in words if w in _BODY_WORDS)
            return body_count >= 2

        def _read_label_value(text: str, label: str) -> tuple[str, int]:
            m = re.search(rf"\b{label}:\s*", text)
            if not m:
                return "", 0
            pos = m.end()
            collected: list[str] = []
            while pos < len(text):
                nl = text.find("\n", pos)
                if nl == -1:
                    line = text[pos:]
                    new_pos = len(text)
                else:
                    line = text[pos:nl]
                    new_pos = nl + 1
                stripped = line.strip()
                if not stripped:
                    pos = new_pos
                    if not collected:
                        continue
                    # We've already collected some text and now hit a blank.
                    # Allow it ONLY if the next non-blank line still looks
                    # like a names list (not body).
                    peek = pos
                    while peek < len(text):
                        pnl = text.find("\n", peek)
                        pline = text[peek:pnl] if pnl != -1 else text[peek:]
                        ps = pline.strip()
                        if ps:
                            if _looks_body_line(ps) or re.match(
                                r"(Organizers|Presenters|Discussant)s?:", ps):
                                return " ".join(collected), pos
                            break
                        peek = pnl + 1 if pnl != -1 else len(text)
                    continue
                if re.match(r"(Organizers|Presenters|Discussant)s?:", stripped):
                    break
                if _looks_body_line(stripped):
                    break
                collected.append(stripped)
                pos = new_pos
            return " ".join(collected), pos

        organizers_txt, organizers_end = _read_label_value(overview_text, "Organizers")
        presenters_txt, presenters_end = _read_label_value(overview_text, "Presenters")

        # Strip the Organizers/Presenters preamble from overview to leave the description.
        desc_start = max(organizers_end, presenters_end, 0)
        desc_lines = overview_text[desc_start:].split("\n")
        sym_desc = normalize_paragraph(desc_lines)

        # Emit the symposium itself as one item (the umbrella session).
        # NOTE: the room slug must be long enough to disambiguate parallel
        # rooms.  "Talk Room 1" and "Talk Room 2" both slugify to start
        # with "talk-r", so an over-eager `[:6]` truncation makes the
        # sym_id identical for two symposia at the same date+time in
        # different rooms — and then every talk inside them collides too.
        # Use the full slug (typically <20 chars) to guarantee uniqueness.
        sym_id = f"symp-{date}-{fmt_time(start_t).replace(':','')}-{slugify(room)}"
        # Organizers/Presenters: extract names with affiliation indices when
        # there's a ';' tail; presenters lines typically don't have affils.
        sym_authors: list[str] = []
        sym_author_idx: list[list[str]] = []
        sym_affils: list[str] = []
        if ";" in organizers_txt:
            org_pairs, org_affs = parse_authors_line(organizers_txt)
            sym_affils.extend(org_affs)
            for n, idxs in org_pairs:
                if n:
                    sym_authors.append(n)
                    sym_author_idx.append(idxs)
        else:
            for tok in re.split(r",", organizers_txt):
                name, _ = clean_author_token(tok)
                if name:
                    sym_authors.append(name)
                    sym_author_idx.append([])
        for tok in re.split(r",", presenters_txt.split(";", 1)[0]):
            name, _ = clean_author_token(tok)
            if name and name not in sym_authors:
                sym_authors.append(name)
                sym_author_idx.append([])
        # Dedup keep order
        seen = set()
        sym_authors = [a for a in sym_authors if not (a in seen or seen.add(a))]
        yield Abstract(
            id=sym_id, title=sym_title, authors=sym_authors,
            affils=sym_affils, author_indices=sym_author_idx,
            body=sym_desc, track="Symposium",
            kind="symposium", date=date, time=fmt_time(start_t),
            mins=((eh - sh) * 60 + (em_ - sm_)) or 0,
            room=room,
        )

        # Now each individual talk in the symposium.
        n_talks = (len(talk_split) - 1) // 2
        # Per-symposium overrides for talk durations / staggered start times.
        # When `mins` > 0 we stagger talks so talk_i starts at first_start +
        # i*mins.  Both default to "inherit symposium start, mins=0".
        override = _symposium_override(sym_title)
        talk_mins = int(override.get("mins", 0))
        first_start_str = override.get("start") or fmt_time(start_t)
        try:
            base_h, base_m = (int(x) for x in first_start_str.split(":"))
        except ValueError:
            base_h, base_m = start_t
        base_minutes = base_h * 60 + base_m
        for i in range(n_talks):
            num = talk_split[1 + 2 * i]
            body = talk_split[2 + 2 * i]
            lines = body.split("\n")
            title, authors_line, body_lines = parse_talk_block(lines)
            authors_w_idx, affils = parse_authors_line(authors_line)
            authors = [n for n, _ in authors_w_idx]
            indices = [idx for _, idx in authors_w_idx]
            body_text = normalize_paragraph(body_lines)
            if talk_mins > 0:
                t_total = base_minutes + i * talk_mins
                t_h, t_m = divmod(t_total, 60)
                talk_time = f"{t_h:02d}:{t_m:02d}"
            else:
                talk_time = fmt_time(start_t)
            yield Abstract(
                id=f"{sym_id}.t{int(num):02d}",
                title=title, authors=authors, affils=affils,
                author_indices=indices,
                body=body_text, track="Symposium",
                kind="symposium-talk", date=date, time=talk_time,
                # Per-talk durations aren't printed in the booklet — leave
                # mins=0 unless the symposium has an explicit override.
                mins=talk_mins, room=room,
                parent_session_time=fmt_time(start_t),
            )


# ---------------------------------------------------------------------------
# Step 8b. Talk Session parser.
# ---------------------------------------------------------------------------

TALK_SESS_HEADER_RE = re.compile(
    r"TALK\s+SESSION:\s+(?P<day>\w+),\s+(?P<month>\w+)\s+(?P<dom>\d+),\s+"
    r"(?P<year>\d{4}),[\s\S]{0,200}?"
    r"(?P<sh>\d{1,2}):(?P<sm>\d{2})\s*(?P<sa>AM|PM)?\s*[\s\S]{0,40}?[-–]\s*[\s\S]{0,40}?"
    r"(?P<eh>\d{1,2}):(?P<em>\d{2})\s*(?P<ampm>AM|PM)\s*,\s*(?P<room>[^\n]+)",
    re.IGNORECASE,
)
TALK_INSESSION_RE = re.compile(
    r"^TALK\s+(?P<n>\d+),\s+(?P<time>\d{1,2}:\d{2}\s*(?:AM|PM)?),\s+"
    r"(?P<id>\d+\.\d+[A-Za-z]?)\s*$",
    re.IGNORECASE,
)


def iter_talk_sessions(text: str) -> Iterable[Abstract]:
    blocks = re.split(r"(?=^TALK SESSION:)", text, flags=re.MULTILINE)
    for blk in blocks:
        if not blk.lstrip().startswith("TALK SESSION:"):
            continue
        m = TALK_SESS_HEADER_RE.search(blk)
        if not m:
            warn("talk session header not parsed:",
                 blk[:120].replace("\n", " | "))
            continue
        try:
            date = fmt_date(m.group("month"), int(m.group("dom")),
                            int(m.group("year")))
        except KeyError:
            continue
        sh = int(m.group("sh")); sm_ = int(m.group("sm") or 0)
        eh = int(m.group("eh")); em_ = int(m.group("em"))
        ampm = m.group("ampm").upper()
        sa = (m.group("sa") or "").upper()
        if ampm == "PM" and eh != 12:
            eh += 12
        elif ampm == "AM" and eh == 12:
            eh = 0
        if sa == "PM" and sh != 12:
            sh += 12
        elif sa == "AM" and sh == 12:
            sh = 0
        elif not sa:
            cand_sh = sh + 12 if (ampm == "PM" and sh != 12) else sh
            if cand_sh * 60 + sm_ <= eh * 60 + em_:
                sh = cand_sh
        if eh * 60 + em_ < sh * 60 + sm_:
            eh += 12
        room = m.group("room").strip()

        rest = blk[m.end():].lstrip("\n")
        # The session topic is the first plausible-looking line.  Skip stray
        # short fragments (column-reorder noise like "ual.", "r", "ight").
        def looks_like_topic(s: str) -> bool:
            s = s.strip()
            if len(s) < 5:
                return False
            # A real topic line has at least one space-separated word longer
            # than 3 chars and isn't a TALK marker.
            if s.startswith("TALK ") or s.startswith("Moderator"):
                return False
            return any(len(w) > 3 for w in s.split())
        rest_lines = rest.split("\n")
        topic_line = ""
        idx = 0
        while idx < len(rest_lines):
            cand = rest_lines[idx].strip()
            if not cand:
                idx += 1
                continue
            if looks_like_topic(cand):
                topic_line = cand
                idx += 1
                break
            idx += 1
        # Optional Moderator line(s).
        moderator = ""
        while idx < len(rest_lines):
            ln = rest_lines[idx].strip()
            if not ln:
                idx += 1
                continue
            if ln.startswith("Moderator"):
                moderator = ln.split(":", 1)[-1].strip()
                idx += 1
                continue
            break

        # Slice into individual talks.
        body_text = "\n".join(rest_lines[idx:])
        talk_split = re.split(
            r"^TALK\s+\d+,\s+\d{1,2}:\d{2}\s*(?:AM|PM)?,\s+\d+\.\d+[A-Za-z]?\s*$",
            body_text, flags=re.MULTILINE | re.IGNORECASE,
        )
        markers = re.findall(
            r"^TALK\s+(\d+),\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?),\s+(\d+\.\d+[A-Za-z]?)\s*$",
            body_text, flags=re.MULTILINE | re.IGNORECASE,
        )
        # talk_split[0] is text before the first TALK marker (probably empty).
        for marker, talk_body in zip(markers, talk_split[1:]):
            n_str, time_str, abs_id = marker
            t_hm = normalize_time(time_str)
            if t_hm is None:
                t_hm = (sh, sm_)
            # PM/AM inheritance: if no am/pm given, inherit session's ampm.
            if "am" not in time_str.lower() and "pm" not in time_str.lower():
                if ampm == "PM" and t_hm[0] < 12 and t_hm[0] >= 8:
                    # only push to PM if it makes the time inside session window
                    pm = (t_hm[0] + 12, t_hm[1])
                    if (sh, sm_) <= pm <= (eh, em_):
                        t_hm = pm
                elif ampm == "PM" and t_hm[0] < 8:
                    t_hm = (t_hm[0] + 12, t_hm[1])

            lines = talk_body.split("\n")
            title, authors_line, body_lines = parse_talk_block(lines)
            authors_w_idx, affils = parse_authors_line(authors_line)
            authors = [n for n, _ in authors_w_idx]
            indices = [idx for _, idx in authors_w_idx]
            body_text2 = normalize_paragraph(body_lines)
            yield Abstract(
                id=abs_id,
                title=title, authors=authors, affils=affils,
                author_indices=indices,
                body=body_text2,
                track=topic_line, kind="talk",
                date=date, time=fmt_time(t_hm),
                # Per-talk durations aren't printed in the booklet; default
                # to 15 minutes so the schedule UI has a reasonable block.
                mins=15,
                room=room,
                parent_session_time=fmt_time((sh, sm_)),
            )

        # Also emit the talk SESSION as its own item (umbrella).
        # Use the full room slug to avoid collisions between rooms whose
        # names share a prefix (e.g. "Talk Room 1" vs "Talk Room 2",
        # both starting with "talk-r").
        yield Abstract(
            id=f"talksess-{date}-{fmt_time((sh,sm_)).replace(':','')}-{slugify(room)}",
            title=topic_line, authors=[a.strip() for a in moderator.split(",") if a.strip()][:1],
            affils=[], body=f"Moderator: {moderator}" if moderator else "",
            track="Talk Session", kind="talk-session",
            date=date, time=fmt_time((sh, sm_)),
            mins=((eh - sh) * 60 + (em_ - sm_)),
            room=room,
        )


# ---------------------------------------------------------------------------
# Step 8c. Poster Session parser.
# ---------------------------------------------------------------------------

POSTER_SESS_HEADER_RE = re.compile(
    r"^(?P<day>\w+),\s+(?P<month>\w+)\s+(?P<dom>\d+),\s+"
    r"(?P<sh>\d{1,2}):(?P<sm>\d{2})\s*(?P<sa>AM|PM)?\s*[-–]\s*"
    r"(?P<eh>\d{1,2}):(?P<em>\d{2})\s*(?P<ampm>AM|PM)"
    # Room is optional (wraps onto a continuation line on some pages).  The
    # comma between PM and the room is NOT optional in the source, but when
    # the room wraps off the line we still see a dangling trailing comma —
    # so accept either form: ", ROOM" or trailing ",".
    r"(?:\s*,\s*(?P<room>.+?))?\s*,?\s*$",
    re.MULTILINE | re.IGNORECASE,
)
POSTER_TOPIC_HEADER_RE = re.compile(
    r"^(?P<day>FRIDAY|SATURDAY|SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY)\s+"
    r"(?P<period>MORNING|AFTERNOON)\s+POSTERS\s+IN\s+(?P<room>[A-Z ]+?)\s*$",
    re.MULTILINE | re.IGNORECASE,
)
POSTER_ABS_RE = re.compile(
    r"^(?P<id>\d+\.\d+[A-Za-z]?)\s+(?P<rest>.+)$"
)


# Header lines whose room name might wrap onto the next line:
# (a) topic header with no room yet ("FRIDAY MORNING POSTERS IN")
# (b) topic header with a partial room word ("FRIDAY MORNING POSTERS IN BANYAN")
# (c) session header with no room ("FRIDAY, MAY 15, 3:45 – 6:00 PM,")
# (d) session header with a partial room word ("FRIDAY, MAY 15, 3:45 – 6:00 PM, BANYAN")
_TOPIC_HEAD_RE = re.compile(
    r"^(FRIDAY|SATURDAY|SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY)\s+"
    r"(MORNING|AFTERNOON)\s+POSTERS\s+IN(?:\s+([A-Z][A-Z ]*))?\s*$",
    re.IGNORECASE,
)
_SESS_HEAD_RE = re.compile(
    r"^\w+,\s+\w+\s+\d+,\s+\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[-–]\s*"
    r"\d{1,2}:\d{2}\s*(?:AM|PM)\s*,(?:\s+([A-Z][A-Z ]*))?\s*$",
    re.IGNORECASE,
)
_ROOM_CONT_RE = re.compile(r"^[A-Z][A-Z ]*$")
# Multi-word rooms whose second word may wrap onto a continuation line.
_KNOWN_ROOM_HEADS = frozenset(s.upper() for s in (
    "Banyan",  # -> Banyan Breezeway
    "Garden",  # -> Garden Courtyard
    "Talk",    # -> Talk Room
    "Grand",   # -> Grand Palm Colonnade
    "Royal",   # -> Royal Tern
    "Spotted", # -> Spotted Curlew
    "Snowy",   # -> Snowy Egret
    "Horizons", # -> Horizons West
    "Blue",    # -> Blue Heron
    "Palm",    # -> Palm/Sabal/Sawgrass
    "Pirate",  # -> Pirate Island
    "RumFish", # -> RumFish Beach
))


_FUNDING_PREFIXES = frozenset({
    "NIH", "NSF", "NEI", "NIMH", "NINDS", "NICHD", "NIDA", "NIA", "NEYE",
    "BBSRC", "EPSRC", "STFC", "MRC", "ERC", "EU", "DFG", "JSPS", "JST",
    "CIHR", "NSERC", "FRQNT", "FRQS", "FRQSC", "MEXT", "MOST", "NSFC",
    "ONR", "ARO", "AFOSR", "DARPA", "NRF", "BRAINS", "ANR", "FCT",
    "Templeton", "Wellcome", "Simons", "Sloan", "Vision",
})


def _looks_funding(s: str) -> bool:
    """Detect grant / acknowledgement lines that shouldn't be confused
    with topic names when walking back from a poster session header."""
    s = s.strip()
    if not s:
        return False
    first = s.split()[0] if s.split() else ""
    if first in _FUNDING_PREFIXES:
        return True
    # Grant codes: "R01", "1R01...", "U01...", "K99...", "T32...".
    if re.match(r"^[1-9]?[A-Z]\d{2,}[A-Z]{0,4}\d+", first):
        return True
    # "This work was supported by" / "Funded by" / "We thank" / etc.
    if re.match(
        r"(?i)^(this\s+(work|research|study|project)|"
        r"funded\s+by|supported\s+by|"
        r"acknowled[gem]+|we\s+(thank|acknowledge))",
        s,
    ):
        return True
    # Lines that are dominated by uppercase and digit codes (grant IDs).
    letters = [c for c in s if c.isalpha()]
    if letters and len(s) <= 80:
        upper = sum(1 for c in letters if c.isupper())
        digits = sum(1 for c in s if c.isdigit())
        if (upper / len(letters)) >= 0.7 and digits >= 2:
            return True
    return False


def _join_wrapped_headers(lines: list[str]) -> list[str]:
    """Join poster-section headers whose room name wraps onto the next
    non-empty line.  Handles four patterns:
      (a) "SATURDAY MORNING POSTERS IN" + (next line) "PAVILION"
      (b) "SATURDAY MORNING POSTERS IN BANYAN" + (next) "BREEZEWAY"
      (c) "SATURDAY, MAY 16, 8:30 AM – 12:30 PM," + (next) "PAVILION"
      (d) "SATURDAY, MAY 16, 8:30 AM – 12:30 PM, BANYAN" + (next) "BREEZEWAY"
    Returns a new line list with the joins applied."""
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        s = line.strip()
        m_topic = _TOPIC_HEAD_RE.match(s)
        m_sess = _SESS_HEAD_RE.match(s)
        if m_topic or m_sess:
            partial_room = (m_topic.group(3) if m_topic else m_sess.group(1)) if (m_topic or m_sess) else None
            partial_room = (partial_room or "").strip().upper()
            # Need a continuation if the room is empty OR is a known
            # multi-word-room first-word.
            needs_continuation = (
                not partial_room or partial_room in _KNOWN_ROOM_HEADS
            )
            if needs_continuation:
                j = i + 1
                while j < len(lines) and not lines[j].strip():
                    j += 1
                if j < len(lines):
                    cont = lines[j].strip()
                    if _ROOM_CONT_RE.match(cont) and len(cont) <= 30:
                        out.append(s + " " + cont)
                        i = j + 1
                        continue
        out.append(line)
        i += 1
    return out


def iter_posters(text: str, expected_topics: Optional[set[str]] = None) -> Iterable[Abstract]:
    """Walk poster-session text emitting one Abstract per numbered poster.

    Each repeat of POSTER_SESS_HEADER_RE marks a new TOPIC group within
    the same session ("Visual Working Memory: Performance, influences",
    "Multisensory Processing: Motor", ...).  We emit a `kind=poster-topic`
    Abstract for each topic and parent the actual poster Abstracts to it
    via `parent_id_explicit`.  The topic itself parents to the schedule
    overview row via the normal session_lookup path.

    `expected_topics` (optional) is the set of canonical topic strings
    from the schedule-overview rows.  When supplied, the look-back result
    is matched against this set so funding lines, affiliations, or stray
    page-header fragments don't bleed into the topic name.
    """
    expected_topics = expected_topics or set()

    def _norm_topic_key(s: str) -> str:
        """Aggressively normalize a topic string for substring matching:
        lowercase, collapse whitespace, tighten hyphens (so 'real- world'
        and 'real-world' compare equal)."""
        s = s.lower()
        s = re.sub(r"\s+", " ", s)
        s = re.sub(r"\s*-\s*", "-", s)
        return s

    norm_topics = []
    for t in expected_topics:
        cleaned = re.sub(r"\s+", " ", t.strip())
        if cleaned:
            norm_topics.append((_norm_topic_key(cleaned), cleaned))
    # Sort by length descending so a more-specific topic ("Eye Movements:
    # Pursuit, vergence") wins over a less-specific one ("Eye Movements")
    # if both occur as substrings.
    norm_topics.sort(key=lambda x: -len(x[0]))

    def _canonicalize_topic(text: str) -> str:
        """Match `text` against the expected topics; return the best
        canonical match if one is found, else `text` itself.

        Tries (in order):
          1. Expected topic appears as substring in look-back text
             (handles noisy look-backs like "...Hillman Foundation Funds
             Action: Reaching" where the topic is at the tail).
          2. Look-back is a SUFFIX of an expected topic — covers wrapped
             topic names where the look-back caught only the trailing
             fragment ("integration" -> "3D Shape and Space Perception:
             Cues, integration").
          3. Look-back is a PREFIX of an expected topic — same idea
             but for the leading fragment.
        """
        if not text or not norm_topics:
            return text
        norm = _norm_topic_key(text)
        if len(norm) < 4:
            return text
        for low, orig in norm_topics:
            if low in norm:
                return orig
        # Suffix / prefix match: require at least 6 chars to avoid
        # accidentally matching tiny common words.
        if len(norm) >= 6:
            for low, orig in norm_topics:
                if low.endswith(norm) or low.startswith(norm):
                    return orig
        return text

    lines = _join_wrapped_headers(text.split("\n"))
    cur_topic = ""
    cur_topic_id = ""
    cur_date = ""
    cur_time = ""
    cur_end = ""
    cur_room = ""

    def flush(poster_state):
        if not poster_state["id"]:
            return None
        all_lines = poster_state["title_lines"] + poster_state["body"]
        title, authors_line, body_lines = parse_talk_block(all_lines)
        authors_w_idx, affils = parse_authors_line(authors_line)
        authors = [n for n, _ in authors_w_idx]
        indices = [idx for _, idx in authors_w_idx]
        body_text = normalize_paragraph(body_lines)
        try:
            sh, sm_ = [int(x) for x in cur_time.split(":")] if cur_time else (0, 0)
            eh, em_ = [int(x) for x in cur_end.split(":")] if cur_end else (0, 0)
            mins = ((eh * 60 + em_) - (sh * 60 + sm_)) if cur_time else 0
        except ValueError:
            mins = 0
        return Abstract(
            id=poster_state["id"], title=title,
            authors=authors, affils=affils,
            author_indices=indices,
            body=body_text, track=cur_topic, kind="poster",
            date=cur_date, time=cur_time, mins=mins, room=cur_room,
            parent_session_time=cur_time,
            parent_id_explicit=cur_topic_id,
        )

    def look_back_for_topic(idx: int) -> str:
        """Walk back from line `idx` to find the topic-name lines that
        appear right before a POSTER_SESS_HEADER_RE match.

        Allows up to two blank lines in the middle of the topic block —
        column-reorder sometimes interleaves blank L rows when the
        right column held body text on the same physical row, and the
        topic name itself may wrap across two lines with a blank between.
        Stops at body-shaped, funding/acknowledgement, or
        pattern-matching lines.
        """
        candidates: list[str] = []
        j = idx - 1
        blanks_inside = 0
        while j >= 0 and not lines[j].strip():
            j -= 1
        while j >= 0 and len(candidates) < 6:
            s = lines[j].strip()
            if not s:
                blanks_inside += 1
                if blanks_inside > 2:
                    break  # too many blanks — done
                j -= 1
                continue
            if POSTER_ABS_RE.match(s):
                break
            if POSTER_SESS_HEADER_RE.match(s):
                break
            if POSTER_TOPIC_HEADER_RE.match(s):
                break
            if _looks_funding(s):
                break
            if len(s) > 80:
                break
            if re.search(r"\.\s+[A-Z]", s):
                break
            if s.endswith(".") or s.endswith(") and"):
                break
            candidates.insert(0, s)
            blanks_inside = 0
            j -= 1
        return " ".join(candidates).strip()

    import collections as _c
    _sess_count = _c.Counter()
    poster_state = {"id": "", "title_lines": [], "body": []}
    in_title = False

    for i, line in enumerate(lines):
        s = line.strip()

        # Topic-header pattern: "FRIDAY AFTERNOON POSTERS IN BANYAN BREEZEWAY"
        m = POSTER_TOPIC_HEADER_RE.match(s)
        if m:
            # Flush the pending poster FIRST, before mutating cur_room /
            # cur_topic_id.  This header marks the start of a new room's
            # block; whatever poster was open belongs to the OLD room
            # and OLD topic, so it must be emitted with the prior values.
            ab = flush(poster_state)
            if ab:
                yield ab
            poster_state = {"id": "", "title_lines": [], "body": []}
            cur_room = m.group("room").strip().title()
            cur_topic = ""
            cur_topic_id = ""
            continue

        # Date/time header: "FRIDAY, MAY 15, 3:45 – 6:00 PM, BANYAN BREEZEWAY"
        m = POSTER_SESS_HEADER_RE.match(s)
        if m:
            # Flush any pending poster — its body ends here, before the
            # new topic group begins.
            ab = flush(poster_state)
            if ab:
                yield ab
            poster_state = {"id": "", "title_lines": [], "body": []}
            in_title = False

            try:
                cur_date = fmt_date(m.group("month"), int(m.group("dom")), 2026)
            except KeyError:
                pass
            sh = int(m.group("sh")); sm_ = int(m.group("sm"))
            eh = int(m.group("eh")); em_ = int(m.group("em"))
            ampm = m.group("ampm").upper()
            sa = (m.group("sa") or "").upper()
            if ampm == "PM" and eh != 12:
                eh += 12
            elif ampm == "AM" and eh == 12:
                eh = 0
            if sa == "PM" and sh != 12:
                sh += 12
            elif sa == "AM" and sh == 12:
                sh = 0
            elif not sa:
                cand_sh = sh + 12 if (ampm == "PM" and sh != 12) else sh
                if cand_sh * 60 + sm_ <= eh * 60 + em_:
                    sh = cand_sh
            cur_time = f"{sh:02d}:{sm_:02d}"
            cur_end = f"{eh:02d}:{em_:02d}"
            captured_room = m.group("room") or ""
            if captured_room.strip():
                cur_room = captured_room.strip().title()
            # else: keep the previously-set cur_room (room wrapped onto a
            # continuation line that didn't end up adjacent in the L block).

            # Identify the topic name from the lines immediately preceding
            # this header.  Then emit a poster-topic Abstract and remember
            # its id so subsequent posters can parent to it.
            _sess_count[(cur_date, cur_room)] += 1
            raw_topic = look_back_for_topic(i)
            topic_text = _canonicalize_topic(raw_topic)
            if topic_text:
                cur_topic = topic_text
                cur_topic_id = "pt-" + slugify(
                    f"{cur_date}-{cur_time}-{cur_topic}"
                )[:90]
                # PosterTopic renders at the actual session start time.
                # (Earlier this used start-1 to force sort order against
                # the now-removed PosterSession umbrella; PR 1's nested
                # renderer makes that workaround unnecessary.)
                topic_time = cur_time
                topic_mins = (eh * 60 + em_) - (sh * 60 + sm_)
                yield Abstract(
                    id=cur_topic_id,
                    title=cur_topic,
                    authors=[], affils=[],
                    body="", track="", kind="poster-topic",
                    date=cur_date, time=topic_time, mins=topic_mins,
                    room=cur_room,
                    parent_session_time=cur_time,
                )
            else:
                cur_topic = ""
                cur_topic_id = ""
            continue

        # Abstract start: "<id> UPPERCASE_FIRST_WORD..."
        m = POSTER_ABS_RE.match(s)
        if m and m.group("rest")[:2].isupper():
            ab = flush(poster_state)
            if ab:
                yield ab
            poster_state = {
                "id": m.group("id"),
                "title_lines": [m.group("rest")],
                "body": [],
            }
            in_title = True
            continue

        if not poster_state["id"]:
            # Before we've found any abstract yet - this is probably the
            # session topic name e.g. "Visual Working Memory: Performance, influences"
            if s and not s.isupper() and not s.startswith("Poster Sessions"):
                cur_topic = s
            continue

        # Inside a poster: distinguish title lines from body
        if in_title:
            # Continue title if line looks uppercase-titley
            stripped = s
            letters = [c for c in stripped if c.isalpha()]
            if stripped and letters:
                upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
                if upper_ratio >= 0.7 and not stripped.startswith("("):
                    poster_state["title_lines"].append(stripped)
                    continue
            # Otherwise we're done with the title
            in_title = False

        poster_state["body"].append(line)

    ab = flush(poster_state)
    if ab:
        yield ab
    import sys as _sys
    print('[dbg] SESS_HEADER count by (date, room):', file=_sys.stderr)
    for k, v in sorted(_sess_count.items()):
        print(f'  {v}  {k}', file=_sys.stderr)


# ---------------------------------------------------------------------------
# Step 9. Convert Abstract objects into konopas program items, building people.
# ---------------------------------------------------------------------------

def _norm_room(room: str) -> str:
    """Lowercase + collapse whitespace so 'Talk Room 1' and 'TALK ROOM 1' match."""
    return re.sub(r"\s+", " ", (room or "").strip().lower())


def _display_room(room: str) -> str:
    """Title-case a room name for display so "TALK ROOM 1" -> "Talk Room 1".

    Symposium and talk-session headers in the source render rooms in
    ALL CAPS while poster/schedule rows render them in title case;
    normalize at the display step so loc strings compare equal across
    item types.  Preserves hyphens, slashes, and existing case for
    already-mixed names.
    """
    s = (room or "").strip()
    if not s:
        return s
    # Strip a dangling trailing connector ("Garden Courtyard &" -> "Garden Courtyard")
    s = re.sub(r"\s*&\s*$", "", s)
    # Skip if any lowercase letter is present (already mixed-case).
    if any(c.islower() for c in s):
        return s
    def _cap(w: str) -> str:
        if not w:
            return w
        return w[0].upper() + w[1:].lower()
    out_words = []
    for w in s.split():
        # Preserve trailing digits unchanged ("ROOM 1" -> "Room 1")
        if w.isdigit():
            out_words.append(w)
            continue
        # Words may contain "/" or "-" inside ("BANYAN/CITRUS").
        parts = re.split(r"([/\-])", w)
        out = "".join(_cap(p) if i % 2 == 0 else p for i, p in enumerate(parts))
        out_words.append(out)
    return " ".join(out_words)



# Map an Abstract's `kind` (or a ScheduleEntry's `kind`) to the human-facing
# Type tag used by conclar.  Symposium talks get their own "Symposium Talk"
# type so they can be visually distinguished from talk-session talks; the
# parent: tag still records which specific session they belong to.
_TYPE_TAG: dict[str, str] = {
    # Schedule overview row kinds
    "Symposium": "Type:Symposium",
    "Talk Session": "Type:TalkSession",
    "Poster Session": "Type:PosterSession",
    "Workshop": "Type:Workshop",
    "Keynote": "Type:Keynote",
    "Social": "Type:Social",
    "Satellite": "Type:Satellite",
    "Networking": "Type:Networking",
    "Award": "Type:Award",
    "Break": "Type:Break",
    "Lounge": "Type:Lounge",
    "Registration": "Type:Registration",
    "Exhibits": "Type:Exhibits",
    "Business": "Type:Business",
    "Student": "Type:Student",
    "Other": "Type:Other",
    # Abstract (child) kinds
    "symposium": "Type:Symposium",
    "symposium-talk": "Type:Symposium Talk",
    "talk": "Type:Talk",
    "talk-session": "Type:TalkSession",
    "poster": "Type:Poster",
    "poster-topic": "Type:PosterTopic",
}


def _build_people_refs_for(ab: Abstract, owner_id: str) -> list[dict]:
    """Build {id, name} refs for an Abstract's authors, registering each
    under `owner_id` in the people registry.  The owner_id may be the
    abstract's own id or a parent schedule-row id (when a session umbrella
    is being merged into its schedule row)."""
    refs: list[dict] = []
    affil_map = affil_lookup(ab.affils)
    fallback: list[str] = []
    if len(ab.affils) == 1 and not any(ab.author_indices):
        m = re.match(r"^\d+\s*(.+)$", ab.affils[0])
        fallback = [m.group(1).strip() if m else ab.affils[0]]
    for i, author in enumerate(ab.authors):
        ref = people.ref(author)
        people.add_prog(ref["id"], owner_id)
        idxs = ab.author_indices[i] if i < len(ab.author_indices) else []
        person_affils: list[str] = []
        for idx in idxs:
            if idx in affil_map:
                person_affils.append(affil_map[idx])
        if not person_affils and fallback:
            person_affils = list(fallback)
        people.add_affils(ref["id"], person_affils)
        refs.append(ref)
    return refs


def abstract_to_program(ab: Abstract,
                        session_lookup: Optional[dict[tuple[str, str, str], str]] = None
                        ) -> dict:
    """Render a child Abstract as a top-level program item with a
    parent:<sched_id> tag pointing at the matching schedule overview row."""
    refs = _build_people_refs_for(ab, ab.id)
    tags: list[str] = []
    if ab.track and ab.track != ab.kind:
        tags.append(ab.track)
    type_tag = _TYPE_TAG.get(ab.kind)
    if type_tag and type_tag not in tags:
        tags.append(type_tag)
    parent_id = ""
    if ab.parent_id_explicit:
        parent_id = ab.parent_id_explicit
    elif session_lookup and ab.parent_session_time:
        ab_room = _norm_room(ab.room)
        parent_id = session_lookup.get(
            (ab.date, ab.parent_session_time, ab_room), ""
        )
        # Fallback: poster session headers in the abstract body sometimes
        # truncate the room ("Banyan" instead of "Banyan Breezeway" because
        # the second word wraps to a new line).  Match by prefix on the
        # same date+time slot.
        if not parent_id and ab_room:
            for (d, t, r), sid in session_lookup.items():
                if d == ab.date and t == ab.parent_session_time:
                    if r.startswith(ab_room) or ab_room.startswith(r):
                        parent_id = sid
                        break
    if parent_id:
        tags.append(f"parent:{parent_id}")
    # Affiliations are surfaced via each person's `tags` field rather than
    # duplicated into every program item's description.
    desc = ab.body
    return {
        "id": ab.id,
        "title": smart_title_case(ab.title),
        "tags": tags,
        "date": ab.date,
        "time": ab.time,
        "mins": ab.mins,
        "loc": [_display_room(ab.room)] if ab.room else [],
        "people": refs,
        "desc": desc,
    }


_TITLE_CONTINUATION_TAILS = frozenset({
    "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into",
    "of", "on", "or", "the", "to", "with", "without",
})


def _maybe_extend_title(title: str, sub_topics: list[str]) -> tuple[str, list[str]]:
    """If `title` ends with a connector word or colon, absorb the first
    `sub_topics` entry as a continuation.  Returns (new_title, remaining_subs).

    Schedule overview titles wrap onto a second indented row when too long,
    e.g. "Rhythms of Vision: How Neural Oscillations Structure Perception and"
    + "Attention".  The continuation lands in sub_topics by the row parser;
    fold it back into the title here.
    """
    if not title or not sub_topics:
        return title, list(sub_topics)
    stripped = title.rstrip()
    last_word_m = re.search(r"\b(\w+)\W*$", stripped)
    last_word = last_word_m.group(1).lower() if last_word_m else ""
    if stripped.endswith(":") or last_word in _TITLE_CONTINUATION_TAILS:
        cont = sub_topics[0].strip()
        if cont and not cont.startswith(("Sponsored ", "Organized ", "Lunch ")):
            return (stripped + " " + cont).strip(), list(sub_topics[1:])
    return title, list(sub_topics)


def schedule_entry_to_program(e: ScheduleEntry, idx: int) -> dict:
    """Render a schedule overview row as a top-level program item.

    Times are emitted as-is — earlier versions of this function shifted
    parent start times down by 1-2 minutes so children at the original
    start sorted strictly after.  That sort-order workaround is no longer
    needed: PR 1's tree-aware renderer places children inside their
    parent's DOM, so parent and child are no longer siblings competing
    for sort position.  Items render at their true scheduled time."""
    mins_val = (e.end[0] - e.start[0]) * 60 + (e.end[1] - e.start[1])
    mins_val = mins_val if mins_val > 0 else 0
    time_str = fmt_time(e.start)
    tags: list[str] = []
    type_tag = _TYPE_TAG.get(e.kind)
    if type_tag:
        tags.append(type_tag)
    full_title, remaining_subs = _maybe_extend_title(e.title, e.sub_topics)
    return {
        "id": f"sched-{idx:04d}",
        "title": smart_title_case(full_title),
        "tags": tags,
        "date": e.date,
        "time": time_str,
        "mins": mins_val,
        "loc": [_display_room(e.room)] if e.room else [],
        "people": [],
        "desc": ("\n".join(remaining_subs)) if remaining_subs else "",
    }


def merge_umbrella_into_schedule(ab: Abstract,
                                 session_lookup: dict[tuple[str, str, str], str],
                                 sched_by_id: dict[str, dict]) -> bool:
    """If `ab` is a Symposium / Talk-Session umbrella that maps to a
    schedule overview row, fold its people and overview body into the row
    and return True (so the caller can skip emitting it as a standalone
    item).  Returns False if no matching row exists; the caller should
    then emit the umbrella so its content isn't dropped."""
    if ab.kind not in ("symposium", "talk-session"):
        return False
    key = (ab.date, ab.time, _norm_room(ab.room))
    sched_id = session_lookup.get(key)
    if not sched_id or sched_id not in sched_by_id:
        return False
    sched_item = sched_by_id[sched_id]
    refs = _build_people_refs_for(ab, sched_id)
    seen = {r["id"] for r in sched_item["people"]}
    for r in refs:
        if r["id"] not in seen:
            sched_item["people"].append(r)
            seen.add(r["id"])
    if ab.body:
        existing = sched_item["desc"]
        if ab.body not in existing:
            sched_item["desc"] = (existing + "\n\n" + ab.body).strip() if existing else ab.body
    return True


# ---------------------------------------------------------------------------
# Step 10. Run everything.
# ---------------------------------------------------------------------------

program: list[dict] = []

# Schedule overview rows are the canonical session items.  We emit them
# first, then build a (date, original_start_time, normalized_room) lookup
# so symposium / talk-session / poster children can be linked back via a
# `parent:<sched_id>` tag.
#
# Poster Session umbrella rows ("Friday Afternoon Posters" etc.) are
# intentionally NOT emitted as program items: they carry no useful info
# beyond what the day header already provides, and their children
# (PosterTopics) read better as top-level items.  We also skip them from
# session_lookup so PosterTopics don't get a parent: tag pointing to a
# nonexistent row.
session_lookup: dict[tuple[str, str, str], str] = {}
sched_by_id: dict[str, dict] = {}
for i, e in enumerate(schedule):
    if e.kind == "Poster Session":
        continue
    item = schedule_entry_to_program(e, i)
    program.append(item)
    sched_by_id[item["id"]] = item
    session_lookup[(e.date, fmt_time(e.start), _norm_room(e.room))] = item["id"]

n_sched = len(program)

n_sym = 0
n_sym_orphan = 0  # umbrellas we couldn't merge (no matching sched row)
for ab in iter_symposia(sym_text):
    if ab.kind == "symposium":
        if merge_umbrella_into_schedule(ab, session_lookup, sched_by_id):
            continue
        # Orphan umbrella - emit it so we don't drop the content entirely.
        n_sym_orphan += 1
    program.append(abstract_to_program(ab, session_lookup))
    n_sym += 1

n_talk = 0
n_talk_orphan = 0
for ab in iter_talk_sessions(talk_text):
    if ab.kind == "talk-session":
        if merge_umbrella_into_schedule(ab, session_lookup, sched_by_id):
            continue
        n_talk_orphan += 1
    program.append(abstract_to_program(ab, session_lookup))
    n_talk += 1

n_poster = 0
# Build the canonical topic set from poster-session schedule rows so
# iter_posters can disambiguate noisy look-back results (funding lines,
# affiliations, stray page-header fragments) against known topics.
expected_topics: set[str] = set()
for e in schedule:
    if e.kind == "Poster Session":
        for t in e.sub_topics:
            t = t.strip()
            if t:
                expected_topics.add(t)
for ab in iter_posters(poster_text, expected_topics=expected_topics):
    program.append(abstract_to_program(ab, session_lookup))
    n_poster += 1

if args.limit > 0:
    program = program[: args.limit]


# ---------------------------------------------------------------------------
# Step 10b. Merge likely-duplicate person records.
#
# Two passes:
#   1. Automatic merge (case/diacritic/punct, middle initials, nicknames).
#   2. Manual aliases from `aliases.json` (or --aliases <path>): a JSON
#      object mapping `{dup_id: canonical_id}` for one-off merges that the
#      auto pass can't safely make (typos, uncommon nicknames, etc.).
# Both passes update each program item's people refs in place.
# ---------------------------------------------------------------------------

auto_remap: dict[str, str] = {}
alias_remap: dict[str, str] = {}

if not args.no_merge:
    auto_remap = people.merge_duplicates()
    if auto_remap:
        dbg(f"auto-merged {len(auto_remap)} duplicate people")

aliases_path = Path(args.aliases) if args.aliases else HERE / "aliases.json"
if aliases_path.exists():
    try:
        raw_aliases = json.loads(aliases_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        warn(f"could not parse {aliases_path}: {exc}")
        raw_aliases = {}
    if not isinstance(raw_aliases, dict):
        warn(f"{aliases_path} should be a JSON object mapping dup_id -> canonical_id")
        raw_aliases = {}
    # Resolve any keys/values that the auto-merge already collapsed.
    def _resolve(target: str) -> str:
        seen: set[str] = set()
        while target in auto_remap and target not in seen:
            seen.add(target)
            target = auto_remap[target]
        return target
    resolved: dict[str, str] = {}
    for k, v in raw_aliases.items():
        if not isinstance(k, str) or not isinstance(v, str):
            continue
        rk = _resolve(k)
        rv = _resolve(v)
        if rk != rv:
            resolved[rk] = rv
    alias_remap = people.apply_aliases(resolved)
    if alias_remap:
        dbg(f"alias-merged {len(alias_remap)} additional duplicate people "
            f"from {aliases_path.name}")

# Combine remaps (auto first, then aliases) and propagate any chains so a
# stale id in program.json gets resolved all the way to its surviving id.
combined_remap = dict(auto_remap)
for old, new in alias_remap.items():
    combined_remap[old] = new
def _final(start: str) -> str:
    seen: set[str] = set()
    while start in combined_remap and start not in seen:
        seen.add(start)
        start = combined_remap[start]
    return start
for old in list(combined_remap.keys()):
    combined_remap[old] = _final(combined_remap[old])

if combined_remap:
    for item in program:
        for ref in item.get("people", []):
            new_id = combined_remap.get(ref["id"])
            if new_id is not None and new_id != ref["id"]:
                ref["id"] = new_id
                ref["name"] = people.display(new_id) or ref["name"]

n_merged = len(auto_remap) + len(alias_remap)


# ---------------------------------------------------------------------------
# Step 11. Write outputs.
# ---------------------------------------------------------------------------

# --- Tag individual posters with parent:<session_id> by time-window match. -
# Some posters slip past the upstream (date, time, room) lookup in
# abstract_to_program -- typically because the schedule row's room name
# differs from the individual poster's loc (e.g., "Banyan Breezeway and
# Pavilion" vs. just "Banyan").  Catch them here by matching on date +
# time-falls-within-session-window instead of room.
def _t_to_min(t: str) -> int:
    h, m = t.split(":")
    return int(h) * 60 + int(m)

_poster_sessions: list[dict] = []
for _it in program:
    _title = _it.get("title", "")
    _tags = _it.get("tags", [])
    _is_individual = "Type:Poster" in _tags
    _looks_like_session = "Posters" in _title or "Poster Session" in _title
    if _looks_like_session and not _is_individual:
        _start = _t_to_min(_it["time"])
        _end = _start + int(_it.get("mins", 0))
        _poster_sessions.append({
            "id": _it["id"],
            "date": _it["date"],
            "start": _start,
            "end": _end,
        })

_n_late_tagged = 0
_n_already_tagged = 0
_n_no_match = 0
_unmatched_samples: list[tuple[str, str, str]] = []  # (date, time, title) of misses
for _it in program:
    if "Type:Poster" not in _it.get("tags", []):
        continue
    if any(t.startswith("parent:") for t in _it["tags"]):
        _n_already_tagged += 1
        continue
    _p_min = _t_to_min(_it["time"])
    _matched = False
    for _s in _poster_sessions:
        if _it["date"] == _s["date"] and _s["start"] <= _p_min < _s["end"]:
            _it["tags"].append(f"parent:{_s['id']}")
            _n_late_tagged += 1
            _matched = True
            break
    if not _matched:
        _n_no_match += 1
        if len(_unmatched_samples) < 5:
            _unmatched_samples.append((_it["date"], _it["time"], _it.get("title", "")[:60]))

print(
    f"poster-session post-pass: tagged {_n_late_tagged} posters | "
    f"already tagged upstream: {_n_already_tagged} | "
    f"no matching session: {_n_no_match} | "
    f"sessions found: {len(_poster_sessions)}",
    file=sys.stderr,
)
if _unmatched_samples:
    print("  unmatched poster samples:", file=sys.stderr)
    for _d, _t, _ttl in _unmatched_samples:
        print(f"    {_d} {_t}  {_ttl!r}", file=sys.stderr)
if _poster_sessions:
    print("  poster sessions:", file=sys.stderr)
    for _s in _poster_sessions[:8]:
        _hh, _mm = divmod(_s["start"], 60)
        _eh, _em = divmod(_s["end"], 60)
        print(
            f"    {_s['id']}  {_s['date']}  "
            f"{_hh:02d}:{_mm:02d}-{_eh:02d}:{_em:02d}",
            file=sys.stderr,
        )
    if len(_poster_sessions) > 8:
        print(f"    ... and {len(_poster_sessions) - 8} more", file=sys.stderr)
# --- end poster parent-tagging pass ----------------------------------------

# ---------------------------------------------------------------------------
# Manual extras: side-file annotations for events whose details aren't in
# the main abstract booklet (satellite workshops, special sessions, etc.).
#
# `extras.json` next to this script may contain a list of override
# entries.  Each entry has:
#   - match: dict with one or more of:
#       id              -> exact program-item id  ("sched-0000")
#       title_prefix    -> matches items whose title starts with this
#       title_contains  -> matches items whose title contains this
#       tags_all        -> list of tags ALL of which must be present
#       date            -> exact date "YYYY-MM-DD"
#   - desc:    string to set as the item's description
#   - people:  ordered list of {name, affil} to register and attach
#   - replace_people: bool (default true) — if false, append instead
# Multiple entries may match the same item; later entries override.
# ---------------------------------------------------------------------------

EXTRAS_PATH = HERE / "extras.json"


def _extras_match(item: dict, match: dict) -> bool:
    if "id" in match and item.get("id") != match["id"]:
        return False
    if "title_prefix" in match and not item.get("title", "").startswith(match["title_prefix"]):
        return False
    if "title_contains" in match and match["title_contains"] not in item.get("title", ""):
        return False
    if "date" in match and item.get("date") != match["date"]:
        return False
    if "tags_all" in match:
        item_tags = set(item.get("tags") or [])
        if not all(t in item_tags for t in match["tags_all"]):
            return False
    return True


_extras: list[dict] = []
if EXTRAS_PATH.exists():
    try:
        _extras = json.loads(EXTRAS_PATH.read_text(encoding="utf-8"))
        if not isinstance(_extras, list):
            warn(f"{EXTRAS_PATH} should contain a JSON list; ignoring")
            _extras = []
    except Exception as exc:
        warn(f"could not parse {EXTRAS_PATH}: {exc}")
        _extras = []

n_extras_applied = 0
for _entry in _extras:
    _match = _entry.get("match") or {}
    _matched = [it for it in program if _extras_match(it, _match)]
    if not _matched:
        warn(f"extras entry matched no items: {_match}")
        continue
    # Pre-register people with affils so they get a stable id.
    _entry_refs: list[dict] = []
    for _person in (_entry.get("people") or []):
        _name = (_person.get("name") or "").strip()
        if not _name:
            continue
        _ref = people.ref(_name)
        _affil = (_person.get("affil") or "").strip()
        if _affil:
            people.add_affils(_ref["id"], [_affil])
        _entry_refs.append(_ref)
    _replace = _entry.get("replace_people", True)
    for it in _matched:
        if _entry_refs:
            for _ref in _entry_refs:
                people.add_prog(_ref["id"], it["id"])
            if _replace:
                it["people"] = list(_entry_refs)
            else:
                seen = {r["id"] for r in (it.get("people") or [])}
                for _ref in _entry_refs:
                    if _ref["id"] not in seen:
                        it.setdefault("people", []).append(_ref)
                        seen.add(_ref["id"])
        if "desc" in _entry:
            it["desc"] = _entry["desc"]
        n_extras_applied += 1

if n_extras_applied:
    print(f"applied {n_extras_applied} extras annotations from {EXTRAS_PATH.name}",
          file=sys.stderr)

_program_text = json.dumps(program, ensure_ascii=False, indent=2)
_people_text = json.dumps(people.to_konopas(), ensure_ascii=False, indent=2)

PROGRAM_PATH.write_text(_program_text, encoding="utf-8")
PEOPLE_PATH.write_text(_people_text, encoding="utf-8")

# Mirror to the deployed public/2026/ location.
DEPLOY_DIR.mkdir(parents=True, exist_ok=True)
DEPLOY_PROGRAM_PATH.write_text(_program_text, encoding="utf-8")
DEPLOY_PEOPLE_PATH.write_text(_people_text, encoding="utf-8")

if n_merged:
    _parts: list[str] = []
    if auto_remap:
        _parts.append(f"{len(auto_remap)} auto")
    if alias_remap:
        _parts.append(f"{len(alias_remap)} aliased")
    _merge_note = f"  (merged {n_merged} duplicate records: {', '.join(_parts)})"
else:
    _merge_note = ""
_orphan_note = ""
if n_sym_orphan or n_talk_orphan:
    _orphan_note = (f"  ({n_sym_orphan} symposium / {n_talk_orphan} talk-session "
                    f"umbrellas had no matching schedule row and were emitted standalone)\n")
print(
    f"wrote {len(program):,} program items "
    f"(schedule={n_sched}, symp={n_sym}, talks={n_talk}, posters={n_poster})\n"
    f"{_orphan_note}"
    f"wrote {len(people.to_konopas()):,} unique people{_merge_note}\n"
    f"  -> {PROGRAM_PATH}\n"
    f"  -> {PEOPLE_PATH}\n"
    f"  -> {DEPLOY_PROGRAM_PATH}\n"
    f"  -> {DEPLOY_PEOPLE_PATH}",
    file=sys.stderr,
)