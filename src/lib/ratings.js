// Skill ratings with OpenSkill (Weng-Lin, Plackett-Luce). Unlike Elo it
// handles multiplayer games and ties natively. Every seat (a solo player or a
// team sharing one deck) is ONE competitor: a team is rated as a single
// player of its members' average skill — OpenSkill's default would add the
// members up and treat a 2-person team as twice as strong.
import { rating, rate, predictWin } from 'openskill'

// Shown as 1000 + 40 × (μ − 25): everyone starts at 1000 and the number only
// moves with results (win → up, last place → down). Uncertainty (σ) is used
// for the provisional marker, not baked into the number.
export const RATING_BASE = 1000
export const RATING_SCALE = 40
export const PROVISIONAL_GAMES = 5
const DEFAULT_MU = 25

export const toDisplay = r => Math.round(RATING_BASE + RATING_SCALE * (r.mu - DEFAULT_MU))

const yearOf = game => Number(String(game.date || '').slice(0, 4)) || null

// One virtual rating per seat: mean μ, root-mean-square σ.
function seatRating(members) {
  const n = members.length
  const mu = members.reduce((sum, m) => sum + m.mu, 0) / n
  const sigma = Math.sqrt(members.reduce((sum, m) => sum + m.sigma ** 2, 0) / n)
  return rating({ mu, sigma })
}

// Apply the seat's change to each member: same μ shift, σ scaled alike.
function applySeatChange(member, seatBefore, seatAfter) {
  return rating({ mu: member.mu + (seatAfter.mu - seatBefore.mu), sigma: member.sigma * (seatAfter.sigma / seatBefore.sigma) })
}

function rateGame(game, current) {
  const seats = game.seats || []
  if (seats.length < 2) return null
  const members = seats.map(s => s.players.map(p => current.get(p)?.rating || rating()))
  const before = members.map(seatRating)
  const after = rate(before.map(r => [r]), { rank: seats.map(s => s.place) }).map(([r]) => r)
  return {
    seatOdds: predictWin(before.map(r => [r])),
    changes: seats.flatMap((s, i) => s.players.map((name, j) => ({
      name, before: members[i][j], after: applySeatChange(members[i][j], before[i], after[i]),
    }))),
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

// Established players by rating, then provisional ones (too few games to trust).
export function leaderboard(players) {
  return [...players.values()]
    .map(p => ({ name: p.name, display: p.display, games: p.games, peak: p.peak, provisional: p.games < PROVISIONAL_GAMES }))
    .sort((a, b) => a.provisional - b.provisional || b.display - a.display || a.name.localeCompare(b.name, 'is'))
}

// Win odds for each seat (array of player-name arrays), from current ratings.
export function predictSeats(players, seats) {
  if (seats.length < 2) return seats.map(() => 1)
  return predictWin(seats.map(names => [seatRating(names.map(n => players.get(n)?.rating || rating()))]))
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
