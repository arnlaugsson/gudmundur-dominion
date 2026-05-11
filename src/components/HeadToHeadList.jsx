import { useMemo } from 'react'
import DATA from '../data'
import Avatar from './Avatar'

const MIN_SHARED_GAMES = 3

function computeHeadToHead(playerName, games) {
  const stats = {}
  for (const g of games) {
    const placed = (g.results || []).filter(r => r.place != null)
    const me = placed.find(r => r.name === playerName)
    if (!me) continue
    for (const r of placed) {
      if (r.name === playerName) continue
      if (!stats[r.name]) stats[r.name] = { total: 0, wins: 0 }
      stats[r.name].total++
      if (me.place < r.place) stats[r.name].wins++
    }
  }
  return Object.entries(stats)
    .filter(([, s]) => s.total >= MIN_SHARED_GAMES)
    .map(([name, s]) => ({ name, total: s.total, wins: s.wins, losses: s.total - s.wins, pct: Math.round((s.wins / s.total) * 100) }))
    .sort((a, b) => b.total - a.total)
}

export default function HeadToHeadList({ playerName, profilesByName }) {
  const rows = useMemo(() => computeHeadToHead(playerName, DATA.games), [playerName])
  if (rows.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
      {rows.map(r => {
        const profile = profilesByName?.get(r.name)
        return (
          <div
            key={r.name}
            onClick={() => { window.location.hash = `players/${encodeURIComponent(r.name)}` }}
            style={{
              display: 'flex', alignItems: 'center', gap: '.7rem',
              padding: '.4rem .6rem', background: 'var(--bg3)', borderRadius: 6, cursor: 'pointer',
            }}
          >
            <Avatar name={r.name} src={profile?.avatarUrl} size={32} />
            <span style={{ flex: 1, fontSize: '.88rem' }}>{r.name}</span>
            <span style={{ fontSize: '.78rem', color: 'var(--dim)' }}>
              {r.total} leikir · {r.wins}-{r.losses} ({r.pct}%)
            </span>
            <span style={{ color: 'var(--gold)' }}>→</span>
          </div>
        )
      })}
    </div>
  )
}
