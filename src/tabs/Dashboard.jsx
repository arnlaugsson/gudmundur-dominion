import { useMemo, useState } from 'react'
import useChart from '../hooks/useChart'
import DATA from '../data'
import { PALETTE } from '../constants'
import CardImage from '../components/CardImage'
import CardModal from '../components/CardModal'

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { games, players, cards } = DATA
  const [selectedCard, setSelectedCard] = useState(null)

  const randomCard = useState(() => {
    const pool = cards.filter(c => !c.isSupplyCard && !c.removed && c.times_used > 0)
    return pool[Math.floor(Math.random() * pool.length)] || null
  })[0]

  const stats = useMemo(() => {
    const totalGames = games.length
    const totalPlayers = players.length
    const locations = new Set(games.map(g => g.location)).size
    const allScores = games.flatMap(g => g.results.filter(r => r.score != null).map(r => r.score))
    const avgScore = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : '—'
    const topWinner = [...players].sort((a, b) => b.first - a.first)[0]
    const mostGames = [...players].sort((a, b) => b.games - a.games)[0]
    return { totalGames, totalPlayers, locations, avgScore, topWinner, mostGames }
  }, [games, players])

  const victoryRef = useChart(() => {
    const counts = {}
    games.forEach(g => {
      if (g.victory_type) counts[g.victory_type] = (counts[g.victory_type] || 0) + 1
    })
    const labels = Object.keys(counts)
    const data = Object.values(counts)
    return {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: [PALETTE.green, PALETTE.blue, PALETTE.red, PALETTE.gold], borderWidth: 0 }],
      },
      options: { plugins: { legend: { labels: { color: PALETTE.text, font: { size: 11 } } } }, cutout: '65%' },
    }
  }, [])

  const expansionRef = useChart(() => {
    const counts = {}
    games.forEach(g => g.expansions.forEach(e => { counts[e] = (counts[e] || 0) + 1 }))
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return {
      type: 'bar',
      data: {
        labels: sorted.map(([e]) => e),
        datasets: [{ data: sorted.map(([, v]) => v), backgroundColor: PALETTE.gold + '99', borderColor: PALETTE.gold, borderWidth: 1 }],
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: PALETTE.dim }, grid: { color: PALETTE.border } },
          y: { ticks: { color: PALETTE.text, font: { size: 11 }, autoSkip: false }, grid: { display: false } },
        },
      },
    }
  }, [])

  const monthlyRef = useChart(() => {
    const counts = {}
    games.forEach(g => {
      const m = g.date?.slice(0, 7)
      if (m) counts[m] = (counts[m] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]))
    return {
      type: 'bar',
      data: {
        labels: sorted.map(([m]) => m),
        datasets: [{ data: sorted.map(([, v]) => v), backgroundColor: PALETTE.gold + '88', borderColor: PALETTE.gold, borderWidth: 1 }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: PALETTE.dim, maxRotation: 45 }, grid: { color: PALETTE.border } },
          y: { ticks: { color: PALETTE.dim }, grid: { color: PALETTE.border } },
        },
      },
    }
  }, [])

  const scoresRef = useChart(() => {
    const byGame = games
      .map(g => {
        const scores = g.results.filter(r => r.score != null).map(r => r.score)
        if (!scores.length || !g.date) return null
        return { date: g.date, avg: scores.reduce((a, b) => a + b, 0) / scores.length }
      })
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      type: 'line',
      data: {
        labels: byGame.map(g => g.date),
        datasets: [{
          data: byGame.map(g => +g.avg.toFixed(1)),
          borderColor: PALETTE.gold,
          backgroundColor: PALETTE.gold + '22',
          tension: 0.3,
          fill: true,
          pointRadius: 3,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: PALETTE.dim, maxRotation: 45, autoSkip: true, maxTicksLimit: 12 }, grid: { color: PALETTE.border } },
          y: { ticks: { color: PALETTE.dim }, grid: { color: PALETTE.border } },
        },
      },
    }
  }, [])

  const participationRef = useChart(() => {
    const top = [...players].sort((a, b) => b.games - a.games).slice(0, 12)
    return {
      type: 'bar',
      data: {
        labels: top.map(p => p.name),
        datasets: [{ data: top.map(p => p.games), backgroundColor: PALETTE.blue + '88', borderColor: PALETTE.blue, borderWidth: 1 }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: PALETTE.text, font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: PALETTE.dim }, grid: { color: PALETTE.border } },
        },
      },
    }
  }, [])

  return (
    <section className="section active">
      {randomCard && (() => {
        const EXTRA_FIELDS = ['events', 'landmarks', 'projects', 'ways', 'allies', 'traits', 'prophecy']
        const cardGames = games.filter(g =>
          g.kingdom.some(k => k.card === randomCard.name) ||
          EXTRA_FIELDS.some(f => g[f]?.includes(randomCard.name))
        )
        const recentGames = [...cardGames].slice(-5).reverse()
        const winRate = cardGames.length > 0
          ? Math.round(cardGames.filter(g => players.find(p => p.name === g.results[0]?.name)).length / cardGames.length * 100)
          : null
        return (
          <div className="chart-box" style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '.7rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.85rem' }}>Random Card</div>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <div
                style={{ flexShrink: 0, width: 90, borderRadius: 8, overflow: 'hidden', background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => setSelectedCard(randomCard)}
              >
                <CardImage name={randomCard.name} style={{ width: '100%', display: 'block' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ fontFamily: 'Cinzel, serif', fontSize: '1.15rem', color: 'var(--gold)', marginBottom: '.2rem', cursor: 'pointer' }}
                  onClick={() => setSelectedCard(randomCard)}
                >
                  {randomCard.name}
                </div>
                <div style={{ fontSize: '.8rem', color: 'var(--dim)', marginBottom: '.6rem' }}>{randomCard.expansion}</div>
                <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Times played</div>
                    <div style={{ fontSize: '1.4rem', fontFamily: 'Cinzel, serif', color: 'var(--gold)', lineHeight: 1.2 }}>{randomCard.times_used}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em' }}>In % of games</div>
                    <div style={{ fontSize: '1.4rem', fontFamily: 'Cinzel, serif', color: 'var(--gold)', lineHeight: 1.2 }}>
                      {games.length > 0 ? Math.round(randomCard.times_used / games.length * 100) : 0}%
                    </div>
                  </div>
                </div>
                {recentGames.length > 0 && (
                  <div>
                    <div style={{ fontSize: '.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>Recent Games</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                      {recentGames.map(g => (
                        <div key={g.game_num} style={{ fontSize: '.78rem', background: 'var(--bg3)', borderRadius: '4px', padding: '.28rem .6rem', display: 'flex', gap: '.5rem' }}>
                          <span style={{ color: 'var(--gold)' }}>#{g.game_num}</span>
                          <span style={{ color: 'var(--dim)' }}>{g.date}</span>
                          {g.results[0]?.name && <><span style={{ color: 'var(--dim)' }}>·</span><span>{g.results[0].name} won</span></>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      <div className="stats-grid">
        <StatCard label="Total Games" value={stats.totalGames} />
        <StatCard label="Active Players" value={stats.totalPlayers} />
        <StatCard label="Locations" value={stats.locations} />
        <StatCard label="Avg Score" value={stats.avgScore} sub="per player per game" />
        <StatCard label="Top Winner" value={stats.topWinner?.name} sub={`${stats.topWinner?.first} wins`} />
        <StatCard label="Most Dedicated" value={stats.mostGames?.name} sub={`${stats.mostGames?.games} games`} />
      </div>

      <div className="charts-row">
        <div className="chart-box"><h3>VICTORY TYPES</h3><canvas ref={victoryRef} /></div>
        <div className="chart-box" style={{ gridColumn: 'span 2 / auto' }}><h3>GAMES PER MONTH</h3><canvas ref={monthlyRef} /></div>
      </div>
      <div className="chart-box" style={{ marginBottom: '1.5rem' }}>
        <h3>MOST USED EXPANSIONS</h3>
        <div style={{ height: '420px', position: 'relative' }}>
          <canvas ref={expansionRef} />
        </div>
      </div>
      <div className="charts-row">
        <div className="chart-box"><h3>AVERAGE SCORE PER GAME (trend)</h3><canvas ref={scoresRef} /></div>
        <div className="chart-box"><h3>PLAYER PARTICIPATION</h3><canvas ref={participationRef} /></div>
      </div>

      {selectedCard && <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </section>
  )
}
