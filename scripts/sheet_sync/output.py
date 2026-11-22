"""Build and write dominion_data.json.

The GitHub Action commits and deploys whenever `git diff` shows a change, so
the file is only rewritten (and `last_updated` only bumped) when its content
actually changed.
"""

import datetime
import json
from pathlib import Path

from .card_list import sync_cards
from .normalize import build_card_name_map, canonicalize_game_cards

ROOT = Path(__file__).resolve().parent.parent.parent
JSON_FILE = ROOT / "data" / "dominion_data.json"

TIMESTAMP_KEY = "last_updated"
TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M"
DROPPED_KEYS = ("legacy_games",)


def _without_timestamp(data):
    """JSON-equivalent copy of data minus last_updated, for comparison."""
    stripped = {k: v for k, v in data.items() if k != TIMESTAMP_KEY}
    return json.loads(json.dumps(stripped, ensure_ascii=False))


def _merge_keys(existing, overrides):
    """existing with overrides applied, keeping existing key order."""
    kept = {k: overrides.get(k, v) for k, v in existing.items() if k not in DROPPED_KEYS}
    added = {k: v for k, v in overrides.items() if k not in kept}
    return {**kept, **added}


def build_output(existing, games, sheet_cards, upcoming_count, now):
    """Return (data, changed) for the new dominion_data.json.

    existing is the current file's content ({} if absent) and is not modified.
    When nothing but the timestamp would differ, existing is returned as-is
    with changed=False, so its last_updated is kept.
    """
    overrides = {"games": games, "upcoming_games": upcoming_count}
    if existing.get("cards"):
        cards = sync_cards(existing["cards"], sheet_cards, games)
        name_map = build_card_name_map(cards)
        overrides = {
            **overrides,
            "cards": cards,
            "games": [canonicalize_game_cards(g, name_map) for g in games],
        }

    candidate = _merge_keys(existing, overrides)
    if _without_timestamp(candidate) == _without_timestamp(existing):
        return existing, False

    stamped = _merge_keys(candidate, {TIMESTAMP_KEY: now})
    return stamped, True


def _load(json_file):
    if not json_file.exists():
        return {}
    with open(json_file, encoding="utf-8") as f:
        return json.load(f)


def update_json(games, sheet_cards, upcoming_count, json_file=JSON_FILE, now=None):
    """Write dominion_data.json if its content changed. Returns whether it did."""
    existing = _load(json_file)
    stamp = now or datetime.datetime.now().strftime(TIMESTAMP_FORMAT)
    data, changed = build_output(existing, games, sheet_cards, upcoming_count, stamp)

    if not changed:
        print(f"No changes; left {json_file} untouched "
              f"(last_updated {existing.get(TIMESTAMP_KEY)})")
        return False

    if any(k in existing for k in DROPPED_KEYS):
        print(f"Removed keys: {[k for k in DROPPED_KEYS if k in existing]}")

    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Updated {json_file} with {len(games)} games")
    return True
