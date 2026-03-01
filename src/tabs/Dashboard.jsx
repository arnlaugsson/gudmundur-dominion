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

  // Player of the Day — deterministic daily rotation based on date
  const playerOfDay = useMemo(() => {
    const d = new Date()
    const dayIndex = Math.floor(d.getTime() / 86400000)
    const eligible = players.filter(p => p.games >= 1)
    if (!eligible.length) return null
    const p = eligible[dayIndex % eligible.length]

    // Compute stats for this player
    const pgames = games.filter(g => g.results.some(r => r.name === p.name))
      .sort((a, b) => a.game_num - b.game_num)
    const firstGame = pgames[0]
    const lastGame = pgames[pgames.length - 1]

    // Most competed against
    const opponents = {}
    pgames.forEach(g => {
      g.results.forEach(r => {
        if (r.name !== p.name && r.name !== 'Mummi') opponents[r.name] = (opponents[r.name] || 0) + 1
      })
    })
    const topOpponent = Object.entries(opponents).sort((a, b) => b[1] - a[1])[0]

    // Favourite expansion
    const expCounts = {}
    pgames.forEach(g => g.expansions?.forEach(e => { expCounts[e] = (expCounts[e] || 0) + 1 }))
    const favExp = Object.entries(expCounts).sort((a, b) => b[1] - a[1])[0]

    // Best score
    const allScores = pgames.flatMap(g => {
      const r = g.results.find(r => r.name === p.name)
      return r?.score != null ? [r.score] : []
    })
    const bestScore = allScores.length ? Math.max(...allScores) : null

    return { player: p, firstGame, lastGame, topOpponent, favExp, bestScore, pgames }
  }, [games, players])

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
    const EXP_YEAR = {
      'Base': 2008, 'Intrigue': 2009, 'Seaside': 2009, 'Alchemy': 2010,
      'Prosperity': 2010, 'Cornucopia & Guilds': 2011, 'Hinterlands': 2011,
      'Dark Ages': 2012, 'Adventures': 2015, 'Empires': 2016, 'Nocturne': 2017,
      'Renaissance': 2018, 'Menagerie': 2020, 'Allies': 2022, 'Plunder': 2022,
      'Rising Sun': 2024, 'Promo': null,
    }
    return {
      type: 'bar',
      data: {
        labels: sorted.map(([e]) => EXP_YEAR[e] ? `${e} (${EXP_YEAR[e]})` : e),
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
            <div style={{ fontSize: '.7rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.85rem' }}>Handahófskennt spil</div>
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
                    <div style={{ fontSize: '.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Skipti spiluð</div>
                    <div style={{ fontSize: '1.4rem', fontFamily: 'Cinzel, serif', color: 'var(--gold)', lineHeight: 1.2 }}>{randomCard.times_used}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Í % spila</div>
                    <div style={{ fontSize: '1.4rem', fontFamily: 'Cinzel, serif', color: 'var(--gold)', lineHeight: 1.2 }}>
                      {games.length > 0 ? Math.round(randomCard.times_used / games.length * 100) : 0}%
                    </div>
                  </div>
                </div>
                {recentGames.length > 0 && (
                  <div>
                    <div style={{ fontSize: '.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>Nýlegir leikir</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                      {recentGames.map(g => (
                        <div key={g.game_num} style={{ fontSize: '.78rem', background: 'var(--bg3)', borderRadius: '4px', padding: '.28rem .6rem', display: 'flex', gap: '.5rem' }}>
                          <span style={{ color: 'var(--gold)' }}>#{g.game_num}</span>
                          <span style={{ color: 'var(--dim)' }}>{g.date}</span>
                          {g.results[0]?.name && <><span style={{ color: 'var(--dim)' }}>·</span><span>{g.results[0].name} vann</span></>}
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
        <StatCard label="Leikir alls" value={stats.totalGames} />
        <StatCard label="Virkir leikmenn" value={stats.totalPlayers} />
        <StatCard label="Staðir" value={stats.locations} />
        <StatCard label="Meðalskor" value={stats.avgScore} sub="á leikmann á leik" />
        <StatCard label="Besti sigurvegari" value={stats.topWinner?.name} sub={`${stats.topWinner?.first} sigrar`} />
        <StatCard label="Hollastur" value={stats.mostGames?.name} sub={`${stats.mostGames?.games} leikir`} />
      </div>

      {playerOfDay && (
        <div className="chart-box" style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '.7rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>Leikmaður dagsins</div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', color: 'var(--gold)', marginBottom: '.2rem' }}>{playerOfDay.player.name}</div>
              <div style={{ fontSize: '.8rem', color: 'var(--dim)', marginBottom: '.8rem' }}>
                {playerOfDay.firstGame ? `Meðlimur síðan ${playerOfDay.firstGame.date ?? `leikur #${playerOfDay.firstGame.game_num}`}` : ''}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '.6rem' }}>
                {[
                  { label: 'Leikir',        value: playerOfDay.player.games },
                  { label: 'Sigrar',         value: playerOfDay.player.first },
                  { label: 'Sigurhlutfall',  value: `${playerOfDay.player.win_rate.toFixed(0)}%` },
                  { label: 'Meðalskor',      value: playerOfDay.player.avg_score ?? '—' },
                  playerOfDay.bestScore != null && { label: 'Besta skor',  value: playerOfDay.bestScore },
                  playerOfDay.topOpponent && { label: 'Mest spilað við', value: `${playerOfDay.topOpponent[0]} (${playerOfDay.topOpponent[1]}×)` },
                  playerOfDay.favExp && { label: 'Uppáhalds viðbót', value: playerOfDay.favExp[0] },
                ].filter(Boolean).map(({ label, value }) => (
                  <div key={label} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '.4rem .6rem' }}>
                    <div style={{ fontSize: '.62rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.15rem' }}>{label}</div>
                    <div style={{ fontSize: '.88rem', fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ minWidth: 160, flex: 1 }}>
              <div style={{ fontSize: '.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>Síðustu leikir</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                {playerOfDay.pgames.slice(-5).reverse().map(g => {
                  const result = g.results.find(r => r.name === playerOfDay.player.name)
                  return (
                    <div key={g.game_num} style={{ fontSize: '.78rem', background: 'var(--bg3)', borderRadius: 4, padding: '.28rem .6rem', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                      <span style={{ color: 'var(--gold)' }}>#{g.game_num}</span>
                      <span style={{ color: 'var(--dim)' }}>{g.date}</span>
                      {result && <span style={{ color: result.place === 1 ? 'var(--gold)' : 'var(--dim)', marginLeft: 'auto' }}>{result.place}. sæti{result.score != null ? ` · ${result.score}stig` : ''}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="charts-row">
        <div className="chart-box"><h3>SIGURTEGUNDIR</h3><canvas ref={victoryRef} /></div>
        <div className="chart-box" style={{ gridColumn: 'span 2 / auto' }}><h3>LEIKIR Á MÁNUÐI</h3><canvas ref={monthlyRef} /></div>
      </div>
      <div className="chart-box" style={{ marginBottom: '1.5rem' }}>
        <h3>VINSÆLUSTU VIÐBÆTUR</h3>
        <div style={{ height: '420px', position: 'relative' }}>
          <canvas ref={expansionRef} />
        </div>
      </div>
      <div className="charts-row">
        <div className="chart-box"><h3>MEÐALSKOR Á LEIK (þróun)</h3><canvas ref={scoresRef} /></div>
        <div className="chart-box"><h3>ÞÁTTTAKA LEIKENDA</h3><canvas ref={participationRef} /></div>
      </div>

      {selectedCard && <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </section>
  )
}
