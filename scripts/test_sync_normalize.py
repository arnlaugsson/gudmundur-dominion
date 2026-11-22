#!/usr/bin/env python3
"""Tests for the name normalisation the sync applies, so the frontend can use
dominion_data.json as-is (these fixes used to run in src/data.js).

Run: python3 scripts/test_sync_normalize.py
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sheet_sync.normalize import (  # noqa: E402
    build_card_name_map,
    canonicalize_game_cards,
    normalize_expansion,
    normalize_location,
    normalize_player_name,
    normalize_victory_type,
)


class PlayerAndExpansionTest(unittest.TestCase):
    def test_player_fixes(self):
        self.assertEqual(normalize_player_name("Hallgríur"), "Hallgrímur")
        self.assertEqual(normalize_player_name("Haflið"), "Hafliði")
        self.assertEqual(normalize_player_name(" Mummi "), "Mummi")
        self.assertIsNone(normalize_player_name(None))

    def test_expansion_fixes(self):
        self.assertEqual(normalize_expansion("Dark ages"), "Dark Ages")
        self.assertEqual(normalize_expansion("Cornucopia"), "Cornucopia & Guilds")
        self.assertEqual(normalize_expansion("Base"), "Base")


class LocationTest(unittest.TestCase):
    def test_declensions_collapse_to_nominative(self):
        cases = {
            "Laugarási": "Laugarás", "Húsafelli": "Húsafell",
            "Arnarholti": "Arnarholt", "Álfheimum": "Álfheimar",
            "Laugalæk 23": "Laugalækur",
        }
        for raw, want in cases.items():
            self.assertEqual(normalize_location(raw), want)

    def test_other_locations_untouched(self):
        self.assertEqual(normalize_location("Selvogsgrunn"), "Selvogsgrunn")
        self.assertIsNone(normalize_location(None))


class VictoryTypeTest(unittest.TestCase):
    def test_variants(self):
        cases = {
            "Province": "Province", "provinces": "Province", "Provincce": "Province",
            " province ": "Province", "Colony": "Colony", "colonies": "Colony",
            "Supply": "Supply piles", "supply piles": "Supply piles",
            "Supply piles (3)": "Supply piles",
        }
        for raw, want in cases.items():
            self.assertEqual(normalize_victory_type(raw), want, raw)

    def test_unknown_kept(self):
        self.assertEqual(normalize_victory_type("Tími"), "Tími")
        self.assertIsNone(normalize_victory_type(None))


class CardNameTest(unittest.TestCase):
    CARDS = [{"name": "Fool's Gold"}, {"name": "Hunting Party"}, {"name": "Way of the Goat"},
             {"name": "Rich"}, {"name": "Quartermaster"}, {"name": "Harsh Winter"}]

    def test_map_prefers_more_uppercase(self):
        names = build_card_name_map([{"name": "Wishing well"}, {"name": "Wishing Well"},
                                     {"name": "Wishing well"}])
        self.assertEqual(names["wishing well"], "Wishing Well")

    def test_all_card_fields_canonicalised(self):
        game = {
            "game_num": 141,
            "kingdom": [{"card": "Fool's gold", "expansion": "Hinterlands"},
                        {"card": "hunting party", "expansion": "Cornucopia"},
                        {"card": "Not a card", "expansion": None}],
            "events": ["harsh winter"], "landmarks": [], "projects": [],
            "ways": ["Way Of The Goat"], "allies": [], "prophecy": ["HARSH WINTER"],
            "traits": [{"name": "rich", "card": "quartermaster"}],
        }
        out = canonicalize_game_cards(game, build_card_name_map(self.CARDS))
        self.assertEqual([k["card"] for k in out["kingdom"]],
                         ["Fool's Gold", "Hunting Party", "Not a card"])
        self.assertEqual(out["events"], ["Harsh Winter"])
        self.assertEqual(out["ways"], ["Way of the Goat"])
        self.assertEqual(out["prophecy"], ["Harsh Winter"])
        self.assertEqual(out["traits"], [{"name": "Rich", "card": "Quartermaster"}])
        # Input is not mutated.
        self.assertEqual(game["kingdom"][0]["card"], "Fool's gold")

    def test_trait_without_card_keeps_shape(self):
        out = canonicalize_game_cards({"traits": [{"name": "rich"}]},
                                      build_card_name_map(self.CARDS))
        self.assertEqual(out["traits"], [{"name": "Rich"}])


if __name__ == "__main__":
    unittest.main()
