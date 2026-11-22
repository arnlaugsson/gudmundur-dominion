import { useMemo } from 'react'
import DATA from '../data'
import { computeLastGameFacts } from '../lib/lastGameFacts'
import { cardThumbUrl } from '../constants'
import { pressable } from '../lib/pressable'
import SeatResults from './SeatResults'
import { getRatings } from '../lib/ratings'
import { victoryLabel } from '../lib/icelandic'

const VICTORY_BADGE_CLASS = {
  Province: 'badge-province',
  Colony: 'badge-colony',
  'Supply piles': 'badge-supply',
}


// The priciest kingdom card makes the most striking backdrop art.
function pickArtCard(game, cards) {
  const costByName = new Map(cards.map(c => [c.name, (c.cost ?? 0) + (c.debt ? c.debt / 2 : 0)]))
  const names = (game.kingdom || []).map(k => k.card).filter(n => costByName.has(n))
  if (!names.length) return null
  return names.reduce((best, n) => (costByName.get(n) > costByName.get(best) ? n : best))
}

export default function LatestGameBox({ onGameNav }) {
  const { games, players, cards } = DATA

  const { latest, facts, artCard, rating } = useMemo(() => {
    if (!games.length) return { latest: null, facts: [] }
    const latest = games[games.length - 1]
    const facts = computeLastGameFacts(latest, games, players, cards)
    return { latest, facts, artCard: pickArtCard(latest, cards), rating: getRatings(games).byGame.get(latest.game_num) || null }
  }, [games, players, cards])

  if (!latest) return null

  return (
    <div
      className="chart-box latest-game-box"
      {...pressable(() => onGameNav?.(latest.game_num))}
    >
      {artCard && (
        <div className="latest-game-art" aria-hidden="true" style={{ backgroundImage: `url("${cardThumbUrl(artCard)}")` }} />
      )}
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
            {victoryLabel(latest.victory_type)}
          </span>
        )}
      </div>

      {/* Podium: one row per seat, with rating changes */}
      <div style={{ marginBottom: '.8rem' }}>
        <SeatResults game={latest} rating={rating} compact />
      </div>

      {/* Facts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {facts.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: '.55rem', alignItems: 'flex-start', fontSize: '.82rem', lineHeight: 1.4 }}>
            <span style={{ flexShrink: 0 }}>{f.icon}</span>
            <span>
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{f.title}</span>
              <span style={{ color: 'var(--dim)' }}>: {f.text}</span>
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
