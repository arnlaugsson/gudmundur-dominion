#!/usr/bin/env python3
"""Regression test: the sync script must locate rows by their column-A labels,
so inserting/removing rows in the Google Sheet never shifts fields into the
wrong bucket (prophecies into expansions, expansions into victory_type, ...).

Run: python3 scripts/test_sync_layout.py
Uses the checked-in data/spreadsheet.xlsx as the fixture.
"""

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "data" / "spreadsheet.xlsx"

spec = importlib.util.spec_from_file_location("sync", ROOT / "scripts" / "sync_spreadsheet.py")
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

# Prophecy card names must never appear as an expansion.
PROPHECY_NAMES = {
    "harsh winter", "kind emperor", "panic", "progress", "rapid expansion",
    "sickness", "approaching army", "biding time", "bureaucracy", "divine wind",
    "enlightenment", "flourishing trade", "good harvest", "great leader", "growth",
}
# Victory types are the only legal values (plus None); anything else means a
# neighbouring row (an expansion name) leaked into the victory_type column.
VALID_VICTORY = {None, "Province", "Colony", "Supply piles"}


def main():
    games, _ = sync.parse_spreadsheet(str(XLSX))
    by_num = {g["game_num"]: g for g in games}
    failures = []

    for g in games:
        for e in g.get("expansions") or []:
            if e.lower() in PROPHECY_NAMES:
                failures.append(f"game {g['game_num']}: prophecy '{e}' leaked into expansions")
        if g.get("victory_type") not in VALID_VICTORY:
            failures.append(f"game {g['game_num']}: bad victory_type {g['victory_type']!r}")

    # Spot-check a known Rising Sun game with a prophecy (game 74 in the fixture).
    g74 = by_num.get(74)
    if g74:
        if "Kind emperor" not in (g74.get("prophecy") or []):
            failures.append("game 74: expected prophecy 'Kind emperor' in prophecy field")
        if "Rising Sun" not in (g74.get("expansions") or []):
            failures.append("game 74: expected 'Rising Sun' in expansions")

    if failures:
        print("FAIL:")
        for f in failures:
            print("  -", f)
        sys.exit(1)
    print(f"OK: {len(games)} games parsed, no leakage, victory types clean.")


if __name__ == "__main__":
    main()
