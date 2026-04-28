# Latest Game Highlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Latest Game" box (with computed fun facts) to the Dashboard, alongside two random-card boxes (one played, one unplayed), reshuffling the dashboard top into a 2-column grid where the latest game spans both rows.

**Architecture:** Pure derivation module `src/lib/lastGameFacts.js` computes the fact list. Two new components in `src/components/`: `RandomCardBox` (parameterized by `pool: 'played' | 'unplayed'`) and `LatestGameBox`. Dashboard renders the three boxes in a `.dashboard-highlights` CSS grid. Click on the latest-game box reuses the existing `handleGameNav` flow → History tab + open modal.

**Tech Stack:** React 18, Vite 5. No test runner — verification is manual via `npm run dev` and the browser.

**Spec:** [`docs/superpowers/specs/2026-04-28-latest-game-highlight-design.md`](../specs/2026-04-28-latest-game-highlight-design.md).

**Note on TDD:** The project has no test runner today (per spec, adding one is out of scope). Each task substitutes manual browser verification via `npm run dev` for automated tests. `computeLastGameFacts` is structured as a pure function so unit tests can be added later when the project gains a test runner.

---

## Task 1: Wire `onGameNav` from App through to Dashboard

**Files:**
- Modify: `src/App.jsx:63` (the `<Dashboard />` render)
- Modify: `src/tabs/Dashboard.jsx:19` (function signature)

The latest-game box (built later) needs `onGameNav` to navigate to History on click. `App.jsx` already defines `handleGameNav` and passes it to `FunFacts`. This task threads it into Dashboard too. Dashboard accepts the prop but doesn't use it yet — that comes in Task 5.

- [ ] **Step 1: Modify `src/App.jsx` to pass `handleGameNav` to Dashboard**

Replace line 63 in `src/App.jsx`:

```jsx
{activeTab === 'dashboard' && <Dashboard />}
```

with:

```jsx
{activeTab === 'dashboard' && <Dashboard onGameNav={handleGameNav} />}
```

- [ ] **Step 2: Modify `src/tabs/Dashboard.jsx` to accept the prop**

Replace line 19:

```jsx
export default function Dashboard() {
```

with:

```jsx
export default function Dashboard({ onGameNav }) {
```

(Don't use `onGameNav` yet — it's threaded for use in Task 5.)

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Open: `http://localhost:5173`
Expected: Dashboard renders unchanged, no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/tabs/Dashboard.jsx
git commit -m "feat(dashboard): thread onGameNav prop to Dashboard"
```

---

## Task 2: Build `src/lib/lastGameFacts.js`

**Files:**
- Create: `src/lib/lastGameFacts.js`

Pure module exporting `computeLastGameFacts(game, allGames, players, cards)`. Returns `Array<{ icon, title, text }>`, capped at 5 entries, priority order: records broken → personal milestones → result snippet → card spotlight.

`allGames` is everything up to and including `game` (the array passed by `LatestGameBox` will be `DATA.games` itself, where `game` is the last element — so it includes itself for "ever" comparisons; that's correct because a record set in *this* game still counts).

- [ ] **Step 1: Create the file with skeleton + result snippet**

Create `src/lib/lastGameFacts.js`:

```js
// Pure derivation: compute fun facts for a single game in the context
// of all known games. No React imports, no DOM access.

const ROUND_GAME_MILESTONES = new Set([10, 25, 50, 100, 150, 200, 250, 300])
const ROUND_WIN_MILESTONES = new Set([5, 10, 25, 50, 100])
const RETURN_GAP_THRESHOLD = 30
const STREAK_THRESHOLD = 3
const SPOTLIGHT_RARE_MAX = 3
const MAX_FACTS = 5

function buildResultSnippet(game) {
  const scored = (game.results || []).filter(r => r.score != null).sort((a, b) => a.place - b.place)
  if (scored.length === 0) {
    // No scores recorded — fall back to listing players
    const players = (game.players || []).join(', ')
    return players
      ? { icon: '🎲', title: 'Niðurstaða', text: `Spilarar: ${players}` }
      : null
  }
  const winner = scored[0]
  const runnerUp = scored[1]
  const gap = runnerUp ? winner.score - runnerUp.score : null
  const victory = game.victory_type ? ` — ${game.victory_type} sigur` : ''
  const gapText = runnerUp != null
    ? ` (${gap} yfir ${runnerUp.name})`
    : ''
  return {
    icon: '🎲',
    title: 'Niðurstaða',
    text: `${winner.name} vann með ${winner.score} stigum${gapText}${victory}`,
  }
}

