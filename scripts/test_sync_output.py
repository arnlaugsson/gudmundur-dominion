#!/usr/bin/env python3
"""Tests for building/writing dominion_data.json.

The sync runs every 2h and the workflow commits whenever `git diff` shows a
change, so a run that changes nothing must leave the file byte-for-byte alone
(including `last_updated`).

Run: python3 scripts/test_sync_output.py
"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sheet_sync.output import build_output, update_json  # noqa: E402

OLD_STAMP = "2024-01-01 00:00"
NEW_STAMP = "2026-11-21 12:00"


def game(num=1, kingdom=None):
    return {
        "game_num": num,
        "players": ["Mummi"],
        "results": [],
        "kingdom": kingdom or [{"card": "Village", "expansion": "Base"}],
    }


def card(name, expansion="Base", times_used=0):
    return {"name": name, "expansion": expansion, "cost": 3, "debt": None,
            "potion": False, "notes": None, "removed": False,
            "card_type": "Kingdom", "times_used": times_used}


def existing_data(games, cards=None):
    data = {"games": games, "players": [], "last_updated": OLD_STAMP, "upcoming_games": 0}
    if cards is not None:
        data = {**data, "cards": cards}
    return data


class BuildOutputTest(unittest.TestCase):
    def test_unchanged_data_keeps_old_timestamp(self):
        existing = existing_data([game()])
        data, changed = build_output(existing, [game()], [], 0, NEW_STAMP)
        self.assertFalse(changed)
        self.assertEqual(data["last_updated"], OLD_STAMP)
        self.assertEqual(data, existing)

    def test_changed_games_get_new_timestamp(self):
        existing = existing_data([game()])
        data, changed = build_output(existing, [game(), game(2)], [], 0, NEW_STAMP)
        self.assertTrue(changed)
        self.assertEqual(data["last_updated"], NEW_STAMP)
        self.assertEqual(len(data["games"]), 2)

    def test_upcoming_count_change_is_a_change(self):
        existing = existing_data([game()])
        _, changed = build_output(existing, [game()], [], 3, NEW_STAMP)
        self.assertTrue(changed)

    def test_legacy_games_removal_is_a_change(self):
        existing = {**existing_data([game()]), "legacy_games": []}
        data, changed = build_output(existing, [game()], [], 0, NEW_STAMP)
        self.assertTrue(changed)
        self.assertNotIn("legacy_games", data)

    def test_does_not_mutate_existing(self):
        existing = existing_data([game()])
        snapshot = json.dumps(existing, sort_keys=True)
        build_output(existing, [game(2)], [], 1, NEW_STAMP)
        self.assertEqual(json.dumps(existing, sort_keys=True), snapshot)

    def test_key_order_is_preserved(self):
        existing = existing_data([game()])
        data, _ = build_output(existing, [game(2)], [], 0, NEW_STAMP)
        self.assertEqual(list(data), list(existing))

    def test_game_card_names_use_card_list_spelling(self):
        cards = [card("Fool's Gold", "Hinterlands", 1)]
        games = [game(kingdom=[{"card": "Fool's gold", "expansion": "Hinterlands"}])]
        data, _ = build_output(existing_data([], cards), games, [], 0, NEW_STAMP)
        self.assertEqual(data["games"][0]["kingdom"][0]["card"], "Fool's Gold")
        self.assertEqual(data["cards"][0]["times_used"], 1)


class UpdateJsonTest(unittest.TestCase):
    def write(self, path, data):
        text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
        path.write_text(text, encoding="utf-8")
        return text

    def test_no_change_leaves_file_untouched(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "data.json"
            before = self.write(path, existing_data([game()]))
            changed = update_json([game()], [], 0, json_file=path, now=NEW_STAMP)
            self.assertFalse(changed)
            self.assertEqual(path.read_text(encoding="utf-8"), before)

    def test_change_rewrites_file_with_new_timestamp(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "data.json"
            self.write(path, existing_data([game()]))
            changed = update_json([game(), game(2)], [], 0, json_file=path, now=NEW_STAMP)
            self.assertTrue(changed)
            written = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(written["last_updated"], NEW_STAMP)
            self.assertEqual(len(written["games"]), 2)

    def test_missing_file_is_created(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "data.json"
            self.assertTrue(update_json([game()], [], 0, json_file=path, now=NEW_STAMP))
            self.assertEqual(json.loads(path.read_text(encoding="utf-8"))["games"], [game()])


if __name__ == "__main__":
    unittest.main()
