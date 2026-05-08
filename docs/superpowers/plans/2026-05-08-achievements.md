# Player Achievements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface ~26 player-recognition badges (volume / wins / records / streaks / variety / rivalries) on the Players tab, in `PlayerModal`, and in a new `Afrek` tab.

**Architecture:** Pure derivation module `src/lib/achievements.js` walks games chronologically once and returns `Map<playerName, Achievement[]>`. New `AchievementBadge` component renders one pill. PlayerModal grows an Afrek section, Players tab grows a count column, new `Afrek` tab adds three leaderboard sections.

**Tech Stack:** React 18, Vite 5. No test runner — verification is manual via `npm run build` and the browser, with one-off Node scripts for the pure logic.

**Spec:** [`docs/superpowers/specs/2026-05-08-achievements-design.md`](../specs/2026-05-08-achievements-design.md).

**Note on TDD:** Project has no test runner (per spec, adding one is out of scope). Each task substitutes manual verification via `npm run build` and (where useful) a Node one-shot that imports the pure module against the real data file.

---

## Task 1: Nav infra — add Afrek tab to TABS, route, stub component

**Files:**
- Modify: `src/constants.js`
- Modify: `src/App.jsx`
- Create: `src/tabs/Afrek.jsx`

Adds the new tab without any real content yet so the rest of the work has a place to land.

- [ ] **Step 1: Add Afrek to `TABS`**

In `src/constants.js`, change the `TABS` array to:

```js
export const TABS = [
  { id: 'dashboard',   label: '📊 Yfirlit' },
  { id: 'history',     label: '📖 Spilasaga' },
  { id: 'players',     label: '🏆 Leikmenn' },
  { id: 'cards',       label: '♣ Spil' },
  { id: 'expansions',  label: '📦 Viðbætur' },
  { id: 'funfacts',    label: '🌟 Skemmtilegt' },
  { id: 'afrek',       label: '🎖️ Afrek' },
  { id: 'suggester',   label: '🎲 Ríkistillögur' },
]
```

- [ ] **Step 2: Create the stub tab component**

Create `src/tabs/Afrek.jsx`:

```jsx
export default function Afrek({ onSelectPlayer }) {
  return (
    <section className="section active">
      <h2 className="section-title">Afrek</h2>
      <p style={{ color: 'var(--dim)' }}>Innihald kemur fljótlega.</p>
    </section>
  )
}
```

- [ ] **Step 3: Wire the tab in App.jsx**

Open `src/App.jsx`. Add a lazy import near the other tab imports (around line 12):

```jsx
const Afrek = lazy(() => import('./tabs/Afrek'))
```

In the render block, add a new conditional alongside the other tabs:

```jsx
{activeTab === 'afrek' && <Afrek />}
```

(Insert it between `funfacts` and `suggester` to match the TABS order.)

- [ ] **Step 4: Verify**

Run `npm run build` — should succeed.

Run `npm run dev` and navigate to the Afrek tab via the nav. Should show "Innihald kemur fljótlega." Other tabs should still work.

- [ ] **Step 5: Commit**

```bash
git add src/constants.js src/App.jsx src/tabs/Afrek.jsx
git commit -m "feat(nav): add Afrek tab stub"
```

---

## Task 2: `achievements.js` skeleton + volume + wins

**Files:**
- Create: `src/lib/achievements.js`

Build the pure module with the public API and the simplest achievement family (volume + wins).

- [ ] **Step 1: Create the file**

Create `src/lib/achievements.js`:

```js
// Pure derivation: compute player achievement badges from games + players.
// Single chronological pass over games. No React, no DOM, no module-level state.

const GAMES_TIERS = [10, 25, 50, 100]
const WIN_TIERS = [1, 5, 10, 25, 50]

function buildAchievement({ id, category, icon, title, detail = null, earnedGameNum = null, earnedDate = null }) {
  return { id, category, icon, title, detail, earnedGameNum, earnedDate }
}

function computeVolumeAndWins(sortedGames, byPlayer) {
  // Walk games in chronological order, count games + wins per player,
  // emit one achievement when a player crosses each threshold.
  const counts = {}   // name -> games count
  const wins = {}     // name -> wins count
  for (const g of sortedGames) {
    for (const name of (g.players || [])) {
      counts[name] = (counts[name] || 0) + 1
      const newGames = counts[name]
      if (GAMES_TIERS.includes(newGames)) {
        byPlayer.get(name).push(buildAchievement({
          id: `games-${newGames}`,
          category: 'volume',
          icon: '🎯',
          title: `${newGames} leikir`,
          earnedGameNum: g.game_num,
          earnedDate: g.date || null,
        }))
      }
    }
    for (const r of (g.results || [])) {
      if (r.place !== 1) continue
      wins[r.name] = (wins[r.name] || 0) + 1
      const newWins = wins[r.name]
      if (WIN_TIERS.includes(newWins)) {
        byPlayer.get(r.name).push(buildAchievement({
          id: `wins-${newWins}`,
          category: 'wins',
          icon: '🥇',
          title: newWins === 1 ? 'Fyrsti sigur' : `${newWins} sigrar`,
          earnedGameNum: g.game_num,
          earnedDate: g.date || null,
        }))
      }
    }
  }
}

export function computeAchievements(games = [], players = []) {
  const byPlayer = new Map()
  for (const p of players) byPlayer.set(p.name, [])
  if (games.length === 0) return byPlayer
  const sortedGames = [...games].sort((a, b) => a.game_num - b.game_num)
  computeVolumeAndWins(sortedGames, byPlayer)
  return byPlayer
}
```

