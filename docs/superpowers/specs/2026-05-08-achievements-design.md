# Player Achievements — Design

## Goal

Surface what's notable about each player as a set of badges ("afrek") on the Players tab, in `PlayerModal`, and in a new dedicated `Afrek` tab. Recognition only — no progress bars, no locked/hidden achievements.

## Scope

In:

- New pure module `src/lib/achievements.js` exporting `computeAchievements(games, players)`.
- New `AchievementBadge` component for rendering one badge.
- Extension of `PlayerModal` with a grouped Afrek section.
- New "Afrek" column on the Players tab list.
- New `Afrek` tab in the nav with three leaderboard sections.

Out:

- Persistence / Firestore. Computation is pure derivation on every load (cheap for ~120 games × 15 players).
- Test runner. Module is structured as a pure function so tests can be added later.
- Locked-achievement display, progress bars, gamification. (Recognition mode only — engagement mode is a possible follow-up.)
- Time-of-day / seasonal achievements.

## Architecture

```
src/lib/achievements.js              new — pure derivation module
src/components/AchievementBadge.jsx  new — single badge component
src/components/PlayerModal.jsx       modify — add Afrek section
src/tabs/Players.jsx                 modify — add Afrek count column
src/tabs/Afrek.jsx                   new — leaderboards tab
src/App.jsx                          modify — route the Afrek tab
src/constants.js                     modify — add Afrek to TABS
src/index.css                        modify — badge styles
```

`computeAchievements(games, players)` walks games in chronological order once (`game_num` ascending) and returns `Map<playerName, Achievement[]>`. Tier-based achievements record the game where the threshold was first crossed (giving "earned on" timestamps for free). All-time-record achievements track the current holder; ties are allowed (multiple players can hold the same record badge if their values match).

`Achievement` shape:

```js
{
  id: 'games-50',                 // stable ID for React key + future de-dup
  category: 'volume',             // 'volume' | 'wins' | 'records' | 'streaks' | 'variety' | 'rivalries'
  icon: '🎯',
  title: '50 leikir',
  detail: null,                   // optional second line, e.g. '117 stig í leik #98'
  earnedGameNum: 50,              // optional, the game where the threshold was crossed
  earnedDate: '2023-04-12',       // optional ISO date matching the earned game
}
```

## Achievement catalog

Per the spec, **every tier earned** is shown (not just the highest). A player with 60 games has badges for `games-10`, `games-25`, and `games-50` separately.

### Þátttaka — volume (per player)

- 🎯 `games-10` · 10 leikir
- 🎯 `games-25` · 25 leikir
- 🎯 `games-50` · 50 leikir
- 🎯 `games-100` · 100 leikir

### Sigrar — win count (per player, count of 1st-place finishes)

- 🥇 `wins-1` · Fyrsti sigur
- 🥇 `wins-5` · 5 sigrar
- 🥇 `wins-10` · 10 sigrar
- 🥇 `wins-25` · 25 sigrar
- 🥇 `wins-50` · 50 sigrar

### Met — all-time records currently held

Only the current record-holder(s) earn these. Ties allowed.

- 🏆 `record-high-score` · Stigamet · *detail: max single-player score, game #*
- 🌊 `record-largest-victory` · Stærsti sigur · *detail: max gap between 1st and last, game #*
- 😰 `record-narrowest-victory` · Spennumesti sigur · *detail: min gap between 1st and 2nd (≥1), game #*
- 📉 `record-lowest-winning-score` · Lágmarks-sigur · *detail: min score for a 1st-place win, game #*

### Sigurraðir — streaks

