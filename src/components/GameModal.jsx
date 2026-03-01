import { useEffect, useState } from 'react'
import CardImage from './CardImage'
import CardModal from './CardModal'
import DATA from '../data'

const EXTRA_COLORS = { event: '#f97316', landmark: '#3fb950', project: '#58a6ff', way: '#a78bfa', ally: '#f43f5e', trait: '#06b6d4', prophecy: '#e879f9' }

export default function GameModal({ game, onClose }) {
  const [selectedCard, setSelectedCard] = useState(null)

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!game) return null

  function openCard(cardName) {
    const card = DATA.cards.find(c => c.name === cardName) || { name: cardName, expansion: null, cost: null, times_used: 0 }
    setSelectedCard(card)
  }

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
    <>
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-game" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div style={{ marginBottom: '1.25rem' }}>
          <h2 className="cinzel gold" style={{ fontSize: '1.3rem', marginBottom: '.3rem' }}>
            Leikur #{game.game_num}
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
          <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>Niðurstöður</div>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            {game.results.map(r => (
              <div key={r.place} style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <span className={`rank-${r.place}`} style={{ fontFamily: 'Cinzel, serif', fontWeight: 700 }}>
                  {r.place === 1 ? '🥇' : r.place === 2 ? '🥈' : r.place === 3 ? '🥉' : `${r.place}th`}
                </span>
                <span style={{ fontSize: '.88rem' }}>{r.name}</span>
                {r.score != null && <span style={{ fontSize: '.8rem', color: 'var(--gold)' }}>{r.score}stig</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Kingdom Cards — images load only when modal is open */}
        {game.kingdom.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>
              Ríki ({game.kingdom.length} spil)
            </div>
            <div className="kingdom-cards-grid">
              {game.kingdom.map(k => (
                <div
                  key={k.card}
                  className="kingdom-card-thumb"
                  title={k.card}
                  onClick={() => openCard(k.card)}
                  style={{ cursor: 'pointer' }}
                >
                  <CardImage name={k.card} className="kingdom-card-img" loading="eager" />
                  <div className="kingdom-card-name">{k.card}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extras */}
        {extras.length > 0 && (
          <div>
            <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>Aukaleg ({extras.length})</div>
            <div className="kingdom-cards-grid">
              {extras.map(ex => (
                <div
                  key={ex.label}
                  className="kingdom-card-thumb"
                  title={ex.label}
                  onClick={() => openCard(ex.label)}
                  style={{ cursor: 'pointer' }}
                >
                  <CardImage name={ex.label} className="kingdom-card-img" loading="eager" />
                  <div className="kingdom-card-name" style={{ color: EXTRA_COLORS[ex.type] || 'var(--dim)' }}>{ex.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {selectedCard && (
      <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
    )}
  </>
  )
}
