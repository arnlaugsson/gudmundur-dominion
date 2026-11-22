// Pure derivations for the year-in-review ("Árið") pages: one summary for
// the whole club and one per player. Standings use seats, so a team win
// counts as a win for every member.
import { seatOf, placeOf, isWinner, isTeamGame } from './seats'
import { computeAchievements } from './achievements'
import { getRatings, ratingChangeInYear, biggestUpsets } from './ratings'

// Mummi plays (and usually wins) every game, so wherever he tops a list the
// story shows the best of everyone else, with Mummi's number for comparison.
export const MUMMI = 'Mummi'

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_GAMES_FOR_WIN_RATE = 5
const TOP_N = 5

const collator = new Intl.Collator('is')
const yearOf = game => Number(String(game.date || '').slice(0, 4)) || null
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS)

export function gamesInYear(games, year) {
  return games.filter(g => yearOf(g) === year)
}

export function availableYears(games) {
  return [...new Set(games.map(yearOf).filter(Boolean))].sort((a, b) => b - a)
}

// Sorted [{ name, count }] from a Map, highest first, ties by name.
function ranked(counts, limit = Infinity) {
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || collator.compare(a.name, b.name))
    .slice(0, limit)
}

function tally(items) {
  const counts = new Map()
  for (const item of items) counts.set(item, (counts.get(item) || 0) + 1)
  return counts
}

// Names (in order of first appearance) whose first-ever occurrence is in `year`.
function debutsInYear(games, year, namesOf) {
  const firstYear = new Map()
  for (const g of games) {
    for (const name of namesOf(g)) if (!firstYear.has(name)) firstYear.set(name, yearOf(g))
  }
  return [...firstYear.entries()].filter(([, y]) => y === year).map(([name]) => name)
}

const kingdomNames = g => g.kingdom.map(k => k.card)

function scoredMargin(game) {
  const seats = [...(game.seats || [])].sort((a, b) => a.place - b.place)
  if (seats.length < 2) return null
  const [first, second] = seats
  // Both top seats need a score, or the "runner-up" could be the wrong seat.
  if (first.score == null || second.score == null) return null
  return { game_num: game.game_num, margin: first.score - second.score, winners: first.players, runnersUp: second.players }
}

const involvesMummi = entry => entry.name === MUMMI || (entry.players || []).includes(MUMMI)

// First entry of a best-first list; if that's Mummi, the best entry without
// him instead, carrying Mummi's entry as `mummi` for comparison. If nobody
// else qualifies (e.g. Mummi won every game), Mummi himself is the leader.
export function leaderBesidesMummi(sorted) {
  const top = sorted[0]
  if (!top) return null
  if (!involvesMummi(top)) return { ...top, mummi: null }
  const other = sorted.find(e => !involvesMummi(e))
  return other ? { ...other, mummi: top } : { ...top, mummi: null }
}

function scoreRecords(yearGames) {
  const seatScores = yearGames
    .flatMap(g => g.seats.filter(s => s.score != null).map(s => ({ players: s.players, score: s.score, game_num: g.game_num })))
    .sort((a, b) => b.score - a.score || a.game_num - b.game_num)
  const highestScore = leaderBesidesMummi(seatScores)
  const margins = yearGames.map(scoredMargin).filter(Boolean)
  const closestGame = margins.filter(m => m.margin > 0).reduce((best, m) => (!best || m.margin < best.margin ? m : best), null)
  const biggestWin = margins.reduce((best, m) => (!best || m.margin > best.margin ? m : best), null)
  return { highestScore, closestGame, biggestWin }
}

function longestGap(yearGames) {
  let best = null
  for (let i = 1; i < yearGames.length; i++) {
    const days = daysBetween(yearGames[i - 1].date, yearGames[i].date)
    if (!best || days > best.days) best = { days, fromGame: yearGames[i - 1].game_num, toGame: yearGames[i].game_num }
  }
  return best
}

