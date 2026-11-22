// Skill ratings with OpenSkill (Weng-Lin, Plackett-Luce). Unlike Elo it
// handles multiplayer games, ties and teams natively: every seat (a solo
// player or a team sharing a score) is one competitor, ranked by its place.
import { rating, rate, ordinal, predictWin } from 'openskill'

// Shown as 1000 + 40 × ordinal, where ordinal = mu − 3σ (a cautious estimate
// that rises as we get more sure about a player). New players start at 1000.
export const RATING_BASE = 1000
export const RATING_SCALE = 40
export const PROVISIONAL_GAMES = 5

export const toDisplay = r => Math.round(RATING_BASE + RATING_SCALE * ordinal(r))

const yearOf = game => Number(String(game.date || '').slice(0, 4)) || null

function rateGame(game, current) {
  const seats = game.seats || []
  if (seats.length < 2) return null
  const teams = seats.map(s => s.players.map(p => current.get(p)?.rating || rating()))
  const updated = rate(teams, { rank: seats.map(s => s.place) })
  return {
    seatOdds: predictWin(teams),
    changes: seats.flatMap((s, i) => s.players.map((name, j) => ({ name, before: teams[i][j], after: updated[i][j] }))),
  }
}

function nextPlayerState(prev, game, after) {
  const display = toDisplay(after)
  const base = prev || { name: null, games: 0, history: [], peak: null }
  const peak = !base.peak || display > base.peak.display ? { display, game_num: game.game_num, date: game.date } : base.peak
  return {
    ...base,
    rating: after,
    display,
    games: base.games + 1,
    peak,
    history: [...base.history, { game_num: game.game_num, date: game.date, display }],
  }
}

export function computeRatings(games) {
  const ordered = [...games].sort((a, b) => a.game_num - b.game_num)
  let players = new Map()
  const byGame = new Map()
  for (const game of ordered) {
    const rated = rateGame(game, players)
    if (!rated) continue
    const next = new Map(players)
    const changes = rated.changes.map(({ name, before, after }) => {
      next.set(name, { ...nextPlayerState(players.get(name), game, after), name })
      const b = toDisplay(before)
      const a = toDisplay(after)
      return { name, before: b, after: a, delta: a - b }
    })
    byGame.set(game.game_num, { players: changes, seatOdds: rated.seatOdds })
    players = next
  }
  return { players, byGame }
}

export function leaderboard(players) {
  return [...players.values()]
    .map(p => ({ name: p.name, display: p.display, games: p.games, peak: p.peak, provisional: p.games < PROVISIONAL_GAMES }))
    .sort((a, b) => b.display - a.display || a.name.localeCompare(b.name, 'is'))
}

// Win odds for each seat (array of player-name arrays), from current ratings.
export function predictSeats(players, seats) {
  if (seats.length < 2) return seats.map(() => 1)
  return predictWin(seats.map(names => names.map(n => players.get(n)?.rating || rating())))
}

// Rating gained/lost during `year`: last rating in the year minus the last
// rating before it (or the starting rating for a player's first year).
export function ratingChangeInYear(player, year) {
  const inYear = player.history.filter(h => yearOf(h) === year)
  if (!inYear.length) return null
  const before = player.history.filter(h => yearOf(h) != null && yearOf(h) < year)
  const start = before.length ? before[before.length - 1].display : RATING_BASE
  return inYear[inYear.length - 1].display - start
}

// Wins sorted by the winning seat's pre-game odds, least likely first.
export function biggestUpsets(games, byGame) {
  return games
    .filter(g => byGame.has(g.game_num))
    .flatMap(g => {
      const { seatOdds } = byGame.get(g.game_num)
      const winners = g.seats.map((s, i) => ({ s, odds: seatOdds[i] })).filter(({ s }) => s.place === 1)
      // A shared first place isn't much of an upset; only count outright wins.
      return winners.length === 1 ? [{ game_num: g.game_num, date: g.date, winners: winners[0].s.players, odds: winners[0].odds }] : []
    })
    .sort((a, b) => a.odds - b.odds)
}

// Memoized per games array: ratings are derived once per page load.
const cache = new WeakMap()
export function getRatings(games) {
  if (!cache.has(games)) cache.set(games, computeRatings(games))
  return cache.get(games)
}