- [ ] **Step 2: Spot-check against real data**

From the project root:

```bash
node --input-type=module -e "
import('./data/dominion_data.json', { with: { type: 'json' } }).then(async d => {
  const m = await import('./src/lib/achievements.js');
  const games = d.default.games.filter(g => g.game_num != null && Array.isArray(g.players) && g.players.length > 0);
  const players = [...new Set(games.flatMap(g => g.players))].map(name => ({ name }));
  const result = m.computeAchievements(games, players);
  for (const [name, achs] of result) {
    if (achs.length > 0) console.log(name + ':', achs.map(a => a.title).join(' · '));
  }
});
"
```

Expected: Mummi shows `100 leikir · 50 leikir · 25 leikir · 10 leikir · Fyrsti sigur · 5 sigrar · 10 sigrar · 25 sigrar · 50 sigrar` (order depends on when thresholds were crossed). Other long-time players show subsets. Newer players show only the entry tiers.

- [ ] **Step 3: Run build**

Run `npm run build` — should succeed (the module isn't yet imported by anything else, but the syntax must be valid).

- [ ] **Step 4: Commit**

```bash
git add src/lib/achievements.js
git commit -m "feat(achievements): pure module + volume/wins milestones"
```

---

## Task 3: Records + streaks

**Files:**
- Modify: `src/lib/achievements.js`

Add the all-time record holders (4) and the streak tiers (3).

- [ ] **Step 1: Add the constants and helpers**

In `src/lib/achievements.js`, add at the top alongside the existing tier constants:

```js
const STREAK_TIERS = [3, 5, 10]
```

- [ ] **Step 2: Add the records helper**

Add this function above `computeAchievements`:

```js
function computeRecords(sortedGames, byPlayer) {
  // Find the all-time record holder(s) for: max single-player score,
  // max gap (1st vs last), min gap (1st vs 2nd, ≥1), min winning score.
  let maxScore = -Infinity, maxScoreEntry = null
  let maxGap = -Infinity, maxGapEntry = null
  let minNail = Infinity, minNailEntry = null
  let minWin = Infinity, minWinEntry = null
  for (const g of sortedGames) {
    const scored = (g.results || []).filter(r => r.score != null)
    if (scored.length === 0) continue
    for (const r of scored) {
      if (r.score > maxScore) {
        maxScore = r.score
        maxScoreEntry = { name: r.name, score: r.score, game: g }
      }
    }
    const winners = scored.filter(r => r.place === 1)
    for (const w of winners) {
      if (w.score < minWin) {
        minWin = w.score
        minWinEntry = { name: w.name, score: w.score, game: g }
      }
    }
    if (scored.length >= 2) {
      const sorted = [...scored].sort((a, b) => a.place - b.place)
      const gap = sorted[0].score - sorted[sorted.length - 1].score
      if (gap > maxGap) {
        maxGap = gap
        maxGapEntry = { name: sorted[0].name, gap, game: g }
      }
      const top2 = sorted[0].score - sorted[1].score
      if (top2 >= 1 && top2 < minNail) {
        minNail = top2
        minNailEntry = { name: sorted[0].name, top2, game: g }
      }
    }
  }
  if (maxScoreEntry && byPlayer.has(maxScoreEntry.name)) {
    byPlayer.get(maxScoreEntry.name).push(buildAchievement({
      id: 'record-high-score', category: 'records', icon: '🏆', title: 'Stigamet',
      detail: `${maxScoreEntry.score} stig í leik #${maxScoreEntry.game.game_num}`,
      earnedGameNum: maxScoreEntry.game.game_num, earnedDate: maxScoreEntry.game.date || null,
    }))
  }
  if (maxGapEntry && byPlayer.has(maxGapEntry.name)) {
    byPlayer.get(maxGapEntry.name).push(buildAchievement({
      id: 'record-largest-victory', category: 'records', icon: '🌊', title: 'Stærsti sigur',
      detail: `${maxGapEntry.gap} stiga munur í leik #${maxGapEntry.game.game_num}`,
      earnedGameNum: maxGapEntry.game.game_num, earnedDate: maxGapEntry.game.date || null,
    }))
  }
  if (minNailEntry && byPlayer.has(minNailEntry.name)) {
    byPlayer.get(minNailEntry.name).push(buildAchievement({
      id: 'record-narrowest-victory', category: 'records', icon: '😰', title: 'Spennumesti sigur',
      detail: `${minNailEntry.top2} stiga munur í leik #${minNailEntry.game.game_num}`,
      earnedGameNum: minNailEntry.game.game_num, earnedDate: minNailEntry.game.date || null,
    }))
  }
  if (minWinEntry && byPlayer.has(minWinEntry.name)) {
    byPlayer.get(minWinEntry.name).push(buildAchievement({
      id: 'record-lowest-winning-score', category: 'records', icon: '📉', title: 'Lágmarks-sigur',
      detail: `${minWinEntry.score} stig í leik #${minWinEntry.game.game_num}`,
      earnedGameNum: minWinEntry.game.game_num, earnedDate: minWinEntry.game.date || null,
    }))
  }
}
```

- [ ] **Step 3: Add the streaks helper**

Add this function above `computeAchievements`:

```js
function computeStreaks(sortedGames, byPlayer) {
  // For each player, walk their games in order; track current consecutive
  // win streak; emit a tier achievement the FIRST time each threshold is hit.
  const cur = {}    // name -> current streak
  const earned = {} // name -> Set of tier numbers already earned
  for (const g of sortedGames) {
    const winner = (g.results || []).find(r => r.place === 1)
    for (const name of (g.players || [])) {
      if (!byPlayer.has(name)) continue
      if (winner && winner.name === name) {
        cur[name] = (cur[name] || 0) + 1
      } else {
        cur[name] = 0
      }
      const streak = cur[name]
      const earnedSet = earned[name] || (earned[name] = new Set())
      for (const tier of STREAK_TIERS) {
        if (streak >= tier && !earnedSet.has(tier)) {
          earnedSet.add(tier)
          byPlayer.get(name).push(buildAchievement({
            id: `streak-${tier}`,
            category: 'streaks',
            icon: '🔥',
            title: `${tier} sigrar í röð`,
            earnedGameNum: g.game_num,
            earnedDate: g.date || null,
          }))
        }
      }
    }
  }
}
```

- [ ] **Step 4: Wire them into the public function**

Update `computeAchievements`:

```js
export function computeAchievements(games = [], players = []) {
  const byPlayer = new Map()
  for (const p of players) byPlayer.set(p.name, [])
  if (games.length === 0) return byPlayer
  const sortedGames = [...games].sort((a, b) => a.game_num - b.game_num)
  computeVolumeAndWins(sortedGames, byPlayer)
  computeRecords(sortedGames, byPlayer)
  computeStreaks(sortedGames, byPlayer)
  return byPlayer
}
```

- [ ] **Step 5: Spot-check**

```bash
node --input-type=module -e "
import('./data/dominion_data.json', { with: { type: 'json' } }).then(async d => {
  const m = await import('./src/lib/achievements.js');
  const games = d.default.games.filter(g => g.game_num != null && Array.isArray(g.players) && g.players.length > 0);
  const players = [...new Set(games.flatMap(g => g.players))].map(name => ({ name }));
  const result = m.computeAchievements(games, players);
  for (const [name, achs] of result) {
    const recs = achs.filter(a => a.category === 'records');
    const streaks = achs.filter(a => a.category === 'streaks');
    if (recs.length || streaks.length) console.log(name + ':', [...recs, ...streaks].map(a => a.title + (a.detail ? ' (' + a.detail + ')' : '')).join(' · '));
  }
});
"
```

Expected: a small set of players hold the 4 record badges. Some long-time players have streak-3 / streak-5 badges.

- [ ] **Step 6: Build + commit**

```bash
npm run build
git add src/lib/achievements.js
git commit -m "feat(achievements): all-time records + streak tiers"
```

---

## Task 4: Variety achievements

**Files:**
- Modify: `src/lib/achievements.js`

Add the 7 variety achievements (3 expansion tiers + 2 venues + 2 opponents).

- [ ] **Step 1: Add tier constants**

At the top of `src/lib/achievements.js`:

```js
const EXPANSION_TIERS = [5, 10] // plus 'all' computed dynamically
const VENUE_TIERS = [5]          // plus 'all' (≥3 games) computed dynamically
const OPPONENT_TIERS = [10]      // plus 'all' (active = ≥10 games) computed dynamically
const ACTIVE_PLAYER_MIN_GAMES = 10
const COMMON_VENUE_MIN_GAMES = 3
```

- [ ] **Step 2: Add the variety helper**

Add this function above `computeAchievements`:

```js
function computeVariety(sortedGames, byPlayer, totalsForVariety) {
  // For each player, track:
  //   - distinct expansions across games they WON
  //   - distinct venues they've played at
  //   - distinct opponents they've played against
  // Emit tier achievements the first time each threshold is crossed.
  const wonExp = {}      // name -> Set of expansion names from games they won
  const venues = {}      // name -> Set of venues
  const opponents = {}   // name -> Set of other player names
  const earned = {}      // name -> Set of achievement ids already emitted

  const allExpansions = totalsForVariety.allExpansions
  const commonVenues = totalsForVariety.commonVenues
  const activePlayers = totalsForVariety.activePlayers

  function emitOnce(name, ach) {
    const e = earned[name] || (earned[name] = new Set())
    if (e.has(ach.id)) return
    e.add(ach.id)
    byPlayer.get(name).push(ach)
  }

  for (const g of sortedGames) {
    const winnerName = g.results?.find(r => r.place === 1)?.name || null
    for (const name of (g.players || [])) {
      if (!byPlayer.has(name)) continue
      // Venues
      if (g.location) {
        if (!venues[name]) venues[name] = new Set()
        if (!venues[name].has(g.location)) {
          venues[name].add(g.location)
          const c = venues[name].size
          if (VENUE_TIERS.includes(c)) {
            emitOnce(name, buildAchievement({
              id: `variety-venues-${c}`, category: 'variety', icon: '📍',
              title: `Spilað á ${c} stöðum`,
              earnedGameNum: g.game_num, earnedDate: g.date || null,
            }))
          }
          if (commonVenues.size > 0 && [...commonVenues].every(v => venues[name].has(v))) {
            emitOnce(name, buildAchievement({
              id: 'variety-venues-all', category: 'variety', icon: '📍',
              title: 'Spilað á öllum venjulegum stöðum',
              detail: `${commonVenues.size} staðir`,
              earnedGameNum: g.game_num, earnedDate: g.date || null,
            }))
          }
        }
      }
      // Opponents
      if (!opponents[name]) opponents[name] = new Set()
      const before = opponents[name].size
      for (const other of g.players) if (other !== name) opponents[name].add(other)
      if (opponents[name].size !== before) {
        const c = opponents[name].size
        if (OPPONENT_TIERS.includes(c)) {
          emitOnce(name, buildAchievement({
            id: `variety-opponents-${c}`, category: 'variety', icon: '🤝',
            title: `Spilað við ${c} keppinauta`,
            earnedGameNum: g.game_num, earnedDate: g.date || null,
          }))
        }
        if (activePlayers.size > 0 && [...activePlayers].every(p => p === name || opponents[name].has(p))) {
          emitOnce(name, buildAchievement({
            id: 'variety-opponents-all', category: 'variety', icon: '🤝',
            title: 'Spilað við alla virka klúbbmeðlimi',
            detail: `${activePlayers.size} leikmenn`,
            earnedGameNum: g.game_num, earnedDate: g.date || null,
          }))
        }
      }
    }
    // Expansions — only credit the winner of this game
    if (winnerName && byPlayer.has(winnerName)) {
      if (!wonExp[winnerName]) wonExp[winnerName] = new Set()
      const beforeExp = wonExp[winnerName].size
      for (const e of (g.expansions || [])) wonExp[winnerName].add(e)
      if (wonExp[winnerName].size !== beforeExp) {
        const c = wonExp[winnerName].size
        for (const tier of EXPANSION_TIERS) {
          if (c >= tier) {
            emitOnce(winnerName, buildAchievement({
              id: `variety-expansions-${tier}`, category: 'variety', icon: '🎲',
              title: `Sigur með ${tier} viðbótum`,
              earnedGameNum: g.game_num, earnedDate: g.date || null,
            }))
          }
        }
        if (allExpansions.size > 0 && [...allExpansions].every(e => wonExp[winnerName].has(e))) {
          emitOnce(winnerName, buildAchievement({
            id: 'variety-expansions-all', category: 'variety', icon: '🎲',
            title: 'Sigur með öllum viðbótum',
            detail: `${allExpansions.size} viðbætur`,
            earnedGameNum: g.game_num, earnedDate: g.date || null,
          }))
        }
      }
    }
  }
}
```

- [ ] **Step 3: Compute the totals up-front in `computeAchievements`**

Update `computeAchievements`:

```js
export function computeAchievements(games = [], players = []) {
  const byPlayer = new Map()
  for (const p of players) byPlayer.set(p.name, [])
  if (games.length === 0) return byPlayer
  const sortedGames = [...games].sort((a, b) => a.game_num - b.game_num)

  // Pre-compute global sets used by variety thresholds.
  const allExpansions = new Set()
  const venueGameCounts = {}
  const playerGameCounts = {}
  for (const g of sortedGames) {
    for (const e of (g.expansions || [])) allExpansions.add(e)
    if (g.location) venueGameCounts[g.location] = (venueGameCounts[g.location] || 0) + 1
    for (const p of (g.players || [])) playerGameCounts[p] = (playerGameCounts[p] || 0) + 1
  }
  const commonVenues = new Set(Object.entries(venueGameCounts).filter(([, n]) => n >= COMMON_VENUE_MIN_GAMES).map(([v]) => v))
  const activePlayers = new Set(Object.entries(playerGameCounts).filter(([, n]) => n >= ACTIVE_PLAYER_MIN_GAMES).map(([p]) => p))

  computeVolumeAndWins(sortedGames, byPlayer)
  computeRecords(sortedGames, byPlayer)
  computeStreaks(sortedGames, byPlayer)
  computeVariety(sortedGames, byPlayer, { allExpansions, commonVenues, activePlayers })
  return byPlayer
}
```

- [ ] **Step 4: Spot-check**

```bash
node --input-type=module -e "
import('./data/dominion_data.json', { with: { type: 'json' } }).then(async d => {
  const m = await import('./src/lib/achievements.js');
  const games = d.default.games.filter(g => g.game_num != null && Array.isArray(g.players) && g.players.length > 0);
  const players = [...new Set(games.flatMap(g => g.players))].map(name => ({ name }));
  const result = m.computeAchievements(games, players);
  for (const [name, achs] of result) {
    const v = achs.filter(a => a.category === 'variety');
    if (v.length) console.log(name + ':', v.map(a => a.title).join(' · '));
  }
});
"
```

Expected: Mummi shows several variety achievements (lots of expansions/venues/opponents). Newer players show none or just opponents-10.

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add src/lib/achievements.js
git commit -m "feat(achievements): variety (expansions, venues, opponents)"
```