export function computeLastGameFacts(game, allGames, players, cards) {
  if (!game) return []
  const result = buildResultSnippet(game)
  return result ? [result] : []
}
```

- [ ] **Step 2: Add records-broken facts**

Edit `src/lib/lastGameFacts.js`. Add these helper functions ABOVE `buildResultSnippet`:

```js
function buildRecordFacts(game, allGames) {
  const facts = []
  const scored = (game.results || []).filter(r => r.score != null)
  if (scored.length === 0) return [...facts, ...buildSetupRecords(game, allGames)]

  // All historical scores (single-player), max kingdom size, max expansions, max gap, etc.
  let maxScore = -Infinity
  let maxTotal = -Infinity
  let maxGap = -Infinity
  let minNailbiter = Infinity
  let maxKingdom = -Infinity
  let maxExpansions = -Infinity

  for (const g of allGames) {
    if (g === game) continue // exclude current game from the "previous" max
    const s = (g.results || []).filter(r => r.score != null)
    if (s.length > 0) {
      for (const r of s) if (r.score > maxScore) maxScore = r.score
      const total = s.reduce((a, b) => a + b.score, 0)
      if (total > maxTotal) maxTotal = total
      if (s.length >= 2) {
        const sorted = [...s].sort((a, b) => a.place - b.place)
        const gap = sorted[0].score - sorted[sorted.length - 1].score
        if (gap > maxGap) maxGap = gap
        const top2 = sorted[0].score - sorted[1].score
        if (top2 >= 1 && top2 < minNailbiter) minNailbiter = top2
      }
    }
    if ((g.kingdom?.length ?? 0) > maxKingdom) maxKingdom = g.kingdom?.length ?? 0
    if ((g.expansions?.length ?? 0) > maxExpansions) maxExpansions = g.expansions?.length ?? 0
  }

  // This game's values
  const sortedScored = [...scored].sort((a, b) => a.place - b.place)
  const thisMaxScore = Math.max(...scored.map(r => r.score))
  const thisTotal = scored.reduce((a, b) => a + b.score, 0)
  const thisGap = sortedScored.length >= 2
    ? sortedScored[0].score - sortedScored[sortedScored.length - 1].score
    : null
  const thisTop2 = sortedScored.length >= 2
    ? sortedScored[0].score - sortedScored[1].score
    : null
  const thisKingdom = game.kingdom?.length ?? 0
  const thisExpansions = game.expansions?.length ?? 0

  if (thisMaxScore >= maxScore && thisMaxScore !== -Infinity) {
    const top = scored.find(r => r.score === thisMaxScore)
    facts.push({ icon: '🏆', title: 'Stigamet', text: `${top.name} skoraði ${thisMaxScore} stig — met klúbbsins` })
  }
  if (thisTotal >= maxTotal && maxTotal !== -Infinity) {
    facts.push({ icon: '💥', title: 'Stigaríkasti leikurinn', text: `${thisTotal} stig samtals — met` })
  }
  if (thisGap != null && thisGap >= maxGap && maxGap !== -Infinity) {
    const winner = sortedScored[0]
    const loser = sortedScored[sortedScored.length - 1]
    facts.push({ icon: '🌊', title: 'Stærsti sigur', text: `${winner.name} vann ${loser.name} með ${thisGap} stiga mun — met` })
  }
  if (thisTop2 != null && thisTop2 >= 1 && thisTop2 <= minNailbiter && minNailbiter !== Infinity) {
    facts.push({ icon: '😰', title: 'Spennumesti leikurinn', text: `Aðeins ${thisTop2} stiga munur á 1. og 2. sæti — met` })
  }
  if (thisKingdom >= maxKingdom && maxKingdom !== -Infinity) {
    facts.push({ icon: '👑', title: 'Stærsta ríkið', text: `${thisKingdom} ríkiskort — met` })
  }
  if (thisExpansions >= maxExpansions && maxExpansions !== -Infinity) {
    facts.push({ icon: '📦', title: 'Flestar viðbætur', text: `${thisExpansions} viðbætur í einum leik — met` })
  }
  return facts
}

