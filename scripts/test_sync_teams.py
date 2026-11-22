#!/usr/bin/env python3
"""Tests for team play: 2+ people playing as one seat.

Sheet convention: teammates share a row in the "Sæti" (scores) block, with the
partner in the next column, or a single cell holds "A & B" (or "A + B"). The
next column is sometimes a free-text note ("færri umferðir"); it is only a
teammate when it names a player in that game.

Run: python3 scripts/test_sync_teams.py
"""

import sys
import unittest
from pathlib import Path

import openpyxl

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

from sheet_sync.games import parse_game, parse_spreadsheet  # noqa: E402
from sheet_sync.layout import detect_layout  # noqa: E402

XLSX = SCRIPTS.parent / "data" / "spreadsheet.xlsx"

# Minimal "Öll spil" layout: one game in columns C (name), D (partner/note),
# E (place / score).
PLAYER_ROWS = range(3, 7)
SCORE_ROWS = range(10, 14)
LABELS = {1: "Dagsetning", 3: "Spilarar", 7: "Kingdom spil", 8: "Sett",
          9: "Sigurtegund", 10: "Sæti", 14: "Meðalstig"}


def make_game(players, scores=(), known=None):
    """Build a one-game sheet (game 1) and parse it.

    known: {name: {game_nums}} of players seen in the sheet's name columns,
    as parse_spreadsheet collects it.

    players: [(name, partner_or_None, place_or_None)]
    scores:  [(name, partner_or_note_or_None, score_or_None)]
    """
    ws = openpyxl.Workbook().active
    for row, label in LABELS.items():
        ws.cell(row=row, column=1, value=label)
    ws.cell(row=1, column=3, value="2025.01.01")
    ws.cell(row=2, column=3, value=1)
    ws.cell(row=7, column=3, value="Village")
    ws.cell(row=7, column=4, value="Base")
    ws.cell(row=8, column=3, value="Base")
    ws.cell(row=9, column=3, value="Province")
    for rows, entries in ((PLAYER_ROWS, players), (SCORE_ROWS, scores)):
        for row, (name, extra, number) in zip(rows, entries):
            ws.cell(row=row, column=3, value=name)
            ws.cell(row=row, column=4, value=extra)
            ws.cell(row=row, column=5, value=number)
    return parse_game(ws, 1, 3, detect_layout(ws), known_players=known or {})


def by_name(game):
    return {r["name"]: r for r in game["results"]}


class ScoresColumnBTeammateTest(unittest.TestCase):
    """Game 38 style: each person has a players row, teams share a score row."""

    def setUp(self):
        self.game = make_game(
            [("Skúli", None, 3), ("Halla", None, 1), ("Fúsi", None, 3), ("Mummi", None, 1)],
            [("Mummi", "Halla", 24), ("Skúli", "Fúsi", 21)],
        )

    def test_teammates_share_score_and_list_each_other(self):
        res = by_name(self.game)
        self.assertEqual(res["Halla"]["score"], 24.0)
        self.assertEqual(res["Mummi"]["score"], 24.0)
        self.assertEqual(res["Fúsi"]["score"], 21.0)
        self.assertEqual(res["Halla"]["teammates"], ["Mummi"])
        self.assertEqual(res["Skúli"]["teammates"], ["Fúsi"])

    def test_teammates_are_not_ties(self):
        for r in self.game["results"]:
            self.assertIsNone(r["tied_with"], r["name"])

    def test_results_keep_sheet_places(self):
        self.assertEqual([(r["name"], r["place"]) for r in self.game["results"]],
                         [("Halla", 1), ("Mummi", 1), ("Skúli", 3), ("Fúsi", 3)])

    def test_seats(self):
        self.assertEqual(self.game["seats"], [
            {"players": ["Halla", "Mummi"], "place": 1, "score": 24.0},
            {"players": ["Skúli", "Fúsi"], "place": 2, "score": 21.0},
        ])


class ScoresColumnBNoteTest(unittest.TestCase):
    """Game 140 style: column B holds a note, not a player."""

    def test_note_is_ignored(self):
        game = make_game(
            [("Iðunn", None, 4), ("Skúli", None, 1), ("Ragnheiður", None, 1), ("Mummi", None, 3)],
            [("Ragnheiður", None, 38), ("Skúli", None, 38),
             ("Mummi", "færri umferðir", 36), ("Iðunn", None, 36)],
        )
        res = by_name(game)
        self.assertNotIn("teammates", res["Mummi"])
        self.assertEqual(res["Mummi"]["score"], 36.0)
        self.assertEqual(res["Skúli"]["tied_with"], ["Ragnheiður"])
        self.assertEqual(game["players"], ["Iðunn", "Skúli", "Ragnheiður", "Mummi"])
        self.assertEqual([(s["players"], s["place"]) for s in game["seats"]], [
            (["Skúli"], 1), (["Ragnheiður"], 1), (["Mummi"], 3), (["Iðunn"], 4),
        ])