---

## Task 5: Rivalries (Mummi-bani + per-pair leader)

**Files:**
- Modify: `src/lib/achievements.js`

- [ ] **Step 1: Add tier constants**

At the top of `src/lib/achievements.js`:

```js
const MUMMI_SLAYER_TIERS = [5, 10, 25]
const RIVALRY_MIN_SHARED_GAMES = 5
const CLUB_OWNER = 'Mummi'
```

- [ ] **Step 2: Add the rivalries helper**

Add above `computeAchievements`:

```js
function computeRivalries(sortedGames, byPlayer) {
  // Mummi-bani: count of games this player finished above Mummi.
  const mummiBeats = {}
  // Per-pair head-to-head: { aName: { bName: { wins: N, total: N } } }
  // wins = times a finished better (lower place) than b in a shared game.
  const h2h = {}

  function ensure(a, b) {
    if (!h2h[a]) h2h[a] = {}
    if (!h2h[a][b]) h2h[a][b] = { wins: 0, total: 0 }
    return h2h[a][b]
  }

  for (const g of sortedGames) {
    const placed = (g.results || []).filter(r => r.place != null)
    if (placed.length < 2) continue
    const placeByName = {}
    for (const r of placed) placeByName[r.name] = r.place
    const names = placed.map(r => r.name)
    // Mummi-bani: player ranked strictly higher (lower place number) than Mummi
    const mummiPlace = placeByName[CLUB_OWNER]
    if (mummiPlace != null) {
      for (const r of placed) {
        if (r.name === CLUB_OWNER) continue
        if (r.place < mummiPlace) {
          mummiBeats[r.name] = (mummiBeats[r.name] || 0) + 1
          const c = mummiBeats[r.name]
          if (MUMMI_SLAYER_TIERS.includes(c) && byPlayer.has(r.name)) {
            const tierIdx = MUMMI_SLAYER_TIERS.indexOf(c) + 1
            const numeral = ['I', 'II', 'III'][tierIdx - 1] || tierIdx
            byPlayer.get(r.name).push(buildAchievement({
              id: `mummi-slayer-${c}`, category: 'rivalries', icon: '👑',
              title: `Mummi-bani ${numeral}`,
              detail: `Sigrað Mumma ${c} sinnum`,
              earnedGameNum: g.game_num, earnedDate: g.date || null,
            }))
          }
        }
      }
    }
    // Pairwise totals
    for (let i = 0; i < names.length; i++) {
      for (let j = 0; j < names.length; j++) {
        if (i === j) continue
        const a = names[i], b = names[j]
        const stat = ensure(a, b)
        stat.total++
        if (placeByName[a] < placeByName[b]) stat.wins++
      }
    }
  }

  // After the chronological pass, decide rivalry-leader badges from final stats.
  for (const [a, opps] of Object.entries(h2h)) {
    if (!byPlayer.has(a)) continue
    for (const [b, stat] of Object.entries(opps)) {
      if (stat.total < RIVALRY_MIN_SHARED_GAMES) continue
      if (stat.wins * 2 <= stat.total) continue // require strict majority
      byPlayer.get(a).push(buildAchievement({
        id: `rivalry-leader-${b}`,
        category: 'rivalries',
        icon: '⚔️',
        title: `Sigursæll vs ${b}`,
        detail: `${stat.wins}-${stat.total - stat.wins} í ${stat.total} leikjum`,
      }))
    }
  }
}
```

