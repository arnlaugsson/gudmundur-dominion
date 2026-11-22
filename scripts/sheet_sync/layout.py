"""Locate the "Öll spil" sections by their column-A labels."""

# The sheet's row layout is NOT hardcoded. Rows are located at runtime from the
# labels in column A (see detect_layout) so that inserting or removing rows in
# the Google Sheet — e.g. adding the Prophecy row, or a second Project slot —
# never shifts a field into the wrong bucket. ROW_GAME_NUM is the one fixed
# anchor: game numbers always live on the second row and drive column discovery.
ROW_GAME_NUM = 2

# Each key maps to one label in column A (matched case-insensitively). Labels
# with a trailing hint like "Kingdom spil (G)" are matched by prefix.
SECTION_LABELS = {
    "date": ("Dagsetning", "exact"),
    "players": ("Spilarar", "exact"),
    "kingdom": ("Kingdom", "prefix"),
    # Row labelled "Auka spil" is an 11th kingdom-card slot, not a section of
    # its own. It is folded into the kingdom block in detect_layout().
    "kingdom_extra": ("Auka spil", "exact"),
    "events": ("Event", "prefix"),
    "landmarks": ("Landmark", "prefix"),
    "projects": ("Project", "exact"),
    "way": ("Way", "exact"),
    "allies": ("Allies", "exact"),
    "trait": ("Trait", "exact"),
    "prophecy": ("Prophecy", "exact"),
    "expansions": ("Sett", "exact"),
    "victory": ("Sigurtegund", "exact"),
    "scores": ("Sæti", "exact"),
    "avg": ("Meðalstig", "exact"),
}
# Sections that must exist for a parse to be trustworthy. "prophecy" is optional
# so older exports made before the Prophecy row existed still parse.
REQUIRED_SECTIONS = ("players", "kingdom", "expansions", "victory", "scores")
# How far down column A to scan for labels.
LABEL_SCAN_ROWS = 80


def scan_labels(ws):
    """All labelled rows in column A, in order: [(row, lowercased text)]."""
    labelled = []
    for row in range(1, LABEL_SCAN_ROWS + 1):
        val = ws.cell(row=row, column=1).value
        if isinstance(val, str) and val.strip():
            labelled.append((row, val.strip().lower()))
    return labelled


def find_label(labelled, label, mode):
    """Row of the first label matching exactly or by prefix, else None."""
    target = label.lower()
    for row, text in labelled:
        if (text == target) if mode == "exact" else text.startswith(target):
            return row
    return None


def detect_layout(ws):
    """Locate each section by its column-A label and return a layout dict.

    Multi-row sections (players, kingdom, expansions, scores, ...) are returned
    as an inclusive (start, end) row range that runs from the section's label
    up to the row before the next label — so the block auto-resizes when rows
    are inserted. Single-value sections (trait, victory) return an int row.
    Raises RuntimeError if a required label is missing (fail fast, don't guess).
    """
    labelled = scan_labels(ws)
    label_rows = [row for row, _ in labelled]
    found = {key: find_label(labelled, label, mode)
             for key, (label, mode) in SECTION_LABELS.items()}

    missing = [k for k in REQUIRED_SECTIONS if found.get(k) is None]
    if missing:
        raise RuntimeError(
            f"Could not locate required sheet sections {missing} by their labels "
            f"in column A. Detected labels: {[t for _, t in labelled]}"
        )

    def next_label_row(row):
        later = [r for r in label_rows if r > row]
        return min(later) if later else row

    def block(row):
        return (row, next_label_row(row) - 1)

    # "Auka spil" holds an 11th kingdom card. Because it carries its own label
    # it would otherwise close the kingdom block early and the card would be
    # dropped, so extend the block over it when it sits directly below.
    kingdom_block = block(found["kingdom"])
    extra = found.get("kingdom_extra")
    if extra is not None and extra == kingdom_block[1] + 1:
        kingdom_block = (kingdom_block[0], block(extra)[1])

    layout = {
        "game_num": ROW_GAME_NUM,
        "date": found["date"] or 1,
        "players": block(found["players"]),
        "kingdom": kingdom_block,
        "events": block(found["events"]) if found["events"] else None,
        "landmarks": block(found["landmarks"]) if found["landmarks"] else None,
        "projects": block(found["projects"]) if found["projects"] else None,
        "way": block(found["way"]) if found["way"] else None,
        "allies": block(found["allies"]) if found["allies"] else None,
        "trait": found["trait"],
        "prophecy": block(found["prophecy"]) if found["prophecy"] else None,
        "expansions": block(found["expansions"]),
        "victory": found["victory"],
        "scores": block(found["scores"]),
        "avg": found["avg"],
    }
    return layout


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
