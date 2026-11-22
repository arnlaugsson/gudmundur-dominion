"""Parse the per-expansion card sheets into a flat card list."""

from .cells import read_cell, read_string_cell
from .normalize import normalize_expansion

# --- Card list ---------------------------------------------------------------
# Every expansion has its own sheet listing that set's cards. Those sheets are
# the authority for a card's spelling, cost and notes; `cards` in the JSON is
# reconciled against them on each sync so a correction made in the spreadsheet
# reaches the site on its own.
CARD_SHEETS = (
    "Base", "Intrigue", "Seaside", "Alchemy", "Prosperity", "Cornucopia & Guilds",
    "Hinterlands", "Dark Ages", "Adventures", "Empires", "Nocturne", "Renaissance",
    "Menagerie", "Allies", "Plunder", "Rising sun", "Promo",
)

# Column headers inside a card block, mapped to the field they fill. The count
# column is read but discarded: it counts appearances, while times_used counts
# games, so it is recomputed from the games instead (see count_card_usage).
CARD_COLUMNS = {
    "nafn": "name",
    "kostnaður": "cost",
    "skuld": "debt",
    "potion": "potion",
    "athugasemdir": "notes",
}

# Sheets put non-Kingdom cards in their own labelled block off to the right.
# The label sits in the block's name column and names the type of its rows.
CARD_BLOCK_TYPES = {
    "events": "Event",
    "landmarks": "Landmark",
    "projects": "Project",
    "ways": "Way",
    "allies": "Ally",
    "prophecies": "Prophecy",
    "traits": "Trait",
}

# Kingdom blocks run unbroken apart from the odd single spacer row.
CARD_BLOCK_MAX_GAP = 3
# How far to hunt for the labelled blocks described above.
CARD_LABEL_SCAN_ROWS = 60
CARD_LABEL_SCAN_COLS = 30

# Misspellings in the card list, mapped to the spelling the card sheets use.
# Only genuine misspellings belong here — a name that differs from the sheet
# purely by capitalisation keeps the capitalisation the card list already has,
# because that is what the card images in Storage are named after.
CARD_NAME_FIXES = {
    "Transmongrify": "Transmogrify",
    "Apotechary": "Apothecary",
    # Two Plunder traits typed into one cell on the Plunder sheet; "Rich" has a
    # row of its own directly below, so this one is "Reckless".
    "RecklessRich": "Reckless",
}

# Kept lowercase inside a title, matching how the card images are named
# (Way_of_the_Goat, Salt_the_Earth).
TITLE_CASE_SMALL_WORDS = frozenset({
    "a", "an", "and", "of", "the", "to", "in", "on", "for", "with", "at", "by",
})


def title_case_card_name(name):
    """Title-case a name from the sheets, which capitalise inconsistently.

    Applied only to cards being added for the first time. A card already in the
    list keeps its existing capitalisation, which has been corrected by hand and
    which the card image filenames depend on.
    """
    words = name.split(" ")
    out = []
    for index, word in enumerate(words):
        if not word:
            continue
        lower = word.lower()
        if index > 0 and lower in TITLE_CASE_SMALL_WORDS:
            out.append(lower)
        elif word[:1].islower():
            out.append(word[:1].upper() + word[1:])
        else:
            out.append(word)
    return " ".join(out)


def card_block_columns(ws, header_row, name_col):
    """Map field name -> column for one card block, from its header row."""
    columns = {"name": name_col}
    for col in range(name_col, name_col + 6):
        header = read_string_cell(ws, header_row, col)
        if header is None:
            continue
        field = CARD_COLUMNS.get(header.lower())
        if field and field != "name":
            columns[field] = col
    return columns


def read_card_block(ws, header_row, name_col, card_type, expansion):
    """Read the rows of one card block, starting below its header row."""
    columns = card_block_columns(ws, header_row, name_col)
    cards = []
    blanks = 0
    row = header_row + 1

    while row <= ws.max_row and blanks < CARD_BLOCK_MAX_GAP:
        name = read_string_cell(ws, row, name_col)
        if name is None:
            blanks += 1
            row += 1
            continue
        # A block ends where the next one is labelled, e.g. Plunder stacks
        # "Traits" directly below its events.
        if name.lower() in CARD_BLOCK_TYPES:
            break

        blanks = 0
        card = {
            "name": CARD_NAME_FIXES.get(name, name),
            "expansion": expansion,
            "card_type": card_type,
        }

        # Only fields the block actually records are carried. A blank cell means
        # "not written down", never "clear what is already known": the sheets
        # leave costs off every Landmark/Way/Ally/Prophecy block entirely, and
        # omit the odd Kingdom cost (Duchess) and 2nd-edition note (Great Hall).
        cost = read_cell(ws, row, columns["cost"]) if "cost" in columns else None
        if isinstance(cost, (int, float)):
            card["cost"] = int(cost)

        debt = read_cell(ws, row, columns["debt"]) if "debt" in columns else None
        if isinstance(debt, (int, float)) and debt:
            card["debt"] = int(debt)

        potion = read_cell(ws, row, columns["potion"]) if "potion" in columns else None
        if potion:
            card["potion"] = True

        notes = read_string_cell(ws, row, columns["notes"]) if "notes" in columns else None
        if notes:
            card["notes"] = notes
            card["removed"] = notes == "Fjarlægt"

        cards.append(card)
        row += 1

    return cards


def parse_card_sheets(wb):
    """Parse every expansion sheet into a flat list of cards."""
    cards = []
    for sheet in CARD_SHEETS:
        if sheet not in wb.sheetnames:
            print(f"Warning: card sheet {sheet!r} not found, skipping")
            continue
        ws = wb[sheet]
        expansion = normalize_expansion(sheet)

        cards += read_card_block(ws, 2, 1, "Kingdom", expansion)

        for row in range(1, CARD_LABEL_SCAN_ROWS + 1):
            for col in range(1, CARD_LABEL_SCAN_COLS + 1):
                if row == 1 and col == 1:
                    continue  # the sheet's own title, not a block label
                label = read_string_cell(ws, row, col)
                if label is None:
                    continue
                card_type = CARD_BLOCK_TYPES.get(label.lower())
                if card_type:
                    cards += read_card_block(ws, row, col, card_type, expansion)

    return dedupe_sheet_cards(cards)


def dedupe_sheet_cards(cards):
    """Collapse cards listed more than once on a sheet.

    Dark Ages lists "Shelters" twice, once with a cost and once without. Keep
    whichever entry carries the most detail so the two do not overwrite each
    other on alternate syncs.
    """
    def detail(card):
        return sum(1 for value in card.values() if value not in (None, "", False))

    best = {}
    for card in cards:
        key = card["name"].lower()
        if key not in best or detail(card) > detail(best[key]):
            best[key] = card

    if len(best) != len(cards):
        for key, card in best.items():
            if sum(1 for c in cards if c["name"].lower() == key) > 1:
                print(f"Card listed more than once on its sheet: {card['name']} "
                      f"({card['expansion']}) — kept the fullest entry")

    return list(best.values())
