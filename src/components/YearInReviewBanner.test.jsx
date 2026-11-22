import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import YearInReviewBanner, { reviewYearFor } from './YearInReviewBanner'

describe('reviewYearFor', () => {
  it('is the current year in Nov/Dec, last year in January, otherwise null', () => {
    expect(reviewYearFor(new Date(2026, 10, 22))).toBe(2026)
    expect(reviewYearFor(new Date(2026, 11, 31))).toBe(2026)
    expect(reviewYearFor(new Date(2027, 0, 15))).toBe(2026)
    expect(reviewYearFor(new Date(2027, 1, 1))).toBeNull()
  })
})

describe('YearInReviewBanner', () => {
  it('renders in season and hides out of season', () => {
    const { unmount } = render(<YearInReviewBanner now={new Date(2026, 11, 1)} />)
    expect(screen.getByRole('button', { name: /Árið 2026 er komið/ })).toBeInTheDocument()
    unmount()
    const { container } = render(<YearInReviewBanner now={new Date(2026, 5, 1)} />)
    expect(container).toBeEmptyDOMElement()
  })
})
