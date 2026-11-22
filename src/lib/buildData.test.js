import { describe, it, expect } from 'vitest'
import { parseGames, countCardUsage, buildPlayers, buildCards, buildData, cleanCardText } from './buildData'
import { makeGame, loadRealData } from '../test/fixtures'

describe('parseGames', () => {
  it('drops games without players and sorts by game number', () => {
    const games = parseGames([
      makeGame(2, ['A', 'B']),
      { game_num: 3, players: [] },
      { game_num: null, players: ['A'] },
      makeGame(1, ['B', 'A']),
    ])
    expect(games.map(g => g.game_num)).toEqual([1, 2])
  })

  it('derives one seat per player when the JSON has no seats', () => {
    const [g] = parseGames([makeGame(1, ['A', 'B'], { scores: [30, 20] })])
    expect(g.seats).toEqual([
      { players: ['A'], place: 1, score: 30 },
      { players: ['B'], place: 2, score: 20 },
    ])
  })

  it('keeps seats from the JSON when present (team games)', () => {
    const seats = [{ players: ['A', 'B'], place: 1, score: 24 }, { players: ['C'], place: 2, score: 20 }]
    const [g] = parseGames([{ ...makeGame(1, ['A', 'B', 'C']), seats }])
    expect(g.seats).toBe(seats)
  })

  it('aligns results[].place with the seat place (team = one competitor), keeping the sheet value', () => {
    const raw = {
      ...makeGame(1, ['A', 'B', 'C', 'D']),
      results: [
        { name: 'A', place: 1, score: 24, teammates: ['B'] }, { name: 'B', place: 1, score: 24, teammates: ['A'] },
        { name: 'C', place: 3, score: 21, teammates: ['D'] }, { name: 'D', place: 3, score: 21, teammates: ['C'] },
      ],
      seats: [{ players: ['A', 'B'], place: 1, score: 24 }, { players: ['C', 'D'], place: 2, score: 21 }],
    }
    const [g] = parseGames([raw])
    expect(g.results.map(r => [r.name, r.place, r.sheet_place])).toEqual([['A', 1, 1], ['B', 1, 1], ['C', 2, 3], ['D', 2, 3]])
  })

  it('does not mutate its input', () => {
    const input = [makeGame(2, ['A']), makeGame(1, ['B'])]
    const snapshot = JSON.stringify(input)
    parseGames(input)
    expect(JSON.stringify(input)).toBe(snapshot)
  })
})

describe('countCardUsage', () => {
  it('counts kingdom cards and landscape names, including trait objects', () => {
    const games = parseGames([
      { ...makeGame(1, ['A'], { kingdom: [{ card: 'Village' }] }), events: ['Alms'], traits: [{ name: 'Cursed', card: 'Village' }] },
      { ...makeGame(2, ['A'], { kingdom: [{ card: 'Village' }] }), traits: ['Cursed'] },
    ])
    expect(countCardUsage(games)).toEqual({ Village: 2, Alms: 1, Cursed: 2 })
  })
})

describe('buildPlayers', () => {
  it('computes games, placements, win rate and average score', () => {
    const games = parseGames([
      makeGame(1, ['A', 'B'], { scores: [30, 20] }),
      makeGame(2, ['B', 'A'], { scores: [25, 15] }),
      makeGame(3, ['A', 'B'], { scores: [40, 10] }),
    ])
    const a = buildPlayers(games).find(p => p.name === 'A')
    expect(a).toMatchObject({ games: 3, first: 2, second: 1, win_rate: (2 / 3) * 100, avg_score: '28.3' })
  })

  it('ignores result rows for names not in the players list', () => {
    const g = makeGame(1, ['A'])
    const games = parseGames([{ ...g, results: [...g.results, { place: 2, name: 'Ghost', score: 1 }] }])
    expect(buildPlayers(games).map(p => p.name)).toEqual(['A'])
  })
})

describe('buildCards', () => {
  it('dedupes by name preferring entries with a cost, and appends base supply', () => {
    const raw = [
      { name: 'Village', expansion: 'Base', cost: null },
      { name: 'Village', expansion: 'Base', cost: 3 },
    ]
    const cards = buildCards(raw, { Village: '+1 Card+2 Actions' }, [])
    const village = cards.filter(c => c.name === 'Village')
    expect(village).toHaveLength(1)
    expect(village[0]).toMatchObject({ cost: 3, card_text: '+1 Card +2 Actions', times_used: 0 })
    expect(cards.find(c => c.name === 'Province')).toMatchObject({ isSupplyCard: true, cost: 8 })
  })
})

describe('cleanCardText', () => {
  it('separates concatenated effects', () => {
    expect(cleanCardText('+1 Card+1 ActionReveal a card')).toBe('+1 Card +1 Action Reveal a card')
    expect(cleanCardText(null)).toBeNull()
  })
})

describe('buildData on the real synced data', () => {
  const { raw, cardTexts } = loadRealData()
  const data = buildData(raw, cardTexts)

  it('loads every game and player', () => {
    expect(data.games.length).toBeGreaterThan(100)
    expect(data.players.length).toBeGreaterThan(10)
    expect(data.games.every(g => Array.isArray(g.seats))).toBe(true)
  })

  it('every kingdom card in every game exists in the card list (names normalized by the sync)', () => {
    const names = new Set(data.cards.map(c => c.name))
    const unknown = data.games.flatMap(g => g.kingdom.map(k => k.card)).filter(n => !names.has(n))
    expect([...new Set(unknown)]).toEqual([])
  })
})

describe('gameUsesCard', () => {
  it('matches kingdom cards, plain landscape names and trait objects', async () => {
    const { gameUsesCard } = await import('./buildData')
    const game = { kingdom: [{ card: 'Village' }], events: ['Alms'], traits: [{ name: 'Friendly', card: 'Village' }] }
    expect(gameUsesCard(game, 'Village')).toBe(true)
    expect(gameUsesCard(game, 'Alms')).toBe(true)
    expect(gameUsesCard(game, 'Friendly')).toBe(true)
    expect(gameUsesCard(game, 'Moat')).toBe(false)
  })
})
