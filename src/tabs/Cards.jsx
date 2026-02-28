import { useState, useMemo } from 'react'
import CardImage from '../components/CardImage'
import CardModal from '../components/CardModal'
import DATA from '../data'
import { wikiUrl } from '../constants'

function CostBadge({ card }) {
  if (card.debt) return <span className="coin debt">{card.debt}D</span>
  if (card.potion) return <><span className="coin">{card.cost ?? 0}</span><span className="coin potion">P</span></>
  return <span className="coin">{card.cost ?? 0}</span>
}

function usageDotClass(times) {
  if (times === 0) return 'usage-zero'
  if (times <= 2) return 'usage-low'
  if (times <= 6) return 'usage-mid'
  return 'usage-high'
}

export default function Cards() {
  const { cards, expansions } = DATA
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('used-desc')
  const [filterExp, setFilterExp] = useState('')
  const [hideRemoved, setHideRemoved] = useState(false)
  const [hideBaseCards, setHideBaseCards] = useState(false)
  const [activeChips, setActiveChips] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)

  const toggleChip = (exp) => {
    setActiveChips(prev => prev.includes(exp) ? prev.filter(e => e !== exp) : [...prev, exp])
  }

  const filtered = useMemo(() => {
    let list = [...cards]
    if (hideRemoved) list = list.filter(c => !c.removed)
    if (hideBaseCards) list = list.filter(c => !c.isSupplyCard)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q))
    }
    const activeExps = activeChips.length > 0 ? activeChips : (filterExp ? [filterExp] : null)
    if (activeExps) list = list.filter(c => activeExps.includes(c.expansion))

    list.sort((a, b) => {
      if (sortBy === 'used-asc') return a.times_used - b.times_used
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'cost') return (a.cost ?? 0) - (b.cost ?? 0)
      return b.times_used - a.times_used
    })
    return list
  }, [cards, search, sortBy, filterExp, hideRemoved, hideBaseCards, activeChips])

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

      <div style={{ fontSize: '.8rem', color: 'var(--dim)', marginBottom: '.75rem' }}>
        {filtered.length} cards
      </div>

      <div className="cards-grid">
        {filtered.map(card => (
          <div
            key={card.name}
            className="card-item"
            onClick={() => setSelectedCard(card)}
            style={{ cursor: 'pointer' }}
          >
            <CardImage name={card.name} className="card-art" />
            <div style={{ padding: '.65rem .9rem' }}>
              <div className="cn" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
                {card.name}
                {card.removed && <span className="tag tag-removed">Removed</span>}
                {card.isSecondEdition && <span className="tag tag-2nd">2nd Ed.</span>}
              </div>
              <div className="ce">{card.expansion}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <span className={`usage-dot ${usageDotClass(card.times_used)}`}></span>
                <span style={{ fontSize: '.8rem', color: 'var(--dim)' }}>{card.times_used}x in kingdom</span>
                <CostBadge card={card} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCard && (
        <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </section>
  )
}
