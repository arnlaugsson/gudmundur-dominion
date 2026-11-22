import { useState, useEffect } from 'react'
import CardImage from '../CardImage'
import { MONTHS_SHORT } from '../../lib/icelandic'

export function Slide({ kicker, big, headline, children, tone = 'gold' }) {
  return (
    <div className={`slide slide-${tone}`}>
      {kicker && <div className="slide-kicker">{kicker}</div>}
      {big != null && <div className="slide-big">{big}</div>}
      {headline && <h2 className="slide-headline">{headline}</h2>}
      {children}
    </div>
  )
}

export function Sub({ children }) {
  return <p className="slide-sub">{children}</p>
}

// Change vs last year, e.g. "▲ +3 frá 2025". Pass before={null} when there
// is no baseline (0 is a real baseline, e.g. a winless year).
export function Delta({ now, before, unit = '', yearBefore }) {
  if (before == null) return null
  const diff = Math.round((now - before) * 10) / 10
  if (diff === 0) return <span className="delta">Sama og {yearBefore}</span>
  const up = diff > 0
  return (
    <span className={`delta ${up ? 'delta-up' : 'delta-down'}`}>
      {up ? '▲ +' : '▼ −'}{Math.abs(diff)}{unit} frá {yearBefore}
    </span>
  )
}

export function MonthBars({ counts, highlight }) {
  const max = Math.max(1, ...counts)
  return (
    <div className="month-bars" role="img" aria-label={counts.map((c, i) => `${MONTHS_SHORT[i]}: ${c}`).join(', ')}>
      {counts.map((c, i) => (
        <div key={MONTHS_SHORT[i]} className={`month-bar${i === highlight ? ' hot' : ''}`}>
          <span className="month-bar-fill" style={{ height: `${(c / max) * 100}%` }} />
          <span className="month-bar-label">{MONTHS_SHORT[i]}</span>
        </div>
      ))}
    </div>
  )
}

export function CardStrip({ items }) {
  return (
    <div className="card-strip">
      {items.map(item => (
        <figure key={item.name}>
          <CardImage name={item.name} className="card-strip-img" />
          <figcaption>{item.name}{item.count != null && <span> · {item.count}×</span>}</figcaption>
        </figure>
      ))}
    </div>
  )
}

export function PlaceBars({ places }) {
  const max = Math.max(1, ...places)
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="place-bars">
      {places.map((count, i) => (
        <div key={i} className="place-bar">
          <span className="place-bar-label">{medals[i] || `${i + 1}.`}</span>
          <span className="place-bar-track"><span style={{ width: `${(count / max) * 100}%` }} /></span>
          <span className="place-bar-count">{count}</span>
        </div>
      ))}
    </div>
  )
}

const FEEDBACK_MS = 2500

const SHARE_LABELS = {
  idle: '↗ Deila mynd',
  working: 'Bý til mynd…',
  downloaded: '✓ Mynd vistuð og hlekkur afritaður',
  failed: 'Tókst ekki að deila',
}

// Shares a story image (see lib/shareCard + lib/share).
export function ShareButton({ url, text, card, fileName }) {
  const [state, setState] = useState('idle')
  useEffect(() => {
    if (state === 'idle' || state === 'working') return undefined
    const timer = setTimeout(() => setState('idle'), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [state])
  const share = async () => {
    setState('working')
    try {
      const [{ shareStory }, { renderShareCard }] = await Promise.all([import('../../lib/share'), import('../../lib/shareCard')])
      const result = await shareStory({ url, text, fileName, render: () => renderShareCard(card) })
      setState(result === 'downloaded' ? 'downloaded' : 'idle')
    } catch (err) {
      console.error('Share failed:', err)
      setState('failed')
    }
  }
  return (
    <button className="story-cta" onClick={share} disabled={state === 'working'} aria-live="polite">
      {SHARE_LABELS[state]}
    </button>
  )
}
