# Nightly Spreadsheet Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically sync game data from a public Google Spreadsheet every night, rebuild the site, and deploy to Firebase.

**Architecture:** A Python script downloads the spreadsheet as XLSX, parses the "Öll spil" sheet into `dominion_data.json` (games array only — cards are static and stay as-is), and a GitHub Actions workflow orchestrates the nightly fetch-parse-build-deploy cycle.

**Tech Stack:** Python 3 + openpyxl (parser), GitHub Actions (cron), Firebase Hosting (deploy), Vite (build)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `scripts/sync_spreadsheet.py` | Rewrite | Download XLSX, parse "Öll spil" sheet, update games in JSON |
| `scripts/fix_legacy_results.py` | Delete | Superseded by sync_spreadsheet.py |
| `src/data.js` | Modify (lines 1-24) | Remove legacy_games merge, simplify to single games array |
| `.github/workflows/sync-data.yml` | Create | Nightly cron: download → parse → diff → build → deploy |

---

### Task 1: Write the game parser

**Files:**
- Rewrite: `scripts/sync_spreadsheet.py`

This is the core of the system. It reads the "Öll spil" sheet and produces the games array.

- [ ] **Step 1: Create the spreadsheet download function**

```python
#!/usr/bin/env python3
"""
Sync game data from the Guðmundur Dominion Google Spreadsheet.

Downloads the public spreadsheet as XLSX, parses the "Öll spil" sheet,
and updates the games array in dominion_data.json.
"""

import json
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

import openpyxl

SPREADSHEET_ID = "14f5TW05_jpnWGf6d3cAO7ChSrHPZl0dIbxyIO3qqe2A"
EXPORT_URL = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=xlsx"
ROOT = Path(__file__).resolve().parent.parent
JSON_FILE = ROOT / "data" / "dominion_data.json"


def download_spreadsheet(dest_path):
    """Download the public Google Spreadsheet as XLSX."""
    print(f"Downloading spreadsheet to {dest_path}...")
    urllib.request.urlretrieve(EXPORT_URL, dest_path)
    print("Download complete.")
```

- [ ] **Step 2: Create the game column discovery function**

This finds all game columns in the "Öll spil" sheet by scanning row 2 for game numbers.

```python
def find_game_columns(ws):
    """
    Scan row 2 for game numbers. Returns dict of game_num -> col_index.
    Each game occupies a 3-column group: (names/date, location/expansion, places/scores).
    """
    game_cols = {}
    for col in range(1, ws.max_column + 1):
        val = ws.cell(row=2, column=col).value
        if val is not None and isinstance(val, (int, float)) and 1 <= val <= 9999:
            game_cols[int(val)] = col
    return game_cols
```

- [ ] **Step 3: Create the single-game parser function**

This extracts all data for one game from its 3-column group. The spreadsheet layout per column:
- Rows 3-7: player names (col+0) and places (col+2)
- Row 8: "Kingdom spil" header
- Rows 9-18: kingdom cards (col+0) and expansion (col+1)
- Row 20: event, Row 22: landmark, Row 24: project, Row 25: way, Row 26: allies, Row 28: trait, Row 29: prophecy
- Rows 30-33: expansion names
- Row 34: victory type
- Rows 35-38: score results (name col+0, score col+2)

