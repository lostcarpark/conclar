#!/usr/bin/env python3
"""
Scan people.json for likely-duplicate entries.

Reports groups of records that probably refer to the same person, organized
by confidence level:

  HIGH:   normalized name collisions (case/diacritics/whitespace differ).
  MEDIUM: same surname + same first initial, different first-name spellings
          (covers middle initials, "T. Smith" vs "Thomas Smith", etc.).
  LOW:    same surname + nickname pair (Tom/Thomas, Liz/Elizabeth, ...).

Run from the project folder:
    python3 find_duplicate_people.py
or, to print every group regardless of confidence, including singletons:
    python3 find_duplicate_people.py --all
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
PEOPLE = HERE / "people.json"


# --- Common nickname pairs ---------------------------------------------------

NICKNAMES: dict[str, str] = {}
for full, nicks in [
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
    ("George",     ["Geo"]),
    ("Henry",      ["Hank", "Harry"]),
    ("Jonathan",   ["Jon", "Jonny"]),
    ("Alexander",  ["Alex", "Alec", "Sasha", "Xander"]),
    ("Patrick",    ["Pat", "Paddy"]),
    ("Vincent",    ["Vince", "Vinny"]),
    ("Frederick",  ["Fred", "Freddy"]),
    ("Gregory",    ["Greg"]),
    ("Timothy",    ["Tim", "Timmy"]),
    ("Lawrence",   ["Larry", "Lou"]),
    ("Russell",    ["Russ"]),
    ("Donald",     ["Don", "Donny"]),
    ("Ronald",     ["Ron", "Ronnie"]),
    ("Jeffrey",    ["Jeff"]),
    ("Bradley",    ["Brad"]),
    ("Cameron",    ["Cam"]),
    ("Joshua",     ["Josh"]),
    ("Jacob",      ["Jake"]),
    ("Zachary",    ["Zach", "Zack"]),
    # Female nicknames
    ("Elizabeth",  ["Liz", "Lizzy", "Beth", "Betty", "Bess", "Eliza", "Betsy"]),
    ("Jennifer",   ["Jen", "Jenny", "Jenn"]),
    ("Susan",      ["Sue", "Suzy", "Susie"]),
    ("Katherine",  ["Kate", "Katie", "Kathy", "Kay"]),
    ("Catherine",  ["Cathy", "Cat", "Kate"]),
    ("Margaret",   ["Maggie", "Meg", "Peggy", "Marge"]),
    ("Patricia",   ["Pat", "Patty", "Trish", "Tricia"]),
    ("Christina",  ["Chris", "Christy", "Tina"]),
    ("Christine",  ["Chris", "Christy"]),
    ("Rebecca",    ["Becca", "Becky"]),
    ("Stephanie",  ["Steph"]),
    ("Samantha",   ["Sam", "Sammy"]),
    ("Jessica",    ["Jess", "Jessie"]),
    ("Barbara",    ["Barb", "Barbie"]),
    ("Deborah",    ["Deb", "Debbie", "Debby"]),
    ("Cynthia",    ["Cindy"]),
    ("Pamela",     ["Pam"]),
    ("Veronica",   ["Ronnie", "Vera"]),
    ("Victoria",   ["Vicky", "Vic", "Tori"]),
    ("Sarah",      ["Sara"]),
    ("Rachel",     ["Rae"]),
    ("Nicole",     ["Niki", "Nikki"]),
    ("Madison",    ["Maddie"]),
    ("Alexandra",  ["Alex", "Alexa", "Sasha", "Lexi"]),
    ("Natalie",    ["Nat"]),
    ("Olivia",     ["Liv", "Livvy"]),
]:
    full_l = full.lower()
    for n in nicks:
        # bidirectional pairing (the canonical name is the longer-form)
        NICKNAMES[n.lower()] = full_l


# --- Normalization helpers ---------------------------------------------------

def strip_diacritics(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def normalize_part(s: str) -> str:
    s = strip_diacritics(s).lower()
    s = re.sub(r"[^a-z]", "", s)  # drop hyphens, periods, apostrophes
    return s


def first_canonical(first_part: str) -> str:
    """Return the dominant first-name token, expanding nicknames."""
    s = strip_diacritics(first_part).lower()
    # Use only the first whitespace-separated token (skip middle names/initials)
    head = s.split()[0] if s.split() else ""
    head = re.sub(r"[^a-z]", "", head)
    return NICKNAMES.get(head, head)


def first_initial(first_part: str) -> str:
    s = strip_diacritics(first_part).lower().lstrip(".")
    s = re.sub(r"[^a-z\s]", "", s).strip()
    if not s:
        return ""
    return s[0]


# --- Main --------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true",
                    help="also print groups containing only one entry")
    args = ap.parse_args()

    if not PEOPLE.exists():
        print(f"Could not find {PEOPLE}", file=sys.stderr)
        return 2

    ppl = json.loads(PEOPLE.read_text(encoding="utf-8"))
    print(f"loaded {len(ppl)} people\n")

    # Bucket each record by (normalized_last, first_initial)
    by_last_init: dict[tuple[str, str], list[dict]] = defaultdict(list)
    by_last_canon: dict[tuple[str, str], list[dict]] = defaultdict(list)
    by_full_norm: dict[str, list[dict]] = defaultdict(list)

    for p in ppl:
        first, last = p["name"][0], p["name"][1]
        full_norm = normalize_part(first) + "|" + normalize_part(last)
        by_full_norm[full_norm].append(p)

        last_n = normalize_part(last)
        if not last_n:
            continue
        init = first_initial(first)
        canon = first_canonical(first)
        by_last_init[(last_n, init)].append(p)
        if canon:
            by_last_canon[(last_n, canon)].append(p)

    # --- HIGH confidence: identical normalized names -------------------------

    high = {k: v for k, v in by_full_norm.items() if len(v) > 1}
    if high:
        print(f"=== HIGH confidence: {len(high)} groups (case/diacritic/punct match) ===")
        for k, group in sorted(high.items()):
            ids = ", ".join(f"{p['id']} ({len(p['prog'])} prog)" for p in group)
            print(f"  {k:<35} -> {len(group)} records: {ids}")
            for p in group:
                bio = (p["bio"][:60] + "…") if len(p["bio"]) > 60 else p["bio"]
                print(f"      {p['name'][0]} {p['name'][1]:<25}  bio: {bio!r}")
        print()

    # --- MEDIUM confidence: same surname + same first initial,
    #     different first-name spellings -----------------------------------

    medium = []
    for (last, init), group in by_last_init.items():
        if init == "":
            continue
        # Distinct first-name spellings within the group
        firsts = {strip_diacritics(p["name"][0]).lower().strip(): p for p in group}
        if len(firsts) > 1:
            medium.append((last, init, list(firsts.values())))
    if medium:
        print(f"=== MEDIUM confidence: {len(medium)} groups "
              f"(same surname + same first initial, different first names) ===")
        for last, init, group in sorted(medium):
            print(f"  {last.title()}, {init.upper()}.")
            for p in group:
                bio = (p["bio"][:60] + "…") if len(p["bio"]) > 60 else p["bio"]
                print(f"      [{p['id']:<35}] {p['name'][0]:<18} {p['name'][1]:<22}  "
                      f"prog={len(p['prog'])}  bio: {bio!r}")
        print()

    # --- LOW confidence: same surname + same canonical first name (nickname
    #     mapping resolves Tom/Thomas etc.) -----------------------------------

    low = []
    for (last, canon), group in by_last_canon.items():
        if not canon:
            continue
        firsts = {strip_diacritics(p["name"][0]).lower().strip(): p for p in group}
        if len(firsts) > 1:
            # Skip groups already reported as MEDIUM (same first initial)
            if all(first_initial(p["name"][0]) == first_initial(group[0]["name"][0])
                   for p in group):
                continue
            low.append((last, canon, list(firsts.values())))
    if low:
        print(f"=== LOW confidence: {len(low)} groups "
              f"(same surname + nickname pair like Tom/Thomas) ===")
        for last, canon, group in sorted(low):
            print(f"  {last.title()} -- {canon.title()}")
            for p in group:
                bio = (p["bio"][:60] + "…") if len(p["bio"]) > 60 else p["bio"]
                print(f"      [{p['id']:<35}] {p['name'][0]:<18} {p['name'][1]:<22}  "
                      f"prog={len(p['prog'])}  bio: {bio!r}")
        print()

    print("Notes:")
    print(" - HIGH groups are very likely the same person and worth merging.")
    print(" - MEDIUM groups need eyeballing (initials vs full first names).")
    print(" - LOW groups catch nickname collisions; many are coincidence.")
    print(" - Same first+last but different bios may still be distinct people")
    print("   (e.g. namesakes at different institutions).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
