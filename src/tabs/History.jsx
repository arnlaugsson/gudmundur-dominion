import { useState, useMemo, useEffect } from 'react'
import GameModal from '../components/GameModal'
import DATA from '../data'

export default function History({ targetGame, onClearTarget }) {
  const { games, players, expansions } = DATA
  const [search, setSearch] = useState('')
  const [filterPlayers, setFilterPlayers] = useState([])
  const [filterExp, setFilterExp] = useState('')
  const [filterVictory, setFilterVictory] = useState('')
  const [selectedGame, setSelectedGame] = useState(null)

  useEffect(() => {
    if (targetGame != null) {
      const game = games.find(g => g.game_num === targetGame)
      if (game) setSelectedGame(game)
      onClearTarget?.()
    }
  }, [targetGame]) // eslint-disable-line react-hooks/exhaustive-deps

  const sortedGames = useMemo(() => [...games].sort((a, b) => b.game_num - a.game_num), [games])

  const filtered = useMemo(() => {
    let list = sortedGames
    if (filterPlayers.length > 0) list = list.filter(g => filterPlayers.every(p => g.results.some(r => r.name === p)))
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
  }, [sortedGames, search, filterPlayers, filterExp, filterVictory])

  const victoryBadgeClass = {
    Province: 'badge-province',
    Colony: 'badge-colony',
    'Supply piles': 'badge-supply',
  }

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players])

  const availablePlayers = useMemo(() => {
    if (filterPlayers.length === 0) return sortedPlayers
    const sharedGames = games.filter(g => filterPlayers.every(p => g.results.some(r => r.name === p)))
    const sharedNames = new Set(sharedGames.flatMap(g => g.results.map(r => r.name)))
    return sortedPlayers.filter(p => !filterPlayers.includes(p.name) && sharedNames.has(p.name))
  }, [sortedPlayers, filterPlayers, games])

  function addPlayer(name) {
    if (name && !filterPlayers.includes(name)) setFilterPlayers(prev => [...prev, name])
  }

  function removePlayer(name) {
    setFilterPlayers(prev => prev.filter(p => p !== name))
  }

  return (
    <section className="section active">
      <h2 className="section-title">Leikasaga</h2>

      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginBottom: filterPlayers.length > 0 ? '.5rem' : '1rem', alignItems: 'center' }}>
        <input
          type="text"
          className="search-bar"
          placeholder="Leita eftir leikmann, korti, stað..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 0 }}
        />
        <select
          value=""
          onChange={e => { addPlayer(e.target.value); e.target.value = '' }}
          style={{ minWidth: '130px' }}
        >
          <option value="">Sía eftir leikmann…</option>
          {availablePlayers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
        <select value={filterExp} onChange={e => setFilterExp(e.target.value)}>
          <option value="">Allar viðbætur</option>
          {expansions.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filterVictory} onChange={e => setFilterVictory(e.target.value)}>
          <option value="">Allar sigurtegundir</option>
          <option value="Province">Héraðið</option>
          <option value="Colony">Nýlendur</option>
          <option value="Supply piles">Birgðahrúgar</option>
        </select>
      </div>

      {filterPlayers.length > 0 && (
        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '.78rem', color: 'var(--dim)' }}>Leikmenn:</span>
          {filterPlayers.map(name => (
            <button
              key={name}
              onClick={() => removePlayer(name)}
              style={{
                background: 'rgba(201,168,76,.15)', border: '1px solid var(--gold)',
                borderRadius: '99px', padding: '.25rem .65rem', fontSize: '.78rem',
                color: 'var(--gold)', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '.3rem',
              }}
            >
              {name} <span style={{ fontSize: '.7rem', opacity: .7 }}>✕</span>
            </button>
          ))}
          <button
            onClick={() => setFilterPlayers([])}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: '99px',
              padding: '.25rem .6rem', fontSize: '.72rem', color: 'var(--dim)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Hreinsa
          </button>
        </div>
      )}

      <div style={{ fontSize: '.82rem', color: 'var(--dim)', marginBottom: '.75rem' }}>
        {filtered.length} leik{filtered.length !== 1 ? 'ir' : 'ur'}
        {filterPlayers.length > 1 && <span style={{ marginLeft: '.4rem' }}>með alla {filterPlayers.length} leikendur</span>}
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
                {game.expansions?.includes('Prosperity') && (
                  <span className="badge badge-prosperity">Colony</span>
                )}
                {game.events?.length > 0 && <span className="badge badge-event">Events</span>}
                {game.landmarks?.length > 0 && <span className="badge badge-landmark">Landmarks</span>}
                {game.projects?.length > 0 && <span className="badge badge-project">Projects</span>}
                {game.allies?.length > 0 && <span className="badge badge-ally">Allies</span>}
                {game.ways?.length > 0 && <span className="badge badge-way">Ways</span>}
                {game.traits?.length > 0 && <span className="badge badge-trait">Traits</span>}
                {game.prophecy?.length > 0 && <span className="badge badge-prophecy">Prophecy</span>}
              </div>
              <div className="podium">
                {game.results.slice(0, 3).map(r => (
                  <span key={r.place} className={`p${r.place}`}>
                    {r.place === 1 ? '🥇' : r.place === 2 ? '🥈' : '🥉'} {r.name}
                    {r.score != null && <span style={{ color: 'var(--dim)', fontSize: '.78rem', marginLeft: '.3rem' }}>{r.score}stig</span>}
                  </span>
                ))}
              </div>
            </div>
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