Computed across games the player participated in (matching the existing streak logic in `lastGameFacts.js` — a player skipping games doesn't break their streak).

- 🔥 `streak-3` · 3 sigrar í röð
- 🔥 `streak-5` · 5 sigrar í röð
- 🔥 `streak-10` · 10 sigrar í röð

### Fjölbreytni — variety

The expansion-variety achievements count **distinct expansions across all of the player's winning games' kingdoms**. Example: if you win game A (Plunder + Allies) and game B (Plunder + Nocturne), you've covered three distinct expansions toward this count.

- 🎲 `variety-expansions-5` · Sigur með 5 viðbótum (won games whose kingdoms covered 5 distinct expansions in total)
- 🎲 `variety-expansions-10` · Sigur með 10 viðbótum
- 🎲 `variety-expansions-all` · Sigur með öllum viðbótum (every expansion in the data — currently 17 incl. Promo)
- 📍 `variety-venues-5` · Spilað á 5 stöðum (distinct venues the player has played at)
- 📍 `variety-venues-all` · Spilað á öllum venjulegum stöðum (venues with ≥3 games total — avoids cluttering with one-off vacation locations)
- 🤝 `variety-opponents-10` · Spilað við 10 keppinauta (distinct opponents)
- 🤝 `variety-opponents-all` · Spilað við alla virka klúbbmeðlimi (every player with ≥10 games)

### Keppinautar — rivalries

- ⚔️ `rivalry-leader-<other>` · Sigursæll vs `<other>` · *detail: 8-3 í 11 leikjum* — earned per pair where this player has a strict majority of head-to-head finishes (1st-place comparisons across games both played in), minimum 5 shared games.
- 👑 `mummi-slayer-5` / `mummi-slayer-10` / `mummi-slayer-25` · Mummi-bani I/II/III — finished above Mummi N times (Mummi himself excluded).

Total stable-ID achievements: **26** (4 volume + 5 wins + 4 records + 3 streaks + 7 variety + 3 mummi-slayer), plus a per-pair `rivalry-leader-<other>` achievement that expands across active player pairs.

## UI layout

### `PlayerModal` — new Afrek section

Added after the existing player content. Header row: `AFREK · {earned}/{eligibleTotal}` (eligibleTotal excludes `mummi-slayer-*` for Mummi himself, etc., so the ratio is meaningful).

Below the header, badges grouped by category in this order: Þátttaka, Sigrar, Met, Sigurraðir, Fjölbreytni, Keppinautar. Empty categories are hidden. Badges flow as wrapping pills.

Each badge: `<AchievementBadge>` — pill with `icon`, `title`, optional `detail` on a second line. Hover tooltip:
- For tier achievements: `Náði í leik #N þann YYYY-MM-DD`
- For record achievements: same as `detail` line (the value held)

### `Players` tab — Afrek count column

New column (or inline pill in the existing row) showing `🏆 N`. Sortable. The existing click-to-open-`PlayerModal` flow stays as-is.

### `Afrek` tab — leaderboards

New entry in `TABS`, placed between `funfacts` and `suggester` (group with the other "fun" content). Three sections:

1. **Flest afrek** — players ranked by total badge count. Each row links to `PlayerModal`.
2. **Sjaldgæfustu afrekin** — achievements held by 1 or 2 players, listed with the holder(s) and their `detail`.
3. **Hver á hvað?** — table grid: rows = achievement IDs, columns = active players (≥10 games). Cells show ✓ when the player has the badge, blank otherwise. Compact, uses player initials as column headers.

## Data flow

- `DATA.games` / `DATA.players` load once at module init.
- `achievements` is computed once from `computeAchievements(DATA.games, DATA.players)` — wrapped in a memoized export so multiple consumers share the result.
- Consumers (`PlayerModal`, `Players`, `Afrek`) read from the same map. No re-computation on tab switch.
- Re-runs only on data refresh (page reload after a sync).

## Error handling

- Empty `games`: returns empty Map. UI renders "Engin afrek enn" in PlayerModal.
- Player with games < first-tier threshold: empty badge array, no UI section.
- Tied records: both holders earn the badge.
- Rivalry: requires min 5 shared games AND a strict majority (no ties).
- Mummi: filtered out of `mummi-slayer-*`; cannot earn rivalry-leader badges against himself.
- Missing `g.location` or `g.expansions`: skipped silently from variety counts.

## Testing

No test runner; manual verification via `npm run dev`:

- Open Mummi's `PlayerModal`: shows 12+ badges across volume / wins / records / streaks / variety / rivalries.
- Open a newer player (e.g. Iðunn ≈ 5 games): low badge count, only the entry-tier volume + maybe `wins-1`.
- Players tab: new Afrek column sorts correctly; Mummi at the top.
- Afrek tab: three sections render. "Sjaldgæfustu" shows record-holder badges. "Hver á hvað?" grid layout is readable.
- Earned-on tooltip on tier badges shows the correct game #.

`computeAchievements` is pure — unit tests can be added later without refactoring.

## Files touched

- `src/lib/achievements.js` (new, ~250-300 lines)
- `src/components/AchievementBadge.jsx` (new, ~30 lines)
- `src/components/PlayerModal.jsx` (modify — add Afrek section)
- `src/tabs/Players.jsx` (modify — add count column)
- `src/tabs/Afrek.jsx` (new, ~120 lines)
- `src/App.jsx` (modify — route the new tab)
- `src/constants.js` (modify — add Afrek to TABS, ordering)
- `src/index.css` (modify — `.achievement-pill`, `.afrek-grid` styles)
