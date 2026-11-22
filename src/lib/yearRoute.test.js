import { describe, it, expect } from 'vitest'
import { parseYearSub } from './yearRoute'

describe('parseYearSub', () => {
  const years = [2026, 2025]
  it('reads year and story', () => {
    expect(parseYearSub('2025/Mummi', years)).toEqual({ year: 2025, story: 'Mummi' })
    expect(parseYearSub('2026', years)).toEqual({ year: 2026, story: null })
  })
  it('falls back to the newest year and drops the story for unknown years', () => {
    expect(parseYearSub('2019/klubburinn', years)).toEqual({ year: 2026, story: null })
    expect(parseYearSub(null, years)).toEqual({ year: 2026, story: null })
  })
  it('returns a null year when there are no games', () => {
    expect(parseYearSub('2026', [])).toEqual({ year: null, story: null })
  })
})
