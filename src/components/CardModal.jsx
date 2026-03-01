import { useEffect } from 'react'
import { cardImgUrl, wikiUrl } from '../constants'
import DATA from '../data'

export default function CardModal({ card, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!card) return null

  const EXTRA_FIELDS = ['events', 'landmarks', 'projects', 'ways', 'allies', 'traits', 'prophecy']
  const gamesWithCard = DATA.games.filter(g =>
    g.kingdom.some(k => k.card === card.name) ||
    EXTRA_FIELDS.some(f => g[f]?.includes(card.name))
  )

  function costBadge() {
    if (card.debt) return <span className="coin debt">{card.debt}D</span>
    if (card.potion) return <><span className="coin">{card.cost ?? 0}</span><span className="coin potion">P</span></>
    return <span className="coin">{card.cost ?? 0}</span>
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-card-layout">
          <div className="modal-card-img-wrap">
            <img
              src={cardImgUrl(card.name)}
              alt={card.name}
              className="modal-card-img"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </div>
          <div className="modal-card-info">
            <h2 className="cinzel gold" style={{ fontSize: '1.4rem', marginBottom: '.5rem' }}>{card.name}</h2>
            <div style={{ fontSize: '.85rem', color: 'var(--dim)', marginBottom: '.75rem' }}>
              {card.expansion}
              {card.removed && <span className="tag tag-removed" style={{ marginLeft: '.5rem' }}>Removed</span>}
              {card.isSecondEdition && <span className="tag tag-2nd" style={{ marginLeft: '.5rem' }}>2nd Ed.</span>}
            </div>
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '.82rem', color: 'var(--dim)' }}>Verð:</span>
              {costBadge()}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.3rem' }}>Skipti spiluð</div>
              <div style={{ fontSize: '2rem', fontFamily: 'Cinzel, serif', color: 'var(--gold)' }}>{card.times_used}</div>
            </div>
            {gamesWithCard.length > 0 && (
              <div>
                <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>Nýlegir leikir</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', maxHeight: '160px', overflowY: 'auto' }}>
                  {gamesWithCard.slice(-6).reverse().map(g => (
                    <div key={g.game_num} style={{ fontSize: '.8rem', color: 'var(--text)', background: 'var(--bg3)', borderRadius: '4px', padding: '.3rem .6rem' }}>
                      <span style={{ color: 'var(--gold)' }}>#{g.game_num}</span>
                      <span style={{ color: 'var(--dim)', marginLeft: '.5rem' }}>{g.date}</span>
                      <span style={{ marginLeft: '.5rem' }}>{g.results[0]?.name}</span>
                      <span style={{ color: 'var(--dim)', marginLeft: '.25rem' }}>vann</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <a
              href={wikiUrl(card.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="wiki-link"
              style={{ marginTop: '1rem', display: 'inline-block' }}
            >
              Opna á Dominion Strategy Wiki ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
