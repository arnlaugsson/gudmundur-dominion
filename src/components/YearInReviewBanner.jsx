import { pressable } from '../lib/pressable'

// Season for the year-in-review teaser: November through January.
const SEASON_MONTHS = new Set([10, 11, 0])

export function reviewYearFor(date) {
  if (!SEASON_MONTHS.has(date.getMonth())) return null
  return date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear()
}

export default function YearInReviewBanner({ now = new Date() }) {
  const year = reviewYearFor(now)
  if (!year) return null
  const open = () => { window.location.hash = `arid/${year}/klubburinn` }
  return (
    <div className="wrapped-banner" {...pressable(open)}>
      <span className="wrapped-banner-icon" aria-hidden="true">🎁</span>
      <span><b>Árið {year} er komið!</b> Sjáðu meistara, met og þitt eigið ár í spilum.</span>
      <span className="wrapped-banner-go" aria-hidden="true">▶</span>
    </div>
  )
}