- [ ] **Step 3: Wire into the public function**

Update `computeAchievements`:

```js
export function computeAchievements(games = [], players = []) {
  const byPlayer = new Map()
  for (const p of players) byPlayer.set(p.name, [])
  if (games.length === 0) return byPlayer
  const sortedGames = [...games].sort((a, b) => a.game_num - b.game_num)
  const allExpansions = new Set()
  const venueGameCounts = {}
  const playerGameCounts = {}
  for (const g of sortedGames) {
    for (const e of (g.expansions || [])) allExpansions.add(e)
    if (g.location) venueGameCounts[g.location] = (venueGameCounts[g.location] || 0) + 1
    for (const p of (g.players || [])) playerGameCounts[p] = (playerGameCounts[p] || 0) + 1
  }
  const commonVenues = new Set(Object.entries(venueGameCounts).filter(([, n]) => n >= COMMON_VENUE_MIN_GAMES).map(([v]) => v))
  const activePlayers = new Set(Object.entries(playerGameCounts).filter(([, n]) => n >= ACTIVE_PLAYER_MIN_GAMES).map(([p]) => p))
  computeVolumeAndWins(sortedGames, byPlayer)
  computeRecords(sortedGames, byPlayer)
  computeStreaks(sortedGames, byPlayer)
  computeVariety(sortedGames, byPlayer, { allExpansions, commonVenues, activePlayers })
  computeRivalries(sortedGames, byPlayer)
  return byPlayer
}
```

