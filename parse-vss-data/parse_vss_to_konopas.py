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
    right_threshold = max(boundary - 10, 30)

    def pick_gap(line: str) -> Optional[tuple[int, int]]:
        """Choose the most likely column gap on this line.

        Strategy:
          (1) Collect every gap whose nearest edge is within 8 chars of the
              page-wide boundary.  Among those, prefer the widest, then the
              rightmost.  Rightmost matters when the page-wide boundary
              accidentally lands inside a left-column 'wrap' gap (e.g. a
              long affil that wraps "1University   of" with a small visual
              gap before the actual column break).
          (2) If no gap is near the boundary, fall back to the closest gap
              with width >= 4.
        """
        cands = [(m.start(1), m.end(1)) for m in GAP_RE.finditer(line)]
        if not cands:
            return None
        near: list[tuple[int, int, int]] = []
        for gs, ge in cands:
            if ge < boundary:
                d = boundary - ge
            elif gs > boundary:
                d = gs - boundary
            else:
                d = 0
            if d <= 8:
                near.append((gs, ge, d))
        if near:
            near.sort(key=lambda x: (-(x[1] - x[0]), -x[0]))
            return (near[0][0], near[0][1])
        best: Optional[tuple[int, int]] = None
        best_dist = float("inf")
        for gs, ge in cands:
            if (ge - gs) < 4:
                continue
            mid = (gs + ge) / 2
            dist = abs(mid - boundary)
            if dist < best_dist:
                best_dist = dist
                best = (gs, ge)
        return best

    for line in lines:
        if not line.strip():
            left.append("")
            continue
        # Right-only: leading whitespace alone reaches into right-column area.
        first_nonws = len(line) - len(line.lstrip())
        if first_nonws >= right_threshold:
            right.append(line.strip())
            continue
        # Wide left-only line: nothing extends past the page boundary.  Even
        # if the line has wide internal gaps (between author list and a
        # wrapping affiliation, between authors, etc.), with no right-column
        # text we shouldn't try to split.
        if not line[boundary:].strip():
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
    s = re.sub(r"\s+", " ", line.strip())
    if not s:
        return False
    # Common patterns observed:
    #   "Vis ion Sc ienc es Society | 12"
    #   "11 | Vis ion Sc ienc es Society"
    if "Vis ion Sc" in s and "Society" in s:
        return True
    if re.fullmatch(r"\d+\s*\|\s*Vis ion Sc.*Society.*", s):
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
        if not line.strip():
            last_entry = None
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
    """From 'Jane Doe1,2 (jane@x.edu)' return ('Jane Doe', ['1','2'])."""
    s = EMAIL_RE.sub("", tok).strip().rstrip(",;")
    s = re.sub(r"\s+", " ", s)
    # Trailing affiliation indices.
    m = re.match(r"^(.*?)([0-9](?:[0-9]|,|\s)*)$", s)
    if m:
        name = m.group(1).strip(" ,")
        idx_part = re.findall(r"\d+", m.group(2))
        return name, idx_part
    return s, []


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
    raw_tokens = [t.strip() for t in re.split(r",(?=\s*[A-Za-zÀ-ÿ])", authors_txt) if t.strip()]
    out: list[tuple[str, list[str]]] = []
    for tok in raw_tokens:
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
    sem_idx = -1
    for i, line in enumerate(lines):
        s = line.strip()
        if not s or ";" not in s:
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

    # Walk back to find the start of the authors block.
    auth_start = sem_idx
    while auth_start > 0:
        prev = lines[auth_start - 1]
        if not prev.strip():
            break
        if _looks_titley(prev):
            break
        auth_start -= 1
        if sem_idx - auth_start > 10:  # safety
            break

    # Walk forward through affiliation continuation lines.  Only absorb a
    # line if it positively looks like an affiliation; bail at the first
    # body-shaped paragraph or when we've gone too far.
    auth_end = sem_idx + 1
    while auth_end < len(lines):
        line = lines[auth_end]
        s = line.strip()
        if not s:
            break
        if _looks_bodyish(s):
            break
        if not _looks_affil(s):
            break
        auth_end += 1
        if auth_end - sem_idx > 12:
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
        organizers_m = re.search(r"Organizers:\s*(.+?)(?=\n[A-Z][a-z]|\nPresenters:|\Z)",
                                 overview_text, flags=re.DOTALL)
        presenters_m = re.search(r"Presenters:\s*(.+?)(?=\n[A-Z][a-z]|\Z)",
                                 overview_text, flags=re.DOTALL)
        organizers_txt = organizers_m.group(1) if organizers_m else ""
        presenters_txt = presenters_m.group(1) if presenters_m else ""

        # Strip the Organizers/Presenters preamble from overview to leave the description.
        desc_start = 0
        for p in (organizers_m, presenters_m):
            if p:
                desc_start = max(desc_start, p.end())
        desc_lines = overview_text[desc_start:].split("\n")
        sym_desc = normalize_paragraph(desc_lines)

        # Emit the symposium itself as one item (the umbrella session).
        sym_id = f"symp-{date}-{fmt_time(start_t).replace(':','')}-{slugify(room)[:6]}"
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
        for i in range(n_talks):
            num = talk_split[1 + 2 * i]
            body = talk_split[2 + 2 * i]
            lines = body.split("\n")
            title, authors_line, body_lines = parse_talk_block(lines)
            authors_w_idx, affils = parse_authors_line(authors_line)
            authors = [n for n, _ in authors_w_idx]
            indices = [idx for _, idx in authors_w_idx]
            body_text = normalize_paragraph(body_lines)
            yield Abstract(
                id=f"{sym_id}.t{int(num):02d}",
                title=title, authors=authors, affils=affils,
                author_indices=indices,
                body=body_text, track="Symposium",
                kind="symposium-talk", date=date, time=fmt_time(start_t),
                mins=0, room=room,
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
                mins=0,  # individual talk durations not given
                room=room,
            )

        # Also emit the talk SESSION as its own item (umbrella).
        yield Abstract(
            id=f"talksess-{date}-{fmt_time((sh,sm_)).replace(':','')}-{slugify(room)[:6]}",
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
    r"(?P<eh>\d{1,2}):(?P<em>\d{2})\s*(?P<ampm>AM|PM)\s*,\s*(?P<room>.+?)\s*$",
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


def iter_posters(text: str) -> Iterable[Abstract]:
    """Walk poster-session text emitting one Abstract per numbered poster."""
    # Strategy: scan lines.  When we hit a topic header, capture the room/date/time
    # block above it. When we hit a `<id> <UPPER>` line, start a new poster.

    lines = text.split("\n")
    cur_topic = ""
    cur_date = ""
    cur_time = ""
    cur_end = ""
    cur_room = ""

    def flush(poster_state):
        if not poster_state["id"]:
            return None
        # The poster's own lines: title_lines (uppercase title fragments) +
        # body lines (authors, affils, abstract).  Concatenate and let
        # parse_talk_block locate the title/author/body boundary via the
        # first ';' line — same logic the talk parsers use.
        all_lines = poster_state["title_lines"] + poster_state["body"]
        title, authors_line, body_lines = parse_talk_block(all_lines)
        authors_w_idx, affils = parse_authors_line(authors_line)
        authors = [n for n, _ in authors_w_idx]
        indices = [idx for _, idx in authors_w_idx]
        body_text = normalize_paragraph(body_lines)
        # Compute mins from session window
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
        )

    poster_state = {"id": "", "title_lines": [], "body": []}
    in_title = False

    for line in lines:
        s = line.strip()

        # Topic-header pattern: "FRIDAY AFTERNOON POSTERS IN BANYAN BREEZEWAY"
        m = POSTER_TOPIC_HEADER_RE.match(s)
        if m:
            # New poster session block - reset topic until we see a topic name
            cur_room = m.group("room").strip().title()
            cur_topic = ""
            # Flush any pending poster
            ab = flush(poster_state)
            if ab:
                yield ab
            poster_state = {"id": "", "title_lines": [], "body": []}
            continue

        # Date/time header: "FRIDAY, MAY 15, 3:45 – 6:00 PM, BANYAN BREEZEWAY"
        m = POSTER_SESS_HEADER_RE.match(s)
        if m:
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
            cur_room = m.group("room").strip().title()
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


