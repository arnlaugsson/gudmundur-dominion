import CardImage from './CardImage'
import { pressable } from '../lib/pressable'
import { TYPE_COLOR } from '../lib/suggester'


export function CostBadge({ card }) {
  if (card.cost == null && !card.debt && !card.potion) return null
  if (card.debt) return <span className="coin debt">{card.debt}D</span>
  if (card.potion) return <><span className="coin">{card.cost ?? 0}</span><span className="coin potion">S</span></>
  return <span className="coin">{card.cost}</span>
}

export function KingdomCard({ card, attachedTrait, attachedHeirloom, baneOf, onClick }) {
  const highlight = attachedTrait ? 'kd-card-trait'
    : baneOf ? 'kd-card-bane'
    : attachedHeirloom ? 'kd-card-heirloom'
    : ''
  return (
    <div
      className={`kd-card${highlight ? ' ' + highlight : ''}`}
      {...pressable(onClick, card.name)}
    >
      <CardImage name={card.name} className="card-art" />
      <div style={{ padding: '.5rem .6rem' }}>
        <div className="kn" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
          {card.name}
          {card.isSecondEdition && <span className="tag tag-2nd">2nd Ed.</span>}
          {attachedTrait && <span className="trait-pill">✨ {attachedTrait.name}</span>}
          {attachedHeirloom && <span className="heirloom-pill">🎁 {attachedHeirloom}</span>}
          {baneOf && <span className="bane-pill">🧙 Bane</span>}
        </div>
        <div className="ke">{card.expansion}</div>
        <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
          <CostBadge card={card} />
          <span className="kt">{card.times_used}× notað</span>
        </div>
      </div>
    </div>
  )
}

export function ExtraCard({ card, onClick }) {
  const color = TYPE_COLOR[card.card_type] || 'var(--dim)'
  return (
    <div className="kd-card" {...pressable(onClick, card.name)}>
      <CardImage name={card.name} className="card-art" />
      <div style={{ padding: '.5rem .6rem' }}>
        <div className="kn">{card.name}</div>
        <div className="ke">{card.expansion}</div>
        <div style={{ fontSize: '.72rem', fontWeight: 600, color }}>{card.card_type}</div>
      </div>
    </div>
  )
}
