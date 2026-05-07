import { useMemo, useState } from 'react'
import useChart from '../hooks/useChart'
import DATA from '../data'
import { PALETTE } from '../constants'
import CardModal from '../components/CardModal'
import GameModal from '../components/GameModal'
import LatestGameBox from '../components/LatestGameBox'
import RandomCardBox from '../components/RandomCardBox'

function StatCard({ label, value, sub, className = '' }) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export default function Dashboard({ onGameNav }) {
  const { games, players } = DATA
  const [selectedCard, setSelectedCard] = useState(null)
  const [selectedGame, setSelectedGame] = useState(null)

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
    const topWinner = [...players].filter(p => p.name !== 'Mummi').sort((a, b) => b.first - a.first)[0]
    const mummi = players.find(p => p.name === 'Mummi')
    const mostGames = [...players].filter(p => p.name !== 'Mummi').sort((a, b) => b.games - a.games)[0]
    return { totalGames, totalPlayers, locations, avgScore, topWinner, mummi, mostGames }
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
      plugins: [{
        id: 'barLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart
          chart.data.datasets[0].data.forEach((value, i) => {
            const bar = chart.getDatasetMeta(0).data[i]
            ctx.save()
            ctx.fillStyle = PALETTE.text
            ctx.font = '11px sans-serif'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            ctx.fillText(value, bar.x + 4, bar.y)
            ctx.restore()
          })
        },
      }],
    }
  }, [])

  const locationRef = useChart(() => {
    const MIN = 3
    const counts = {}
    games.forEach(g => { if (g.location) counts[g.location] = (counts[g.location] || 0) + 1 })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const big = sorted.filter(([, v]) => v >= MIN)
    const small = sorted.filter(([, v]) => v < MIN)
    const otherTotal = small.reduce((sum, [, v]) => sum + v, 0)
    const otherLabel = `Annað (${small.length} staðir)`
    const slices = otherTotal > 0 ? [...big, [otherLabel, otherTotal]] : big
    const colors = slices.map((_, i) => `hsl(${Math.round(i * 360 / slices.length)}, 60%, 55%)`)
    return {
      type: 'doughnut',
      data: {
        labels: slices.map(([loc]) => loc),
        datasets: [{ data: slices.map(([, v]) => v), backgroundColor: colors, borderWidth: 0 }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: PALETTE.text, font: { size: 11 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const label = ctx.label || ''
                const value = ctx.parsed
                if (label === otherLabel) {
                  return [`${value} leikir alls`, ...small.map(([n, v]) => `  ${n}: ${v}`)]
                }
                return `${value} leikir`
              },
            },
          },
        },
        cutout: '55%',
      },
    }
  }, [])

  const scoresRef = useChart(() => {
    // Aggregate by month: game count + average of per-game average scores.
    const counts = {}
    const monthAvgs = {}
    for (const g of games) {
      const m = g.date?.slice(0, 7)
      if (!m) continue
      counts[m] = (counts[m] || 0) + 1
      const scores = g.results.filter(r => r.score != null).map(r => r.score)
      if (scores.length) {
        const gameAvg = scores.reduce((a, b) => a + b, 0) / scores.length
        if (!monthAvgs[m]) monthAvgs[m] = []
        monthAvgs[m].push(gameAvg)
      }
    }
    const months = Object.keys(counts).sort()
    const monthlyAvg = months.map(m => {
      const arr = monthAvgs[m]
      return arr && arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null
    })
    const monthlyCount = months.map(m => counts[m] || 0)
    return {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            type: 'bar',
            label: 'Leikir',
            data: monthlyCount,
            backgroundColor: PALETTE.blue + '55',
            borderColor: PALETTE.blue,
            borderWidth: 1,
            yAxisID: 'y1',
            order: 2,
          },
          {
            type: 'line',
            label: 'Meðalskor',
            data: monthlyAvg,
            borderColor: PALETTE.gold,
            backgroundColor: PALETTE.gold + '22',
            tension: 0.3,
            pointRadius: 3,
            yAxisID: 'y',
            order: 1,
            spanGaps: true,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: PALETTE.text, font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: PALETTE.dim, maxRotation: 45, autoSkip: true, maxTicksLimit: 12 }, grid: { color: PALETTE.border } },
          y: {
            position: 'left',
            title: { display: true, text: 'Meðalskor', color: PALETTE.dim, font: { size: 11 } },
            ticks: { color: PALETTE.dim },
            grid: { color: PALETTE.border },
          },
          y1: {
            position: 'right',
            title: { display: true, text: 'Leikir', color: PALETTE.dim, font: { size: 11 } },
            beginAtZero: true,
            ticks: { color: PALETTE.dim, precision: 0 },
            grid: { display: false },
          },
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
      <div className="dashboard-highlights">
        <LatestGameBox onGameNav={onGameNav} />
        <RandomCardBox pool="played" onCardClick={setSelectedCard} onGameClick={setSelectedGame} />
        <RandomCardBox pool="unplayed" onCardClick={setSelectedCard} />
      </div>

      <div className="stats-grid">
        <StatCard label="Leikir alls" value={stats.totalGames} />
        <StatCard label="Virk í leik" value={stats.totalPlayers} />
        <StatCard label="Staðir" value={stats.locations} />
        <StatCard label="Meðalskor" value={stats.avgScore} sub="per leik" />
        <StatCard className="span-2" label="Sigursælastur utan Mumma" value={stats.topWinner?.name} sub={`${stats.topWinner?.first} sigrar${stats.mummi ? ` · Mummi: ${stats.mummi.first}` : ''}`} />
        <StatCard className="span-2" label="Flestir leikir utan Mumma" value={stats.mostGames?.name} sub={`${stats.mostGames?.games} leikir${stats.mummi ? ` · Mummi: ${stats.mummi.games}` : ''}`} />
      </div>

      {playerOfDay && (
        <div className="chart-box" style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '.7rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem' }}>Spilari dagsins</div>
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
                    <div key={g.game_num} style={{ fontSize: '.78rem', background: 'var(--bg3)', borderRadius: 4, padding: '.28rem .6rem', display: 'flex', gap: '.5rem', alignItems: 'center', cursor: 'pointer' }} onClick={() => setSelectedGame(g)}>
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
      </div>
      <div className="chart-box" style={{ marginBottom: '1.5rem' }}>
        <h3>VINSÆLUSTU VIÐBÆTUR</h3>
        <div style={{ height: '300px', position: 'relative' }}>
          <canvas ref={expansionRef} />
        </div>
      </div>
      <div className="chart-box" style={{ marginBottom: '1.5rem' }}>
        <h3>VINSÆLUSTU STAÐIR</h3>
        <div style={{ height: '300px', position: 'relative' }}>
          <canvas ref={locationRef} />
        </div>
      </div>
      <div className="charts-row">
        <div className="chart-box">
          <h3>MEÐALSKOR &amp; LEIKIR Á MÁNUÐI</h3>
          <div style={{ height: '300px', position: 'relative' }}>
            <canvas ref={scoresRef} />
          </div>
        </div>
        <div className="chart-box"><h3>ÞÁTTTAKA LEIKENDA</h3><canvas ref={participationRef} /></div>
      </div>


      {selectedCard && <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
      {selectedGame && <GameModal game={selectedGame} onClose={() => setSelectedGame(null)} />}
    </section>
  )
}
