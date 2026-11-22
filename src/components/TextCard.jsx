import { getCard } from '../lib/cardIndex'
import { TYPE_COLOR } from '../lib/suggester'

const LANDSCAPE_TYPES = new Set(['Event', 'Landmark', 'Project', 'Way', 'Ally', 'Trait', 'Prophecy'])

function costText(card) {
  if (!card) return null
  if (card.debt) return `${card.debt}D`
  if (card.cost == null) return null
  return card.potion ? `${card.cost}P` : String(card.cost)
}

// Stand-in for a card whose scan is missing: name, type, cost and rules text
// laid out like a small card, so it still reads well in grids and kingdoms.
export default function TextCard({ name, className = '', style = {} }) {
  const card = getCard(name)
  const type = card?.card_type && card.card_type !== 'Kingdom' ? card.card_type : null
  const landscape = type && LANDSCAPE_TYPES.has(type)
  const cost = costText(card)
  return (
    <div
      className={`card-image-fallback text-card${landscape ? ' landscape' : ''} ${className}`}
      style={{ ...style, '--type-color': TYPE_COLOR[type] || 'var(--gold)' }}
      role="img"
      aria-label={name}
      title={`Engin mynd til af ${name}`}
    >
      <span className="text-card-head">
        <span className="text-card-name">{name}</span>
        {cost && <span className="coin">{cost}</span>}
      </span>
      {card?.card_text && <span className="text-card-text">{card.card_text}</span>}
      <span className="text-card-foot">{type || card?.expansion || ''}</span>
    </div>
  )
}
