import { describe, it, expect } from 'vitest'
import { computeAchievements } from './achievements'
import { computeLastGameFacts } from './lastGameFacts'
import { buildData } from './buildData'
import { makeGame, loadRealData } from '../test/fixtures'

const ids = list => list.map(a => a.id)

describe('computeAchievements', () => {
  it('returns an empty list per player when there are no games', () => {
    const result = computeAchievements([], [{ name: 'A' }])
    expect(result.get('A')).toEqual([])
  })

  it('awards the record high score to the right player', () => {
    const games = [
      makeGame(1, ['A', 'B'], { scores: [30, 20] }),
      makeGame(2, ['B', 'A'], { scores: [55, 25] }),
    ]
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
    const games = [makeGame(1, ['A', 'B'], { scores: [30, 20] }), makeGame(2, ['B', 'A'], { scores: [33, 31] })]
    const facts = computeLastGameFacts(games[1], games, [], [])
    expect(facts.length).toBeLessThanOrEqual(5)
    expect(facts.map(f => f.text).join(' ')).toContain('B vann með 33 stigum (2 yfir A)')
  })
})
