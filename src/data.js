import rawData from '../data/dominion_data.json'
import cardTexts from '../data/card_texts.json'

// ── Normalize & parse all games ───────────────────────────────────────────────
const PLAYER_FIXES = { 'Hallgríur': 'Hallgrímur' }
const EXP_FIXES = { 'Cornucopia': 'Cornucopia & Guilds', 'Prospoerity': 'Prosperity', 'Rising sun': 'Rising Sun', 'Dark ages': 'Dark Ages' }
const fixName = n => PLAYER_FIXES[n] || n
const fixExp = e => EXP_FIXES[e] || e

// Build canonical card name map (lowercase → proper case) from card list
const canonicalCardName = new Map()
for (const c of rawData.cards) {
  const lower = c.name.toLowerCase()
  // Prefer the version with more uppercase letters (proper title case)
  const existing = canonicalCardName.get(lower)
  if (!existing || c.name.replace(/[a-z]/g, '').length > existing.replace(/[a-z]/g, '').length) {
    canonicalCardName.set(lower, c.name)
  }
}
const fixCard = name => canonicalCardName.get(name.toLowerCase()) || name

const parsedGames = rawData.games
  .filter(g => g.date !== 'Sæti' && g.game_num != null && Array.isArray(g.players) && g.players.length > 0)
  .map(g => {
    let victory_type = g.victory_type
    if (victory_type) {
      const vt = victory_type.trim()
      if (/^provinc(es?|ce)$/i.test(vt)) victory_type = 'Province'
      else if (/^colon(y|ies)$/i.test(vt)) victory_type = 'Colony'
      else if (/^supply/i.test(vt)) victory_type = 'Supply piles'
    }
    const EXTRA_FIELDS = ['events', 'landmarks', 'projects', 'ways', 'allies', 'traits', 'prophecy']
    const extras = {}
    for (const f of EXTRA_FIELDS) {
      if (!g[f]?.length) continue
      if (f === 'traits') {
        // Traits are { name, card? } objects. Older sync files may still have plain strings.
        extras.traits = g.traits.map(t => {
          if (!t) return null
          if (typeof t === 'string') return { name: fixCard(t) }
          const out = { name: fixCard(t.name) }
          if (t.card) out.card = fixCard(t.card)
          return out
        }).filter(Boolean)
      } else {
        extras[f] = g[f].map(fixCard)
      }
    }
    return {
      ...g,
      ...extras,
      victory_type,
      players: g.players.map(fixName),
      results: g.results.map(r => ({ ...r, name: fixName(r.name) })),
      expansions: (g.expansions || []).map(fixExp),
      kingdom: (g.kingdom || []).map(k => ({ ...k, card: fixCard(k.card), expansion: k.expansion ? fixExp(k.expansion) : k.expansion })),
    }
  })

// Sort by game number ascending
const games = [...parsedGames].sort((a, b) => a.game_num - b.game_num)

// ── Cards ─────────────────────────────────────────────────────────────────────
// Deduplicate cards by name — keep the entry with the best data (non-null cost)
const seenCardNames = new Map()
for (const c of rawData.cards) {
  const existing = seenCardNames.get(c.name)
  if (!existing || (c.cost != null && existing.cost == null)) {
    seenCardNames.set(c.name, c)
  }
}

// Detect attack and curse-giving cards from card text
function isAttackCard(text) {
  if (!text) return false
  const lower = text.toLowerCase()
  const idx = lower.indexOf('each other player')
  if (idx === -1) return false
  const after = lower.slice(idx)
  // "may trash/discard...to draw/gain" = optional benefit, not attack
  if (/may (trash|discard).*to (draw|gain)/i.test(after)) return false
  if (/may trash a card from their hand\./i.test(after)) return false
  // Negative effects on other players = attack
  return /discards?\b|trash|gains? a (curse|ruins)|puts? .*(back|onto)|down to|name a card|does nothing|instead of following/i.test(after)
}

function isCurseGiver(text) {
  if (!text) return false
  return /gains? a curse/i.test(text)
}

// Detect Duration cards from card text. Hallmarks: effects that span turns
// — "at the start of your next/each turn", taking an extra turn (Outpost),
// or effects "for the rest of the game" (Hireling).
function isDurationCard(text) {
  if (!text) return false
  return /at the (start|beginning) of (your )?(next|each)( of your)? turn|now and at the start|while this is in play|take an extra turn|for the rest of (this|the) game/i.test(text)
}

// Victory cards whose +XVP is printed (not tokens) — excluded from token detection.
const VICTORY_CARDS = new Set([
  'Gardens', 'Great Hall', 'Duke', 'Harem', 'Nobles', 'Island', 'Vineyard',
  'Fairgrounds', 'Tunnel', 'Silk Road', 'Farmland', 'Feodum', 'Distant Lands',
  'Cemetery', 'Colony', 'Curse', 'Estate', 'Duchy', 'Province',
])

