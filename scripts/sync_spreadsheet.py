#!/usr/bin/env python3
"""
Download a public Google Spreadsheet (or read a local XLSX file) and parse
the "Oll spil" sheet into a unified games array for dominion_data.json.

Usage:
    python3 scripts/sync_spreadsheet.py                    # download from Google
    python3 scripts/sync_spreadsheet.py path/to/local.xlsx # use local file
"""

import datetime
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

import openpyxl

SPREADSHEET_URL = (
    "https://docs.google.com/spreadsheets/d/"
    "14f5TW05_jpnWGf6d3cAO7ChSrHPZl0dIbxyIO3qqe2A/export?format=xlsx"
)
ROOT = Path(__file__).resolve().parent.parent
JSON_FILE = ROOT / "data" / "dominion_data.json"
DOWNLOAD_PATH = ROOT / "data" / "spreadsheet.xlsx"

SHEET_NAME = "Öll spil"

# Row layout (1-indexed) within each 3-column game group
ROW_DATE = 1         # col+0: date string
ROW_GAME_NUM = 2     # col+0: game number, col+1: location
ROWS_PLAYERS = (3, 7)  # col+0: player name, col+2: place
ROW_KINGDOM_START = 9
ROW_KINGDOM_END = 18
ROW_EVENT_1 = 20
ROW_EVENT_2 = 21
ROW_LANDMARK_1 = 22
ROW_LANDMARK_2 = 23
ROW_PROJECT = 24
ROW_WAY = 25
ROW_ALLY_1 = 26
ROW_ALLY_2 = 27
ROW_TRAIT = 28
ROW_PROPHECY = 29
ROWS_EXPANSIONS = (30, 33)
ROW_VICTORY_TYPE = 34
ROWS_SCORES = (35, 38)
ROW_AVG_SCORE = 39


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


def normalize_date(raw):
    """Convert date string like '2025.10.17' or '2025.10.17.' to 'YYYY-MM-DD'."""
    if raw is None:
        return None
    if isinstance(raw, datetime.datetime):
        return raw.strftime("%Y-%m-%d")
    s = str(raw).strip().rstrip(".")
    if not s:
        return None
    parts = s.split(".")
    if len(parts) == 3:
        return f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
    return s


def is_valid_place(val):
    """Check if a cell value is a valid place number (not a datetime)."""
    if isinstance(val, datetime.datetime):
        return False
    if isinstance(val, (int, float)):
        return True
    return False


def read_cell(ws, row, col):
    """Read a cell value, returning None for empty-ish values."""
    val = ws.cell(row=row, column=col).value
    if val is None:
        return None
    if isinstance(val, str):
        stripped = val.strip()
        if stripped == "" or stripped.lower() == "x":
            return None
        return stripped
    return val


def read_string_cell(ws, row, col):
    """Read a cell as a string, returning None for empty/placeholder values."""
    val = read_cell(ws, row, col)
    if val is None:
        return None
    if isinstance(val, str):
        return val
    return None


def find_game_columns(ws):
    """Scan row 2 for game number columns. Returns list of (game_num, col)."""
    game_cols = []
    for col in range(1, ws.max_column + 1):
        val = ws.cell(row=ROW_GAME_NUM, column=col).value
        if val is None:
            continue
        if not isinstance(val, (int, float)):
            continue
        num = int(val)
        if num < 1 or num > 9999:
            continue
        # Skip column 1 and 2 which are label columns
        if col <= 2:
            continue
        game_cols.append((num, col))
    return game_cols


def parse_players_and_places(ws, col):
    """Parse player names and places from rows 3-7."""
    players = []
    for row in range(ROWS_PLAYERS[0], ROWS_PLAYERS[1] + 1):
        name = read_string_cell(ws, row, col)
        if name is None:
            continue
        name = normalize_player_name(name)
        place_val = ws.cell(row=row, column=col + 2).value
        place = int(place_val) if is_valid_place(place_val) else None
        players.append({"name": name, "place": place})
    return players


def parse_kingdom(ws, col):
    """Parse kingdom cards from rows 9-18."""
    cards = []
    for row in range(ROW_KINGDOM_START, ROW_KINGDOM_END + 1):
        card_name = read_string_cell(ws, row, col)
        if card_name is None:
            continue
        expansion = read_string_cell(ws, row, col + 1)
        cards.append({"card": card_name, "expansion": expansion})
    return cards


def parse_string_rows(ws, col, rows):
    """Parse string values from a list of rows, filtering out None."""
    values = []
    for row in rows:
        val = read_string_cell(ws, row, col)
        if val is not None:
            values.append(val)
    return values


def parse_scores(ws, col):
    """Parse score rows (35-38). Returns list of {name, score}."""
    scores = []
    for row in range(ROWS_SCORES[0], ROWS_SCORES[1] + 1):
        name = read_string_cell(ws, row, col)
        if name is None:
            continue
        name = normalize_player_name(name)
        score_val = ws.cell(row=row, column=col + 2).value
        score = float(score_val) if isinstance(score_val, (int, float)) else None
        scores.append({"name": name, "score": score})
    return scores


def parse_avg_score(ws, col):
    """Parse average score from row 39."""
    val = ws.cell(row=ROW_AVG_SCORE, column=col + 2).value
    if isinstance(val, (int, float)):
        return round(float(val), 2)
    return None


PLAYER_NAME_FIXES = {
    "Hallgríur": "Hallgrímur",
}

EXPANSION_FIXES = {
    "Cornucopia": "Cornucopia & Guilds",
    "Prospoerity": "Prosperity",
    "Rising sun": "Rising Sun",
    "Dark ages": "Dark Ages",
}