class ScoresColumnBTieAnnotationTest(unittest.TestCase):
    """Games 111/112 style: two rows name each other with equal scores. Each
    person has their own scores row, so column B annotates a tie, not a team."""

    def test_rows_naming_each_other_are_a_tie(self):
        game = make_game(
            [("Fúsi", None, 1), ("Halla", None, 2), ("Ragnheiður", None, 4), ("Mummi", None, 2)],
            [("Fúsi", None, 31), ("Halla", "Mummi", 29), ("Mummi", "Halla", 29),
             ("Ragnheiður", None, 18)],
        )
        res = by_name(game)
        self.assertNotIn("teammates", res["Halla"])
        self.assertNotIn("teammates", res["Mummi"])
        self.assertEqual(res["Halla"]["tied_with"], ["Mummi"])
        self.assertEqual(res["Mummi"]["tied_with"], ["Halla"])
        self.assertEqual([(s["players"], s["place"], s["score"]) for s in game["seats"]], [
            (["Fúsi"], 1, 31.0), (["Halla"], 2, 29.0), (["Mummi"], 2, 29.0),
            (["Ragnheiður"], 4, 18.0),
        ])


class AmpersandTeamTest(unittest.TestCase):
    def test_team_of_three_in_one_cell(self):
        game = make_game(
            [("Mummi & Halla + Fúsi", None, 1), ("Skúli", None, 2)],
            [(" Mummi &Halla &  Fúsi ", None, 30), ("Skúli", None, 20)],
        )
        self.assertEqual(game["players"], ["Mummi", "Halla", "Fúsi", "Skúli"])
        res = by_name(game)
        self.assertEqual(res["Halla"]["teammates"], ["Mummi", "Fúsi"])
        self.assertEqual(res["Fúsi"]["score"], 30.0)
        self.assertEqual(res["Halla"]["place"], 1)
        self.assertEqual(game["seats"], [
            {"players": ["Mummi", "Halla", "Fúsi"], "place": 1, "score": 30.0},
            {"players": ["Skúli"], "place": 2, "score": 20.0},
        ])

    def test_ampersand_only_in_scores_block(self):
        game = make_game(
            [("Mummi", None, 1), ("Halla", None, 1), ("Skúli", None, 3)],
            [("Mummi & Halla", None, 24), ("Skúli", None, 21)],
        )
        self.assertEqual(by_name(game)["Halla"]["teammates"], ["Mummi"])
        self.assertEqual(by_name(game)["Halla"]["score"], 24.0)


class PlayersColumnBTeammateTest(unittest.TestCase):
    """Game 20 style: the partner is written beside the name in the players
    block too, and nowhere else."""

    def test_partner_becomes_a_player(self):
        game = make_game(
            [("Mummi", "Hafliði", 1), ("Jóel", None, 2)],
            [("Mummi", "Hafliði", 34), ("Jóel", None, 31)],
        )
        self.assertEqual(game["players"], ["Mummi", "Hafliði", "Jóel"])
        res = by_name(game)
        self.assertEqual(res["Hafliði"]["score"], 34.0)
        self.assertEqual(res["Hafliði"]["place"], 1)
        self.assertEqual(res["Hafliði"]["teammates"], ["Mummi"])


class PlayersColumnBNoteTest(unittest.TestCase):
    """Text beside a name in the players block is only a partner when it is a
    plausible player: named in this game's scores block, or a player in
    another game."""

    def test_note_beside_name_is_ignored(self):
        game = make_game(
            [("Mummi", "nýr", 1), ("Skúli", "(gestur)", 2)],
            [("Mummi", None, 30), ("Skúli", None, 20)],
            known={"Mummi": {1, 2}, "Skúli": {1}},
        )
        self.assertEqual(game["players"], ["Mummi", "Skúli"])
        self.assertNotIn("teammates", by_name(game)["Mummi"])
        self.assertEqual(len(game["seats"]), 2)

    def test_partner_in_scores_block_accepted(self):
        game = make_game(
            [("Mummi", "Bragi Valdimar", 1), ("Skúli", None, 2)],
            [("Mummi", "Bragi Valdimar", 75), ("Skúli", None, 20)],
        )
        self.assertEqual(game["players"], ["Mummi", "Bragi Valdimar", "Skúli"])
        self.assertEqual(by_name(game)["Bragi Valdimar"]["teammates"], ["Mummi"])

    def test_partner_known_from_another_game_accepted(self):
        game = make_game(
            [("Mummi", "Hafliði", 1), ("Skúli", None, 2)],
            [("Mummi", None, 30), ("Skúli", None, 20)],
            known={"Hafliði": {5}},
        )
        self.assertEqual(game["players"], ["Mummi", "Hafliði", "Skúli"])
        self.assertEqual(by_name(game)["Hafliði"]["score"], 30.0)

    def test_name_seen_only_in_this_game_is_not_enough(self):
        game = make_game(
            [("Mummi", "nýr", 1), ("Skúli", None, 2)],
            [("Mummi", None, 30), ("Skúli", None, 20)],
            known={"nýr": {1}},
        )
        self.assertEqual(game["players"], ["Mummi", "Skúli"])