function isTokenCard(text, card) {
  if (VICTORY_CARDS.has(card?.name)) return false
  if (card?.debt > 0) return true
  if (!text) return false
  if (/coffers|villagers?\b|\bexile\b|\btavern\s*mat\b|\breserve\b/i.test(text)) return true
  if (/\btake\b.*\bvp\b|\badd\b.*\bvp\b/i.test(text)) return true
  if (/\bvp\s*tokens?\b/i.test(text)) return true
  if (/\+\d+\s*vp\b/i.test(text)) return true
  return false
}

const rawCards = [...seenCardNames.values()].map(c => ({
  ...c,
  card_type: c.card_type || 'Kingdom',
  isSecondEdition: c.notes === '2nd edition',
  isAttack: isAttackCard(cardTexts[c.name]),
  isCurseGiver: isCurseGiver(cardTexts[c.name]),
  isDuration: isDurationCard(cardTexts[c.name]),
  isTokenCard: isTokenCard(cardTexts[c.name], c),
}))

const totalGames = games.length

// Base supply cards always present in every game (not tracked as kingdom cards)
const BASE_SUPPLY_CARDS = [
  { name: 'Copper',   expansion: 'Base Cards', cost: 0, debt: null, potion: false, notes: 'Always in supply', times_used: totalGames, removed: false, isSupplyCard: true, isSecondEdition: false, card_type: 'Kingdom' },
  { name: 'Silver',   expansion: 'Base Cards', cost: 3, debt: null, potion: false, notes: 'Always in supply', times_used: totalGames, removed: false, isSupplyCard: true, isSecondEdition: false, card_type: 'Kingdom' },
  { name: 'Gold',     expansion: 'Base Cards', cost: 6, debt: null, potion: false, notes: 'Always in supply', times_used: totalGames, removed: false, isSupplyCard: true, isSecondEdition: false, card_type: 'Kingdom' },
  { name: 'Estate',   expansion: 'Base Cards', cost: 2, debt: null, potion: false, notes: 'Always in supply', times_used: totalGames, removed: false, isSupplyCard: true, isSecondEdition: false, card_type: 'Kingdom' },
  { name: 'Duchy',    expansion: 'Base Cards', cost: 5, debt: null, potion: false, notes: 'Always in supply', times_used: totalGames, removed: false, isSupplyCard: true, isSecondEdition: false, card_type: 'Kingdom' },
  { name: 'Province', expansion: 'Base Cards', cost: 8, debt: null, potion: false, notes: 'Always in supply (6VP each)', times_used: totalGames, removed: false, isSupplyCard: true, isSecondEdition: false, card_type: 'Kingdom' },
  { name: 'Curse',    expansion: 'Base Cards', cost: 0, debt: null, potion: false, notes: 'Always in supply', times_used: totalGames, removed: false, isSupplyCard: true, isSecondEdition: false, card_type: 'Kingdom' },
]

// Recount times_used from all game data (kingdom + extras fields)
const usageCounts = {}
games.forEach(g => {
  g.kingdom?.forEach(k => { usageCounts[k.card] = (usageCounts[k.card] || 0) + 1 })
  const extraFields = ['events', 'landmarks', 'projects', 'ways', 'allies', 'traits', 'prophecy']
  extraFields.forEach(field => {
    g[field]?.forEach(name => { usageCounts[name] = (usageCounts[name] || 0) + 1 })
  })
})

// Some card_texts entries from the source spreadsheet concatenate effects
// without separators ("+1 Card+1 ActionReveal..."). Normalize at load time
// so every display site sees readable text.
function cleanCardText(text) {
  if (!text) return null
  return text
    .replace(/(\S)\+/g, '$1 +')          // space before any non-leading +
    .replace(/([a-z])([A-Z])/g, '$1 $2') // space at lowercase→uppercase boundary
    .replace(/(\d)([A-Z])/g, '$1 $2')    // space at digit→uppercase boundary (e.g. "$1You")
}

const baseCardNames = new Set(BASE_SUPPLY_CARDS.map(c => c.name))
const cards = [
  ...rawCards.filter(c => !baseCardNames.has(c.name)).map(c => ({
    ...c,
    times_used: usageCounts[c.name] ?? c.times_used ?? 0,
    card_text: cleanCardText(cardTexts[c.name]) || null,
  })),
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
  // Count game participation from players array (authoritative for who played)
  g.players.forEach(name => {
    const p = playerStats[name]
    if (p) p.games++
  })
  // Count placements and scores from results
  g.results.forEach(r => {
    const p = playerStats[r.name]
    if (!p) return
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

// Expansion list (all non-base cards)
const expansions = [...new Set(
  cards.filter(c => !c.isSupplyCard).map(c => c.expansion)
)].sort()

// Card types for filter UI
const cardTypes = [...new Set(cards.map(c => c.card_type || 'Kingdom'))].sort()

export const DATA = {
  games,
  cards,
  players,
  expansions,
  cardTypes,
  lastUpdated: rawData.last_updated || null,
  upcomingGames: rawData.upcoming_games || 0,
  raw: rawData,
}

export default DATA