# ---------------------------------------------------------------------------
# Step 9. Convert Abstract objects into konopas program items, building people.
# ---------------------------------------------------------------------------

def abstract_to_program(ab: Abstract) -> dict:
    refs = []
    affil_map = affil_lookup(ab.affils)
    # If we have only one affiliation and no explicit per-author indices,
    # treat it as everyone's affiliation (common pattern for single-PI labs).
    fallback: list[str] = []
    if len(ab.affils) == 1 and not any(ab.author_indices):
        m = re.match(r"^\d+\s*(.+)$", ab.affils[0])
        fallback = [m.group(1).strip() if m else ab.affils[0]]
    for i, author in enumerate(ab.authors):
        ref = people.ref(author)
        people.add_prog(ref["id"], ab.id)
        idxs = ab.author_indices[i] if i < len(ab.author_indices) else []
        person_affils: list[str] = []
        for idx in idxs:
            if idx in affil_map:
                person_affils.append(affil_map[idx])
        if not person_affils and fallback:
            person_affils = list(fallback)
        people.add_affils(ref["id"], person_affils)
        refs.append(ref)
    tags = []
    if ab.track:
        tags.append(ab.track)
    if ab.kind:
        tags.append(f"`type:{ab.kind}")  # backtick prefix marks "hidden" tag
    # Affiliations are surfaced via each person's `bio` field rather than
    # duplicated into every program item's description.
    desc = ab.body
    return {
        "id": ab.id,
        "title": ab.title,
        "tags": tags,
        "date": ab.date,
        "time": ab.time,
        "mins": ab.mins,
        "loc": [ab.room] if ab.room else [],
        "people": refs,
        "desc": desc,
    }


