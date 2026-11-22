"""Parse games from the "Öll spil" sheet, one 3-column group per game."""

import openpyxl

from .card_sheets import CARD_SHEETS, parse_card_sheets
from .cells import block_rows, is_number, normalize_date, read_string_cell
from .layout import detect_layout, find_game_columns
from .normalize import normalize_expansion, normalize_location, normalize_victory_type
from .teams import (
    build_results_and_seats,
    find_number_column,
    players_from_rows,
    read_player_rows,
    read_score_rows,
)

SHEET_NAME = "Öll spil"


def parse_kingdom(ws, col, kingdom_range):
    """Parse kingdom cards from the kingdom block (card in col, expansion in col+1)."""
    cards = []
    for row in range(kingdom_range[0], kingdom_range[1] + 1):
        card_name = read_string_cell(ws, row, col)
        if card_name is None:
            continue
        expansion = normalize_expansion(read_string_cell(ws, row, col + 1))
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


# Source-expansion tags (e.g. 'Renaissance') sit in col+1 of single-name rows
# to mark which expansion a project/way/trait comes from. They look like names
# but should not be treated as project names.
KNOWN_EXPANSION_TAGS = frozenset({
    'dominion', 'intrigue', 'seaside', 'alchemy', 'prosperity',
    'prospoerity', 'cornucopia', 'guilds', 'cornucopia & guilds',
    'hinterlands', 'dark ages', 'adventures', 'empires', 'nocturne',
    'renaissance', 'menagerie', 'allies', 'plunder', 'rising sun',
})


def is_expansion_tag(val):
    return isinstance(val, str) and val.strip().lower() in KNOWN_EXPANSION_TAGS


def parse_projects(ws, col, projects_range):
    """Parse the project block.

    A game may have more than one project, written either into extra rows of
    the block or into the next column of the same row. col+1 historically holds
    the source-expansion tag (e.g. 'Renaissance') when there is only one
    project, so we read every cell and drop expansion tags — every project
    survives regardless of which cell the user happened to use.
    """
    names = []
    for row in range(projects_range[0], projects_range[1] + 1):
        for offset in (0, 1, 2):
            val = read_string_cell(ws, row, col + offset)
            if val is None or is_expansion_tag(val):
                continue
            names.append(val)
    return names


def parse_traits(ws, col, trait_row):
    """Parse the trait row.

    Each trait may be paired with the kingdom-card pile it's attached to:
      - col+0: trait name (e.g., 'Rich')
      - col+1: source-expansion tag (e.g., 'Plunder') — informational, ignored here
      - col+2: attached kingdom card (e.g., 'Quartermaster') — may be empty for
        older games where the association wasn't recorded.
    Returns a list with at most one entry of shape {'name': str, 'card'?: str}.
    """
    name = read_string_cell(ws, trait_row, col)
    if name is None:
        return []
    card = read_string_cell(ws, trait_row, col + 2)
    if card:
        card = card.strip()
        if card.startswith("(") and card.endswith(")"):
            card = card[1:-1].strip()
        if not card:
            card = None
    entry = {"name": name}
    if card:
        entry["card"] = card
    return [entry]


def parse_avg_score(ws, col, avg_row, scores_range):
    """Parse average score from the avg row."""
    if avg_row is None:
        return None
    score_col = find_number_column(ws, col, scores_range, is_number)
    val = ws.cell(row=avg_row, column=score_col).value
    if is_number(val):
        return round(float(val), 2)
    return None


def parse_card_fields(ws, col, layout):
    """Kingdom, events, landmarks, ... for one game (names as typed)."""
    def rows(key):
        return parse_string_rows(ws, col, block_rows(layout[key]))

    return {
        "kingdom": parse_kingdom(ws, col, layout["kingdom"]),
        "events": rows("events"),
        "landmarks": rows("landmarks"),
        "projects": parse_projects(ws, col, layout["projects"]) if layout["projects"] else [],
        "ways": rows("way"),
        "allies": rows("allies"),
        "traits": parse_traits(ws, col, layout["trait"]) if layout["trait"] else [],
        "prophecy": rows("prophecy"),
    }


def parse_game(ws, game_num, col, layout):
    """Parse a single game from its 3-column group using the detected layout.

    Games with players but no places or scores are still included (with empty
    results) so they count toward player stats like "biggest game".
    """
    player_rows = read_player_rows(ws, col, layout["players"])
    if not player_rows:
        return None  # empty column: nobody has played this game yet

    players = players_from_rows(player_rows)
    score_rows = read_score_rows(ws, col, layout["scores"], players)
    results, seats = build_results_and_seats(players, player_rows, score_rows)
    expansions = parse_string_rows(ws, col, block_rows(layout["expansions"]))

    return {
        "game_num": game_num,
        "date": normalize_date(ws.cell(row=layout["date"], column=col).value),
        "location": normalize_location(read_string_cell(ws, layout["game_num"], col + 1)),
        "players": players,
        "results": results,
        **parse_card_fields(ws, col, layout),
        "expansions": [normalize_expansion(e) for e in expansions],
        "victory_type": normalize_victory_type(read_string_cell(ws, layout["victory"], col)),
        "avg_score": parse_avg_score(ws, col, layout["avg"], layout["scores"]),
        "seats": seats,
    }


def parse_spreadsheet(xlsx_path):
    """Parse all games from the spreadsheet."""
    wb = openpyxl.load_workbook(str(xlsx_path), data_only=True)

    if SHEET_NAME not in wb.sheetnames:
        raise RuntimeError(
            f"Sheet '{SHEET_NAME}' not found. Available: {wb.sheetnames}"
        )

    ws = wb[SHEET_NAME]
    layout = detect_layout(ws)
    print(f"Detected layout: {layout}")
    game_columns = find_game_columns(ws)
    print(f"Found {len(game_columns)} game columns in spreadsheet")

    games = []
    skipped = 0

    for game_num, col in game_columns:
        game = parse_game(ws, game_num, col, layout)
        if game is None:
            skipped += 1
            continue
        games.append(game)

    games.sort(key=lambda g: g["game_num"])

    print(f"Parsed {len(games)} games, skipped {skipped} incomplete")

    sheet_cards = parse_card_sheets(wb)
    print(f"Parsed {len(sheet_cards)} cards from {len(CARD_SHEETS)} expansion sheets")

    return games, skipped, sheet_cards
