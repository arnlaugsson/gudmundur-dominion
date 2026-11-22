"""Normalisation of names typed inconsistently into the sheet.

Everything here used to be patched up at runtime by src/data.js; doing it in
the sync means dominion_data.json is already clean when the frontend loads it.
"""

import re

PLAYER_NAME_FIXES = {
    "Hallgríur": "Hallgrímur",
    "Haflið": "Hafliði",
}

EXPANSION_FIXES = {
    "Cornucopia": "Cornucopia & Guilds",
    "Prospoerity": "Prosperity",
    "Rising sun": "Rising Sun",
    "Dark ages": "Dark Ages",
}

# Icelandic case declensions of the same place, collapsed to the nominative.
LOCATION_FIXES = {
    "Laugarási": "Laugarás",
    "Húsafelli": "Húsafell",
    "Arnarholti": "Arnarholt",
    "Álfheimum": "Álfheimar",
    "Laugalæk 23": "Laugalækur",
}

# (pattern, canonical victory type); first match wins.
VICTORY_TYPE_PATTERNS = (
    (re.compile(r"^provinc(es?|ce)$", re.IGNORECASE), "Province"),
    (re.compile(r"^colon(y|ies)$", re.IGNORECASE), "Colony"),
    (re.compile(r"^supply", re.IGNORECASE), "Supply piles"),
)

# Game fields holding plain card-name strings.
CARD_STRING_FIELDS = ("events", "landmarks", "projects", "ways", "allies", "prophecy")


def normalize_player_name(raw):
    """Fix known player name typos."""
    if raw is None:
        return None
    name = raw.strip()
    return PLAYER_NAME_FIXES.get(name, name)


def normalize_expansion(raw):
    """Fix known expansion name typos and inconsistencies."""
    if raw is None:
        return None
    return EXPANSION_FIXES.get(raw, raw)


def normalize_location(raw):
    """Collapse declined place names to one spelling."""
    if raw is None:
        return None
    return LOCATION_FIXES.get(raw, raw)


def normalize_victory_type(raw):
    """Normalize victory type string to Province / Colony / Supply piles."""
    if raw is None:
        return None
    text = raw.strip()
    for pattern, canonical in VICTORY_TYPE_PATTERNS:
        if pattern.search(text):
            return canonical
    return raw


def _uppercase_weight(name):
    """How "title-cased" a name is: characters other than a-z (as data.js did)."""
    return len(re.sub(r"[a-z]", "", name))


def build_card_name_map(cards):
    """Map lowercased card name -> canonical spelling from the card list.

    When the list holds several capitalisations of one name, prefer the one
    with more uppercase letters (proper title case), first one on a tie.
    """
    best = {}
    for card in cards:
        name = card.get("name")
        if not name:
            continue
        key = name.lower()
        current = best.get(key)
        if current is None or _uppercase_weight(name) > _uppercase_weight(current):
            best[key] = name  # local accumulator; inputs are never modified
    return best


def _canonical(name, name_map):
    if not isinstance(name, str):
        return name
    return name_map.get(name.lower(), name)


def _canonical_trait(trait, name_map):
    if not isinstance(trait, dict):
        return trait
    fixed = {"name": _canonical(trait.get("name"), name_map)}
    if trait.get("card"):
        fixed = {**fixed, "card": _canonical(trait["card"], name_map)}
    return {**trait, **fixed}


def canonicalize_game_cards(game, name_map):
    """Return a copy of game with every card name spelled as in the card list."""
    updates = {
        field: [_canonical(v, name_map) for v in game[field]]
        for field in CARD_STRING_FIELDS if game.get(field)
    }
    if game.get("kingdom"):
        updates["kingdom"] = [
            {**k, "card": _canonical(k.get("card"), name_map)} if isinstance(k, dict) else k
            for k in game["kingdom"]
        ]
    if game.get("traits"):
        updates["traits"] = [_canonical_trait(t, name_map) for t in game["traits"]]
    return {**game, **updates}