def schedule_entry_to_program(e: ScheduleEntry, idx: int) -> dict:
    mins = (e.end[0] - e.start[0]) * 60 + (e.end[1] - e.start[1])
    return {
        "id": f"sched-{idx:04d}",
        "title": e.title,
        "tags": [e.kind] if e.kind else [],
        "date": e.date,
        "time": fmt_time(e.start),
        "mins": mins if mins > 0 else 0,
        "loc": [e.room] if e.room else [],
        "people": [],
        "desc": ("\n".join(e.sub_topics)) if e.sub_topics else "",
    }


# ---------------------------------------------------------------------------
# Step 10. Run everything.
# ---------------------------------------------------------------------------

program: list[dict] = []

# Schedule overview rows (workshops, breaks, satellites...)
sched_kinds_to_skip_when_dupe = {"Symposium", "Talk Session", "Poster Session"}
for i, e in enumerate(schedule):
    # We'll emit ALL schedule rows, but tag them so users can filter.
    program.append(schedule_entry_to_program(e, i))

n_sched = len(program)

n_sym = 0
for ab in iter_symposia(sym_text):
    program.append(abstract_to_program(ab))
    n_sym += 1

n_talk = 0
for ab in iter_talk_sessions(talk_text):
    program.append(abstract_to_program(ab))
    n_talk += 1

n_poster = 0
for ab in iter_posters(poster_text):
    program.append(abstract_to_program(ab))
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

PROGRAM_PATH.write_text(
    json.dumps(program, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
PEOPLE_PATH.write_text(
    json.dumps(people.to_konopas(), ensure_ascii=False, indent=2),
    encoding="utf-8",
)

if n_merged:
    _parts: list[str] = []
    if auto_remap:
        _parts.append(f"{len(auto_remap)} auto")
    if alias_remap:
        _parts.append(f"{len(alias_remap)} aliased")
    _merge_note = f"  (merged {n_merged} duplicate records: {', '.join(_parts)})"
else:
    _merge_note = ""
print(
    f"wrote {len(program):,} program items "
    f"(schedule={n_sched}, symp={n_sym}, talks={n_talk}, posters={n_poster})\n"
    f"wrote {len(people.to_konopas()):,} unique people{_merge_note}\n"
    f"  -> {PROGRAM_PATH}\n"
    f"  -> {PEOPLE_PATH}",
    file=sys.stderr,
)