// Setup-only records (kingdom size, expansions) for games without scored results
function buildSetupRecords(game, allGames) {
  const facts = []
  let maxKingdom = -Infinity
  let maxExpansions = -Infinity
  for (const g of allGames) {
    if (g === game) continue
    if ((g.kingdom?.length ?? 0) > maxKingdom) maxKingdom = g.kingdom?.length ?? 0
    if ((g.expansions?.length ?? 0) > maxExpansions) maxExpansions = g.expansions?.length ?? 0
  }
  const thisKingdom = game.kingdom?.length ?? 0
  const thisExpansions = game.expansions?.length ?? 0
  if (thisKingdom >= maxKingdom && maxKingdom !== -Infinity) {
    facts.push({ icon: '👑', title: 'Stærsta ríkið', text: `${thisKingdom} ríkiskort — met` })
  }
  if (thisExpansions >= maxExpansions && maxExpansions !== -Infinity) {
    facts.push({ icon: '📦', title: 'Flestar viðbætur', text: `${thisExpansions} viðbætur í einum leik — met` })
  }
  return facts
}
```

Then update the exported function to call it:

```js
export function computeLastGameFacts(game, allGames, players, cards) {
  if (!game) return []
  const records = buildRecordFacts(game, allGames)
  const result = buildResultSnippet(game)
  return [...records, ...(result ? [result] : [])]
}
```

- [ ] **Step 3: Add personal-milestones facts**

Add this helper above `buildResultSnippet`:

```js
function buildMilestoneFacts(game, allGames) {
  const facts = []
  const sortedHistory = [...allGames].sort((a, b) => a.game_num - b.game_num)
  const thisIdx = sortedHistory.indexOf(game)
  const previousGames = sortedHistory.slice(0, thisIdx)

  // Tally history per player
  const gamesPlayed = {}
  const winsCount = {}
  const lastSeenIdx = {}
  previousGames.forEach((g, i) => {
    g.players?.forEach(name => {
      gamesPlayed[name] = (gamesPlayed[name] || 0) + 1
      lastSeenIdx[name] = i
    })
    g.results?.forEach(r => { if (r.place === 1) winsCount[r.name] = (winsCount[r.name] || 0) + 1 })
  })

  const seenPlayers = new Set() // ensure one milestone per player

  // First appearance ever
  for (const name of (game.players || [])) {
    if (!seenPlayers.has(name) && (gamesPlayed[name] || 0) === 0) {
      facts.push({ icon: '🌟', title: 'Fyrsti leikur', text: `${name} spilaði sinn fyrsta leik` })
      seenPlayers.add(name)
    }
  }

  // First win ever
  for (const r of (game.results || [])) {
    if (r.place !== 1 || seenPlayers.has(r.name)) continue
    if ((winsCount[r.name] || 0) === 0 && (gamesPlayed[r.name] || 0) > 0) {
      facts.push({ icon: '🥇', title: 'Fyrsti sigur', text: `${r.name} vann í fyrsta sinn (eftir ${gamesPlayed[r.name]} leiki)` })
      seenPlayers.add(r.name)
    }
  }

  // Round-number game count (after this game)
  for (const name of (game.players || [])) {
    if (seenPlayers.has(name)) continue
    const total = (gamesPlayed[name] || 0) + 1 // include this game
    if (ROUND_GAME_MILESTONES.has(total)) {
      facts.push({ icon: '🎯', title: `${total}. leikur`, text: `${name} náði ${total} leikjum í klúbbnum` })
      seenPlayers.add(name)
    }
  }

  // Round-number win count
  for (const r of (game.results || [])) {
    if (r.place !== 1 || seenPlayers.has(r.name)) continue
    const total = (winsCount[r.name] || 0) + 1
    if (ROUND_WIN_MILESTONES.has(total)) {
      facts.push({ icon: '🎖️', title: `${total}. sigur`, text: `${r.name} náði ${total} sigrum` })
      seenPlayers.add(r.name)
    }
  }

  // Win streak ≥ STREAK_THRESHOLD for this game's winner
  const winner = (game.results || []).find(r => r.place === 1)
  if (winner && !seenPlayers.has(winner.name)) {
    let streak = 1
    for (let i = previousGames.length - 1; i >= 0; i--) {
      const g = previousGames[i]
      if (!g.players?.includes(winner.name)) continue
      const w = g.results?.find(r => r.place === 1)
      if (w?.name === winner.name) streak++
      else break
    }
    if (streak >= STREAK_THRESHOLD) {
      facts.push({ icon: '🔥', title: 'Sigurröð', text: `${winner.name} hefur unnið ${streak} leiki í röð` })
      seenPlayers.add(winner.name)
    }
  }

  // Returning player after long gap
  for (const name of (game.players || [])) {
    if (seenPlayers.has(name)) continue
    const last = lastSeenIdx[name]
    if (last == null) continue // first-timer (already covered)
    const gap = thisIdx - last
    if (gap >= RETURN_GAP_THRESHOLD) {
      facts.push({ icon: '👋', title: 'Aftur eftir hlé', text: `${name} mætti aftur eftir ${gap} leiki` })
      seenPlayers.add(name)
    }
  }

  return facts
}
```

Update the exported function:

```js
export function computeLastGameFacts(game, allGames, players, cards) {
  if (!game) return []
  const records = buildRecordFacts(game, allGames)
  const milestones = buildMilestoneFacts(game, allGames)
  const result = buildResultSnippet(game)
  return [...records, ...milestones, ...(result ? [result] : [])]
}
```

- [ ] **Step 4: Add card-spotlight fact**

Add helper above `buildResultSnippet`:

```js
function buildSpotlightFact(game, allGames, cards) {
  const kingdom = game.kingdom || []
  if (kingdom.length === 0) return null
  const sortedHistory = [...allGames].sort((a, b) => a.game_num - b.game_num)
  const thisIdx = sortedHistory.indexOf(game)
  const previousGames = sortedHistory.slice(0, thisIdx)

  // Count historical kingdom appearances of each card name (ignore extras for spotlight)
  const priorUsage = {}
  for (const g of previousGames) {
    g.kingdom?.forEach(k => { priorUsage[k.card] = (priorUsage[k.card] || 0) + 1 })
  }

  // Frumraun: any card with prior usage 0
  const debutCard = kingdom.find(k => (priorUsage[k.card] || 0) === 0)
  if (debutCard) {
    return { icon: '✨', title: 'Frumraun', text: `${debutCard.card} kom í ríki í fyrsta sinn` }
  }

  // Sjaldgæft: card with the lowest prior usage among kingdom cards, if ≤ SPOTLIGHT_RARE_MAX
  let rare = null
  for (const k of kingdom) {
    const u = priorUsage[k.card] || 0
    if (u <= SPOTLIGHT_RARE_MAX && (rare == null || u < rare.count)) {
      rare = { card: k.card, count: u }
    }
  }
  if (rare) {
    const desc = rare.count === 1
      ? `${rare.card} hafði aðeins komið einu sinni áður í ríki`
      : `${rare.card} hafði aðeins komið ${rare.count} sinnum áður í ríki`
    return { icon: '🦗', title: 'Sjaldgæft spil', text: desc }
  }

  return null
}
```

Update the exported function:

```js
export function computeLastGameFacts(game, allGames, players, cards) {
  if (!game) return []
  const records = buildRecordFacts(game, allGames)
  const milestones = buildMilestoneFacts(game, allGames)
  const result = buildResultSnippet(game)
  const spotlight = buildSpotlightFact(game, allGames, cards)

  const ordered = [
    ...records,
    ...milestones,
    ...(result ? [result] : []),
    ...(spotlight ? [spotlight] : []),
  ]
  return ordered.slice(0, MAX_FACTS)
}
```

- [ ] **Step 5: Quick syntax check**

Run: `npm run build`
Expected: Vite build completes without errors. (Build runs the same parser the dev server uses; if there's a syntax error in `lastGameFacts.js`, this catches it.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/lastGameFacts.js
git commit -m "feat(lib): add computeLastGameFacts for latest-game fact derivation"
```

