import { useEffect, useMemo } from 'react'
import DATA from '../data'
import PlayerPhotos from './PlayerPhotos'

export default function PlayerModal({ playerName, photosByPlayer, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const { games, players } = DATA
  const p = players.find(pl => pl.name === playerName)

  const details = useMemo(() => {
    if (!p) return null

    const pgames = games
      .filter(g => g.results.some(r => r.name === p.name))
      .sort((a, b) => a.game_num - b.game_num)

    const firstGame = pgames[0]
    const lastGame = pgames[pgames.length - 1]

    // Most competed against (excluding Mummi)
    const opponents = {}
    pgames.forEach(g => {
      g.results.forEach(r => {
        if (r.name !== p.name && r.name !== 'Mummi') {
          opponents[r.name] = (opponents[r.name] || 0) + 1
        }
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

    // Win streak
    let maxStreak = 0
    let currentStreak = 0
    pgames.forEach(g => {
      const r = g.results.find(r => r.name === p.name)
      if (r?.place === 1) {
        currentStreak++
        if (currentStreak > maxStreak) maxStreak = currentStreak
      } else {
        currentStreak = 0
      }
    })

    // Favourite card (in wins)
    const wins = pgames.filter(g => g.results[0]?.name === p.name)
    const cardCounts = {}
    wins.forEach(g => g.kingdom?.forEach(k => { cardCounts[k.card] = (cardCounts[k.card] || 0) + 1 }))
    const favCard = Object.entries(cardCounts).sort((a, b) => b[1] - a[1])[0]

    return { pgames, firstGame, lastGame, topOpponent, favExp, bestScore, maxStreak, favCard }
  }, [p, games])

  if (!p || !details) return null

  const statItems = [
    { label: 'Leikir', value: p.games },
    { label: 'Sigrar', value: p.first },
    { label: 'Sigurhlutfall', value: `${p.win_rate.toFixed(0)}%` },
    { label: 'Meðalskor', value: p.avg_score ?? '—' },
    details.bestScore != null && { label: 'Besta skor', value: details.bestScore },
    { label: '2. sæti', value: p.second },
    { label: '3. sæti', value: p.third },
    details.maxStreak > 1 && { label: 'Lengsta sigursería', value: `${details.maxStreak} leikir` },
    details.topOpponent && { label: 'Mest spilað við', value: `${details.topOpponent[0]} (${details.topOpponent[1]}×)` },
    details.favExp && { label: 'Uppáhalds viðbót', value: details.favExp[0] },
    details.favCard && { label: 'Uppáhaldskort í sigrum', value: `${details.favCard[0]} (${details.favCard[1]}×)` },
  ].filter(Boolean)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <h2 className="cinzel gold" style={{ fontSize: '1.4rem', marginBottom: '.2rem' }}>{p.name}</h2>
        {details.firstGame && (
          <div style={{ fontSize: '.8rem', color: 'var(--dim)', marginBottom: '1rem' }}>
            Meðlimur síðan {details.firstGame.date ?? `leikur #${details.firstGame.game_num}`}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '.6rem', marginBottom: '1.25rem' }}>
          {statItems.map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '.5rem .7rem' }}>
              <div style={{ fontSize: '.62rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.15rem' }}>{label}</div>
              <div style={{ fontSize: '.9rem', fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>

        {details.pgames.length > 0 && (
          <div>
            <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.5rem' }}>Síðustu leikir</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', maxHeight: '200px', overflowY: 'auto' }}>
              {details.pgames.slice(-8).reverse().map(g => {
                const result = g.results.find(r => r.name === p.name)
                return (
                  <div key={g.game_num} style={{ fontSize: '.8rem', background: 'var(--bg3)', borderRadius: 4, padding: '.3rem .6rem', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--gold)' }}>#{g.game_num}</span>
                    <span style={{ color: 'var(--dim)' }}>{g.date}</span>
                    {result && (
                      <span style={{ color: result.place === 1 ? 'var(--gold)' : 'var(--dim)', marginLeft: 'auto' }}>
                        {result.place}. sæti{result.score != null ? ` · ${result.score} stig` : ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <PlayerPhotos playerName={playerName} photosByPlayer={photosByPlayer} />
      </div>
    </div>
  )
}
