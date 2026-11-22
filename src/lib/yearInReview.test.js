import { describe, it, expect } from 'vitest'
import { computeClubYear, computePlayerYear, availableYears, earnedInYear } from './yearInReview'
import { parseGames } from './buildData'

// g(num, date, seats) where seats = [[players..., score], ...] best-first.
function g(num, date, seats, { kingdom = [], expansions = ['Base'], location = 'Laugarás' } = {}) {
  const seatObjs = seats.map((s, i) => {
    const score = typeof s[s.length - 1] === 'number' ? s[s.length - 1] : null
    const players = score == null ? s : s.slice(0, -1)
    return { players, place: i + 1, score }
  })
  const players = seatObjs.flatMap(s => s.players)
  const results = seatObjs.flatMap(s => s.players.map(name => ({ name, place: s.place, score: s.score, tied_with: null })))
  return { game_num: num, date, location, players, results, seats: seatObjs, kingdom: kingdom.map(card => ({ card, expansion: 'Base' })), expansions }
}

const games = parseGames([
  g(1, '2025-11-02', [['A', 30], ['B', 20]], { kingdom: ['Village'] }),
  g(2, '2026-01-10', [['A', 40], ['B', 39], ['C', 10]], { kingdom: ['Village', 'Moat'], location: 'Húsafell' }),
  g(3, '2026-01-24', [['B', 35], ['A', 25]], { kingdom: ['Village'], expansions: ['Base', 'Seaside'] }),
  g(4, '2026-03-01', [['A', 'D', 50], ['B', 20]], { kingdom: ['Moat', 'Witch'] }),
  g(5, '2026-03-02', [['A', 33], ['B', 30]], { kingdom: ['Village'] }),
])

describe('availableYears', () => {
  it('lists years with games, newest first', () => {
    expect(availableYears(games)).toEqual([2026, 2025])
  })
})

describe('computeClubYear', () => {
  const club = computeClubYear(games, 2026)

  it('counts games this year and last year', () => {
    expect(club.totalGames).toBe(4)
    expect(club.prevYearGames).toBe(1)
  })

  it('finds the busiest month and longest gap', () => {
    expect(club.gamesByMonth).toEqual([2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(club.busiestMonth).toEqual({ month: 0, count: 2 })
    expect(club.longestGap).toMatchObject({ days: 36, fromGame: 3, toGame: 4 })
  })

  it('crowns the champion by wins (team wins count for every member)', () => {
    expect(club.champion).toMatchObject({ name: 'A', wins: 3, games: 4 })
    expect(club.mostGames).toMatchObject({ name: 'A', games: 4 })
  })

  it('finds score records by seat', () => {
    expect(club.highestScore).toMatchObject({ players: ['A', 'D'], score: 50, game_num: 4 })
    expect(club.closestGame).toMatchObject({ game_num: 2, margin: 1 })
    expect(club.biggestWin).toMatchObject({ game_num: 4, margin: 30 })
  })

  it('ranks cards and expansions and spots debuts', () => {
    expect(club.topCards[0]).toEqual({ name: 'Village', count: 3 })
    expect(club.debutExpansions).toEqual(['Seaside'])
    expect(club.newCards).toEqual(['Moat', 'Witch'])
  })

  it('lists newcomers and the top location', () => {
    expect(club.newcomers).toEqual(['C', 'D'])
    expect(club.topLocations[0]).toEqual({ name: 'Laugarás', count: 3 })
  })

  it('finds the rivalry of the year among opponents', () => {
    expect(club.rivalry).toMatchObject({ a: 'A', b: 'B', games: 4, aWins: 3, bWins: 1 })
  })

  it('counts team games', () => {
    expect(club.teamGames).toBe(1)
  })

  it('returns an empty summary for a year without games', () => {
    expect(computeClubYear(games, 2019).totalGames).toBe(0)
  })
})

describe('computePlayerYear', () => {
  it('summarizes one player and compares with last year', () => {
    const a = computePlayerYear(games, 2026, 'A')
    expect(a).toMatchObject({
      games: 4, wins: 3, winRate: 75,
      prevYear: { games: 1, wins: 1, winRate: 100 },
      places: [3, 1],
      bestScore: { score: 50, game_num: 4 },
      longestWinStreak: 2,
      teammates: ['D'],
      rankByWins: 1,
    })
    expect(a.mostSeenCard).toEqual({ name: 'Village', count: 3 })
  })

  it('finds nemesis (beat me most) and victim (I beat most)', () => {
    const b = computePlayerYear(games, 2026, 'B')
    expect(b.nemesis).toEqual({ name: 'A', count: 3 })
    expect(b.victim).toEqual({ name: 'A', count: 1 }) // tie with C → alphabetical
  })

  it('handles games without results (no seats) without crashing', () => {
    const unscored = parseGames([{ game_num: 9, date: '2024-05-01', players: ['A', 'B'], results: [], seats: [], kingdom: [], expansions: [] }])
    expect(computePlayerYear(unscored, 2024, 'A')).toMatchObject({ games: 1, wins: 0, teammates: [], places: [] })
  })

  it('returns null for a player who did not play that year', () => {
    expect(computePlayerYear(games, 2026, 'Nobody')).toBeNull()
  })
})

describe('earnedInYear', () => {
  it('returns achievements present at year end but not at the previous year end', () => {
    const compute = gs => new Map([['A', gs.length >= 3 ? [{ id: 'x' }, { id: 'y' }] : [{ id: 'x' }]]])
    expect(earnedInYear(games, 2026, ['A'], compute).get('A').map(a => a.id)).toEqual(['y'])
  })
})