```python
def parse_valid_place(value):
    """Return int place if value is a valid number, None otherwise.
    Some cells contain datetime objects due to Excel formatting bugs."""
    if value is None:
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return int(value)
    return None


def parse_game(ws, col):
    """Parse a single game from a 3-column group starting at col.
    Returns a game dict, or None if the game is incomplete (should be skipped)."""

    # Row 1: date
    raw_date = ws.cell(row=1, column=col).value
    if raw_date is None:
        return None
    if isinstance(raw_date, datetime):
        date_str = raw_date.strftime("%Y-%m-%d")
    else:
        # Normalize "2025.10.17" or "2025.10.17." to "2025-10-17"
        date_str = str(raw_date).rstrip(".").replace(".", "-")

    # Row 2: game number, location
    game_num_raw = ws.cell(row=2, column=col).value
    if game_num_raw is None:
        return None
    game_num = int(game_num_raw)
    location = ws.cell(row=2, column=col + 1).value

    # Rows 3-7: players and places
    player_entries = []
    for row in range(3, 8):
        name = ws.cell(row=row, column=col).value
        if not name or not isinstance(name, str):
            continue
        place = parse_valid_place(ws.cell(row=row, column=col + 2).value)
        player_entries.append({"name": name, "place": place})

    # Skip games with no players
    if not player_entries:
        return None

    # Skip games where no places are recorded (incomplete)
    has_places = any(e["place"] is not None for e in player_entries)
    if not has_places:
        return None

    players = [e["name"] for e in player_entries]

    # Rows 9-18: kingdom cards
    kingdom = []
    for row in range(9, 19):
        card_name = ws.cell(row=row, column=col).value
        expansion = ws.cell(row=row, column=col + 1).value
        if card_name and isinstance(card_name, str):
            kingdom.append({
                "card": card_name,
                "expansion": expansion or "",
            })

    # Landscape cards (single-row entries)
    def read_landscape(row):
        val = ws.cell(row=row, column=col).value
        return val if val and isinstance(val, str) else None

    events = [v] if (v := read_landscape(20)) else []
    landmarks = [v] if (v := read_landscape(22)) else []
    projects = [v] if (v := read_landscape(24)) else []
    ways = [v] if (v := read_landscape(25)) else []
    allies = [v] if (v := read_landscape(26)) else []
    traits = [v] if (v := read_landscape(28)) else []
    prophecy = [v] if (v := read_landscape(29)) else []

    # Rows 30-33: expansions
    expansions = []
    for row in range(30, 34):
        val = ws.cell(row=row, column=col).value
        if val and isinstance(val, str):
            expansions.append(val)

    # Row 34: victory type
    victory_type = ws.cell(row=34, column=col).value
    if victory_type and isinstance(victory_type, str):
        vt = victory_type.strip()
        if vt.lower().startswith("province"):
            victory_type = "Province"
        elif vt.lower().startswith("colon"):
            victory_type = "Colony"
        elif vt.lower().startswith("supply"):
            victory_type = "Supply piles"
    else:
        victory_type = None

    # Rows 35-38: scores (name at col+0, score at col+2)
    score_map = {}
    for row in range(35, 39):
        name = ws.cell(row=row, column=col).value
        score = ws.cell(row=row, column=col + 2).value
        if name and isinstance(name, str) and score is not None:
            if isinstance(score, (int, float)):
                score_map[name] = float(score)

    # Row 39: average score
    avg_score_raw = ws.cell(row=39, column=col + 2).value
    avg_score = None
    if avg_score_raw is not None and isinstance(avg_score_raw, (int, float)):
        avg_score = round(float(avg_score_raw), 2)

    # Build results: merge places from rows 3-7 with scores from rows 35-38
    results = []
    for entry in player_entries:
        if entry["place"] is None:
            continue
        results.append({
            "place": entry["place"],
            "name": entry["name"],
            "tied_with": None,
            "score": score_map.get(entry["name"]),
        })
    results.sort(key=lambda r: r["place"])

    # Detect ties
    for i, r in enumerate(results):
        tied = [
            other["name"]
            for other in results
            if other["place"] == r["place"] and other["name"] != r["name"]
        ]
        if tied:
            r["tied_with"] = tied

    return {
        "game_num": game_num,
        "date": date_str,
        "location": location,
        "players": players,
        "kingdom": kingdom,
        "events": events,
        "landmarks": landmarks,
        "projects": projects,
        "ways": ways,
        "allies": allies,
        "traits": traits,
        "prophecy": prophecy,
        "expansions": expansions,
        "victory_type": victory_type,
        "results": results,
        "avg_score": avg_score,
    }
```

