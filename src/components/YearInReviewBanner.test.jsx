import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
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
    const { unmount } = render(<YearInReviewBanner isMember years={[2026]} now={new Date(2026, 11, 1)} />)
    expect(screen.getByRole('button', { name: /Árið 2026 er komið/ })).toBeInTheDocument()
    unmount()
    const { container } = render(<YearInReviewBanner years={[2026]} now={new Date(2026, 5, 1)} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('hides when the review year has no games', () => {
    const { container } = render(<YearInReviewBanner years={[2026]} now={new Date(2027, 10, 20)} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('YearInReviewBanner for guests', () => {
  it('asks guests to sign in and calls onLogin when pressed', () => {
    const onLogin = vi.fn()
    render(<YearInReviewBanner isMember={false} onLogin={onLogin} years={[2026]} now={new Date(2026, 10, 22)} />)
    const banner = screen.getByRole('button', { name: /Skráðu þig inn/ })
    fireEvent.click(banner)
    expect(onLogin).toHaveBeenCalled()
  })

  it('follows the same season as the members banner', () => {
    const { container } = render(<YearInReviewBanner isMember={false} onLogin={() => {}} years={[2026]} now={new Date(2026, 5, 1)} />)
    expect(container).toBeEmptyDOMElement()
  })
})
