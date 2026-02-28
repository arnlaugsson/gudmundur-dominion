import rawData from '../data/dominion_data.json'

// ── Parse legacy "Sæti" games ────────────────────────────────────────────────
// Older games (≈ #2–49) were recorded in a different spreadsheet format:
//   - date = "Sæti" (column header meaning "placement")
//   - game_num = null, but the actual game # is in the `location` field
//   - players = seat numbers ["1.0", "2.0", ...]
//   - results[n].name = score (as string float), results[n].tied_with = player name
function parseLegacyGame(g) {
  const gameNum = g.location != null ? parseInt(parseFloat(g.location)) : null
  if (!gameNum || isNaN(gameNum)) return null
  const results = (g.results || [])
    .map(r => ({
      place: r.place,
      name: r.tied_with || null,
      tied_with: null,
      score: r.name != null && !isNaN(parseFloat(r.name)) ? parseFloat(r.name) : null,
    }))
    .filter(r => r.name)
  if (!results.length) return null
  const players = results.map(r => r.name)
  return {
    game_num: gameNum,
    date: null,
    location: null,
    players,
    results,
    kingdom: [],
    events: [], landmarks: [], projects: [], ways: [], allies: [], traits: [], prophecy: [],
    expansions: [],
    victory_type: null,
    avg_score: null,
  }
}

// ── Normalize & parse all games ───────────────────────────────────────────────
const allGames = rawData.games
  .map(g => {
    if (g.date === 'Sæti') return parseLegacyGame(g)

    // Normalize victory types for modern games
    if (!g.victory_type) return g
    const vt = g.victory_type.trim()
    let victory_type = g.victory_type
    if (/^provinces?$/i.test(vt)) victory_type = 'Province'
    else if (/^colonies?$/i.test(vt)) victory_type = 'Colony'
    else if (/^supply/i.test(vt)) victory_type = 'Supply piles'
    return { ...g, victory_type }
  })
  .filter(g => g != null && g.game_num != null && Array.isArray(g.players) && g.players.length > 0)

// Sort by game number ascending
const games = [...allGames].sort((a, b) => a.game_num - b.game_num)

// ── Cards ─────────────────────────────────────────────────────────────────────
// Deduplicate cards by name — keep the entry with the best data (non-null cost)
const seenCardNames = new Map()
for (const c of rawData.cards) {
  const existing = seenCardNames.get(c.name)
  if (!existing || (c.cost != null && existing.cost == null)) {
    seenCardNames.set(c.name, c)
  }
}

const rawCards = [...seenCardNames.values()].map(c => ({
  ...c,
  isSecondEdition: c.notes === '2nd edition',
}))

const totalGames = games.length

// Base supply cards always present in every game (not tracked as kingdom cards)
const BASE_SUPPLY_CARDS = [
  { name: 'Copper',   expansion: 'Base Cards', cost: 0, debt: null, potion: false, notes: 'Always in supply', times_used: totalGames, removed: false, isSupplyCard: true, isSecondEdition: false },
  { name: 'Silver',   expansion: 'Base Cards', cost: 3, debt: null, potion: false, notes: 'Always in supply', times_used: totalGames, removed: false, isSupplyCard: true, isSecondEdition: false },
  { name: 'Gold',     expansion: 'Base Cards', cost: 6, debt: null, potion: false, notes: 'Always in supply', times_used: totalGames, removed: false, isSupplyCard: true, isSecondEdition: false },
  { name: 'Estate',   expansion: 'Base Cards', cost: 2, debt: null, potion: false, notes: 'Always in supply', times_used: totalGames, removed: false, isSupplyCard: true, isSecondEdition: false },
  { name: 'Duchy',    expansion: 'Base Cards', cost: 5, debt: null, potion: false, notes: 'Always in supply', times_used: totalGames, removed: false, isSupplyCard: true, isSecondEdition: false },
  { name: 'Province', expansion: 'Base Cards', cost: 8, debt: null, potion: false, notes: 'Always in supply (6VP each)', times_used: totalGames, removed: false, isSupplyCard: true, isSecondEdition: false },
  { name: 'Curse',    expansion: 'Base Cards', cost: 0, debt: null, potion: false, notes: 'Always in supply', times_used: totalGames, removed: false, isSupplyCard: true, isSecondEdition: false },
]

const baseCardNames = new Set(BASE_SUPPLY_CARDS.map(c => c.name))
const cards = [
  ...rawCards.filter(c => !baseCardNames.has(c.name)),
  ...BASE_SUPPLY_CARDS,
]

// ── Players ───────────────────────────────────────────────────────────────────
const playerSet = new Set()
games.forEach(g => g.players.forEach(p => playerSet.add(p)))

const playerStats = {}
for (const name of playerSet) {
  playerStats[name] = { name, games: 0, first: 0, second: 0, third: 0, fourth: 0, scores: [] }
}

games.forEach(g => {
  g.results.forEach(r => {
    const p = playerStats[r.name]
    if (!p) return
    p.games++
    if (r.place === 1) p.first++
    if (r.place === 2) p.second++
    if (r.place === 3) p.third++
    if (r.place === 4) p.fourth++
    if (r.score != null) p.scores.push(r.score)
  })
})

const players = Object.values(playerStats)
  .filter(p => p.games >= 1)
  .map(p => ({
    ...p,
    win_rate: p.games > 0 ? (p.first / p.games) * 100 : 0,
    gpa: p.scores.length > 0 ? p.scores.reduce((a, b) => a + b, 0) / p.scores.length : null,
    avg_score: p.scores.length > 0 ? (p.scores.reduce((a, b) => a + b, 0) / p.scores.length).toFixed(1) : null,
  }))

// Expansion list (kingdom cards only, excluding Base Cards category)
const expansions = [...new Set(
  cards.filter(c => !c.isSupplyCard).map(c => c.expansion)
)].sort()

export const DATA = {
  games,
  cards,
  players,
  expansions,
  raw: rawData,
}

export default DATA
