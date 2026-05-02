import { useEffect, useState, useMemo } from 'react'
import CardImage from './CardImage'
import CardModal from './CardModal'
import MemorySection from './MemorySection'
import MemoryEditor from './MemoryEditor'
import DATA from '../data'
import { detectSidePiles, detectHeirlooms } from '../lib/sidePiles'

const EXTRA_COLORS = { event: '#f97316', landmark: '#3fb950', project: '#58a6ff', way: '#a78bfa', ally: '#f43f5e', trait: '#06b6d4', prophecy: '#e879f9' }

export default function GameModal({ game, memories, onClose, onMemorySaved }) {
  const [selectedCard, setSelectedCard] = useState(null)
  const [editing, setEditing] = useState(false)

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
    ...game.traits.map(t => ({ label: t.name, type: 'trait', attachedCard: t.card || null })),
    ...(game.prophecy || []).map(e => ({ label: e, type: 'prophecy' })),
  ]

  // Side pieces implied by the kingdom (Loots, Spoils, Boons, Heirlooms, ...).
  // Resolve each kingdom name to its full card object so card_text is available
  // for regex detection (Loot, Spoils, Ruins, Imps, Spirits, Wishes).
  const { sidePiles, heirlooms } = useMemo(() => {
    const cardByName = new Map(DATA.cards.map(c => [c.name, c]))
    const kingdomCards = game.kingdom.map(k => cardByName.get(k.card)).filter(Boolean)
    const extraCards = [
      ...game.events,
      ...game.landmarks,
      ...game.projects,
      ...game.ways,
      ...game.allies,
      ...game.traits.map(t => t.name),
      ...(game.prophecy || []),
    ].map(n => cardByName.get(n)).filter(Boolean)
    return {
      sidePiles: detectSidePiles(kingdomCards, extraCards),
      heirlooms: detectHeirlooms(kingdomCards),
    }
  }, [game])

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
              {game.kingdom.map(k => {
                const trait = game.traits.find(t => t.card === k.card)
                const heirloom = heirlooms.find(h => h.kingdomCard === k.card)?.heirloom
                const cls = trait ? 'kingdom-card-trait' : heirloom ? 'kingdom-card-heirloom' : ''
                const title = trait ? `${k.card} — Trait: ${trait.name}` : heirloom ? `${k.card} — Heirloom: ${heirloom}` : k.card
                return (
                  <div
                    key={k.card}
                    className={`kingdom-card-thumb${cls ? ' ' + cls : ''}`}
                    title={title}
                    onClick={() => openCard(k.card)}
                    style={{ cursor: 'pointer' }}
                  >
                    <CardImage name={k.card} className="kingdom-card-img" loading="eager" />
                    <div className="kingdom-card-name">{k.card}</div>
                    {trait && <div className="trait-pill">✨ {trait.name}</div>}
                    {heirloom && !trait && <div className="heirloom-pill">🎁 {heirloom}</div>}
                  </div>
                )
              })}
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
                  title={ex.attachedCard ? `${ex.label} → ${ex.attachedCard}` : ex.label}
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

        {/* Side piles implied by kingdom (Loots, Spoils, Boons, Hexes, ...) */}
        {sidePiles.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>Aukabunkar ({sidePiles.length})</div>
            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
              {sidePiles.map(p => (
                <span key={p.pile} className="side-pile-chip">
                  <span className="side-pile-icon">{p.icon}</span>
                  {p.pile}
                </span>
              ))}
            </div>
          </div>
        )}
        {editing ? (
          <MemoryEditor
            game={game}
            existingMemory={memories?.[0] || null}
            onSave={() => {
              setEditing(false)
              onMemorySaved?.()
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <MemorySection memories={memories} onEdit={() => setEditing(true)} />
        )}
      </div>
    </div>

    {selectedCard && (
      <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
    )}
  </>
  )
}
