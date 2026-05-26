const rtf = new Intl.RelativeTimeFormat('is', { numeric: 'auto' })

const UNITS = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
]

export function formatRelative(date) {
  if (!date) return null
  const diff = date.getTime() - Date.now()
  const abs = Math.abs(diff)
  if (abs < 60 * 1000) return 'rétt í þessu'
  for (const { unit, ms } of UNITS) {
    if (abs >= ms) {
      return rtf.format(Math.round(diff / ms), unit)
    }
  }
  return rtf.format(Math.round(diff / 1000), 'second')
}

export function formatAbsolute(date) {
  if (!date) return null
  return date.toLocaleString('is-IS', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