function playerTotals(yearGames) {
  const totals = new Map()
  for (const g of yearGames) {
    for (const name of g.players) {
      const t = totals.get(name) || { name, games: 0, wins: 0 }
      totals.set(name, { ...t, games: t.games + 1, wins: t.wins + (isWinner(g, name) ? 1 : 0) })
    }
  }
  return [...totals.values()]
}

function rivalryOfYear(yearGames) {
  const pairs = new Map()
  for (const g of yearGames) {
    for (const s1 of g.seats) {
      for (const s2 of g.seats) {
        if (s1 === s2) continue
        for (const a of s1.players) {
          for (const b of s2.players) {
            if (collator.compare(a, b) >= 0) continue
            const key = `${a}\u0000${b}`
            const p = pairs.get(key) || { a, b, games: 0, aWins: 0, bWins: 0 }
            pairs.set(key, { ...p, games: p.games + 1, aWins: p.aWins + (s1.place < s2.place ? 1 : 0), bWins: p.bWins + (s2.place < s1.place ? 1 : 0) })
          }
        }
      }
    }
  }
  const best = [...pairs.values()].sort((x, y) => y.games - x.games || Math.abs(x.aWins - x.bWins) - Math.abs(y.aWins - y.bWins))[0]
  if (!best) return null
  // Put the leader first.
  return best.bWins > best.aWins ? { a: best.b, b: best.a, games: best.games, aWins: best.bWins, bWins: best.aWins } : best
}

function byWinsThenName(a, b) {
  return b.wins - a.wins || a.games - b.games || collator.compare(a.name, b.name)
}

function ratingHighlights(games, year) {
  const { players, byGame } = getRatings(games)
  const climber = leaderBesidesMummi([...players.values()]
    .map(p => ({ name: p.name, change: ratingChangeInYear(p, year) }))
    .filter(p => p.change != null && p.change > 0)
    .sort((a, b) => b.change - a.change || collator.compare(a.name, b.name)))
  const upset = biggestUpsets(gamesInYear(games, year), byGame)[0] || null
  return { climber, upset }
}

export function computeClubYear(games, year) {
  const yearGames = gamesInYear(games, year)
  const totals = playerTotals(yearGames)
  const qualified = totals.filter(t => t.games >= MIN_GAMES_FOR_WIN_RATE)
  const withRate = t => ({ ...t, rate: (t.wins / t.games) * 100 })
  const bestWinRate = leaderBesidesMummi(
    qualified.filter(t => t.wins > 0).map(withRate).sort((a, b) => b.rate - a.rate || byWinsThenName(a, b)),
  )
  const champion = leaderBesidesMummi([...totals].filter(t => t.wins > 0).sort(byWinsThenName))
  const gamesByMonth = Array.from({ length: 12 }, (_, m) => yearGames.filter(g => Number(g.date.slice(5, 7)) === m + 1).length)
  const busiest = Math.max(0, ...gamesByMonth)
  return {
    year,
    totalGames: yearGames.length,
    prevYearGames: gamesInYear(games, year - 1).length,
    gamesByMonth,
    busiestMonth: busiest ? { month: gamesByMonth.indexOf(busiest), count: busiest } : null,
    longestGap: longestGap(yearGames),
    // No champion in a year where nobody has won yet (e.g. unscored games).
    champion,
    bestWinRate,
    mostGames: leaderBesidesMummi([...totals].sort((a, b) => b.games - a.games || byWinsThenName(a, b))),
    playerCount: totals.length,
    ...scoreRecords(yearGames),
    topCards: ranked(tally(yearGames.flatMap(kingdomNames)), TOP_N),
    topExpansions: ranked(tally(yearGames.flatMap(g => g.expansions)), TOP_N),
    topLocations: ranked(tally(yearGames.map(g => g.location).filter(Boolean)), TOP_N),
    debutExpansions: debutsInYear(games, year, g => g.expansions),
    newCards: debutsInYear(games, year, kingdomNames),
    newcomers: debutsInYear(games, year, g => g.players),
    rivalry: rivalryOfYear(yearGames),
    teamGames: yearGames.filter(isTeamGame).length,
    ...ratingHighlights(games, year),
  }
}