---

## Task 3: Create `LatestGameBox.jsx`

**Files:**
- Create: `src/components/LatestGameBox.jsx`

The component picks the latest game, computes facts, and renders the box. Whole box is a single click target → `onGameNav(game.game_num)`.

- [ ] **Step 1: Create the component file**

Create `src/components/LatestGameBox.jsx`:

```jsx
import { useMemo } from 'react'
import DATA from '../data'
import { computeLastGameFacts } from '../lib/lastGameFacts'

const VICTORY_BADGE_CLASS = {
  Province: 'badge-province',
  Colony: 'badge-colony',
  'Supply piles': 'badge-supply',
}

export default function LatestGameBox({ onGameNav }) {
  const { games, players, cards } = DATA

  const { latest, facts } = useMemo(() => {
    if (!games.length) return { latest: null, facts: [] }
    const latest = games[games.length - 1]
    const facts = computeLastGameFacts(latest, games, players, cards)
    return { latest, facts }
  }, [games, players, cards])

  if (!latest) return null

  return (
    <div
      className="chart-box latest-game-box"
      onClick={() => onGameNav?.(latest.game_num)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGameNav?.(latest.game_num) } }}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ fontSize: '.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>
        Síðasti leikur
      </div>

      {/* Header: # · date · location · victory */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6rem', alignItems: 'center', marginBottom: '.6rem' }}>
        <span className="cinzel gold" style={{ fontSize: '1.1rem' }}>#{latest.game_num}</span>
        {latest.date && <span style={{ fontSize: '.78rem', color: 'var(--dim)' }}>{latest.date}</span>}
        {latest.location && <span style={{ fontSize: '.78rem', color: 'var(--dim)' }}>{latest.location}</span>}
        {latest.victory_type && (
          <span className={`badge ${VICTORY_BADGE_CLASS[latest.victory_type] || 'badge-province'}`}>
            {latest.victory_type}
          </span>
        )}
      </div>

      {/* Podium */}
      {latest.results?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem .8rem', marginBottom: '.8rem', fontSize: '.82rem' }}>
          {latest.results.map(r => (
            <span key={r.place}>
              <span style={{ color: r.place === 1 ? 'var(--gold)' : 'var(--dim)' }}>
                {r.place === 1 ? '🥇' : r.place === 2 ? '🥈' : r.place === 3 ? '🥉' : `${r.place}.`}
              </span>
              {' '}
              <span>{r.name}</span>
              {r.score != null && <span style={{ color: 'var(--dim)', marginLeft: '.3rem' }}>{r.score}stig</span>}
            </span>
          ))}
        </div>
      )}

      {/* Facts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {facts.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: '.55rem', alignItems: 'flex-start', fontSize: '.82rem', lineHeight: 1.4 }}>
            <span style={{ flexShrink: 0 }}>{f.icon}</span>
            <span>
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{f.title}</span>
              <span style={{ color: 'var(--dim)' }}> — {f.text}</span>
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '.85rem', fontSize: '.72rem', color: 'var(--dim)', textAlign: 'right' }}>
        Sjá leikinn →
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Quick syntax check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/LatestGameBox.jsx
git commit -m "feat(components): add LatestGameBox"
```

