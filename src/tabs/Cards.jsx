import { useState, useMemo } from 'react'
import CardImage from '../components/CardImage'
import CardModal from '../components/CardModal'
import DATA from '../data'

// Landscape card types (Events, Landmarks, Projects, Ways, Allies, Traits, Prophecy)
// Loots are portrait-facing cards; the rest are landscape-oriented
const LANDSCAPE_TYPES = new Set(['Event','Landmark','Project','Way','Ally','Trait','Prophecy'])

function CostBadge({ card }) {
  if (card.debt) return <span className="coin debt">{card.debt}D</span>
  if (card.potion) return <><span className="coin">{card.cost ?? 0}</span><span className="coin potion">P</span></>
  if (card.cost === 0 && LANDSCAPE_TYPES.has(card.card_type)) return null
  return <span className="coin">{card.cost ?? 0}</span>
}

const TYPE_COLORS = {
  Event:    '#f97316',
  Landmark: '#3fb950',
  Project:  '#58a6ff',
  Way:      '#a78bfa',
  Ally:     '#f43f5e',
  Trait:    '#06b6d4',
  Prophecy: '#e879f9',
  Loot:     '#c9a84c',
}

function TypeBadge({ type }) {
  if (!type || type === 'Kingdom') return null
  const color = TYPE_COLORS[type] || 'var(--dim)'
  return (
    <span style={{
      display: 'inline-block', padding: '.12rem .4rem', borderRadius: '4px',
      fontSize: '.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em',
      background: color + '22', color, border: `1px solid ${color}44`,
    }}>{type}</span>
  )
}

function usageDotClass(times) {
  if (times === 0) return 'usage-zero'
  if (times <= 2) return 'usage-low'
  if (times <= 6) return 'usage-mid'
  return 'usage-high'
}

function costSortKey(card) {
  if (card.debt) return [2, card.debt]
  if (card.potion) return [1, card.cost ?? 0]
  return [0, card.cost ?? 0]
}

function compareCost(a, b) {
  const [ga, va] = costSortKey(a)
  const [gb, vb] = costSortKey(b)
  if (ga !== gb) return ga - gb
  return va - vb
}

const TYPE_ORDER = ['Kingdom','Event','Landmark','Project','Way','Ally','Trait','Prophecy','Loot']

export default function Cards() {
  const { cards, expansions, cardTypes } = DATA
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('used-desc')
  const [sortReversed, setSortReversed] = useState(false)
  const [filterExp, setFilterExp] = useState('')
  const [filterType, setFilterType] = useState('')
  const [hideRemoved, setHideRemoved] = useState(false)
  const [hideBaseCards, setHideBaseCards] = useState(false)
  const [activeChips, setActiveChips] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)

  const toggleChip = (exp) => {
    setActiveChips(prev => prev.includes(exp) ? prev.filter(e => e !== exp) : [...prev, exp])
  }

  const sortedTypes = useMemo(() =>
    [...cardTypes].sort((a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b)),
  [cardTypes])

  const filtered = useMemo(() => {
    let list = [...cards]
    if (hideRemoved) list = list.filter(c => !c.removed)
    if (hideBaseCards) list = list.filter(c => !c.isSupplyCard)
    if (filterType) list = list.filter(c => (c.card_type || 'Kingdom') === filterType)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q))
    }
    const activeExps = activeChips.length > 0 ? activeChips : (filterExp ? [filterExp] : null)
    if (activeExps) list = list.filter(c => activeExps.includes(c.expansion))

    const dir = sortReversed ? -1 : 1
    list.sort((a, b) => {
      if (sortBy === 'used-asc') return dir * (a.times_used - b.times_used)
      if (sortBy === 'name') return dir * a.name.localeCompare(b.name)
      if (sortBy === 'cost') return dir * compareCost(a, b)
      return dir * (b.times_used - a.times_used)
    })
    return list
  }, [cards, search, sortBy, sortReversed, filterType, filterExp, hideRemoved, hideBaseCards, activeChips])

  return (
    <section className="section active">
      <h2 className="section-title">Card Explorer</h2>

      <div className="cards-filter">
        <input
          type="text"
          className="search-bar"
          placeholder="Search cards..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 0 }}
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="used-desc">Most Used First</option>
          <option value="used-asc">Least Used First</option>
          <option value="name">Alphabetical</option>
          <option value="cost">By Cost</option>
        </select>
        <button
          className={`sort-btn${sortReversed ? ' active' : ''}`}
          onClick={() => setSortReversed(v => !v)}
          title="Reverse sort order"
        >
          {sortReversed ? '↑ Reversed' : '↓ Normal'}
        </button>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setActiveChips([]) }}>
          <option value="">All Types</option>
          {sortedTypes.map(t => <option key={t} value={t}>{t}s</option>)}
        </select>
        <select value={filterExp} onChange={e => { setFilterExp(e.target.value); setActiveChips([]) }}>
          <option value="">All Expansions</option>
          {expansions.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.82rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={hideRemoved} onChange={e => setHideRemoved(e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
          Hide removed
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.82rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={hideBaseCards} onChange={e => setHideBaseCards(e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
          Hide base cards
        </label>
      </div>

      {!filterType && (
        <div className="chips" style={{ marginBottom: '1rem' }}>
          {expansions.map(e => (
            <button
              key={e}
              className={`chip${activeChips.includes(e) ? ' active' : ''}`}
              onClick={() => toggleChip(e)}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div style={{ fontSize: '.8rem', color: 'var(--dim)', marginBottom: '.75rem' }}>
        {filtered.length} cards
      </div>

      <div className="cards-grid">
        {filtered.map(card => {
          const isLandscape = LANDSCAPE_TYPES.has(card.card_type)
          return (
            <div
              key={card.name}
              className={`card-item${isLandscape ? ' card-item-landscape' : ''}`}
              onClick={() => setSelectedCard(card)}
              style={{ cursor: 'pointer' }}
            >
              <CardImage name={card.name} className={isLandscape ? 'card-art-landscape' : 'card-art'} />
              <div style={{ padding: '.65rem .9rem' }}>
                <div className="cn" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
                  {card.name}
                  {card.removed && <span className="tag tag-removed">Removed</span>}
                  {card.isSecondEdition && <span className="tag tag-2nd">2nd Ed.</span>}
                </div>
                <div className="ce">{card.expansion}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                  <TypeBadge type={card.card_type} />
                  {card.times_used > 0 && (
                    <>
                      <span className={`usage-dot ${usageDotClass(card.times_used)}`}></span>
                      <span style={{ fontSize: '.8rem', color: 'var(--dim)' }}>{card.times_used}x</span>
                    </>
                  )}
                  <CostBadge card={card} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedCard && (
        <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </section>
  )
}