def normalize_player_name(raw):
    """Fix known player name typos."""
    if raw is None:
        return None
    return PLAYER_NAME_FIXES.get(raw, raw)


def normalize_expansion(raw):
    """Fix known expansion name typos and inconsistencies."""
    if raw is None:
        return None
    return EXPANSION_FIXES.get(raw, raw)


def normalize_victory_type(raw):
    """Normalize victory type string."""
    if raw is None:
        return None
    mapping = {
        "province": "Province",
        "provinces": "Province",
        "provincce": "Province",
        "colony": "Colony",
        "colonies": "Colony",
        "supply piles": "Supply piles",
        "supply": "Supply piles",
    }
    return mapping.get(raw.lower(), raw)


def build_results(player_places, score_list):
    """
    Merge places from rows 3-7 with scores from rows 35-38 by matching
    player names. Sort by place. Detect ties.
    """
    score_map = {s["name"]: s["score"] for s in score_list}

    results = []
    for pp in player_places:
        if pp["place"] is None:
            continue
        results.append({
            "place": pp["place"],
            "name": pp["name"],
            "tied_with": None,
            "score": score_map.get(pp["name"]),
        })

    results.sort(key=lambda r: r["place"])

    # Detect ties: players with same place number
    place_groups = {}
    for r in results:
        p = r["place"]
        if p not in place_groups:
            place_groups[p] = []
        place_groups[p].append(r["name"])

    for r in results:
        group = place_groups[r["place"]]
        if len(group) > 1:
            others = [name for name in group if name != r["name"]]
            r["tied_with"] = others

    return results


def parse_game(ws, game_num, col):
    """Parse a single game from its 3-column group."""
    date_raw = ws.cell(row=ROW_DATE, column=col).value
    date = normalize_date(date_raw)
    location = read_string_cell(ws, ROW_GAME_NUM, col + 1)

    player_places = parse_players_and_places(ws, col)

    # Skip incomplete games: no players or no valid places
    if not player_places:
        return None

    has_places = any(pp["place"] is not None for pp in player_places)
    if not has_places:
        return None

    kingdom = parse_kingdom(ws, col)
    events = parse_string_rows(ws, col, [ROW_EVENT_1, ROW_EVENT_2])
    landmarks = parse_string_rows(ws, col, [ROW_LANDMARK_1, ROW_LANDMARK_2])
    projects = parse_string_rows(ws, col, [ROW_PROJECT])
    ways = parse_string_rows(ws, col, [ROW_WAY])
    allies = parse_string_rows(ws, col, [ROW_ALLY_1, ROW_ALLY_2])
    traits = parse_string_rows(ws, col, [ROW_TRAIT])
    prophecy = parse_string_rows(ws, col, [ROW_PROPHECY])
    expansions = [normalize_expansion(e) for e in parse_string_rows(ws, col, range(ROWS_EXPANSIONS[0], ROWS_EXPANSIONS[1] + 1))]
    victory_type = normalize_victory_type(read_string_cell(ws, ROW_VICTORY_TYPE, col))

    score_list = parse_scores(ws, col)
    avg_score = parse_avg_score(ws, col)

    results = build_results(player_places, score_list)
    players = [pp["name"] for pp in player_places]

    return {
        "game_num": game_num,
        "date": date,
        "location": location,
        "players": players,
        "results": results,
        "kingdom": kingdom,
        "events": events,
        "landmarks": landmarks,
        "projects": projects,
        "ways": ways,
        "allies": allies,
        "traits": traits,
        "prophecy": prophecy,
        "expansions": expansions,
        "victory_type": victory_type,
        "avg_score": avg_score,
    }


def parse_spreadsheet(xlsx_path):
    """Parse all games from the spreadsheet."""
    wb = openpyxl.load_workbook(str(xlsx_path), data_only=True)

    if SHEET_NAME not in wb.sheetnames:
        raise RuntimeError(
            f"Sheet '{SHEET_NAME}' not found. Available: {wb.sheetnames}"
        )

    ws = wb[SHEET_NAME]
    game_columns = find_game_columns(ws)
    print(f"Found {len(game_columns)} game columns in spreadsheet")

    games = []
    skipped = 0

    for game_num, col in game_columns:
        game = parse_game(ws, game_num, col)
        if game is None:
            skipped += 1
            continue
        games.append(game)

    games.sort(key=lambda g: g["game_num"])

    print(f"Parsed {len(games)} games, skipped {skipped} incomplete")
    return games, skipped


def update_json(games, upcoming_count):
    """Update dominion_data.json with new games array."""
    if JSON_FILE.exists():
        with open(JSON_FILE, encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {}

    # Construct a new dict instead of mutating the loaded one
    new_data = {k: v for k, v in data.items() if k != "legacy_games"}
    new_data["games"] = games
    new_data["last_updated"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    new_data["upcoming_games"] = upcoming_count

    if "legacy_games" in data:
        print("Removed 'legacy_games' key")

    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Updated {JSON_FILE} with {len(games)} games")


def main():
    if len(sys.argv) > 1:
        xlsx_path = Path(sys.argv[1])
        if not xlsx_path.exists():
            print(f"Error: File not found: {xlsx_path}")
            sys.exit(1)
    else:
        xlsx_path = DOWNLOAD_PATH
        download_spreadsheet(xlsx_path)

    games, skipped = parse_spreadsheet(xlsx_path)
    update_json(games, skipped)


if __name__ == "__main__":
    main()
