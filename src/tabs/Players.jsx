import { useState, useMemo } from 'react'
import useChart from '../hooks/useChart'
import DATA from '../data'
import { PALETTE } from '../constants'

export default function Players() {
  const { players, games } = DATA
  const [sortKey, setSortKey] = useState('games')
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      if (sortKey === 'win_rate') return b.win_rate - a.win_rate
      if (sortKey === 'gpa') return (b.gpa ?? -1) - (a.gpa ?? -1)
      if (sortKey === 'first') return b.first - a.first
      return b.games - a.games
    })
  }, [players, sortKey])

  const winrateRef = useChart(() => {
    const top = [...players].filter(p => p.games >= 3).sort((a, b) => b.win_rate - a.win_rate).slice(0, 10)
    return {
      type: 'bar',
      data: {
        labels: top.map(p => p.name),
        datasets: [{ data: top.map(p => +p.win_rate.toFixed(1)), backgroundColor: PALETTE.gold + '88', borderColor: PALETTE.gold, borderWidth: 1, label: 'Win Rate %' }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: PALETTE.text, font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: PALETTE.dim }, grid: { color: PALETTE.border }, max: 100 },
        },
      },
    }
  }, [])

  const placementRef = useChart(() => {
    const top = [...players].sort((a, b) => b.games - a.games).slice(0, 8)
    return {
      type: 'bar',
      data: {
        labels: top.map(p => p.name),
        datasets: [
          { label: '1st', data: top.map(p => p.first), backgroundColor: PALETTE.gold + 'bb' },
          { label: '2nd', data: top.map(p => p.second), backgroundColor: '#9ca3af88' },
          { label: '3rd', data: top.map(p => p.third), backgroundColor: '#b4530988' },
          { label: '4th+', data: top.map(p => p.fourth), backgroundColor: PALETTE.dim + '55' },
        ],
      },
      options: {
        plugins: { legend: { labels: { color: PALETTE.text, font: { size: 10 } } } },
        scales: {
          x: { stacked: true, ticks: { color: PALETTE.text, font: { size: 11 } }, grid: { display: false } },
          y: { stacked: true, ticks: { color: PALETTE.dim }, grid: { color: PALETTE.border } },
        },
      },
    }
  }, [])

  return (
    <section className="section active">
      <h2 className="section-title">Player Rankings</h2>

      <div className="charts-row" style={{ marginBottom: '1.5rem' }}>
        <div className="chart-box"><h3>WIN RATE COMPARISON</h3><canvas ref={winrateRef} /></div>
        <div className="chart-box"><h3>PLACEMENT DISTRIBUTION</h3><canvas ref={placementRef} /></div>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '.82rem', color: 'var(--dim)' }}>Sort by:</span>
        {['games', 'win_rate', 'gpa', 'first'].map(key => (
          <button key={key} className={`sort-btn${sortKey === key ? ' active' : ''}`} onClick={() => setSortKey(key)}>
            {key === 'win_rate' ? 'Win Rate' : key === 'gpa' ? 'GPA' : key === 'first' ? 'Wins' : 'Games'}
          </button>
        ))}
      </div>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Player</th><th>Games</th>
              <th>1st</th><th>2nd</th><th>3rd</th><th>4th</th>
              <th>Win Rate</th><th>Avg Score</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={p.name} style={{ cursor: 'pointer' }} onClick={() => setSelectedPlayer(selectedPlayer === p.name ? null : p.name)}>
                <td className={i < 3 ? `rank-${i + 1}` : ''}>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td>{p.games}</td>
                <td className="rank-1">{p.first}</td>
                <td className="rank-2">{p.second}</td>
                <td className="rank-3">{p.third}</td>
                <td style={{ color: 'var(--dim)' }}>{p.fourth}</td>
                <td>
                  <div className="bar-inline">
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${p.win_rate}%` }} /></div>
                    <span style={{ fontSize: '.78rem', color: 'var(--dim)', minWidth: '36px' }}>{p.win_rate.toFixed(0)}%</span>
                  </div>
                </td>
                <td style={{ color: 'var(--gold)' }}>{p.avg_score ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPlayer && <PlayerDetail name={selectedPlayer} games={games} />}
    </section>
  )
}

function PlayerDetail({ name, games }) {
  const playerGames = useMemo(() => {
    return games
      .filter(g => g.players.includes(name))
      .sort((a, b) => a.game_num - b.game_num)
  }, [name, games])

  const scoresRef = useChart(() => {
    const pts = playerGames
      .map(g => ({ label: g.date ?? `#${g.game_num}`, score: g.results.find(r => r.name === name)?.score }))
      .filter(x => x.score != null)

    if (!pts.length) return null

    return {
      type: 'line',
      data: {
        labels: pts.map(p => p.label),
        datasets: [{
          data: pts.map(p => p.score),
          borderColor: PALETTE.gold,
          backgroundColor: PALETTE.gold + '22',
          tension: 0.3,
          fill: true,
          pointRadius: 4,
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: PALETTE.dim, maxRotation: 45, autoSkip: true, maxTicksLimit: 10 }, grid: { color: PALETTE.border } },
          y: { ticks: { color: PALETTE.dim }, grid: { color: PALETTE.border } },
        },
      },
    }
  }, [name])

  const favCardsRef = useChart(() => {
    const wins = playerGames.filter(g => g.results[0]?.name === name)
    const cardCounts = {}
    wins.forEach(g => g.kingdom.forEach(k => { cardCounts[k.card] = (cardCounts[k.card] || 0) + 1 }))
    const top = Object.entries(cardCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

    if (!top.length) return null

    return {
      type: 'bar',
      data: {
        labels: top.map(([c]) => c),
        datasets: [{ data: top.map(([, v]) => v), backgroundColor: PALETTE.blue + '88', borderColor: PALETTE.blue, borderWidth: 1 }],
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: PALETTE.dim }, grid: { color: PALETTE.border } },
          y: { ticks: { color: PALETTE.text, font: { size: 11 } }, grid: { display: false } },
        },
      },
    }
  }, [name])

  return (
    <div className="player-detail active">
      <h3 className="cinzel gold" style={{ marginBottom: '1rem', fontSize: '1.3rem' }}>{name}</h3>
      <div className="charts-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="chart-box"><h3>SCORE HISTORY</h3><canvas ref={scoresRef} /></div>
        <div className="chart-box"><h3>FAVOURITE CARDS IN WINNING GAMES</h3><canvas ref={favCardsRef} /></div>
      </div>
    </div>
  )
}
