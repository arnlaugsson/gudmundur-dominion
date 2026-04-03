import { useState, useMemo } from 'react'
import DATA from '../data'
import EXPANSIONS from '../expansionData'
import CardModal from '../components/CardModal'

function ExpansionCard({ exp, stats, onCardClick, onFilterCards }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="exp-timeline-card">
      <div className="exp-timeline-dot" />

      <div className="exp-timeline-year">{exp.year}</div>

      <div className="exp-timeline-content" onClick={() => setExpanded(v => !v)}>
        <div className="exp-timeline-header">
          <div>
            <h3 className="exp-timeline-name">
              {exp.name}
              {exp.has2ndEdition && (
                <span className="tag tag-2nd" style={{ marginLeft: '.5rem', fontSize: '.65rem' }}>
                  2nd Ed. {exp.secondEditionYear}
                </span>
              )}
            </h3>
            <div className="exp-timeline-stats">
              {stats.cardCount} spil &middot; Notað {stats.timesUsed}x &middot; {stats.gameCount} leikir
            </div>
          </div>
          <span className="exp-timeline-toggle">{expanded ? '−' : '+'}</span>
        </div>

        {expanded && (
          <div className="exp-timeline-details" onClick={e => e.stopPropagation()}>
            <div className="exp-detail-section">
              <div className="exp-detail-label">Nýjungar</div>
              <ul className="exp-mechanic-list">
                {exp.keyMechanics.map(m => <li key={m}>{m}</li>)}
              </ul>
            </div>

            <div className="exp-detail-section">
              <div className="exp-detail-label">Skemmtilegt</div>
              <p className="exp-fun-fact">{exp.funFact}</p>
            </div>

            {stats.topCards.length > 0 && (
              <div className="exp-detail-section">
                <div className="exp-detail-label">Vinsælustu spilin</div>
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

            <div className="exp-detail-actions">
              <a href={exp.bggUrl} target="_blank" rel="noopener noreferrer" className="exp-link-btn">
                BGG
              </a>
              <button className="exp-link-btn" onClick={() => onFilterCards(exp.dataKey)}>
                Skoða öll spil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Expansions({ onNavigateCards }) {
  const { cards, games } = DATA
  const [selectedCard, setSelectedCard] = useState(null)

  const expStats = useMemo(() => {
    const stats = {}
    for (const exp of EXPANSIONS) {
      const expCards = cards.filter(c => c.expansion === exp.dataKey && !c.isSupplyCard)
      const timesUsed = expCards.reduce((sum, c) => sum + (c.times_used || 0), 0)
      const gameCount = games.filter(g =>
        g.expansions?.includes(exp.dataKey) ||
        g.kingdom?.some(k => k.expansion === exp.dataKey)
      ).length
      const topCards = [...expCards]
        .filter(c => c.times_used > 0)
        .sort((a, b) => b.times_used - a.times_used)
        .slice(0, 5)

      stats[exp.dataKey] = { cardCount: expCards.length, timesUsed, gameCount, topCards }
    }
    return stats
  }, [cards, games])

  return (
    <section className="section active">
      <h2 className="section-title">Viðbætur</h2>
      <p style={{ color: 'var(--dim)', marginBottom: '1.5rem', fontSize: '.85rem' }}>
        Allar Dominion viðbætur frá 2008 til dagsins í dag. Smelltu á viðbót til að sjá nánari upplýsingar.
      </p>

      <div className="exp-timeline">
        {EXPANSIONS.map(exp => (
          <ExpansionCard
            key={exp.dataKey}
            exp={exp}
            stats={expStats[exp.dataKey]}
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
