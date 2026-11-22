import { describe, it, expect } from 'vitest'
import { pickRandom, pickLandscapeCards, buildExportText, buildPlayerCardUsage, formatColonyPlatinumLabel } from './suggester'

// Deterministic PRNG (mulberry32) so tests are reproducible.
function seeded(seed) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('pickRandom', () => {
  it('returns n distinct items without mutating the input', () => {
    const arr = [1, 2, 3, 4, 5]
    const out = pickRandom(arr, 3, seeded(1))
    expect(out).toHaveLength(3)
    expect(new Set(out).size).toBe(3)
    expect(arr).toEqual([1, 2, 3, 4, 5])
  })

  it('handles empty input and n larger than the array', () => {
    expect(pickRandom([], 3)).toEqual([])
    expect(pickRandom([1, 2], 5).sort()).toEqual([1, 2])
  })

  it('is roughly uniform (each item first about equally often)', () => {
    const rnd = seeded(42)
    const counts = [0, 0, 0, 0]
    for (let i = 0; i < 8000; i++) counts[pickRandom([0, 1, 2, 3], 1, rnd)[0]]++
    for (const c of counts) expect(c).toBeGreaterThan(1800)
  })
})

describe('pickLandscapeCards', () => {
  const pool = [
    { name: 'Way of the Ox', card_type: 'Way' },
    { name: 'League of Shopkeepers', card_type: 'Ally' },
    { name: 'Rapid Expansion', card_type: 'Prophecy' },
  ]

  it('adds an Ally only when the kingdom has a Liaison', () => {
    const withoutLiaison = pickLandscapeCards(pool, [{ name: 'Village' }])
    expect(withoutLiaison.some(c => c.card_type === 'Ally')).toBe(false)
    const withLiaison = pickLandscapeCards(pool, [{ name: 'Bauble' }])
    expect(withLiaison.some(c => c.card_type === 'Ally')).toBe(true)
  })

  it('adds a Prophecy only when the kingdom has an Omen', () => {
    expect(pickLandscapeCards(pool, [{ name: 'Village' }]).some(c => c.card_type === 'Prophecy')).toBe(false)
    expect(pickLandscapeCards(pool, [{ name: 'Tanuki' }]).some(c => c.card_type === 'Prophecy')).toBe(true)
  })
})

describe('buildExportText', () => {
  it('lists kingdom cards by cost and includes Colony/Platinum when used', () => {
    const kingdom = [
      { name: 'Market', cost: 5, expansion: 'Base' },
      { name: 'Village', cost: 3, expansion: 'Base' },
    ]
    const text = buildExportText(kingdom, [], [], [], [], true, {}, {}, 2)
    expect(text.split('\n').slice(0, 3)).toEqual(['Ríkið:', '  Village (3) · Base', '  Market (5) · Base'])
    expect(text).toContain(`Prosperity: ${formatColonyPlatinumLabel(2)}`)
  })
})

describe('buildPlayerCardUsage', () => {
  it('counts how often each player has seen each card', () => {
    const games = [
      { players: ['A', 'B'], kingdom: [{ card: 'Village' }] },
      { players: ['A'], kingdom: [{ card: 'Village' }, { card: 'Moat' }] },
    ]
    expect(buildPlayerCardUsage(games)).toEqual({ A: { Village: 2, Moat: 1 }, B: { Village: 1 } })
  })
})
