import { useMemo } from 'react'
import DATA from '../data'
import { computeLastGameFacts } from '../lib/lastGameFacts'

const VICTORY_BADGE_CLASS = {
  Province: 'badge-province',
  Colony: 'badge-colony',
  'Supply piles': 'badge-supply',
}

// Keycap emojis (4️⃣ etc.) match the medal glyph metrics so podium rows align vertically.
const PLACE_ICON = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '4️⃣', 5: '5️⃣', 6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣' }

export default function LatestGameBox({ onGameNav }) {
  const { games, players, cards } = DATA

  const { latest, facts } = useMemo(() => {
    if (!games.length) return { latest: null, facts: [] }
    const latest = games[games.length - 1]
    const facts = computeLastGameFacts(latest, games, players, cards)
    return { latest, facts }
  }, [games, players, cards])

  if (!latest) return null

  return (
    <div
      className="chart-box latest-game-box"
      onClick={() => onGameNav?.(latest.game_num)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGameNav?.(latest.game_num) } }}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ fontSize: '.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>
        Síðasti leikur
      </div>

      {/* Header: # · date · location · victory */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6rem', alignItems: 'center', marginBottom: '.6rem' }}>
        <span className="cinzel gold" style={{ fontSize: '1.1rem' }}>#{latest.game_num}</span>
        {latest.date && <span style={{ fontSize: '.78rem', color: 'var(--dim)' }}>{latest.date}</span>}
        {latest.location && <span style={{ fontSize: '.78rem', color: 'var(--dim)' }}>{latest.location}</span>}
        {latest.victory_type && (
          <span className={`badge ${VICTORY_BADGE_CLASS[latest.victory_type] || 'badge-province'}`}>
            {latest.victory_type}
          </span>
        )}
      </div>

      {/* Podium */}
      {latest.results?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem .8rem', marginBottom: '.8rem', fontSize: '.82rem' }}>
          {latest.results.map(r => (
            <span key={r.place}>
              <span style={{ color: r.place === 1 ? 'var(--gold)' : 'var(--dim)' }}>
                {PLACE_ICON[r.place] || `${r.place}.`}
              </span>
              {' '}
              <span>{r.name}</span>
              {r.score != null && <span style={{ color: 'var(--dim)', marginLeft: '.3rem' }}>{r.score}stig</span>}
            </span>
          ))}
        </div>
      )}

      {/* Facts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {facts.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: '.55rem', alignItems: 'flex-start', fontSize: '.82rem', lineHeight: 1.4 }}>
            <span style={{ flexShrink: 0 }}>{f.icon}</span>
            <span>
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{f.title}</span>
              <span style={{ color: 'var(--dim)' }}> — {f.text}</span>
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '.85rem', fontSize: '.72rem', color: 'var(--dim)', textAlign: 'right' }}>
        Sjá leikinn →
      </div>
    </div>
  )
}
