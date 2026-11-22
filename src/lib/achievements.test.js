import { describe, it, expect } from 'vitest'
import { computeAchievements } from './achievements'
import { computeLastGameFacts } from './lastGameFacts'
import { buildData, parseGames } from './buildData'
import { makeGame, loadRealData } from '../test/fixtures'

const ids = list => list.map(a => a.id)

describe('computeAchievements', () => {
  it('returns an empty list per player when there are no games', () => {
    const result = computeAchievements([], [{ name: 'A' }])
    expect(result.get('A')).toEqual([])
  })

  it('awards the record high score to the right player', () => {
    const games = parseGames([
      makeGame(1, ['A', 'B'], { scores: [30, 20] }),
      makeGame(2, ['B', 'A'], { scores: [55, 25] }),
    ])
    const result = computeAchievements(games, [{ name: 'A' }, { name: 'B' }])
    expect(ids(result.get('B'))).toContain('record-high-score')
    expect(ids(result.get('A'))).not.toContain('record-high-score')
  })

  it('is deterministic and does not mutate games on the real data', () => {
    const { raw, cardTexts } = loadRealData()
    const data = buildData(raw, cardTexts)
    const before = JSON.stringify(data.games)
    const a = computeAchievements(data.games, data.players)
    const b = computeAchievements(data.games, data.players)
    expect(JSON.stringify(data.games)).toBe(before)
    expect([...a.entries()].map(([k, v]) => [k, ids(v)])).toEqual([...b.entries()].map(([k, v]) => [k, ids(v)]))
  })
})

describe('computeLastGameFacts', () => {
  it('returns nothing without a game', () => {
    expect(computeLastGameFacts(null, [], [], [])).toEqual([])
  })

  it('describes the winner and margin of the latest game', () => {
    const games = parseGames([makeGame(1, ['A', 'B'], { scores: [30, 20] }), makeGame(2, ['B', 'A'], { scores: [33, 31] })])
    const facts = computeLastGameFacts(games[1], games, [], [])
    expect(facts.length).toBeLessThanOrEqual(5)
    expect(facts.map(f => f.text).join(' ')).toContain('B vann með 33 stigum, A var 2 stigum á eftir')
  })
})

describe('team games count each hand once in totals', () => {
  it('the club record total uses seat scores, not every teammate', () => {
    const games = parseGames([
      { ...makeGame(1, ['X', 'Y']), results: [{ name: 'X', place: 1, score: 50 }, { name: 'Y', place: 2, score: 40 }] },
      {
        ...makeGame(2, ['A', 'B', 'C']),
        results: [{ name: 'A', place: 1, score: 60, teammates: ['B'] }, { name: 'B', place: 1, score: 60, teammates: ['A'] }, { name: 'C', place: 2, score: 30 }],
        seats: [{ players: ['A', 'B'], place: 1, score: 60 }, { players: ['C'], place: 2, score: 30 }],
      },
    ])
    const facts = computeLastGameFacts(games[1], games, [], [])
    const total = facts.find(f => f.title === 'Stigahæsti leikurinn')
    expect(total.text).toContain('90 stig samtals') // 60 + 30, not 60 + 60 + 30
  })
})