function winRecord(yearGames, name) {
  const games = yearGames.filter(g => g.players.includes(name))
  const wins = games.filter(g => isWinner(g, name)).length
  return { games: games.length, wins, winRate: games.length ? (wins / games.length) * 100 : 0 }
}

function headToHead(myGames, name) {
  const beatMe = new Map()
  const iBeat = new Map()
  for (const g of myGames) {
    const myPlace = placeOf(g, name)
    if (myPlace == null) continue
    for (const s of g.seats) {
      if (s.players.includes(name)) continue
      const target = s.place < myPlace ? beatMe : s.place > myPlace ? iBeat : null
      if (target) s.players.forEach(p => target.set(p, (target.get(p) || 0) + 1))
    }
  }
  // Mummi beats almost everyone, so show the toughest opponent besides him.
  return { nemesis: leaderBesidesMummi(ranked(beatMe)), victim: leaderBesidesMummi(ranked(iBeat)) }
}

function longestStreak(myGames, name) {
  let best = 0
  let run = 0
  for (const g of myGames) {
    run = isWinner(g, name) ? run + 1 : 0
    best = Math.max(best, run)
  }
  return best
}

function placeCounts(myGames, name) {
  const counts = []
  for (const g of myGames) {
    const place = placeOf(g, name)
    if (place == null) continue
    for (let i = counts.length; i < place; i++) counts.push(0)
    counts[place - 1] += 1
  }
  return counts
}

function bestSeatScore(myGames, name) {
  return myGames.reduce((best, g) => {
    const score = seatOf(g, name)?.score
    return score != null && (!best || score > best.score) ? { score, game_num: g.game_num } : best
  }, null)
}

function playerRating(games, year, name) {
  const p = getRatings(games).players.get(name)
  if (!p) return { ratingEnd: null, ratingChange: null }
  const inYear = p.history.filter(h => Number(String(h.date).slice(0, 4)) === year)
  return { ratingEnd: inYear.length ? inYear[inYear.length - 1].display : null, ratingChange: ratingChangeInYear(p, year) }
}

export function computePlayerYear(games, year, name) {
  const yearGames = gamesInYear(games, year)
  const myGames = yearGames.filter(g => g.players.includes(name))
  if (!myGames.length) return null
  const scores = myGames.map(g => seatOf(g, name)?.score).filter(s => s != null)
  const rankList = playerTotals(yearGames).sort(byWinsThenName)
  const myWins = rankList.find(t => t.name === name).wins
  return {
    name,
    year,
    ...winRecord(yearGames, name),
    prevYear: winRecord(gamesInYear(games, year - 1), name),
    places: placeCounts(myGames, name),
    bestScore: bestSeatScore(myGames, name),
    avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    favoriteExpansion: ranked(tally(myGames.flatMap(g => g.expansions)), 1)[0] || null,
    mostSeenCard: ranked(tally(myGames.flatMap(kingdomNames)), 1)[0] || null,
    ...headToHead(myGames, name),
    longestWinStreak: longestStreak(myGames, name),
    teammates: [...new Set(myGames.flatMap(g => (seatOf(g, name)?.players || []).filter(p => p !== name)))],
    rankByWins: 1 + rankList.filter(t => t.wins > myWins).length,
    rankExMummi: 1 + rankList.filter(t => t.name !== MUMMI && t.wins > myWins).length,
    mummiWins: rankList.find(t => t.name === MUMMI)?.wins ?? null,
    playerCount: rankList.length,
    firstGameEver: debutsInYear(games, year, g => g.players).includes(name),
    ...playerRating(games, year, name),
  }
}

// Achievements held at the end of `year` that were not held a year earlier.
export function earnedInYear(games, year, names, compute = gs => computeAchievements(gs, names.map(name => ({ name })))) {
  const upTo = y => games.filter(g => yearOf(g) != null && yearOf(g) <= y)
  const before = compute(upTo(year - 1))
  const after = compute(upTo(year))
  return new Map(names.map(name => {
    const had = new Set((before.get(name) || []).map(a => a.id))
    return [name, (after.get(name) || []).filter(a => !had.has(a.id))]
  }))
}
