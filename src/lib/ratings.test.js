import { describe, it, expect } from 'vitest'
import { computeRatings, leaderboard, predictSeats, ratingChangeInYear, biggestUpsets, RATING_BASE, PROVISIONAL_GAMES } from './ratings'

// seats best-first: [['A'], ['B', 'C'], ...] → places 1..n (pass ties via places).
function game(num, seats, { places, date } = {}) {
  const seatObjs = seats.map((players, i) => ({ players, place: places ? places[i] : i + 1, score: null }))
  return { game_num: num, date: date || `2026-01-${String(num).padStart(2, '0')}`, players: seats.flat(), seats: seatObjs }
}

describe('computeRatings', () => {
  it('starts everyone at the base rating and rewards the winner', () => {
    const { players, byGame } = computeRatings([game(1, [['A'], ['B']])])
    expect(players.get('A').display).toBeGreaterThan(players.get('B').display)
    const [a, b] = byGame.get(1).players
    expect(a).toMatchObject({ name: 'A', before: RATING_BASE })
    expect(a.delta).toBeGreaterThan(0)
    // mu − 3σ can rise even for the loser early on (σ shrinks), but less than the winner.
    expect(b.delta).toBeLessThan(a.delta)
  })

  it('rates a team as one seat: both members move the same direction', () => {
    const { byGame } = computeRatings([game(1, [['A', 'B'], ['C']])])
    const deltas = Object.fromEntries(byGame.get(1).players.map(r => [r.name, r.after - r.before]))
    expect(Math.sign(deltas.A)).toBe(Math.sign(deltas.B))
    expect(deltas.A).toBeGreaterThan(deltas.C)
  })

  it('treats tied seats symmetrically', () => {
    const { players } = computeRatings([game(1, [['A'], ['B']], { places: [1, 1] })])
    expect(players.get('A').rating.mu).toBeCloseTo(players.get('B').rating.mu, 6)
  })

  it('skips games without at least two seats and processes games in order', () => {
    const games = [game(3, [['B'], ['A']]), { game_num: 2, date: '2026-01-02', players: ['A'], seats: [] }, game(1, [['A'], ['B']])]
    const { players, byGame } = computeRatings(games)
    expect(byGame.has(2)).toBe(false)
    expect(players.get('A').history.map(h => h.game_num)).toEqual([1, 3])
    expect(players.get('A').games).toBe(2)
  })

  it('tracks each player\'s peak rating', () => {
    const { players } = computeRatings([game(1, [['A'], ['B']]), game(2, [['A'], ['B']]), game(3, [['B'], ['A']])])
    const a = players.get('A')
    expect(a.peak.game_num).toBe(2)
    expect(a.peak.display).toBeGreaterThanOrEqual(a.display)
  })

  it('does not mutate the input games', () => {
    const games = [game(1, [['A'], ['B']])]
    const before = JSON.stringify(games)
    computeRatings(games)
    expect(JSON.stringify(games)).toBe(before)
  })
})

describe('leaderboard', () => {
  it('sorts by rating and marks players with few games as provisional', () => {
    const games = Array.from({ length: PROVISIONAL_GAMES }, (_, i) => game(i + 1, [['A'], ['B']]))
    const rows = leaderboard(computeRatings([...games, game(99, [['C'], ['B']])]).players)
    expect(rows[0].name).toBe('A')
    expect(rows.find(r => r.name === 'A').provisional).toBe(false)
    expect(rows.find(r => r.name === 'C').provisional).toBe(true)
  })
})

describe('predictSeats', () => {
  it('gives the stronger seat better odds and sums to 1', () => {
    const games = Array.from({ length: 6 }, (_, i) => game(i + 1, [['A'], ['B']]))
    const { players } = computeRatings(games)
    const [pA, pB] = predictSeats(players, [['A'], ['B']])
    expect(pA).toBeGreaterThan(pB)
    expect(pA + pB).toBeCloseTo(1, 6)
  })

  it('handles unknown players with the default rating', () => {
    const odds = predictSeats(new Map(), [['X'], ['Y']])
    expect(odds[0]).toBeCloseTo(0.5, 6)
  })
})

describe('ratingChangeInYear', () => {
  it('is the change from the last rating before the year to the last rating in it', () => {
    const games = [
      game(1, [['A'], ['B']], { date: '2025-06-01' }),
      game(2, [['A'], ['B']], { date: '2026-02-01' }),
      game(3, [['A'], ['B']], { date: '2026-03-01' }),
    ]
    const { players } = computeRatings(games)
    const hist = players.get('A').history
    expect(ratingChangeInYear(players.get('A'), 2026)).toBe(hist[2].display - hist[0].display)
    expect(ratingChangeInYear(players.get('A'), 2024)).toBeNull()
  })
})

describe('pre-game odds and upsets', () => {
  it('stores each seat\'s pre-game win odds in seat order', () => {
    const { byGame } = computeRatings([game(1, [['A'], ['B']])])
    const odds = byGame.get(1).seatOdds
    expect(odds).toHaveLength(2)
    expect(odds[0]).toBeCloseTo(0.5, 6)
  })

  it('ranks wins by how unlikely they were', () => {
    const games = [
      ...Array.from({ length: 6 }, (_, i) => game(i + 1, [['A'], ['B']])),
      game(7, [['B'], ['A']]),
      game(8, [['C'], ['D']]),
    ]
    const upsets = biggestUpsets(games, computeRatings(games).byGame)
    expect(upsets[0]).toMatchObject({ game_num: 7, winners: ['B'] })
    expect(upsets[0].odds).toBeLessThan(0.5)
  })
})
