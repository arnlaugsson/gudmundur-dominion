import { useMemo } from 'react'
import DATA from '../data'
import CardImage from './CardImage'

const EXTRA_FIELDS = ['events', 'landmarks', 'projects', 'ways', 'allies', 'traits', 'prophecy']

const LABELS = {
  played: 'Handahófskennt spil',
  unplayed: 'Óspilað spil',
}

export default function RandomCardBox({ pool, onCardClick, onGameClick }) {
  const { games, cards } = DATA

  const { card, recentGames } = useMemo(() => {
    const filter = pool === 'unplayed'
      ? c => !c.isSupplyCard && !c.removed && c.times_used === 0
      : c => !c.isSupplyCard && !c.removed && c.times_used > 0
    const candidates = cards.filter(filter)
    if (candidates.length === 0) return { card: null, recentGames: [] }
    const card = candidates[Math.floor(Math.random() * candidates.length)]
    if (pool === 'unplayed') return { card, recentGames: [] }
    const using = games.filter(g =>
      g.kingdom.some(k => k.card === card.name) ||
      EXTRA_FIELDS.some(f => g[f]?.includes(card.name))
    )
    return { card, recentGames: [...using].slice(-5).reverse() }
  }, [games, cards, pool])

  // Empty state for unplayed pool
  if (!card && pool === 'unplayed') {
    return (
      <div className="chart-box">
        <div style={{ fontSize: '.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>
          {LABELS.unplayed}
        </div>
        <div style={{ fontSize: '.85rem', color: 'var(--dim)', textAlign: 'center', padding: '1.5rem 0' }}>
          Allt spilað! 🎉
        </div>
      </div>
    )
  }
  if (!card) return null

  const usageText = pool === 'played'
    ? `${card.times_used}× spiluð (${games.length > 0 ? Math.round(card.times_used / games.length * 100) : 0}%)`
    : null

  const hasCost = card.cost != null || card.debt != null || card.potion
  const renderCost = () => {
    if (card.debt) return <span className="coin debt">{card.debt}D</span>
    if (card.potion) return <><span className="coin">{card.cost ?? 0}</span><span className="coin potion">S</span></>
    return <span className="coin">{card.cost}</span>
  }

  const cardTextSnippet = card.card_text
    ? (card.card_text.length > 150 ? card.card_text.slice(0, 150) + '…' : card.card_text)
    : null

  return (
    <div className="chart-box">
      <div style={{ fontSize: '.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>
        {LABELS[pool]}
      </div>

      <div style={{ display: 'flex', gap: '.85rem', alignItems: 'flex-start' }}>
        <div
          style={{ flexShrink: 0, width: 60, borderRadius: 6, overflow: 'hidden', background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer' }}
          onClick={() => onCardClick?.(card)}
        >
          <CardImage name={card.name} style={{ width: '100%', display: 'block' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--gold)', cursor: 'pointer' }}
            onClick={() => onCardClick?.(card)}
          >
            {card.name}
            {card.card_type && card.card_type !== 'Kingdom' && (
              <span className={`badge badge-${card.card_type.toLowerCase()}`} style={{ marginLeft: '.4rem', fontSize: '.6rem', verticalAlign: 'middle', padding: '.1rem .35rem' }}>
                {card.card_type}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem .8rem', marginTop: '.2rem', alignItems: 'center' }}>
            <span style={{ fontSize: '.75rem', color: 'var(--dim)' }}>{card.expansion}</span>
            {hasCost && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.2rem' }}>{renderCost()}</span>}
            {usageText && <span style={{ fontSize: '.75rem', color: 'var(--dim)' }}>{usageText}</span>}
            {pool === 'unplayed' && <span style={{ fontSize: '.75rem', color: 'var(--dim)', fontStyle: 'italic' }}>Aldrei spilað</span>}
          </div>
        </div>
      </div>

      {cardTextSnippet && (
        <div style={{ fontSize: '.78rem', color: 'var(--dim)', lineHeight: 1.5, borderLeft: '2px solid var(--gold)', paddingLeft: '.6rem', marginTop: '.6rem' }}>
          {cardTextSnippet}
        </div>
      )}

      {pool === 'played' && recentGames.length > 0 && (
        <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap', marginTop: '.6rem' }}>
          {recentGames.map(g => (
            <span
              key={g.game_num}
              style={{ fontSize: '.72rem', background: 'var(--bg3)', borderRadius: '4px', padding: '.2rem .5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onClick={() => onGameClick?.(g)}
            >
              <span style={{ color: 'var(--gold)' }}>#{g.game_num}</span>{' '}
              <span style={{ color: 'var(--dim)' }}>{g.date}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
