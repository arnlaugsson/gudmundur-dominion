#!/usr/bin/env python3
"""
Download a public Google Spreadsheet (or read a local XLSX file) and parse
the "Oll spil" sheet into a unified games array for dominion_data.json.

Usage:
    python3 scripts/sync_spreadsheet.py                    # download from Google
    python3 scripts/sync_spreadsheet.py path/to/local.xlsx # use local file
    python3 scripts/sync_spreadsheet.py --download-only    # just fetch data/spreadsheet.xlsx

The parsing lives in the sibling package scripts/sheet_sync/; this file is the
entry point the GitHub Action runs, and re-exports the package's public names
so tests can keep loading it directly.
"""

import sys
import urllib.error
import urllib.request
from pathlib import Path

# Make the sibling package importable however this file is loaded (run as a
# script, or via importlib from a test).
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sheet_sync.games import SHEET_NAME, parse_game, parse_spreadsheet  # noqa: E402,F401
from sheet_sync.layout import detect_layout, find_game_columns  # noqa: E402,F401
from sheet_sync.output import JSON_FILE, update_json  # noqa: E402,F401

SPREADSHEET_URL = (
    "https://docs.google.com/spreadsheets/d/"
    "14f5TW05_jpnWGf6d3cAO7ChSrHPZl0dIbxyIO3qqe2A/export?format=xlsx"
)
ROOT = Path(__file__).resolve().parent.parent
DOWNLOAD_PATH = ROOT / "data" / "spreadsheet.xlsx"
DOWNLOAD_ONLY_FLAG = "--download-only"


def download_spreadsheet(dest):
    """Download the public spreadsheet as XLSX."""
    print(f"Downloading spreadsheet to {dest} ...")
    try:
        urllib.request.urlretrieve(SPREADSHEET_URL, str(dest))
    except urllib.error.URLError as e:
        print(f"Error: Failed to download spreadsheet: {e}")
        sys.exit(1)
    print("Download complete.")
    return dest


def count_pending(games):
    """Games beyond the latest completed one that have players but no results."""
    max_completed = max((g["game_num"] for g in games if g["results"]), default=0)
    return sum(
        1 for g in games
        if g["game_num"] > max_completed and g["players"] and not g["results"]
    )


def main():
    if sys.argv[1:] == [DOWNLOAD_ONLY_FLAG]:
        # CI downloads first, runs the tests against the fresh sheet, and only
        # then parses it and writes the JSON.
        download_spreadsheet(DOWNLOAD_PATH)
        return
    if len(sys.argv) > 1:
        xlsx_path = Path(sys.argv[1])
        if not xlsx_path.exists():
            print(f"Error: File not found: {xlsx_path}")
            sys.exit(1)
    else:
        xlsx_path = DOWNLOAD_PATH
        download_spreadsheet(xlsx_path)

    games, _skipped, sheet_cards = parse_spreadsheet(xlsx_path)
    update_json(games, sheet_cards, count_pending(games))


if __name__ == "__main__":
    main()
