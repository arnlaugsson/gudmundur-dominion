import { useState, useMemo, useRef } from 'react'
import DATA from '../data'
import EXPANSIONS from '../expansionData'
import CardModal from '../components/CardModal'

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function ExpansionCard({ exp, stats, allCards, onCardClick, onFilterCards }) {
  const [expanded, setExpanded] = useState(false)
  const funFactRef = useRef(exp.funFacts ? pickRandom(exp.funFacts) : exp.funFact || '')

  const findCard = (name) => allCards.find(c => c.name === name)

  return (
    <div className="exp-timeline-card">
      <div className="exp-timeline-dot" />

      <div className="exp-timeline-year">{exp.year}</div>

      <div className="exp-timeline-content" onClick={() => setExpanded(v => !v)}>
        <div className="exp-timeline-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            {exp.coverImg && !expanded && (
              <img
                src={exp.coverImg}
                alt={`${exp.name}`}
                className={`exp-thumb-img${exp.portraitImg ? ' portrait' : ''}`}
                loading="lazy"
              />
            )}
            <div>
              <h3 className="exp-timeline-name">
                {exp.name}
                {exp.has2ndEdition && (
                  <span className="tag tag-2nd" style={{ marginLeft: '.5rem', fontSize: '.65rem' }}>
                    2. útg. {exp.secondEditionYear}
                  </span>
                )}
                {(exp.mergedInto || exp.isSmallBox) && (
                  <span style={{ marginLeft: '.5rem', fontSize: '.65rem', color: 'var(--dim)', fontWeight: 400 }}>
                    smákassi
                  </span>
                )}
                {exp.isMergedEdition && (
                  <span style={{ marginLeft: '.5rem', fontSize: '.65rem', color: 'var(--dim)', fontWeight: 400 }}>
                    sameinuð
                  </span>
                )}
              </h3>
              {!exp.mergedInto && (
                <div className="exp-timeline-stats">
                  {stats.cardCount} ríkisspil
                  {Object.entries(stats.extraTypes).map(([type, count]) => (
                    <span key={type}> + {count} {type}</span>
                  ))}
                  {' '}&middot; {stats.gameCount} {stats.gameCount === 1 ? 'leikur' : 'leikir'}
                </div>
              )}
            </div>
          </div>
          <span className="exp-timeline-toggle">{expanded ? '−' : '+'}</span>
        </div>

        {expanded && (
          <div className="exp-timeline-details" onClick={e => e.stopPropagation()}>

            <div className="exp-details-content">
            <div className="exp-detail-section">
              <div className="exp-detail-label">Nýjungar</div>
              <ul className="exp-mechanic-list">
                {exp.keyMechanics.map(m => <li key={m}>{m}</li>)}
              </ul>
            </div>

            <div className="exp-detail-section">
              <div className="exp-detail-label">Vissir þú?</div>
              <p className="exp-fun-fact">{funFactRef.current}</p>
            </div>

            {!exp.mergedInto && (stats.removed.length > 0 || stats.added.length > 0) && (
              <div className="exp-detail-section">
                <div className="exp-detail-label">Breytingar í 2. útgáfu</div>
                {stats.removed.length > 0 && (
                  <div style={{ marginBottom: '.4rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '.2rem' }}>
                    <span style={{ fontSize: '.75rem', color: '#f85149', fontWeight: 600, marginRight: '.3rem' }}>Fjarlægð:</span>
                    {stats.removed.map((name, i) => {
                      const card = findCard(name)
                      return (
                        <span key={name}>
                          {card ? (
                            <button className="exp-edition-card removed" onClick={() => onCardClick(card)}>{name}</button>
                          ) : (
                            <span style={{ fontSize: '.78rem', color: 'var(--dim)' }}>{name}</span>
                          )}
                          {i < stats.removed.length - 1 && <span style={{ color: 'var(--dim)', fontSize: '.78rem' }}>,</span>}
                        </span>
                      )
                    })}
                  </div>
                )}
                {stats.added.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '.2rem' }}>
                    <span style={{ fontSize: '.75rem', color: '#3fb950', fontWeight: 600, marginRight: '.3rem' }}>Ný spil:</span>
                    {stats.added.map((name, i) => {
                      const card = findCard(name)
                      return (
                        <span key={name}>
                          {card ? (
                            <button className="exp-edition-card added" onClick={() => onCardClick(card)}>{name}</button>
                          ) : (
                            <span style={{ fontSize: '.78rem', color: 'var(--dim)' }}>{name}</span>
                          )}
                          {i < stats.added.length - 1 && <span style={{ color: 'var(--dim)', fontSize: '.78rem' }}>,</span>}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {!exp.mergedInto && stats.topCards.length > 0 && (
              <div className="exp-detail-section">
                <div className="exp-detail-label">Mest notuð spil</div>
                <div className="exp-top-cards">
                  {stats.topCards.map(c => (
                    <button key={c.name} className="exp-card-chip" onClick={() => onCardClick(c)}>
                      {c.name}
                      <span className="exp-card-chip-count">{c.times_used}x</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!exp.mergedInto && stats.neverPlayed.length > 0 && (
              <div className="exp-detail-section">
                <div className="exp-detail-label">Aldrei spiluð ({stats.neverPlayed.length})</div>
                <div className="exp-top-cards">
                  {stats.neverPlayed.map(c => (
                    <button key={c.name} className="exp-card-chip exp-card-chip-unseen" onClick={() => onCardClick(c)}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="exp-detail-actions">
              <a href={exp.bggUrl} target="_blank" rel="noopener noreferrer" className="exp-link-btn">
                BoardGameGeek <span className="external-icon">↗</span>
              </a>
              <a
                href={`https://wiki.dominionstrategy.com/index.php/${exp.name.replace(/ /g, '_')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="exp-link-btn"
              >
                Dominion Strategy Wiki <span className="external-icon">↗</span>
              </a>
              {!exp.mergedInto && (
                <button className="exp-link-btn" onClick={() => onFilterCards(exp.dataKey)}>
                  Skoða öll spil
                </button>
              )}
            </div>
            </div>

            {exp.coverImg && (
              <div className="exp-cover-wrap">
                <img
                  src={exp.coverImg}
                  alt={`${exp.name} kassinn`}
                  className={`exp-cover-img${exp.portraitImg ? ' portrait' : ''}`}
                  loading="lazy"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Expansions({ onNavigateCards }) {
  const { cards, games } = DATA
  const [selectedCard, setSelectedCard] = useState(null)
  const [newestFirst, setNewestFirst] = useState(true)

  const expStats = useMemo(() => {
    const stats = {}
    for (const exp of EXPANSIONS) {
      const expCards = cards.filter(c => c.expansion === exp.dataKey && !c.isSupplyCard)
      const kingdomCards = expCards.filter(c => c.card_type === 'Kingdom' || !c.card_type)
      const extraTypes = {}
      for (const c of expCards) {
        const t = c.card_type || 'Kingdom'
        if (t !== 'Kingdom') {
          extraTypes[t] = (extraTypes[t] || 0) + 1
        }
      }
      const timesUsed = expCards.reduce((sum, c) => sum + (c.times_used || 0), 0)
      const gameCount = games.filter(g =>
        g.expansions?.includes(exp.dataKey) ||
        g.kingdom?.some(k => k.expansion === exp.dataKey)
      ).length
      const topCards = [...expCards]
        .filter(c => c.times_used > 0)
        .sort((a, b) => b.times_used - a.times_used)
        .slice(0, 5)

      // 2nd edition changes
      const removed = exp.has2ndEdition
        ? expCards.filter(c => c.removed).map(c => c.name).sort()
        : []
      const added = exp.has2ndEdition
        ? expCards.filter(c => c.isSecondEdition).map(c => c.name).sort()
        : []

      const neverPlayed = expCards.filter(c => !c.times_used && !c.removed).sort((a, b) => a.name.localeCompare(b.name))

      stats[exp.dataKey] = { cardCount: kingdomCards.length, extraTypes, timesUsed, gameCount, topCards, removed, added, neverPlayed }
    }
    return stats
  }, [cards, games])

  const orderedExpansions = useMemo(
    () => newestFirst ? [...EXPANSIONS].reverse() : EXPANSIONS,
    [newestFirst]
  )

  return (
    <section className="section active">
      <h2 className="section-title">Viðbætur</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--dim)', fontSize: '.85rem', margin: 0 }}>
          Allar Dominion-viðbætur frá 2008 til dagsins í dag. Smelltu á viðbót til að sjá nánar.
        </p>
        <button
          className="exp-link-btn"
          style={{ whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '1rem' }}
          onClick={() => setNewestFirst(v => !v)}
        >
          {newestFirst ? 'Elsta fyrst' : 'Nýjasta fyrst'}
        </button>
      </div>

      <div className="exp-timeline">
        {orderedExpansions.map(exp => (
          <ExpansionCard
            key={`${exp.name}-${exp.year}`}
            exp={exp}
            stats={expStats[exp.dataKey]}
            allCards={cards}
            onCardClick={setSelectedCard}
            onFilterCards={onNavigateCards}
          />
        ))}
      </div>

      {selectedCard && (
        <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </section>
  )
}
