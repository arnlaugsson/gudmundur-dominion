// Turns the raw synced JSON into the DATA object the UI reads.
// Pure: no fetching, no module state, so it is easy to test.
// Name/typo normalization happens in scripts/sync_spreadsheet.py — the JSON
// arrives clean, so this module only derives stats.
import { isAttackCard, isCurseGiver, isDurationCard, isTokenCard } from './cardClassifiers'

export const EXTRA_FIELDS = ['events', 'landmarks', 'projects', 'ways', 'allies', 'traits', 'prophecy']

const BASE_SUPPLY = [
  ['Copper', 0, 'Always in supply'],
  ['Silver', 3, 'Always in supply'],
  ['Gold', 6, 'Always in supply'],
  ['Estate', 2, 'Always in supply'],
  ['Duchy', 5, 'Always in supply'],
  ['Province', 8, 'Always in supply (6VP each)'],
  ['Curse', 0, 'Always in supply'],
]

function baseSupplyCards(totalGames) {
  return BASE_SUPPLY.map(([name, cost, notes]) => ({
    name, expansion: 'Base Cards', cost, debt: null, potion: false, notes,
    times_used: totalGames, removed: false, isSupplyCard: true,
    isSecondEdition: false, card_type: 'Kingdom',
  }))
}

// Some card_texts entries concatenate effects without separators
// ("+1 Card+1 ActionReveal..."). Normalize so every display site is readable.
export function cleanCardText(text) {
  if (!text) return null
  return text
    .replace(/(\S)\+/g, '$1 +')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/(\d)([A-Z])/g, '$1 $2')
}

function seatsFromResults(results) {
  return [...results]
    .sort((a, b) => a.place - b.place)
    .map(r => ({ players: [r.name], place: r.place, score: r.score ?? null }))
}

// Every stat reads results[].place, so make it the place of the player's seat:
// a team counts as one competitor (the sheet numbers places per person, e.g.
// the second of two 2-person teams is "3"). The sheet value is kept.
function alignPlacesWithSeats(results, seats) {
  const seatPlace = new Map(seats.flatMap(s => s.players.map(p => [p, s.place])))
  return results.map(r => ({ ...r, sheet_place: r.place, place: seatPlace.get(r.name) ?? r.place }))
}

function parseGame(g) {
  const results = g.results || []
  // Older JSON (before team support) has no seats; every player is a seat.
  const seats = g.seats || seatsFromResults(results)
  return {
    ...g,
    results: alignPlacesWithSeats(results, seats),
    expansions: g.expansions || [],
    kingdom: g.kingdom || [],
    seats,
  }
}

export function parseGames(rawGames) {
  return rawGames
    .filter(g => g.game_num != null && Array.isArray(g.players) && g.players.length > 0)
    .map(parseGame)
    .sort((a, b) => a.game_num - b.game_num)
}

function extraNames(game, field) {
  return (game[field] || []).map(x => (typeof x === 'string' ? x : x?.name)).filter(Boolean)
}

// True if the card is in the game's kingdom or any landscape field
// (traits are { name, card } objects, the other fields plain names).
export function gameUsesCard(game, name) {
  return (game.kingdom || []).some(k => k.card === name)
    || EXTRA_FIELDS.some(f => extraNames(game, f).includes(name))
}

export function countCardUsage(games) {
  const counts = {}
  const bump = name => { counts[name] = (counts[name] || 0) + 1 }
  for (const g of games) {
    g.kingdom.forEach(k => bump(k.card))
    EXTRA_FIELDS.forEach(f => extraNames(g, f).forEach(bump))
  }
  return counts
}

function dedupeCards(rawCards) {
  const byName = new Map()
  for (const c of rawCards) {
    const existing = byName.get(c.name)
    if (!existing || (c.cost != null && existing.cost == null)) byName.set(c.name, c)
  }
  return [...byName.values()]
}

export function buildCards(rawCards, cardTexts, games) {
  const usage = countCardUsage(games)
  const base = baseSupplyCards(games.length)
  const baseNames = new Set(base.map(c => c.name))
  const kingdomCards = dedupeCards(rawCards)
    .filter(c => !baseNames.has(c.name))
    .map(c => {
      const text = cardTexts[c.name]
      return {
        ...c,
        card_type: c.card_type || 'Kingdom',
        isSecondEdition: c.notes === '2nd edition',
        isAttack: isAttackCard(text),
        isCurseGiver: isCurseGiver(text),
        isDuration: isDurationCard(text),
        isTokenCard: isTokenCard(text, c),
        times_used: usage[c.name] ?? c.times_used ?? 0,
        card_text: cleanCardText(text),
      }
    })
  return [...kingdomCards, ...base]
}

const average = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export function buildPlayers(games) {
  const stats = new Map()
  const get = name => {
    if (!stats.has(name)) stats.set(name, { name, games: 0, places: [0, 0, 0, 0], scores: [] })
    return stats.get(name)
  }
  for (const g of games) {
    g.players.forEach(name => { get(name).games += 1 })
    for (const r of g.results) {
      // players[] is authoritative for who played; ignore stray result names
      if (!stats.has(r.name)) continue
      const p = stats.get(r.name)
      if (r.place >= 1 && r.place <= 4) p.places[r.place - 1] += 1
      if (r.score != null) p.scores.push(r.score)
    }
  }
  return [...stats.values()]
    .filter(p => p.games >= 1)
    .map(({ places, ...p }) => {
      const gpa = average(p.scores)
      return {
        ...p,
        first: places[0], second: places[1], third: places[2], fourth: places[3],
        win_rate: (places[0] / p.games) * 100,
        gpa,
        avg_score: gpa == null ? null : gpa.toFixed(1),
      }
    })
}

export function buildData(rawData, cardTexts) {
  const games = parseGames(rawData.games || [])
  const cards = buildCards(rawData.cards || [], cardTexts || {}, games)
  return {
    games,
    cards,
    players: buildPlayers(games),
    expansions: [...new Set(cards.filter(c => !c.isSupplyCard).map(c => c.expansion))].sort(),
    cardTypes: [...new Set(cards.map(c => c.card_type || 'Kingdom'))].sort(),
    lastUpdated: rawData.last_updated || null,
    upcomingGames: rawData.upcoming_games || 0,
    raw: rawData,
  }
}
