import { useMemo, useState } from 'react'
import DATA from '../data'
import { computeAchievements } from '../lib/achievements'
import AchievementBadge from '../components/AchievementBadge'
import PlayerModal from '../components/PlayerModal'
import { useMemories } from '../hooks/useMemories'

const ACTIVE_PLAYER_MIN_GAMES = 10

const CATEGORY_ORDER = [
  ['volume',    'Þátttaka'],
  ['wins',      'Sigrar'],
  ['records',   'Met'],
  ['streaks',   'Sigurraðir'],
  ['variety',   'Fjölbreytni'],
  ['rivalries', 'Keppinautar'],
]

export default function Afrek() {
  const { players, games } = DATA
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const { photosByPlayer } = useMemories()

  const byPlayer = useMemo(
    () => computeAchievements(games, players),
    [games, players],
  )

  // Section 1: ranked by total badge count
  const ranked = useMemo(() => {
    return [...byPlayer.entries()]
      .map(([name, achs]) => ({ name, count: achs.length }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [byPlayer])

  // Section 2: rare achievements (held by 1 or 2 players)
  const rare = useMemo(() => {
    const holdersById = new Map() // id -> { ach, holders: [name, ...] }
    for (const [name, achs] of byPlayer.entries()) {
      for (const a of achs) {
        if (!holdersById.has(a.id)) holdersById.set(a.id, { ach: a, holders: [] })
        holdersById.get(a.id).holders.push(name)
      }
    }
    return [...holdersById.values()]
      .filter(x => x.holders.length <= 2)
      .sort((a, b) => a.holders.length - b.holders.length || a.ach.title.localeCompare(b.ach.title))
  }, [byPlayer])

  // Section 3: per-achievement grid (rows = stable achievement ids, cols = active players)
  const grid = useMemo(() => {
    const activePlayers = players.filter(p => p.games >= ACTIVE_PLAYER_MIN_GAMES).map(p => p.name).sort()
    const allAchIds = new Map() // id -> ach (representative)
    for (const achs of byPlayer.values()) {
      for (const a of achs) if (!allAchIds.has(a.id)) allAchIds.set(a.id, a)
    }
    const rows = [...allAchIds.values()].sort((a, b) => {
      const ai = CATEGORY_ORDER.findIndex(c => c[0] === a.category)
      const bi = CATEGORY_ORDER.findIndex(c => c[0] === b.category)
      if (ai !== bi) return ai - bi
      return a.title.localeCompare(b.title)
    })
    const has = {} // id -> Set of player names
    for (const [name, achs] of byPlayer.entries()) {
      for (const a of achs) {
        if (!has[a.id]) has[a.id] = new Set()
        has[a.id].add(name)
      }
    }
    return { activePlayers, rows, has }
  }, [byPlayer, players])

  return (
    <section className="section active">
      <h2 className="section-title">Afrek</h2>

      {/* Section 1 */}
      <div className="chart-box" style={{ marginBottom: '1.5rem' }}>
        <h3>FLEST AFREK</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
          {ranked.map(({ name, count }, i) => (
            <div
              key={name}
              onClick={() => setSelectedPlayer(name)}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem .8rem', background: 'var(--bg3)', borderRadius: 6, cursor: 'pointer' }}
            >
              <span><span style={{ color: 'var(--dim)', marginRight: '.5rem' }}>{i + 1}.</span>{name}</span>
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>🏆 {count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 */}
      <div className="chart-box" style={{ marginBottom: '1.5rem' }}>
        <h3>SJALDGÆFUSTU AFREKIN</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          {rare.map(({ ach, holders }) => (
            <div key={ach.id} style={{ display: 'flex', alignItems: 'center', gap: '.8rem', padding: '.5rem .8rem', background: 'var(--bg3)', borderRadius: 6 }}>
              <AchievementBadge achievement={ach} />
              <span style={{ fontSize: '.82rem', color: 'var(--dim)' }}>
                {holders.length === 1 ? 'Aðeins ' : ''}{holders.join(' og ')}
              </span>
            </div>
          ))}
          {rare.length === 0 && <span style={{ color: 'var(--dim)' }}>Engin sjaldgæf afrek enn.</span>}
        </div>
      </div>

      {/* Section 3 */}
      <div className="chart-box">
        <h3>HVER Á HVAÐ?</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="afrek-grid" style={{ borderCollapse: 'collapse', fontSize: '.78rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '.3rem .5rem', borderBottom: '1px solid var(--border)' }}>Afrek</th>
                {grid.activePlayers.map(name => (
                  <th key={name} style={{ padding: '.3rem .4rem', borderBottom: '1px solid var(--border)', color: 'var(--dim)', textAlign: 'center', minWidth: '2rem' }}>
                    {name.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.rows.map(a => (
                <tr key={a.id}>
                  <td style={{ padding: '.25rem .5rem', whiteSpace: 'nowrap' }}>{a.icon} {a.title}</td>
                  {grid.activePlayers.map(name => (
                    <td key={name} style={{ padding: '.25rem .4rem', textAlign: 'center', color: grid.has[a.id]?.has(name) ? 'var(--gold)' : 'var(--bg3)' }}>
                      {grid.has[a.id]?.has(name) ? '✓' : '·'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPlayer && (
        <PlayerModal playerName={selectedPlayer} photosByPlayer={photosByPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </section>
  )
}