- [ ] **Step 4: Create the main sync function and CLI entry point**

```python
def sync(xlsx_path=None):
    """Main sync: download (or use local) spreadsheet, parse, update JSON."""
    import tempfile

    if xlsx_path is None:
        tmp = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
        tmp.close()
        xlsx_path = tmp.name
        download_spreadsheet(xlsx_path)

    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb["Öll spil"]
    game_cols = find_game_columns(ws)

    print(f"Found {len(game_cols)} game columns in spreadsheet.")

    games = []
    skipped = 0
    for game_num in sorted(game_cols.keys()):
        col = game_cols[game_num]
        game = parse_game(ws, col)
        if game is None:
            skipped += 1
            print(f"  Skipping game #{game_num} (incomplete)")
            continue
        games.append(game)

    games.sort(key=lambda g: g["game_num"])
    print(f"Parsed {len(games)} complete games, skipped {skipped}.")

    # Load existing JSON to preserve cards and other static data
    with open(JSON_FILE) as f:
        data = json.load(f)

    # Replace games, remove legacy_games
    data["games"] = games
    data.pop("legacy_games", None)

    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Updated {JSON_FILE}")


if __name__ == "__main__":
    xlsx_path = sys.argv[1] if len(sys.argv) > 1 else None
    sync(xlsx_path)
```

- [ ] **Step 5: Assemble the full file and run against local spreadsheet**

Combine all the above into `scripts/sync_spreadsheet.py`, then test against the local spreadsheet copy:

Run: `cd ~/Projects/gudmundur-dominion && python3 scripts/sync_spreadsheet.py "data/Dominion - samantekt úr Guðmundi.xlsx"`

Expected: Parses all 113 games (minus any incomplete), updates `dominion_data.json`, prints summary.

- [ ] **Step 6: Verify Mosi's data is correct after sync**

Run:
```bash
cd ~/Projects/gudmundur-dominion && python3 -c "
import json
with open('data/dominion_data.json') as f:
    data = json.load(f)
for g in data['games']:
    for r in g.get('results', []):
        if r['name'] == 'Mosi':
            print(f'Game #{g[\"game_num\"]}: place={r[\"place\"]}, score={r.get(\"score\")}')
print('legacy_games key present:', 'legacy_games' in data)
"
```

Expected:
```
Game #34: place=3, score=None
Game #35: place=3, score=None
legacy_games key present: False
```

- [ ] **Step 7: Spot-check a modern game with scores**

Run:
```bash
cd ~/Projects/gudmundur-dominion && python3 -c "
import json
with open('data/dominion_data.json') as f:
    data = json.load(f)
g = next(g for g in data['games'] if g['game_num'] == 100)
print(json.dumps(g, indent=2, ensure_ascii=False))
"
```

Expected: Game #100 should have correct results (Mummi 1st/59pts, Skúli 2nd/48pts, Krissi 3rd/45pts, Lúlli 4th/36pts), kingdom cards, expansions, events, landmarks, projects, and victory_type matching the spreadsheet.

- [ ] **Step 8: Delete the old fix script**

Run: `rm scripts/fix_legacy_results.py`

- [ ] **Step 9: Commit**

```bash
cd ~/Projects/gudmundur-dominion
git add scripts/sync_spreadsheet.py data/dominion_data.json
git rm scripts/fix_legacy_results.py
git commit -m "feat: add spreadsheet sync parser, unify all games into single array"
```

---

### Task 2: Update data.js to remove legacy_games merge

**Files:**
- Modify: `src/data.js:1-24`

The `legacy_games` key no longer exists. All games are in `games`. Simplify the data loading.

- [ ] **Step 1: Simplify the game loading in data.js**

Replace lines 1-24 (the legacy/modern merge logic) with:

