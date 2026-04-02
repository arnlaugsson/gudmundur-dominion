# Nightly Spreadsheet Sync & Auto-Deploy

**Date:** 2026-04-02
**Status:** Approved

## Problem

Game data lives in a Google Spreadsheet that is manually exported to `data/dominion_data.json`. The previous manual export scrambled player results for 43 of 49 legacy games. We need automated, correct parsing on a schedule.

## Solution

A GitHub Actions workflow runs nightly, downloads the public Google Spreadsheet, parses it into `dominion_data.json`, and if data changed, commits, builds, and deploys to Firebase Hosting.

## Data Flow

```
Google Sheets (public XLSX export)
  → GitHub Actions cron (3:00 UTC daily)
  → Python parser (scripts/sync_spreadsheet.py)
  → dominion_data.json
  → If changed: git commit → vite build → firebase deploy
```

## Spreadsheet Layout ("Öll spil" sheet)

Each game occupies a 3-column group. Games are ordered right-to-left (newest first). Row 2 contains game numbers.

### Per-game column layout

| Row | col+0 | col+1 | col+2 |
|-----|-------|-------|-------|
| 1 | Date | "Meðspilari" | "Sæti" |
| 2 | Game number | Location | — |
| 3-6 | Player names | — | Place (1st-4th) |
| 7 | Extra player (rare) | — | Place |
| 8 | "Kingdom spil" | "Sett" | — |
| 9-18 | Card name | Expansion | — |
| 20 | Event name | Expansion | — |
| 22 | Landmark name | Expansion | — |
| 24 | Project name | Expansion | — |
| 25 | Way name | Expansion | — |
| 26 | Allies name | Expansion | — |
| 28 | Trait name | Expansion | — |
| 29 | Prophecy name | Expansion | — |
| 30-33 | Expansion names | — | — |
| 34 | Victory type | — | — |
| 35-38 | Player name (score order) | — | Score |
| 39 | — | — | Average score |

### Column A row labels (reference)

| Row | Label |
|-----|-------|
| 1 | Dagsetning |
| 2 | Spil nr. |
| 3 | Spilarar |
| 7 | Auka leikmaður |
| 9 | Kingdom spil |
| 19 | Auka spil |
| 20 | Event |
| 22 | Landmark |
| 24 | Project |
| 25 | Way |
| 26 | Allies |
| 28 | Trait |
| 29 | Prophecy |
| 30 | Sett |
| 34 | Sigurtegund |
| 35 | Sæti |
| 39 | Meðalstig |

## Parser: `scripts/sync_spreadsheet.py`

### Responsibilities

1. Download the spreadsheet as XLSX from the public Google Sheets export URL
2. Parse the "Öll spil" sheet to produce all game data
3. Parse expansion sheets (Base, Intrigue, ...) to produce the cards array
4. Write `data/dominion_data.json` in the same format the app expects

### Skip logic for incomplete games

A game column is skipped if:
- No game number in row 2
- No player names in rows 3-7
- No valid places recorded (all place cells empty or non-numeric)

This handles the case where games are inserted into the spreadsheet before details are filled in.

### Place value handling

Some place cells contain Excel date values instead of integers (a known spreadsheet formatting issue). The parser must detect `datetime` values in place cells and treat them as missing/invalid.

### Score merging

Scores live in rows 35-38 (separate from places in rows 3-6). The parser pairs scores to players by name matching, not row position.

### Output format

```json
{
  "games": [
    {
      "game_num": 100,
      "date": "2025-10-17",
      "location": "Selvogsgrunn",
      "players": ["Mummi", "Skúli", "Krissi", "Lúlli"],
      "results": [
        {"place": 1, "name": "Mummi", "tied_with": null, "score": 59.0},
        ...
      ],
      "kingdom": [{"card": "Overlord", "expansion": "Empires"}, ...],
      "events": ["Delve"],
      "landmarks": ["Keep"],
      "projects": ["Canal"],
      "ways": [],
      "allies": [],
      "traits": [],
      "prophecy": [],
      "expansions": ["Empires", "Renaissance"],
      "victory_type": "Province"
    }
  ],
  "cards": [
    {"name": "Village", "expansion": "Base", "cost": 3, ...},
    ...
  ]
}
```

Note: The `legacy_games` key is eliminated. All games go into `games`. The app's `data.js` already merges both arrays — once we unify them, `data.js` simplifies.

### Cards parsing

Each expansion sheet (Base, Intrigue, Seaside, etc.) contains card definitions. The parser reads these to produce the `cards` array. The "Dominion-þýðingar" sheet is ignored (translations only).

## GitHub Actions Workflow

**File:** `.github/workflows/sync-data.yml`

### Trigger
- `schedule: cron '0 3 * * *'` (3:00 UTC daily)
- `workflow_dispatch` (manual trigger)

### Secrets required
- `FIREBASE_SERVICE_ACCOUNT` — Firebase service account JSON for deployment

### Steps

1. Checkout repo
2. Setup Python 3.x, install `openpyxl`
3. Setup Node 20.x, install npm dependencies
4. Download spreadsheet: `curl -L "https://docs.google.com/spreadsheets/d/14f5TW05_jpnWGf6d3cAO7ChSrHPZl0dIbxyIO3iqe2A/export?format=xlsx" -o /tmp/spreadsheet.xlsx`
5. Run parser: `python3 scripts/sync_spreadsheet.py /tmp/spreadsheet.xlsx`
6. Check for changes: `git diff --quiet data/dominion_data.json`
7. If changed:
   - `git add data/dominion_data.json`
   - `git commit -m "chore: sync game data from spreadsheet"`
   - `git push`
   - `npm run build`
   - Deploy to Firebase using `firebase-tools`

### No-change optimization
If the JSON hasn't changed after parsing, skip commit, build, and deploy entirely.

## What stays the same

- `src/data.js` — import logic unchanged (reads `dominion_data.json`)
- All app components — no UI changes
- `firebase.json` — hosting config unchanged
- Manual `firebase deploy` still works for code changes

## Migration

On first run, the parser replaces the entire `dominion_data.json` (both `legacy_games` and `games` sections). The `legacy_games` key is removed — all games go into `games`. `data.js` must be updated to remove the `legacyGames` merge logic since all games are now in one array.