---

## Task 4: Add `.dashboard-highlights` CSS

**Files:**
- Modify: `src/index.css` (insert near the existing `.charts-row` rule and the responsive media query)

Two columns, latest game spans both rows. Below 768px collapses to single column. Order on mobile is JSX source order, so the JSX in Task 5 will put `LatestGameBox` first.

- [ ] **Step 1: Add the grid rule**

Open `src/index.css`. After the `.chart-box canvas` rule on line 130, insert:

```css

/* ── DASHBOARD HIGHLIGHTS (top row of cards + latest game) ── */
.dashboard-highlights {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: minmax(0, auto);
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}
.dashboard-highlights > .latest-game-box {
  grid-column: 2;
  grid-row: 1 / 3;
}
.latest-game-box:hover {
  border-color: var(--gold);
}
```

- [ ] **Step 2: Add responsive collapse**

In the existing `@media (max-width: 768px)` block (starts at line 542), add this rule before the closing brace:

```css
  .dashboard-highlights {
    grid-template-columns: 1fr;
  }
  .dashboard-highlights > .latest-game-box {
    grid-column: 1;
    grid-row: auto;
  }
```

- [ ] **Step 3: Verify CSS is valid**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(dashboard): add .dashboard-highlights grid layout"
```

---

## Task 5: Integrate `LatestGameBox` into Dashboard

**Files:**
- Modify: `src/tabs/Dashboard.jsx` (add import, add `<LatestGameBox>` in a new wrapper above the existing inline random-card block)

This keeps the existing inline random-card block in place (it gets replaced in Task 7). The latest-game box gets a temporary placeholder slot in the layout — the existing random-card block stays full-width below it for now. We'll do the proper 3-up layout in Task 7.

Why this intermediate state: it lets us verify the latest-game box renders correctly against real data before refactoring the random-card code.

- [ ] **Step 1: Add the import**

In `src/tabs/Dashboard.jsx`, after the existing component imports (around line 7), add:

```jsx
import LatestGameBox from '../components/LatestGameBox'
```

- [ ] **Step 2: Render the box at the top of the section**

In `src/tabs/Dashboard.jsx`, find the `return (` block. Right after the opening `<section className="section active">` tag (line 216), insert:

```jsx
      <div className="dashboard-highlights">
        <LatestGameBox onGameNav={onGameNav} />
      </div>
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Open: `http://localhost:5173`
Expected:
- Latest game box shows at the very top of the dashboard.
- It displays game # · date · location · victory badge, podium row, and a list of facts.
- Clicking anywhere on the box navigates to History tab and opens the game's modal.
- The existing random-card block still renders below (full-width, unchanged).

Manually click the box to verify navigation. Close the modal and confirm you're on the History tab.

- [ ] **Step 4: Commit**

```bash
git add src/tabs/Dashboard.jsx
git commit -m "feat(dashboard): integrate LatestGameBox at top of dashboard"
```

---

## Task 6: Create `RandomCardBox.jsx`

**Files:**
- Create: `src/components/RandomCardBox.jsx`

Parameterized component: `pool: 'played' | 'unplayed'`. The `played` variant matches the existing inline behavior in `Dashboard.jsx` lines 217–267 (image, name, expansion, usage count, card text, recent games). The `unplayed` variant skips usage count and recent games and shows an empty state if the pool is empty.

The two variants share the same chrome and outer layout — keep them in one component.

- [ ] **Step 1: Create the component**

Create `src/components/RandomCardBox.jsx`:

```jsx
import { useMemo } from 'react'
import DATA from '../data'
import CardImage from './CardImage'

const EXTRA_FIELDS = ['events', 'landmarks', 'projects', 'ways', 'allies', 'traits', 'prophecy']

const LABELS = {
  played: 'Handahófskennt spil',
  unplayed: 'Óspilað spil',
}

export default function RandomCardBox({ pool, onCardClick, onGameClick }) {
  const { games, cards } = DATA

  const { card, recentGames } = useMemo(() => {
    const filter = pool === 'unplayed'
      ? c => !c.isSupplyCard && !c.removed && c.times_used === 0
      : c => !c.isSupplyCard && !c.removed && c.times_used > 0
    const candidates = cards.filter(filter)
    if (candidates.length === 0) return { card: null, recentGames: [] }
    const card = candidates[Math.floor(Math.random() * candidates.length)]
    if (pool === 'unplayed') return { card, recentGames: [] }
    const using = games.filter(g =>
      g.kingdom.some(k => k.card === card.name) ||
      EXTRA_FIELDS.some(f => g[f]?.includes(card.name))
    )
    return { card, recentGames: [...using].slice(-5).reverse() }
  }, [games, cards, pool])

  // Empty state for unplayed pool
  if (!card && pool === 'unplayed') {
    return (
      <div className="chart-box">
        <div style={{ fontSize: '.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>
          {LABELS.unplayed}
        </div>
        <div style={{ fontSize: '.85rem', color: 'var(--dim)', textAlign: 'center', padding: '1.5rem 0' }}>
          Allt spilað! 🎉
        </div>
      </div>
    )
  }
  if (!card) return null

  const usageText = pool === 'played'
    ? `${card.times_used}× spiluð (${games.length > 0 ? Math.round(card.times_used / games.length * 100) : 0}%)`
    : null

  const cardTextSnippet = card.card_text
    ? (card.card_text.length > 150 ? card.card_text.slice(0, 150) + '…' : card.card_text)
    : null

  return (
    <div className="chart-box">
      <div style={{ fontSize: '.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>
        {LABELS[pool]}
      </div>

      <div style={{ display: 'flex', gap: '.85rem', alignItems: 'flex-start' }}>
        <div
          style={{ flexShrink: 0, width: 60, borderRadius: 6, overflow: 'hidden', background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer' }}
          onClick={() => onCardClick?.(card)}
        >
          <CardImage name={card.name} style={{ width: '100%', display: 'block' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--gold)', cursor: 'pointer' }}
            onClick={() => onCardClick?.(card)}
          >
            {card.name}
            {card.card_type && card.card_type !== 'Kingdom' && (
              <span className={`badge badge-${card.card_type.toLowerCase()}`} style={{ marginLeft: '.4rem', fontSize: '.6rem', verticalAlign: 'middle', padding: '.1rem .35rem' }}>
                {card.card_type}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem .8rem', marginTop: '.2rem' }}>
            <span style={{ fontSize: '.75rem', color: 'var(--dim)' }}>{card.expansion}</span>
            {usageText && <span style={{ fontSize: '.75rem', color: 'var(--dim)' }}>{usageText}</span>}
          </div>
        </div>
      </div>

      {cardTextSnippet && (
        <div style={{ fontSize: '.78rem', color: 'var(--dim)', lineHeight: 1.5, borderLeft: '2px solid var(--gold)', paddingLeft: '.6rem', marginTop: '.6rem' }}>
          {cardTextSnippet}
        </div>
      )}

      {pool === 'played' && recentGames.length > 0 && (
        <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap', marginTop: '.6rem' }}>
          {recentGames.map(g => (
            <span
              key={g.game_num}
              style={{ fontSize: '.72rem', background: 'var(--bg3)', borderRadius: '4px', padding: '.2rem .5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onClick={() => onGameClick?.(g)}
            >
              <span style={{ color: 'var(--gold)' }}>#{g.game_num}</span>{' '}
              <span style={{ color: 'var(--dim)' }}>{g.date}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Quick syntax check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/RandomCardBox.jsx
git commit -m "feat(components): add RandomCardBox (played/unplayed pools)"
```

---

## Task 7: Replace inline random-card and add unplayed-card box in Dashboard

**Files:**
- Modify: `src/tabs/Dashboard.jsx` (remove inline random-card block, render the two `RandomCardBox` instances inside `.dashboard-highlights`)

Final layout: `.dashboard-highlights` contains `LatestGameBox` (rendered first in JSX → spans rows 1–2 of column 2 via CSS), then `RandomCardBox pool="played"` and `RandomCardBox pool="unplayed"` (which flow into column 1 rows 1 and 2).

- [ ] **Step 1: Add the `RandomCardBox` import**

In `src/tabs/Dashboard.jsx`, near the existing `LatestGameBox` import, add:

```jsx
import RandomCardBox from '../components/RandomCardBox'
```

- [ ] **Step 2: Remove the existing `randomCard` derivation**

In `src/tabs/Dashboard.jsx`, delete this block (currently lines 24–27):

```jsx
  const randomCard = useState(() => {
    const pool = cards.filter(c => !c.isSupplyCard && !c.removed && c.times_used > 0)
    return pool[Math.floor(Math.random() * pool.length)] || null
  })[0]
```

- [ ] **Step 3: Remove the inline random-card render block**

In `src/tabs/Dashboard.jsx`, delete the entire block that begins with `{randomCard && (() => {` and ends with `})()}` (currently lines 217–267). It starts with the comment-free `{randomCard && (() => {` line right after the `return ( <section className="section active">` opening, and ends just before `<div className="stats-grid">`.

- [ ] **Step 4: Replace the existing `.dashboard-highlights` JSX with the full three-box layout**

Find the `.dashboard-highlights` `<div>` you added in Task 5. Replace it with:

```jsx
      <div className="dashboard-highlights">
        <LatestGameBox onGameNav={onGameNav} />
        <RandomCardBox pool="played" onCardClick={setSelectedCard} onGameClick={setSelectedGame} />
        <RandomCardBox pool="unplayed" onCardClick={setSelectedCard} />
      </div>
```

- [ ] **Step 5: Verify in browser (desktop)**

Run: `npm run dev`
Open: `http://localhost:5173`
Expected:
- Top of dashboard shows three boxes: random played card top-left, random unplayed card bottom-left, latest game spanning the right column.
- Clicking a card image or name opens the card modal.
- Clicking a recent-game pill in the played-card box opens the game modal.
- Clicking the latest-game box navigates to History tab + opens that game's modal.
- The unplayed box shows a card with `times_used === 0` (or "Allt spilað! 🎉" if no such card exists in current data).

- [ ] **Step 6: Verify in browser (mobile/narrow)**

In the browser, resize the window below ~768px (or open DevTools responsive mode at e.g. 480px width).
Expected:
- All three boxes stack into a single column.
- Order from top: latest game → random played card → random unplayed card.

- [ ] **Step 7: Commit**

```bash
git add src/tabs/Dashboard.jsx
git commit -m "feat(dashboard): finalize 3-box highlights row (latest game + 2 random cards)"
```

---

## Task 8: Final verification + edge-case smoke test

**Files:** none (verification-only)

- [ ] **Step 1: Verify the empty-results edge case manually**

In the browser DevTools console on the dashboard tab, run:

```js
// Inspect the latest game's results — confirms which cases the box handles
console.log(window) // Just to confirm we're in the right place
```

Then navigate to the History tab and look at the most recent games. If any have empty `results` (rare in current data), confirm the latest-game box still renders without crashing.

For paranoid safety: temporarily edit `src/components/LatestGameBox.jsx` line `const latest = games[games.length - 1]` to `const latest = games.find(g => !g.results || g.results.length === 0) || games[games.length - 1]` to simulate that case, refresh, confirm no crash, then **revert the edit** before committing anything else. Do not commit this temporary change.

- [ ] **Step 2: Verify the empty-unplayed-pool edge case (visual only)**

The `Allt spilað! 🎉` empty state code path is in `RandomCardBox.jsx`. Visually confirm by temporarily editing `src/components/RandomCardBox.jsx` filter for `pool === 'unplayed'` to `c => false` (force empty), refresh, confirm "Allt spilað! 🎉" renders, then **revert the edit**. Do not commit.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: build succeeds with no errors. Output goes to `dist/`.

- [ ] **Step 4: Final inspection — commit only if needed**

Run: `git status`
Expected: clean working tree (no uncommitted changes).

If anything was left modified by the edge-case checks, run `git checkout -- <file>` to discard.

- [ ] **Step 5: Push and (optionally) create PR**

If the user wants to review locally on `main`, no further action needed. If they want a PR, create a feature branch retroactively:

```bash
git log --oneline -10  # confirm the commits made by this plan
```

Ask the user whether they want a PR opened. Do not push or open a PR without explicit approval.

---

## Self-Review Notes

Spec coverage check:

- ✅ Layout 2-col grid w/ latest game spanning rows — Task 4 + Task 7
- ✅ Mobile single-column collapse w/ latest game first — Task 4 (CSS) + Task 7 (JSX order)
- ✅ `RandomCardBox` parameterized by `pool` — Task 6
- ✅ `LatestGameBox` w/ click-to-history — Task 3 + Task 1 (prop wiring)
- ✅ `computeLastGameFacts` pure module — Task 2
- ✅ Result snippet, records, milestones, spotlight, 5-fact cap — Task 2
- ✅ Empty-results edge case — Task 2 step 1 (`buildResultSnippet` fallback) + Task 2 step 2 (`buildSetupRecords`)
- ✅ Empty unplayed pool empty state — Task 6
- ✅ `.dashboard-highlights` CSS in `index.css` — Task 4
- ✅ `App.jsx` thread `handleGameNav` to Dashboard — Task 1
- ✅ Manual verification — Tasks 5, 7, 8

Type/name consistency check:
- `computeLastGameFacts(game, allGames, players, cards)` — same signature in Task 2 and Task 3 ✅
- `RandomCardBox` props `{ pool, onCardClick, onGameClick }` — same in Task 6 and Task 7 ✅
- `LatestGameBox` prop `{ onGameNav }` — same in Task 3 and Tasks 5/7 ✅
- `.dashboard-highlights` and `.latest-game-box` class names — consistent across CSS (Task 4) and JSX (Tasks 3, 5, 7) ✅

No placeholders found. Each step has full code or explicit revert instructions.