```javascript
import rawData from '../data/dominion_data.json'

// ── Normalize & parse all games ───────────────────────────────────────────────
const parsedGames = rawData.games
  .filter(g => g.date !== 'Sæti' && g.game_num != null && Array.isArray(g.players) && g.players.length > 0)
  .map(g => {
    if (!g.victory_type) return g
    const vt = g.victory_type.trim()
    let victory_type = g.victory_type
    if (/^provinces?$/i.test(vt)) victory_type = 'Province'
    else if (/^colonies?$/i.test(vt)) victory_type = 'Colony'
    else if (/^supply/i.test(vt)) victory_type = 'Supply piles'
    return { ...g, victory_type }
  })

// Sort by game number ascending
const games = [...parsedGames].sort((a, b) => a.game_num - b.game_num)
```

- [ ] **Step 2: Verify the app still builds**

Run:
```bash
cd ~/Projects/gudmundur-dominion && npm install && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/gudmundur-dominion
git add src/data.js
git commit -m "refactor: simplify data.js, remove legacy_games merge logic"
```

---

### Task 3: Create GitHub Actions workflow

**Files:**
- Create: `.github/workflows/sync-data.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: Sync Spreadsheet & Deploy

on:
  schedule:
    - cron: '0 3 * * *'  # 3:00 UTC daily
  workflow_dispatch:       # manual trigger

permissions:
  contents: write

jobs:
  sync-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install Python dependencies
        run: pip install openpyxl

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install npm dependencies
        run: npm ci

      - name: Download spreadsheet and sync data
        run: python3 scripts/sync_spreadsheet.py

      - name: Check for changes
        id: diff
        run: |
          git diff --quiet data/dominion_data.json && echo "changed=false" >> "$GITHUB_OUTPUT" || echo "changed=true" >> "$GITHUB_OUTPUT"

      - name: Commit updated data
        if: steps.diff.outputs.changed == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/dominion_data.json
          git commit -m "chore: sync game data from spreadsheet"
          git push

      - name: Build
        if: steps.diff.outputs.changed == 'true'
        run: npm run build

      - name: Deploy to Firebase
        if: steps.diff.outputs.changed == 'true'
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
```

- [ ] **Step 2: Commit**

```bash
cd ~/Projects/gudmundur-dominion
mkdir -p .github/workflows
git add .github/workflows/sync-data.yml
git commit -m "ci: add nightly spreadsheet sync and auto-deploy workflow"
```

---

### Task 4: Configure Firebase service account secret

This task requires manual steps from the repository owner.

- [ ] **Step 1: Generate Firebase service account key**

Instructions to provide the user:
1. Go to [Firebase Console](https://console.firebase.google.com/) → Project Settings → Service Accounts
2. Click "Generate new private key" → download the JSON file
3. Go to GitHub repo Settings → Secrets and variables → Actions
4. Create a new secret named `FIREBASE_SERVICE_ACCOUNT`
5. Paste the entire JSON file contents as the secret value

- [ ] **Step 2: Verify the Google Spreadsheet is publicly accessible**

Open in an incognito browser window:
```
https://docs.google.com/spreadsheets/d/14f5TW05_jpnWGf6d3cAO7ChSrHPZl0dIbxyIO3qqe2A/export?format=xlsx
```

Expected: XLSX file downloads without requiring sign-in.

- [ ] **Step 3: Test the workflow manually**

Go to GitHub repo → Actions → "Sync Spreadsheet & Deploy" → "Run workflow" → Run.

Expected: Workflow runs successfully, downloads spreadsheet, parses data, and (if data changed) commits, builds, and deploys.

---

### Task 5: Push changes and verify

- [ ] **Step 1: Push all commits to remote**

```bash
cd ~/Projects/gudmundur-dominion && git push origin main
```

- [ ] **Step 2: Verify GitHub Actions workflow appears**

Go to `https://github.com/arnlaugsson/gudmundur-dominion/actions` and confirm the "Sync Spreadsheet & Deploy" workflow is listed.

- [ ] **Step 3: Commit the plan document**

```bash
cd ~/Projects/gudmundur-dominion
git add docs/
git commit -m "docs: add implementation plan for nightly spreadsheet sync"
git push origin main
```
