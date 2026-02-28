import { useState, useMemo } from 'react'
import GameModal from '../components/GameModal'
import DATA from '../data'

export default function History() {
  const { games, players, expansions } = DATA
  const [search, setSearch] = useState('')
  const [filterPlayer, setFilterPlayer] = useState('')
  const [filterExp, setFilterExp] = useState('')
  const [filterVictory, setFilterVictory] = useState('')
  const [selectedGame, setSelectedGame] = useState(null)

  // Most recent first: sort by game_num descending (game_num is always set, unlike date for legacy games)
  const sortedGames = useMemo(() => [...games].sort((a, b) => b.game_num - a.game_num), [games])

  const filtered = useMemo(() => {
    let list = sortedGames
    if (filterPlayer) list = list.filter(g => g.players.includes(filterPlayer))
    if (filterExp) list = list.filter(g => g.expansions.includes(filterExp))
    if (filterVictory) list = list.filter(g => g.victory_type === filterVictory)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(g =>
        g.players.some(p => p.toLowerCase().includes(q)) ||
        g.kingdom.some(k => k.card.toLowerCase().includes(q)) ||
        (g.location || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [sortedGames, search, filterPlayer, filterExp, filterVictory])

  const victoryBadgeClass = {
    Province: 'badge-province',
    Colony: 'badge-colony',
    'Supply piles': 'badge-supply',
  }

  return (
    <section className="section active">
      <h2 className="section-title">Game History</h2>

      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <input
          type="text"
          className="search-bar"
          placeholder="Search by player, card, location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 0 }}
        />
        <select value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}>
          <option value="">All Players</option>
          {players.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
        <select value={filterExp} onChange={e => setFilterExp(e.target.value)}>
          <option value="">All Expansions</option>
          {expansions.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filterVictory} onChange={e => setFilterVictory(e.target.value)}>
          <option value="">All Victory Types</option>
          <option value="Province">Province</option>
          <option value="Colony">Colony</option>
          <option value="Supply piles">Supply Piles</option>
        </select>
      </div>

      <div style={{ fontSize: '.82rem', color: 'var(--dim)', marginBottom: '.75rem' }}>
        {filtered.length} game{filtered.length !== 1 ? 's' : ''}
      </div>

      <div>
        {filtered.map(game => (
          <div
            key={game.game_num}
            className="game-row"
            onClick={() => setSelectedGame(game)}
          >
            <div className="gh">
              <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="cinzel gold" style={{ fontSize: '.95rem' }}>#{game.game_num}</span>
                <span className="gd">{game.date}</span>
                <span className="gd">{game.location}</span>
                {game.victory_type && (
                  <span className={`badge ${victoryBadgeClass[game.victory_type] || 'badge-province'}`}>
                    {game.victory_type}
                  </span>
                )}
              </div>
              <div className="podium">
                {game.results.slice(0, 3).map(r => (
                  <span key={r.place} className={`p${r.place}`}>
                    {r.place === 1 ? '🥇' : r.place === 2 ? '🥈' : '🥉'} {r.name}
                    {r.score != null && <span style={{ color: 'var(--dim)', fontSize: '.78rem', marginLeft: '.3rem' }}>{r.score}pts</span>}
                  </span>
                ))}
              </div>
            </div>
            {/* Kingdom card names only — no images in list */}
            {game.kingdom.length > 0 && (
              <div className="gk">
                {game.kingdom.map(k => (
                  <span key={k.card} className="kchip">{k.card}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedGame && (
        <GameModal game={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </section>
  )
}