- [ ] **Step 4: Spot-check**

```bash
node --input-type=module -e "
import('./data/dominion_data.json', { with: { type: 'json' } }).then(async d => {
  const m = await import('./src/lib/achievements.js');
  const games = d.default.games.filter(g => g.game_num != null && Array.isArray(g.players) && g.players.length > 0);
  const players = [...new Set(games.flatMap(g => g.players))].map(name => ({ name }));
  const result = m.computeAchievements(games, players);
  for (const [name, achs] of result) {
    const r = achs.filter(a => a.category === 'rivalries');
    if (r.length) console.log(name + ':', r.map(a => a.title + (a.detail ? ' (' + a.detail + ')' : '')).join(' · '));
  }
});
"
```

Expected: a handful of players show Mummi-bani I/II/III. Several active players show rivalry-leader badges against specific opponents with H2H counts.

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add src/lib/achievements.js
git commit -m "feat(achievements): rivalries (Mummi-bani + per-pair leaders)"
```

---

## Task 6: AchievementBadge component + CSS

**Files:**
- Create: `src/components/AchievementBadge.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: Create the component**

Create `src/components/AchievementBadge.jsx`:

```jsx
const CATEGORY_COLOR = {
  volume:    '#58a6ff',
  wins:      '#c9a84c',
  records:   '#f43f5e',
  streaks:   '#f97316',
  variety:   '#3fb950',
  rivalries: '#a78bfa',
}

export default function AchievementBadge({ achievement }) {
  const color = CATEGORY_COLOR[achievement.category] || 'var(--gold)'
  const tooltip = achievement.earnedGameNum != null
    ? `Náði í leik #${achievement.earnedGameNum}${achievement.earnedDate ? ` þann ${achievement.earnedDate}` : ''}`
    : (achievement.detail || achievement.title)
  return (
    <div className="achievement-pill" title={tooltip} style={{ borderColor: color }}>
      <span className="achievement-icon" style={{ color }}>{achievement.icon}</span>
      <div className="achievement-text">
        <div className="achievement-title">{achievement.title}</div>
        {achievement.detail && <div className="achievement-detail">{achievement.detail}</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add CSS**

Open `src/index.css`. Find a good spot near the existing pill / badge styles (near the `.trait-pill` definitions around line 555). Add:

```css
/* ── ACHIEVEMENT BADGES ── */
.achievement-pill {
  display: inline-flex;
  align-items: center;
  gap: .5rem;
  padding: .35rem .7rem .35rem .55rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg2);
  font-size: .78rem;
  line-height: 1.25;
  white-space: nowrap;
}
.achievement-icon {
  font-size: 1rem;
  flex-shrink: 0;
}
.achievement-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.achievement-title {
  color: var(--text);
  font-weight: 600;
}
.achievement-detail {
  color: var(--dim);
  font-size: .68rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 18ch;
}
.achievement-group {
  margin-top: 1rem;
}
.achievement-group-label {
  font-size: .7rem;
  color: var(--dim);
  text-transform: uppercase;
  letter-spacing: .08em;
  margin-bottom: .4rem;
}
.achievement-group-pills {
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/AchievementBadge.jsx src/index.css
git commit -m "feat(achievements): AchievementBadge component + styles"
```

---

## Task 7: Wire achievements into PlayerModal

**Files:**
- Modify: `src/components/PlayerModal.jsx`

- [ ] **Step 1: Add imports + section**

Open `src/components/PlayerModal.jsx`. Read the file end to end first to understand its current structure (it renders player stats + charts + games list).

Add at the top of the imports:

```jsx
import AchievementBadge from './AchievementBadge'
import { computeAchievements } from '../lib/achievements'
import DATA from '../data'
```

(Skip any imports that already exist — just add the missing ones.)

- [ ] **Step 2: Compute achievements once per modal mount**

Inside the component body, near the other `useMemo` blocks (or at the top), add:

```jsx
const allAchievements = useMemo(() => computeAchievements(DATA.games, DATA.players), [])
const playerAchievements = allAchievements.get(player?.name) || []
```

Make sure `useMemo` is imported from `react` at the top.

- [ ] **Step 3: Add the Afrek section to the rendered modal**

Find the place in the JSX where the player's content ends (after charts/games — wherever feels natural before the closing `</div>` of the modal body). Insert:

```jsx
{playerAchievements.length > 0 && (
  <div className="achievement-group">
    <div className="achievement-group-label">
      Afrek · {playerAchievements.length}
    </div>
    {[
      ['volume',    'Þátttaka'],
      ['wins',      'Sigrar'],
      ['records',   'Met'],
      ['streaks',   'Sigurraðir'],
      ['variety',   'Fjölbreytni'],
      ['rivalries', 'Keppinautar'],
    ].map(([cat, label]) => {
      const items = playerAchievements.filter(a => a.category === cat)
      if (items.length === 0) return null
      return (
        <div key={cat} style={{ marginTop: '.6rem' }}>
          <div style={{ fontSize: '.7rem', color: 'var(--dim)', marginBottom: '.3rem' }}>{label}</div>
          <div className="achievement-group-pills">
            {items.map(a => <AchievementBadge key={a.id} achievement={a} />)}
          </div>
        </div>
      )
    })}
  </div>
)}
```

- [ ] **Step 4: Verify in the browser**

Run `npm run dev`. Open the Players tab, click Mummi → modal opens with the Afrek section showing 6 categories with badges. Click a newer player → only Þátttaka / Sigrar populated.

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add src/components/PlayerModal.jsx
git commit -m "feat(achievements): show Afrek section in PlayerModal"
```

---

## Task 8: Add Afrek count column to Players tab

**Files:**
- Modify: `src/tabs/Players.jsx`

- [ ] **Step 1: Add imports + computed map**

Open `src/tabs/Players.jsx`. Add to the imports:

```jsx
import { computeAchievements } from '../lib/achievements'
```

Inside the component body, after the existing `players, games` destructure, add:

```jsx
const achievementsByPlayer = useMemo(
  () => computeAchievements(games, players),
  [games, players],
)
```

- [ ] **Step 2: Extend the sort options to include `afrek`**

Read the existing sort logic (search for `sortKey`). Add a new branch:

```jsx
if (sortKey === 'afrek') {
  return (achievementsByPlayer.get(b.name)?.length || 0) - (achievementsByPlayer.get(a.name)?.length || 0)
}
```

Insert that as the first branch inside the existing comparator.

- [ ] **Step 3: Add the column header + cell**

Find the existing player table / list rendering. Add a column header `Afrek` (matching the style of the existing column headers; should be sortable and trigger `setSortKey('afrek')` on click).

Add a cell in each row showing `🏆 {n}` where `n = achievementsByPlayer.get(p.name)?.length || 0`.

If the existing layout uses a table:

```jsx
<th onClick={() => setSortKey('afrek')} style={{ cursor: 'pointer' }}>Afrek</th>
```

```jsx
<td>🏆 {achievementsByPlayer.get(p.name)?.length || 0}</td>
```

If the layout uses cards/grid, add an inline pill or small text next to the existing player count: `🏆 {n}`.

- [ ] **Step 4: Verify in the browser**

Players tab shows the new Afrek column. Sort by Afrek → Mummi at the top with the highest count.

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add src/tabs/Players.jsx
git commit -m "feat(achievements): Afrek count column on Players tab"
```

---

## Task 9: Build the Afrek tab content

**Files:**
- Modify: `src/tabs/Afrek.jsx`

Replace the stub from Task 1 with the three leaderboard sections.

- [ ] **Step 1: Replace the stub with full implementation**

Open `src/tabs/Afrek.jsx`. Replace its contents:

```jsx
import { useMemo, useState } from 'react'
import DATA from '../data'
import { computeAchievements } from '../lib/achievements'
import AchievementBadge from '../components/AchievementBadge'
import PlayerModal from '../components/PlayerModal'

const ACTIVE_PLAYER_MIN_GAMES = 10

const CATEGORY_ORDER = [
  ['volume',    'Þátttaka'],
  ['wins',      'Sigrar'],
  ['records',   'Met'],
  ['streaks',   'Sigurraðir'],
  ['variety',   'Fjölbreytni'],
  ['rivalries', 'Keppinautar'],
]

export default function Afrek() {
  const { players, games } = DATA
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  const byPlayer = useMemo(
    () => computeAchievements(games, players),
    [games, players],
  )

  // Section 1: ranked by total badge count
  const ranked = useMemo(() => {
    return [...byPlayer.entries()]
      .map(([name, achs]) => ({ name, count: achs.length }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [byPlayer])

  // Section 2: rare achievements (held by 1 or 2 players)
  const rare = useMemo(() => {
    const holdersById = new Map() // id -> { ach, holders: [name, ...] }
    for (const [name, achs] of byPlayer.entries()) {
      for (const a of achs) {
        if (!holdersById.has(a.id)) holdersById.set(a.id, { ach: a, holders: [] })
        holdersById.get(a.id).holders.push(name)
      }
    }
    return [...holdersById.values()]
      .filter(x => x.holders.length <= 2)
      .sort((a, b) => a.holders.length - b.holders.length || a.ach.title.localeCompare(b.ach.title))
  }, [byPlayer])

  // Section 3: per-achievement grid (rows = stable achievement ids, cols = active players)
  const grid = useMemo(() => {
    const activePlayers = players.filter(p => p.games >= ACTIVE_PLAYER_MIN_GAMES).map(p => p.name).sort()
    const allAchIds = new Map() // id -> ach (representative)
    for (const achs of byPlayer.values()) {
      for (const a of achs) if (!allAchIds.has(a.id)) allAchIds.set(a.id, a)
    }
    const rows = [...allAchIds.values()].sort((a, b) => {
      const ai = CATEGORY_ORDER.findIndex(c => c[0] === a.category)
      const bi = CATEGORY_ORDER.findIndex(c => c[0] === b.category)
      if (ai !== bi) return ai - bi
      return a.title.localeCompare(b.title)
    })
    const has = {} // id -> Set of player names
    for (const [name, achs] of byPlayer.entries()) {
      for (const a of achs) {
        if (!has[a.id]) has[a.id] = new Set()
        has[a.id].add(name)
      }
    }
    return { activePlayers, rows, has }
  }, [byPlayer, players])

  return (
    <section className="section active">
      <h2 className="section-title">Afrek</h2>

      {/* Section 1 */}
      <div className="chart-box" style={{ marginBottom: '1.5rem' }}>
        <h3>FLEST AFREK</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
          {ranked.map(({ name, count }, i) => (
            <div
              key={name}
              onClick={() => setSelectedPlayer(players.find(p => p.name === name))}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem .8rem', background: 'var(--bg3)', borderRadius: 6, cursor: 'pointer' }}
            >
              <span><span style={{ color: 'var(--dim)', marginRight: '.5rem' }}>{i + 1}.</span>{name}</span>
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>🏆 {count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 */}
      <div className="chart-box" style={{ marginBottom: '1.5rem' }}>
        <h3>SJALDGÆFUSTU AFREKIN</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          {rare.map(({ ach, holders }) => (
            <div key={ach.id} style={{ display: 'flex', alignItems: 'center', gap: '.8rem', padding: '.5rem .8rem', background: 'var(--bg3)', borderRadius: 6 }}>
              <AchievementBadge achievement={ach} />
              <span style={{ fontSize: '.82rem', color: 'var(--dim)' }}>
                {holders.length === 1 ? 'Aðeins ' : ''}{holders.join(' og ')}
              </span>
            </div>
          ))}
          {rare.length === 0 && <span style={{ color: 'var(--dim)' }}>Engin sjaldgæf afrek enn.</span>}
        </div>
      </div>

      {/* Section 3 */}
      <div className="chart-box">
        <h3>HVER Á HVAÐ?</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="afrek-grid" style={{ borderCollapse: 'collapse', fontSize: '.78rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '.3rem .5rem', borderBottom: '1px solid var(--border)' }}>Afrek</th>
                {grid.activePlayers.map(name => (
                  <th key={name} style={{ padding: '.3rem .4rem', borderBottom: '1px solid var(--border)', color: 'var(--dim)', textAlign: 'center', minWidth: '2rem' }}>
                    {name.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.rows.map(a => (
                <tr key={a.id}>
                  <td style={{ padding: '.25rem .5rem', whiteSpace: 'nowrap' }}>{a.icon} {a.title}</td>
                  {grid.activePlayers.map(name => (
                    <td key={name} style={{ padding: '.25rem .4rem', textAlign: 'center', color: grid.has[a.id]?.has(name) ? 'var(--gold)' : 'var(--bg3)' }}>
                      {grid.has[a.id]?.has(name) ? '✓' : '·'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </section>
  )
}
```

- [ ] **Step 2: Verify in the browser**

Navigate to the Afrek tab. Three sections render:
- Flest afrek: ranked list, Mummi at the top.
- Sjaldgæfustu afrekin: badges held by 1-2 people (mostly the 4 record-holder badges).
- Hver á hvað? — table grid with active players as columns.

Clicking a player in section 1 opens the PlayerModal.

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/tabs/Afrek.jsx
git commit -m "feat(achievements): Afrek tab with three leaderboard sections"
```

---

## Task 10: Final verification + push

**Files:** none (verification + push only)

- [ ] **Step 1: Confirm clean tree**

Run `git status --porcelain` from the worktree. Expected: empty (all changes committed across 9 task commits).

- [ ] **Step 2: Production build**

Run `npm run build`. Expected: success.

- [ ] **Step 3: Visual sweep**

Run `npm run dev` and verify all four touchpoints:
1. Nav: 🎖️ Afrek tab visible between Skemmtilegt and Ríkistillögur.
2. Players tab: Afrek column shows counts; sortable.
3. Open Mummi modal → Afrek section with 12+ badges across 5-6 categories.
4. Open Afrek tab → three sections render correctly, clicking a name opens the player modal.

- [ ] **Step 4: Edge-case spot-check (no crash on sparse player)**

Open the modal for a player with very few games (e.g. game count < 10). Expected: Afrek section either hidden (count 0) or shows just a couple of entry-tier badges without crashing.

- [ ] **Step 5: Branch summary + push**

Run `git log --oneline main..HEAD` to confirm 9 task commits are present.

Run `git push -u origin feat/achievements`.

- [ ] **Step 6: Open the PR**

```bash
gh pr create --title "Player achievements (afrek)" --body "$(cat <<'EOF'
Closes spec at docs/superpowers/specs/2026-05-08-achievements-design.md.

## Summary

- 26 stable-ID achievements across 6 categories: volume, wins, records, streaks, variety, rivalries — plus per-pair rivalry-leader badges.
- Pure derivation in src/lib/achievements.js (single chronological pass over games).
- Surfaced in three places: PlayerModal Afrek section, Players tab Afrek count column, new 🎖️ Afrek tab with three leaderboard sections.

## Test plan

- [ ] Mummi modal: 12+ badges across 5-6 categories.
- [ ] Newer players: low badge count, only entry tiers.
- [ ] Players tab: Afrek column sortable.
- [ ] Afrek tab: ranked list, rare achievements, per-achievement grid.
EOF
)"
```

## Self-Review Notes

Spec coverage check:

- ✅ `computeAchievements(games, players)` pure module — Task 2
- ✅ Volume tiers (10/25/50/100) — Task 2
- ✅ Win tiers (1/5/10/25/50) — Task 2
- ✅ Records (4) — Task 3
- ✅ Streaks (3/5/10) — Task 3
- ✅ Variety (7) — Task 4
- ✅ Rivalries — Task 5
- ✅ AchievementBadge — Task 6
- ✅ PlayerModal section — Task 7
- ✅ Players tab count column — Task 8
- ✅ Afrek tab three sections — Task 9
- ✅ Nav + routing — Task 1

Type/name consistency:
- `computeAchievements(games, players)` signature consistent across all consumers ✅
- Achievement shape `{ id, category, icon, title, detail?, earnedGameNum?, earnedDate? }` consistent ✅
- Categories `volume | wins | records | streaks | variety | rivalries` consistent ✅
- Stable IDs match the spec ✅

No placeholders found. Each step has full code or explicit verification commands.
