import { useState, useMemo } from 'react'
import CardImage from '../components/CardImage'
import CardModal from '../components/CardModal'
import DATA from '../data'

const MODES = [
  { id: 'random', icon: '🎲', name: 'Pure Random', desc: 'Completely random kingdom' },
  { id: 'least', icon: '🦗', name: 'Forgotten Cards', desc: 'Cards least often in the kingdom' },
  { id: 'favorites', icon: '⭐', name: 'Fan Favorites', desc: 'Most beloved cards from history' },
  { id: 'balanced', icon: '⚖️', name: 'Balanced', desc: 'Mix of new and familiar cards' },
]

function CostBadge({ card }) {
  if (card.debt) return <span className="coin debt">{card.debt}D</span>
  if (card.potion) return <><span className="coin">{card.cost ?? 0}</span><span className="coin potion">P</span></>
  return <span className="coin">{card.cost ?? 0}</span>
}

export default function Suggester() {
  const { cards, expansions } = DATA
  const [mode, setMode] = useState('random')
  const [selectedExps, setSelectedExps] = useState([])
  const [kingdom, setKingdom] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)

  const toggleExp = (e) => {
    setSelectedExps(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])
  }

  const kingdomExpansions = useMemo(() => {
    if (!expansions.length) return []
    // Exclude promo and special expansions from default list
    return expansions.filter(e => e !== 'Promo')
  }, [expansions])

  function generate() {
    const pool = cards.filter(c =>
      !c.removed &&
      !c.isSupplyCard &&
      (selectedExps.length === 0 || selectedExps.includes(c.expansion))
    )

    let candidates = [...pool]

    if (mode === 'least') {
      candidates.sort((a, b) => a.times_used - b.times_used)
      candidates = candidates.slice(0, 20) // pick from bottom 20
    } else if (mode === 'favorites') {
      candidates.sort((a, b) => b.times_used - a.times_used)
      candidates = candidates.slice(0, 30) // pick from top 30
    } else if (mode === 'balanced') {
      const half = Math.floor(candidates.length / 2)
      const leastUsed = [...candidates].sort((a, b) => a.times_used - b.times_used).slice(0, half)
      const mostUsed = [...candidates].sort((a, b) => b.times_used - a.times_used).slice(0, half)
      candidates = [...leastUsed.slice(0, 15), ...mostUsed.slice(0, 15)]
    }

    // Shuffle and pick 10
    const shuffled = candidates.sort(() => Math.random() - 0.5)
    setKingdom(shuffled.slice(0, 10))
  }

  const kingdomExtras = useMemo(() => {
    if (!kingdom.length) return { events: [], landmarks: [], projects: [] }
    // Suggest extras with some probability
    return { events: [], landmarks: [], projects: [] }
  }, [kingdom])

  return (
    <section className="section active">
      <h2 className="section-title">Kingdom Suggester</h2>

      <div className="sug-section">
        <h3>SUGGESTION MODE</h3>
        <div className="mode-grid">
          {MODES.map(m => (
            <button key={m.id} className={`mode-card${mode === m.id ? ' selected' : ''}`} onClick={() => setMode(m.id)}>
              <div className="mi">{m.icon}</div>
              <div className="mn">{m.name}</div>
              <div className="md">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="sug-section">
        <h3>EXPANSIONS <span style={{ color: 'var(--dim)', fontWeight: 400, textTransform: 'none' }}>— leave all unchecked for any</span></h3>
        <div className="exp-checkboxes">
          {kingdomExpansions.map(e => (
            <label key={e} className="exp-check">
              <input
                type="checkbox"
                checked={selectedExps.includes(e)}
                onChange={() => toggleExp(e)}
              />
              <span>{e}</span>
            </label>
          ))}
        </div>
      </div>

      <button className="gen-btn" onClick={generate}>Generate Kingdom</button>

      {kingdom.length > 0 && (
        <div>
          <div className="kingdom-display" style={{ marginTop: '1.5rem' }}>
            {kingdom.map(card => (
              <div
                key={card.name}
                className="kd-card"
                onClick={() => setSelectedCard(card)}
                style={{ cursor: 'pointer' }}
              >
                <CardImage name={card.name} className="card-art" />
                <div style={{ padding: '.5rem .6rem' }}>
                  <div className="kn" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
                    {card.name}
                    {card.isSecondEdition && <span className="tag tag-2nd">2nd Ed.</span>}
                  </div>
                  <div className="ke">{card.expansion}</div>
                  <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                    <CostBadge card={card} />
                    <span className="kt">{card.times_used}x used</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedCard && (
        <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </section>
  )
}
