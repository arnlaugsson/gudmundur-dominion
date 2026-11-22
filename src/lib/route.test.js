import { describe, it, expect } from 'vitest'
import { parseRoute, buildHash } from './route'

const TABS = new Set(['dashboard', 'history', 'players', 'cards'])

describe('parseRoute', () => {
  it('defaults to dashboard for empty or unknown hashes', () => {
    expect(parseRoute('', TABS)).toEqual({ tab: 'dashboard', sub: null })
    expect(parseRoute('#nope/1', TABS)).toEqual({ tab: 'dashboard', sub: null })
  })

  it('reads a tab and a decoded sub-path', () => {
    expect(parseRoute('#history/141', TABS)).toEqual({ tab: 'history', sub: '141' })
    expect(parseRoute('#players/Ragnhei%C3%B0ur', TABS)).toEqual({ tab: 'players', sub: 'Ragnheiður' })
    expect(parseRoute('#cards/Fool%27s%20Gold', TABS)).toEqual({ tab: 'cards', sub: "Fool's Gold" })
  })

  it('keeps slashes inside the sub-path', () => {
    expect(parseRoute('#cards/Way%20of%20the%20Ox%2FHorse', TABS).sub).toBe('Way of the Ox/Horse')
  })

  it('treats malformed escapes as no sub-path instead of throwing', () => {
    expect(parseRoute('#cards/%E0%A4%A', TABS)).toEqual({ tab: 'cards', sub: null })
  })
})

describe('buildHash', () => {
  it('encodes the sub-path', () => {
    expect(buildHash('players', 'Ragnheiður')).toBe('players/Ragnhei%C3%B0ur')
    expect(buildHash('history', 141)).toBe('history/141')
    expect(buildHash('cards')).toBe('cards')
  })

  it('round-trips through parseRoute', () => {
    const hash = buildHash('cards', 'Way of the Ox/Horse')
    expect(parseRoute('#' + hash, TABS)).toEqual({ tab: 'cards', sub: 'Way of the Ox/Horse' })
  })
})

describe('replaceRoute', () => {
  it('changes the hash without adding a history entry and notifies listeners', async () => {
    const { replaceRoute } = await import('./route')
    window.location.hash = '#history/141'
    const before = window.history.length
    let fired = 0
    const onChange = () => { fired += 1 }
    window.addEventListener('hashchange', onChange)
    replaceRoute('history')
    window.removeEventListener('hashchange', onChange)
    expect(window.location.hash).toBe('#history')
    expect(window.history.length).toBe(before)
    expect(fired).toBe(1)
  })
})
