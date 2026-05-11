import { useState, useMemo, useEffect } from 'react'
import DATA from '../data'
import { useAuth } from '../context/AuthContext'
import { useMemories } from '../hooks/useMemories'
import { usePlayerProfiles } from '../hooks/usePlayerProfiles'
import { computeAchievements } from '../lib/achievements'
import Avatar from '../components/Avatar'
import AvatarPicker from '../components/AvatarPicker'
import PlayerBio from '../components/PlayerBio'
import PlayerBioEditor from '../components/PlayerBioEditor'
import HeadToHeadList from '../components/HeadToHeadList'
import AchievementBadge from '../components/AchievementBadge'
import PlayerPhotos from '../components/PlayerPhotos'

const CATEGORIES = [
  ['volume',    'Þátttaka'],
  ['wins',      'Sigrar'],
  ['records',   'Met'],
  ['streaks',   'Sigurraðir'],
  ['variety',   'Fjölbreytni'],
  ['rivalries', 'Keppinautar'],
]

export default function PlayerPage({ playerName }) {
  const { user } = useAuth()
  const { games, players } = DATA
  const { photosByPlayer } = useMemories()
  const { byName: profilesByName, refetch } = usePlayerProfiles()
  const [editingBio, setEditingBio] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const player = players.find(p => p.name === playerName)
  const profile = profilesByName.get(playerName)
  const isOwner = !!(user?.allowed && user?.playerName === playerName)
  const canEdit = isOwner || !!user?.admin

  const allAchievements = useMemo(() => computeAchievements(games, players), [games, players])
  const playerAchievements = allAchievements.get(playerName) || []

  const pgames = useMemo(
    () => games.filter(g => (g.players || []).includes(playerName)).sort((a, b) => a.game_num - b.game_num),
    [games, playerName],
  )
  const firstGame = pgames[0]

  // Redirect home if the player doesn't exist in DATA.
  useEffect(() => {
    if (!player) window.location.hash = 'players'
  }, [player])
  if (!player) return null

  const statItems = [
    { label: 'Leikir', value: player.games },
    { label: 'Sigrar', value: player.first },
    { label: 'Sigurhlutfall', value: `${player.win_rate.toFixed(0)}%` },
    { label: 'Meðalskor', value: player.avg_score ?? '—' },
    { label: '2. sæti', value: player.second },
    { label: '3. sæti', value: player.third },
  ]

  return (
    <section className="section active">
      <button
        onClick={() => { window.location.hash = 'players' }}
        style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: 0, fontSize: '.85rem', marginBottom: '.75rem' }}
      >← Til baka</button>

      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Avatar
          name={playerName}
          src={profile?.avatarUrl}
          size={120}
          onClick={canEdit ? () => setShowAvatarPicker(v => !v) : undefined}
        />
        <div style={{ flex: 1, minWidth: '12rem' }}>
          <h2 className="cinzel gold" style={{ fontSize: '1.5rem', marginBottom: '.2rem' }}>{playerName}</h2>
          {firstGame && (
            <div style={{ fontSize: '.82rem', color: 'var(--dim)', marginBottom: '.4rem' }}>
              Meðlimur síðan {firstGame.date ?? `leikur #${firstGame.game_num}`}
            </div>
          )}
          {canEdit && (
            <button
              onClick={() => setEditingBio(v => !v)}
              style={{
                background: 'var(--bg3)', border: '1px solid var(--border)',
                color: 'var(--gold)', borderRadius: 4, padding: '.3rem .7rem',
                cursor: 'pointer', fontSize: '.82rem',
              }}
            >{editingBio ? 'Loka' : 'Breyta prófíl'}</button>
          )}
        </div>
      </div>

      {showAvatarPicker && canEdit && (
        <AvatarPicker playerName={playerName} photosByPlayer={photosByPlayer} onChange={() => { refetch(); setShowAvatarPicker(false) }} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '.6rem', marginBottom: '1.25rem' }}>
        {statItems.map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '.5rem .7rem' }}>
            <div style={{ fontSize: '.62rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.15rem' }}>{label}</div>
            <div style={{ fontSize: '.9rem', fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.4rem' }}>Um mig</div>
        {editingBio
          ? <PlayerBioEditor playerName={playerName} profile={profile} onCancel={() => setEditingBio(false)} onSave={() => { refetch(); setEditingBio(false) }} />
          : <PlayerBio bio={profile?.bio} canEdit={canEdit} onEdit={() => setEditingBio(true)} />}
      </div>

      {playerAchievements.length > 0 && (
        <div className="achievement-group" style={{ marginBottom: '1.25rem' }}>
          <div className="achievement-group-label">Afrek · {playerAchievements.length}</div>
          {CATEGORIES.map(([cat, label]) => {
            const items = playerAchievements.filter(a => a.category === cat)
            if (items.length === 0) return null
            return (
              <div key={cat} style={{ marginTop: '.6rem' }}>
                <div style={{ fontSize: '.7rem', color: 'var(--dim)', marginBottom: '.3rem' }}>{label}</div>
                <div className="achievement-group-pills">
                  {items.map(a => <AchievementBadge key={a.id} achievement={a} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.4rem' }}>Síðustu leikir</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
          {pgames.slice(-10).reverse().map(g => {
            const r = g.results.find(r => r.name === playerName)
            return (
              <div key={g.game_num} style={{ fontSize: '.8rem', background: 'var(--bg3)', borderRadius: 4, padding: '.3rem .6rem', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--gold)' }}>#{g.game_num}</span>
                <span style={{ color: 'var(--dim)' }}>{g.date}</span>
                {r && (
                  <span style={{ color: r.place === 1 ? 'var(--gold)' : 'var(--dim)', marginLeft: 'auto' }}>
                    {r.place}. sæti{r.score != null ? ` · ${r.score} stig` : ''}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.4rem' }}>Hver vinnur hvern?</div>
        <HeadToHeadList playerName={playerName} profilesByName={profilesByName} />
      </div>

      {(photosByPlayer.get(playerName) || []).length > 0 && (
        <div>
          <div style={{ fontSize: '.75rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.4rem' }}>Myndir</div>
          <PlayerPhotos playerName={playerName} photosByPlayer={photosByPlayer} />
        </div>
      )}
    </section>
  )
}
