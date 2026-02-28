import { useEffect } from 'react'
import CardImage from './CardImage'
import { wikiUrl } from '../constants'

export default function GameModal({ game, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!game) return null

  const extras = [
    ...game.events.map(e => ({ label: e, type: 'event' })),
    ...game.landmarks.map(e => ({ label: e, type: 'landmark' })),
    ...game.projects.map(e => ({ label: e, type: 'project' })),
    ...game.ways.map(e => ({ label: e, type: 'way' })),
    ...game.allies.map(e => ({ label: e, type: 'ally' })),
    ...game.traits.map(e => ({ label: e, type: 'trait' })),
    ...(game.prophecy || []).map(e => ({ label: e, type: 'prophecy' })),
  ]

  const victoryBadgeClass = {
    Province: 'badge-province',
    Colony: 'badge-colony',
    'Supply piles': 'badge-supply',
  }[game.victory_type] || 'badge-province'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-game" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div style={{ marginBottom: '1.25rem' }}>
          <h2 className="cinzel gold" style={{ fontSize: '1.3rem', marginBottom: '.3rem' }}>
            Game #{game.game_num}
          </h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '.85rem', color: 'var(--dim)' }}>
            <span>{game.date}</span>
            <span>{game.location}</span>
            {game.victory_type && (
              <span className={`badge ${victoryBadgeClass}`}>{game.victory_type}</span>
            )}
          </div>
        </div>

        {/* Results */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>Results</div>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            {game.results.map(r => (
              <div key={r.place} style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <span className={`rank-${r.place}`} style={{ fontFamily: 'Cinzel, serif', fontWeight: 700 }}>
                  {r.place === 1 ? '🥇' : r.place === 2 ? '🥈' : r.place === 3 ? '🥉' : `${r.place}th`}
                </span>
                <span style={{ fontSize: '.88rem' }}>{r.name}</span>
                {r.score != null && <span style={{ fontSize: '.8rem', color: 'var(--gold)' }}>{r.score}pts</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Kingdom Cards — images load only when modal is open */}
        {game.kingdom.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>
              Kingdom ({game.kingdom.length} cards)
            </div>
            <div className="kingdom-cards-grid">
              {game.kingdom.map(k => (
                <a
                  key={k.card}
                  href={wikiUrl(k.card)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kingdom-card-thumb"
                  title={k.card}
                >
                  <CardImage name={k.card} className="kingdom-card-img" loading="eager" />
                  <div className="kingdom-card-name">{k.card}</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Extras */}
        {extras.length > 0 && (
          <div>
            <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>Extras</div>
            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
              {extras.map(ex => (
                <span key={ex.label} className={`kchip kchip-${ex.type}`}>{ex.label}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
