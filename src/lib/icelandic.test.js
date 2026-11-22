import { describe, it, expect } from 'vitest'
import { plural, joinNames, isSingular } from './icelandic'

describe('plural', () => {
  it('uses singular for numbers ending in 1 except 11', () => {
    expect(plural(1, 'leikur', 'leikir')).toBe('1 leikur')
    expect(plural(21, 'leikur', 'leikir')).toBe('21 leikur')
    expect(plural(11, 'leikur', 'leikir')).toBe('11 leikir')
    expect(plural(111, 'leikur', 'leikir')).toBe('111 leikir')
    expect(plural(0, 'leikur', 'leikir')).toBe('0 leikir')
    expect(plural(36, 'leikur', 'leikir')).toBe('36 leikir')
  })
})

describe('joinNames', () => {
  it('joins with commas and "og"', () => {
    expect(joinNames(['A'])).toBe('A')
    expect(joinNames(['A', 'B'])).toBe('A og B')
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B og C')
  })
})

describe('isSingular', () => {
  it('follows the ends-in-1-except-11 rule', () => {
    expect([1, 21, 31, 101].every(isSingular)).toBe(true)
    expect([0, 2, 11, 111, 12].some(isSingular)).toBe(false)
  })
})
