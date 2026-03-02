import { useState, useMemo } from 'react'
import CardImage from '../components/CardImage'
import CardModal from '../components/CardModal'
import DATA from '../data'

const MODES = [
  { id: 'random',    icon: '🎲', name: 'Hrein tilviljun', desc: 'Algjörlega handahófskennt ríki' },
  { id: 'least',     icon: '🦗', name: 'Gleymdu kortin',  desc: 'Kortin sem eru sjaldnast í ríkinu' },
  { id: 'favorites', icon: '⭐', name: 'Uppáhald allra',  desc: 'Vinsælustu kortin í sögu klúbbsins' },
  { id: 'balanced',  icon: '⚖️', name: 'Jafnvægt',        desc: 'Blanda af nýjum og kunnuglegum kortum' },
]

const SPECIAL_TYPES = new Set(['Event', 'Landmark', 'Project', 'Way', 'Ally', 'Trait', 'Prophecy'])

const TYPE_COLOR = {
  Event: '#f97316', Landmark: '#3fb950', Project: '#58a6ff',
  Way: '#a78bfa', Ally: '#f43f5e', Trait: '#06b6d4', Prophecy: '#e879f9',
}

function CostBadge({ card }) {
  if (card.debt) return <span className="coin debt">{card.debt}D</span>
  if (card.potion) return <><span className="coin">{card.cost ?? 0}</span><span className="coin potion">P</span></>
  return <span className="coin">{card.cost ?? 0}</span>
}

function KingdomCard({ card, onClick }) {
  return (
    <div className="kd-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <CardImage name={card.name} className="card-art" />
      <div style={{ padding: '.5rem .6rem' }}>
        <div className="kn" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
          {card.name}
          {card.isSecondEdition && <span className="tag tag-2nd">2nd Ed.</span>}
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

function ExtraCard({ card, onClick }) {
  const color = TYPE_COLOR[card.card_type] || 'var(--dim)'
  return (
    <div className="kd-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <CardImage name={card.name} className="card-art" />
      <div style={{ padding: '.5rem .6rem' }}>
        <div className="kn">{card.name}</div>
        <div className="ke">{card.expansion}</div>
        <div style={{ fontSize: '.72rem', fontWeight: 600, color }}>{card.card_type}</div>
      </div>
    </div>
  )
}

export default function Suggester() {
  const { cards, expansions } = DATA
  const [mode, setMode] = useState('random')
  const [selectedExps, setSelectedExps] = useState([])
  const [kingdom, setKingdom] = useState([])
  const [extras, setExtras] = useState([])
  const [colonyPlatinum, setColonyPlatinum] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)

  const toggleExp = (e) => {
    setSelectedExps(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])
  }

  const kingdomExpansions = useMemo(() => {
    if (!expansions.length) return []
    return expansions.filter(e => e !== 'Promo')
  }, [expansions])

  function generate() {
    // Kingdom cards only
    const kingdomPool = cards.filter(c =>
      !c.removed &&
      !c.isSupplyCard &&
      (!c.card_type || c.card_type === 'Kingdom') &&
      (selectedExps.length === 0 || selectedExps.includes(c.expansion))
    )

    // Special/landscape cards as extras
    const extrasPool = cards.filter(c =>
      !c.removed &&
      SPECIAL_TYPES.has(c.card_type) &&
      (selectedExps.length === 0 || selectedExps.includes(c.expansion))
    )

    let candidates = [...kingdomPool]

    if (mode === 'least') {
      candidates.sort((a, b) => a.times_used - b.times_used)
      candidates = candidates.slice(0, 20)
    } else if (mode === 'favorites') {
      candidates.sort((a, b) => b.times_used - a.times_used)
      candidates = candidates.slice(0, 30)
    } else if (mode === 'balanced') {
      const half = Math.floor(candidates.length / 2)
      const leastUsed = [...candidates].sort((a, b) => a.times_used - b.times_used).slice(0, half)
      const mostUsed = [...candidates].sort((a, b) => b.times_used - a.times_used).slice(0, half)
      candidates = [...leastUsed.slice(0, 15), ...mostUsed.slice(0, 15)]
    }

    // Always 10 kingdom cards
    const newKingdom = [...candidates].sort(() => Math.random() - 0.5).slice(0, 10)

    // 1-2 extras if the pool has any
    let newExtras = []
    if (extrasPool.length > 0) {
      const count = extrasPool.length === 1 ? 1 : Math.random() < 0.5 ? 1 : 2
      newExtras = [...extrasPool].sort(() => Math.random() - 0.5).slice(0, count)
    }

    // Colony + Platinum: 10% chance per Prosperity kingdom card
    const prosperityCount = newKingdom.filter(c => c.expansion === 'Prosperity').length
    const newColony = Math.random() < prosperityCount / 10

    setKingdom(newKingdom)
    setExtras(newExtras)
    setColonyPlatinum(newColony)
  }

  const colonyCard = useMemo(() => cards.find(c => c.name === 'Colony'), [cards])
  const platinumCard = useMemo(() => cards.find(c => c.name === 'Platinum'), [cards])

  return (
    <section className="section active">
      <h2 className="section-title">Ríkistillögur</h2>

      <div className="sug-section">
        <h3>TEGUND TILLÖGU</h3>
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
        <h3>VIÐBÆTUR <span style={{ color: 'var(--dim)', fontWeight: 400, textTransform: 'none' }}>— skildu eftir ómerkt til að nota allar</span></h3>
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

      <button className="gen-btn" onClick={generate}>Búa til ríki</button>

      {kingdom.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>

          {/* 10 Kingdom Cards */}
          <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>
            Ríkið — {kingdom.length} spil
          </div>
          <div className="kingdom-display">
            {kingdom.map(card => (
              <KingdomCard key={card.name} card={card} onClick={() => setSelectedCard(card)} />
            ))}
          </div>

          {/* Extras */}
          {extras.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>
                Aukaleg — {extras.length} {extras.length === 1 ? 'spil' : 'spil'}
              </div>
              <div className="kingdom-display">
                {extras.map(card => (
                  <ExtraCard key={card.name} card={card} onClick={() => setSelectedCard(card)} />
                ))}
              </div>
            </div>
          )}

          {/* Colony + Platinum */}
          {colonyPlatinum && colonyCard && platinumCard && (
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>
                Velmegun — Colony &amp; Platinum
              </div>
              <div className="kingdom-display">
                {[colonyCard, platinumCard].map(card => (
                  <KingdomCard key={card.name} card={card} onClick={() => setSelectedCard(card)} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {selectedCard && (
        <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </section>
  )
}
