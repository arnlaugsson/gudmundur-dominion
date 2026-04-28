# Latest Game Highlight — Design

GitHub issue: [#15 "Last test game highlight"](https://github.com/arnlaugsson/gudmundur-dominion/issues/15)

## Goal

Surface the most recently played game on the Dashboard with a few automatically computed fun facts, and ship the dashboard-top reshuffle that also accommodates a new "random unplayed card" box.

## Scope

In:

- New `LatestGameBox` Dashboard component with computed fun facts about the latest game.
- New `RandomCardBox` Dashboard component, parameterized by pool (`played` / `unplayed`), replacing the existing inline random-card block.
- Two-column Dashboard top layout: random played card and random unplayed card stacked on the left, latest-game box spanning both rows on the right.
- Click on latest-game box navigates to the History tab and opens that game's modal.

Out:

- Adding a test runner to the project. `computeLastGameFacts` is structured as a pure function so tests can be added later.
- Mobile-specific styling beyond the single-column collapse.
- Editing the FunFacts tab or the History tab's `computeHighlights`.

## Layout

Dashboard top is a CSS grid with two columns and two rows:

```
┌──────────────────────┬─────────────────────────────┐
│  Random played card  │                             │
├──────────────────────┤   Latest game (2 rows)      │
│  Random unplayed card│                             │
└──────────────────────┴─────────────────────────────┘
```

- Wrapper: `<div className="dashboard-highlights">` placed at the very top of the Dashboard `<section>`.
- `grid-template-columns: 1fr 1fr`, `gap: 1rem`, `margin-bottom: 1.5rem`.
- Latest-game box: `grid-row: 1 / 3`.
- JSX/source order is **latest game → random played → random unplayed**. On desktop, CSS places the latest-game box on the right (`grid-column: 2; grid-row: 1 / 3`); the two card boxes flow into column 1 in that order. Below ~900px viewport, the grid collapses to a single column and the JSX order is what shows — latest game first.
- Each box reuses the existing `chart-box` chrome (border, padding, uppercase label).
- The existing full-width random-card layout (image left, content right) is restructured to vertical (image on top, content below) so all three boxes visually align.
- Width starts at `1fr 1fr`. If the fact list looks cramped during implementation, bump to `1fr 1.4fr`.

## Components

Three new files in `src/components/`.

### `RandomCardBox.jsx`

- Props: `{ pool: 'played' | 'unplayed', onCardClick, onGameClick }`.
- `pool === 'played'`: pick a random card from `cards.filter(c => !c.isSupplyCard && !c.removed && c.times_used > 0)`. Renders card image, name, expansion, usage count, card text snippet, and a row of recent games (last 5) that included the card. This replaces the existing inline block in `Dashboard.jsx` lines 217–267.
- `pool === 'unplayed'`: pick from `cards.filter(c => !c.isSupplyCard && !c.removed && c.times_used === 0)`. Renders card image, name, expansion, card text snippet. No usage count, no recent-games row.
- `onCardClick(card)` opens the card modal; `onGameClick(game)` opens the game modal. Both bubble up to Dashboard, which already owns `selectedCard` / `selectedGame` state.
- If `pool === 'unplayed'` and the pool is empty (every kingdom card has been played), renders a compact "Allt spilað! 🎉" empty state instead of a card.

### `LatestGameBox.jsx`

- Props: `{ onGameNav }` — the existing `handleGameNav` callback from `App.jsx`.
- Picks `games[games.length - 1]` (`DATA.games` is sorted ascending by `game_num` in `data.js`).
- Renders header (`#N · date · location · victory badge`), podium row (places + scores), and the fact list returned by `computeLastGameFacts`.
- Whole box is a click target → `onGameNav(game.game_num)` → History tab opens with that game's modal via the existing `targetGame` `useEffect`.
- If `DATA.games.length === 0`, returns `null`.

### `src/lib/lastGameFacts.js`

- Pure module: `export function computeLastGameFacts(game, allGames, players, cards) → Array<{ icon, title, text }>`.
- `allGames` is everything up to and including `game`, so "first time" / "highest ever" comparisons reflect history at the moment of the latest game.
- No React imports, no DOM access. First non-trivial derived-data module separate from `data.js`; introduces a small `src/lib/` convention for this kind of logic.
- Returns at most 5 facts. If more apply, priority order: records broken → personal milestones → result snippet → card spotlight.

### Dashboard wiring (`Dashboard.jsx`)

- Remove the inline random-card block (lines 217–267).
- Add a wrapper at the top of the `<section>`:

  ```jsx
  <div className="dashboard-highlights">
    <LatestGameBox onGameNav={onGameNav} />
    <RandomCardBox pool="played"   onCardClick={setSelectedCard} onGameClick={setSelectedGame} />
    <RandomCardBox pool="unplayed" onCardClick={setSelectedCard} />
  </div>
  ```

- Dashboard accepts a new `onGameNav` prop. `App.jsx` already has `handleGameNav` (currently passed only to FunFacts); the change is one extra prop on the Dashboard render.
- Existing `selectedCard` / `selectedGame` modal state in Dashboard stays put.

### CSS

- `.dashboard-highlights` rule lives in `src/index.css` next to the existing `.charts-row` rule, with the same media-query breakpoint pattern for collapsing to one column.

## Fact catalog (`computeLastGameFacts`)

Each entry only emits when its underlying condition holds; no padding. Capped at 5 facts.

### Result snippet (always emits)

- Single line: winner + score, gap to runner-up, victory type. Example: `Lúlli vann með 48 stigum (4 yfir Helenu) — Province sigur`.

### Records broken

All "ever" comparisons emit when this game's value **ties or exceeds** the previous all-time max (so a tied record still surfaces). For "smallest" / "closest" comparisons, the converse: tie or below.

- 🏆 **Stigamet** — any score in this game ≥ all-time max single-player score.
- 💥 **Stigaríkasti leikurinn** — total of all scores ≥ all-time max total.
- 🌊 **Stærsti sigur** — gap between 1st and last place ≥ all-time max gap.
- 😰 **Spennumesti leikurinn** — gap between 1st and 2nd ≤ all-time min gap, with gap ≥ 1 (not a tie at the top).
- 👑 **Stærsta ríkið** — `kingdom.length` ≥ all-time max kingdom size.
- 📦 **Flestar viðbætur** — `expansions.length` ≥ all-time max.

### Personal milestones (one per player max)

- 🌟 **Fyrsti leikur** — player's first appearance ever.
- 🥇 **Fyrsti sigur** — player's first 1st-place finish.
- 🎯 **N. leikur** — player hit a round-number game count (10, 25, 50, 100, 150, 200…).
- 🎖️ **N. sigur** — player hit a round-number win count (5, 10, 25, 50).
- 🔥 **Sigurröð** — winner has now won ≥ 3 games in a row.
- 👋 **Aftur eftir N leiki** — player returned after a gap of ≥ 30 games (matches the existing History `computeHighlights` threshold).

### Card spotlight (at most one)

- ✨ **Frumraun** — a card that had never appeared in a kingdom before this game.
- 🦗 **Sjaldgæft spil** — otherwise, the kingdom card with the lowest historical `times_used > 0`, but only if that count is ≤ 3.
- If neither holds, the card spotlight fact is omitted entirely.

### Edge cases

- `game.results.length === 0` (early games #1, #2): skip score-dependent records and milestones. Setup-level facts (kingdom size, expansions, first-appearance cards) and the result snippet (falling back to player list) still render.
- `victory_type` null: omit from the result snippet, no error.
- Names are pre-corrected by `data.js` `fixName`; no extra normalization here.
- Mummi (`CLUB_OWNER`) is **not** suppressed in this view. The latest game is about what actually happened, not the all-time leaderboard, so Mummi's records are shown directly.

## Data flow

- `DATA` is loaded once at module init in `src/data.js`. `DATA.games` is sorted ascending by `game_num`.
- `LatestGameBox` reads `games[games.length - 1]` inside a `useMemo`. `computeLastGameFacts` runs synchronously inside the same memo. With ~hundreds of games and ~10-card kingdoms, all comparisons are O(games × players) at worst — well under 1ms.
- Click flow: `LatestGameBox` → `onGameNav(gameNum)` → `App.handleGameNav` → sets `targetGame` and navigates to `#history` → `History` opens the modal via its existing `useEffect` on `targetGame`.
- `RandomCardBox` follows the existing modal pattern — clicks bubble up to Dashboard's `selectedCard` / `selectedGame` state.

## Error handling

- Empty dataset (`games.length === 0`): both boxes return `null`.
- `unplayed` pool empty: shows the "Allt spilað! 🎉" empty state instead of a card.
- Latest game with empty `results`: fact computation skips score-dependent facts and emits whatever does apply.
- `computeLastGameFacts` validates inputs: if `game` is null/undefined, returns `[]`. No throws.

## Testing

The project has no test runner today (`package.json` defines only `dev` / `build` / `preview`). Adding one is out of scope for this issue. `computeLastGameFacts` is structured as a pure function so tests can be added later without refactoring.

Manual verification via `npm run dev`:

- Latest-game box renders with a non-empty fact list against current data.
- Clicking the box lands on History tab with the correct game modal open.
- Random played card behaves as before.
- Random unplayed card renders a card with `times_used === 0`, or the empty state if none exist.
- Resize: layout collapses to a single column on narrow viewport in the order latest game → played → unplayed.
- Spot-check the empty-`results` edge case: rendering does not crash on a game without scores.

## Files touched

- `src/App.jsx` — pass `handleGameNav` to `Dashboard`.
- `src/tabs/Dashboard.jsx` — remove inline random-card block, add `<div className="dashboard-highlights">` wrapper, render the three boxes, accept `onGameNav` prop.
- `src/components/RandomCardBox.jsx` — new.
- `src/components/LatestGameBox.jsx` — new.
- `src/lib/lastGameFacts.js` — new.
- `src/index.css` — `.dashboard-highlights` grid rule.
