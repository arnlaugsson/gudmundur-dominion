"""Players + scores blocks -> results and seats, with team play.

A seat is one competitor in a game: usually one person, sometimes a team of
2+ people sharing a score. The sheet marks teams in three ways:

- players block: the partner written beside the name, before the place column
  (games 19-31, 139), or "A & B" / "A + B" in the name cell;
- scores block: the partner beside the name, before the score column (games
  38, 86, 104), or "A & B" in the name cell. Here the extra column is also used
  for notes ("færri umferðir"), so it only counts when it names a player of
  that game.

Places in the sheet are per person (team members share one); seat places are
the competition rank among seats.
"""

import re

from .cells import is_number, is_valid_place, read_string_cell
from .normalize import normalize_player_name

TEAM_SEPARATOR = re.compile(r"\s*[&+]\s*")
# Where the place/score column may sit, relative to the game's first column.
NUMBER_COLUMN_OFFSETS = (2, 3, 4)
DEFAULT_NUMBER_OFFSET = 2


def split_names(text):
    """'Mummi & Halla + Fúsi' -> ['Mummi', 'Halla', 'Fúsi'] (normalised)."""
    if not text:
        return []
    parts = (normalize_player_name(p) for p in TEAM_SEPARATOR.split(text))
    return [p for p in parts if p]


def find_number_column(ws, col, block, accept):
    """First column right of the names holding a value accepted by accept()."""
    for offset in NUMBER_COLUMN_OFFSETS:
        for row in range(block[0], block[1] + 1):
            if accept(ws.cell(row=row, column=col + offset).value):
                return col + offset
    return col + DEFAULT_NUMBER_OFFSET


def _row_names(ws, row, col, number_col):
    """(primary names, extra names) of one row; extras sit before number_col."""
    primary = split_names(read_string_cell(ws, row, col))
    extras = [name for c in range(col + 1, number_col)
              for name in split_names(read_string_cell(ws, row, c))]
    return primary, extras


def read_player_rows(ws, col, block):
    """Players block -> [{'members': [...], 'place': int|None}]."""
    place_col = find_number_column(ws, col, block, is_valid_place)
    rows = []
    for row in range(block[0], block[1] + 1):
        primary, extras = _row_names(ws, row, col, place_col)
        if not primary:
            continue
        place_val = ws.cell(row=row, column=place_col).value
        place = int(place_val) if is_valid_place(place_val) else None
        rows.append({"members": _unique(primary + extras), "place": place})
    return rows


def read_score_rows(ws, col, block, players):
    """Scores block -> [{'members': [...], 'score': float|None}].

    Extra cells only count as teammates when they name one of players who
    does not also have a scores row of their own; a name of someone with their
    own row annotates a tie (games 111/112), not a team.
    """
    score_col = find_number_column(ws, col, block, is_number)
    raw = []
    for row in range(block[0], block[1] + 1):
        primary, extras = _row_names(ws, row, col, score_col)
        if not primary:
            continue
        score_val = ws.cell(row=row, column=score_col).value
        score = float(score_val) if is_number(score_val) else None
        raw.append((primary, extras, score))

    has_own_row = {name for primary, _, _ in raw for name in primary}
    eligible = set(players) - has_own_row
    return [
        {"members": _unique(primary + [n for n in extras if n in eligible]), "score": score}
        for primary, extras, score in raw
    ]


def players_from_rows(player_rows):
    """Flat, de-duplicated player list in sheet order."""
    return _unique([name for row in player_rows for name in row["members"]])


def _unique(names):
    return list(dict.fromkeys(names))


def group_seats(players, player_rows, score_rows):
    """Partition players into seats (lists of names, in players order)."""
    groups = [frozenset([p]) for p in players]
    known = set(players)
    for row in player_rows + score_rows:
        members = {m for m in row["members"] if m in known}
        touching = [g for g in groups if g & members]
        if len(touching) < 2:
            continue
        merged = frozenset().union(*touching)
        groups = [g for g in groups if not g & members] + [merged]
    order = {name: i for i, name in enumerate(players)}
    ordered = sorted(groups, key=lambda g: min(order[n] for n in g))
    return [sorted(g, key=order.get) for g in ordered]


def _seat_value(members, rows, field):
    """First non-None field among rows naming any of members."""
    names = set(members)
    for row in rows:
        if row[field] is not None and names & set(row["members"]):
            return row[field]
    return None


def competition_rank(values, better):
    """Rank each value: 1 + number of values strictly better. None stays None."""
    present = [v for v in values if v is not None]
    return [None if v is None else 1 + sum(1 for o in present if better(o, v))
            for v in values]


def build_seats(players, player_rows, score_rows):
    """Seats with their sheet place (or score-inferred place) and score.

    Returns [{'players', 'sheet_place', 'place', 'score'}] in players order;
    sheet_place is what results[].place reports, place is the seat rank.
    """
    groups = group_seats(players, player_rows, score_rows)
    scores = [_seat_value(g, score_rows, "score") for g in groups]
    places = [_seat_value(g, player_rows, "place") for g in groups]
    if all(p is None for p in places):
        # No places in the sheet: rank seats by score, highest first.
        places = competition_rank(scores, lambda a, b: a > b)
    ranks = competition_rank(places, lambda a, b: a < b)
    return [
        {"players": g, "sheet_place": p, "place": r, "score": s}
        for g, p, r, s in zip(groups, places, ranks, scores)
    ]


def _result(name, seat, seats):
    tied = [n for other in seats
            if other is not seat and other["sheet_place"] == seat["sheet_place"]
            for n in other["players"]]
    entry = {
        "place": seat["sheet_place"],
        "name": name,
        "tied_with": tied or None,
        "score": seat["score"],
    }
    teammates = [n for n in seat["players"] if n != name]
    return {**entry, "teammates": teammates} if teammates else entry


def build_results_and_seats(players, player_rows, score_rows):
    """Return (results, seats) for a game; both sorted by place.

    results: one entry per placed player (solo players have no 'teammates').
    seats:   [{'players', 'place', 'score'}], place = rank among seats.
    """
    seats = [s for s in build_seats(players, player_rows, score_rows)
             if s["sheet_place"] is not None]
    seat_of = {name: seat for seat in seats for name in seat["players"]}
    results = [_result(name, seat_of[name], seats) for name in players if name in seat_of]
    results = sorted(results, key=lambda r: r["place"])
    public_seats = sorted(
        ({"players": s["players"], "place": s["place"], "score": s["score"]} for s in seats),
        key=lambda s: s["place"],
    )
    return results, public_seats
