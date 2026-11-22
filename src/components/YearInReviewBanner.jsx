import { pressable } from '../lib/pressable'

// Season for the year-in-review teaser: November through January.
const SEASON_MONTHS = new Set([10, 11, 0])

export function reviewYearFor(date) {
  if (!SEASON_MONTHS.has(date.getMonth())) return null
  return date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear()
}

// `years` = years that have games; no teaser for a year with nothing to show.
// Members open the club story; guests are asked to sign in first.
export default function YearInReviewBanner({ years, isMember, onLogin, now = new Date() }) {
  const year = reviewYearFor(now)
  if (!year || !years.includes(year)) return null
  if (!isMember) {
    return (
      <div className="wrapped-banner" {...pressable(() => onLogin?.())}>
        <span className="wrapped-banner-icon" aria-hidden="true">🔑</span>
        <span><b>Árið {year} er komið!</b> Skráðu þig inn til að sjá árið þitt í tölum.</span>
        <span className="wrapped-banner-go">Innskrá</span>
      </div>
    )
  }
  const open = () => { window.location.hash = `arid/${year}/klubburinn` }
  return (
    <div className="wrapped-banner" {...pressable(open)}>
      <span className="wrapped-banner-icon" aria-hidden="true">🎁</span>
      <span><b>Árið {year} er komið!</b> Sjáðu meistara, met og þitt eigið ár í spilum.</span>
      <span className="wrapped-banner-go" aria-hidden="true">▶</span>
    </div>
  )
}
