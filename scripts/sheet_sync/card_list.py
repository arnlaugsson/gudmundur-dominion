"""Reconcile the JSON card list against the expansion sheets."""

from .card_sheets import CARD_NAME_FIXES, title_case_card_name


# Entries that duplicate a real card under a wrong name or expansion. Keyed by
# (name, expansion) so the correct entry with the same name survives.
CARD_DROPS = {
    ("Transmogrify", "Intrigue"),
    ("Harbringer", "Base"),
}


def card_names_used(game):
    """Every card/event/landmark/... name a game references."""
    names = []
    for entry in game.get("kingdom") or []:
        if isinstance(entry, dict) and entry.get("card"):
            names.append(entry["card"])
    for key in ("events", "landmarks", "projects", "ways", "allies", "prophecy"):
        for value in game.get(key) or []:
            if isinstance(value, str):
                names.append(value)
    for trait in game.get("traits") or []:
        if not isinstance(trait, dict):
            continue
        if trait.get("name"):
            names.append(trait["name"])
        # The pile a trait is attached to is a kingdom pile in that game.
        if trait.get("card"):
            names.append(trait["card"])
    return names


def count_card_usage(games):
    """Map lowercased card name -> number of games it appears in.

    Matched case-insensitively: "Öll spil" and the card list disagree on
    capitalisation for many names (e.g. "Wishing well" vs "Wishing Well"),
    and a case-sensitive count silently reports 0 for those.
    """
    counts = {}
    for game in games:
        for name in {n.lower() for n in card_names_used(game)}:
            counts[name] = counts.get(name, 0) + 1
    return counts


# Fields the expansion sheets may speak for. A sheet only overrides a field it
# actually recorded, so anything missing there leaves the card list untouched.
CARD_SHEET_FIELDS = ("expansion", "cost", "debt", "potion", "notes", "removed", "card_type")

# Defaults for a card being added from a sheet that did not record these.
CARD_DEFAULTS = {"cost": None, "debt": None, "potion": False, "notes": None, "removed": False}


def sync_cards(cards, sheet_cards, games):
    """Reconcile the card list against the expansion sheets.

    The sheets decide a card's details, but a card already in the list keeps its
    own name: those have been corrected by hand and the card images in Storage
    are named after them, so adopting the sheet's capitalisation would silently
    break every image. Genuine misspellings are corrected through
    CARD_NAME_FIXES instead.

    Cards absent from the sheets are kept, not deleted. Split-pile members
    (Knights, Augurs, ...), Loot and the always-in-supply cards are all real
    cards that the sheets simply do not list.
    """
    cleaned = _clean_card_list(cards)
    by_name, added, updated = _apply_sheet_cards(cleaned, sheet_cards)

    sheet_names = {s["name"].lower() for s in sheet_cards}
    unlisted = [c["name"] for c in by_name.values() if c["name"].lower() not in sheet_names]

    counts = count_card_usage(games)
    merged = [{**card, "times_used": counts.get(card["name"].lower(), 0)}
              for card in by_name.values()]

    print(f"Cards: {len(cards)} -> {len(merged)} "
          f"({added} added from expansion sheets, {updated} fields updated)")
    print(f"Cards not listed on any expansion sheet (kept): {len(unlisted)}")

    return merged


def _fill_blanks(existing, card):
    """existing with its empty fields filled from card."""
    filled = {field: value for field, value in card.items()
              if existing.get(field) in (None, "") and value not in (None, "")}
    return {**existing, **filled}


def _clean_card_list(cards):
    """Drop known-bad entries, fix misspellings, merge case-duplicates.

    Returns an ordered {lowercased name: card} dict of new card dicts.
    """
    by_name = {}
    for card in cards:
        if (card.get("name"), card.get("expansion")) in CARD_DROPS:
            print(f"Dropped duplicate card entry: {card['name']} ({card['expansion']})")
            continue

        fixed = CARD_NAME_FIXES.get(card.get("name"))
        if fixed:
            print(f"Renamed card: {card['name']} -> {fixed}")
            card = {**card, "name": fixed}

        key = card["name"].lower()
        if key in by_name:
            # Same card listed twice; fill blanks from the later entry rather
            # than discarding data (e.g. Shelters, listed with and without cost).
            by_name[key] = _fill_blanks(by_name[key], card)
            print(f"Merged duplicate card entry: {card['name']}")
            continue
        by_name[key] = dict(card)
    return by_name


def _apply_sheet_cards(by_name, sheet_cards):
    """Add new sheet cards and overwrite fields the sheets speak for.

    Returns (new ordered {key: card} dict, cards added, fields updated).
    """
    result = dict(by_name)
    added = 0
    updated = 0
    for sheet_card in sheet_cards:
        key = sheet_card["name"].lower()
        existing = result.get(key)

        if existing is None:
            result[key] = {**CARD_DEFAULTS, **sheet_card,
                           "name": title_case_card_name(sheet_card["name"]),
                           "times_used": 0}
            added += 1
            continue

        changes = {field: sheet_card[field] for field in CARD_SHEET_FIELDS
                   if field in sheet_card and existing.get(field) != sheet_card[field]}
        if changes:
            result[key] = {**existing, **changes}
            updated += len(changes)
    return result, added, updated