class SeatRankingTest(unittest.TestCase):
    def test_team_tied_with_solo_seat(self):
        game = make_game(
            [("Mummi", None, 1), ("Halla", None, 1), ("Skúli", None, 1), ("Fúsi", None, 4)],
            [("Mummi", "Halla", 30), ("Skúli", None, 30), ("Fúsi", None, 10)],
        )
        res = by_name(game)
        self.assertEqual(res["Mummi"]["tied_with"], ["Skúli"])
        self.assertEqual(res["Halla"]["tied_with"], ["Skúli"])
        self.assertEqual(res["Skúli"]["tied_with"], ["Mummi", "Halla"])
        self.assertEqual([(s["players"], s["place"]) for s in game["seats"]], [
            (["Mummi", "Halla"], 1), (["Skúli"], 1), (["Fúsi"], 3),
        ])

    def test_places_inferred_from_seat_scores(self):
        game = make_game(
            [("Mummi", None, None), ("Halla", None, None), ("Skúli", None, None),
             ("Fúsi", None, None)],
            [("Mummi", "Halla", 30), ("Skúli", None, 30), ("Fúsi", None, 20)],
        )
        self.assertEqual([(s["players"], s["place"], s["score"]) for s in game["seats"]], [
            (["Mummi", "Halla"], 1, 30.0), (["Skúli"], 1, 30.0), (["Fúsi"], 3, 20.0),
        ])
        self.assertEqual(by_name(game)["Fúsi"]["place"], 3)


class SoloGameTest(unittest.TestCase):
    def test_solo_results_unchanged(self):
        game = make_game(
            [("Mummi", None, 1), ("Skúli", None, 2), ("Halla", None, 2)],
            [("Mummi", None, 40), ("Skúli", None, 30), ("Halla", None, 30)],
        )
        self.assertEqual(game["results"], [
            {"place": 1, "name": "Mummi", "tied_with": None, "score": 40.0},
            {"place": 2, "name": "Skúli", "tied_with": ["Halla"], "score": 30.0},
            {"place": 2, "name": "Halla", "tied_with": ["Skúli"], "score": 30.0},
        ])
        self.assertEqual(game["seats"], [
            {"players": ["Mummi"], "place": 1, "score": 40.0},
            {"players": ["Skúli"], "place": 2, "score": 30.0},
            {"players": ["Halla"], "place": 2, "score": 30.0},
        ])

    def test_no_results_means_no_seats(self):
        game = make_game([("Mummi", None, None), ("Skúli", None, None)])
        self.assertEqual(game["results"], [])
        self.assertEqual(game["seats"], [])


@unittest.skipUnless(XLSX.exists(), f"{XLSX} not present (it is not tracked in git)")
class RealSheetTest(unittest.TestCase):
    """Spot checks against a local download in data/spreadsheet.xlsx."""

    @classmethod
    def setUpClass(cls):
        games, _skipped, _cards = parse_spreadsheet(str(XLSX))
        cls.games = {g["game_num"]: g for g in games}

    def seats(self, num):
        return [(s["players"], s["place"], s["score"]) for s in self.games[num]["seats"]]

    def test_game_38(self):
        self.assertEqual(self.seats(38), [
            (["Halla", "Mummi"], 1, 24.0), (["Skúli", "Fúsi"], 2, 21.0)])

    def test_game_86(self):
        self.assertEqual(self.seats(86), [
            (["Mummi"], 1, 24.0), (["Arnlaugur"], 2, 20.0),
            (["Hafliði", "Hallgrímur"], 3, 18.0)])

    def test_game_104(self):
        self.assertEqual(self.seats(104), [
            (["Mummi"], 1, 56.0), (["Skúli"], 2, 51.0), (["Iðunn", "Ragnheiður"], 3, 37.0)])

    def test_game_140_note_is_not_a_teammate(self):
        self.assertEqual(self.seats(140), [
            (["Skúli"], 1, 38.0), (["Ragnheiður"], 1, 38.0),
            (["Mummi"], 3, 36.0), (["Iðunn"], 4, 36.0)])

    def test_games_111_and_112_are_ties(self):
        self.assertEqual(self.seats(111), [
            (["Fúsi"], 1, 31.0), (["Halla"], 2, 29.0), (["Mummi"], 2, 29.0),
            (["Ragnheiður"], 4, 18.0)])
        self.assertEqual(self.seats(112), [
            (["Halla"], 1, 27.0), (["Mummi"], 2, 21.0), (["Fúsi"], 2, 21.0),
            (["Ragnheiður"], 4, 14.0)])

    def test_every_result_with_a_seat_has_a_score_when_its_seat_does(self):
        for num, game in self.games.items():
            seat_of = {p: s for s in game["seats"] for p in s["players"]}
            for r in game["results"]:
                self.assertEqual(r["score"], seat_of[r["name"]]["score"], (num, r["name"]))


if __name__ == "__main__":
    unittest.main()
