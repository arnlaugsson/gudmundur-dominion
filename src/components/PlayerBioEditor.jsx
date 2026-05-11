import { useMemo, useState } from 'react'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import DATA from '../data'

const MAX_TEXT = 280

function emptyBio() {
  return {
    shortBio: '',
    favoriteExpansion: '',
    favoriteCard: '',
    memorableVictory: { gameNum: '', text: '' },
    memorableLoss: { gameNum: '', text: '' },
  }
}

function bioFromProfile(bio) {
  if (!bio) return emptyBio()
  return {
    shortBio: bio.shortBio || '',
    favoriteExpansion: bio.favoriteExpansion || '',
    favoriteCard: bio.favoriteCard || '',
    memorableVictory: bio.memorableVictory
      ? { gameNum: String(bio.memorableVictory.gameNum ?? ''), text: bio.memorableVictory.text || '' }
      : { gameNum: '', text: '' },
    memorableLoss: bio.memorableLoss
      ? { gameNum: String(bio.memorableLoss.gameNum ?? ''), text: bio.memorableLoss.text || '' }
      : { gameNum: '', text: '' },
  }
}

function normalize(form) {
  return {
    shortBio: form.shortBio.trim() || null,
    favoriteExpansion: form.favoriteExpansion || null,
    favoriteCard: form.favoriteCard || null,
    memorableVictory: form.memorableVictory.gameNum
      ? { gameNum: Number(form.memorableVictory.gameNum), text: form.memorableVictory.text.trim() }
      : null,
    memorableLoss: form.memorableLoss.gameNum
      ? { gameNum: Number(form.memorableLoss.gameNum), text: form.memorableLoss.text.trim() }
      : null,
  }
}

export default function PlayerBioEditor({ playerName, profile, onCancel, onSave }) {
  const { user } = useAuth()
  const { games, expansions, cards } = DATA
  const [form, setForm] = useState(bioFromProfile(profile?.bio))
  const [saving, setSaving] = useState(false)

  const winningGames = useMemo(
    () => games.filter(g => g.results?.[0]?.name === playerName).map(g => g.game_num).sort((a, b) => a - b),
    [games, playerName],
  )
  const allGames = useMemo(
    () => games.filter(g => (g.players || []).includes(playerName)).map(g => g.game_num).sort((a, b) => a - b),
    [games, playerName],
  )
  const kingdomCardNames = useMemo(
    () => [...new Set(cards.filter(c => !c.isSupplyCard && !c.removed).map(c => c.name))].sort(),
    [cards],
  )

  async function save() {
    setSaving(true)
    try {
      await setDoc(
        doc(db, 'playerProfiles', playerName),
        {
          bio: normalize(form),
          updatedAt: Timestamp.now(),
          updatedBy: user?.email || null,
        },
        { merge: true },
      )
      onSave?.()
    } catch (err) {
      console.error('Failed to save bio:', err)
      alert('Villa við að vista prófíl: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)',
    borderRadius: 4, padding: '.3rem .5rem', fontSize: '.85rem', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: '.72rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.2rem' }
  const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '.2rem' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
      <div style={fieldStyle}>
        <label style={labelStyle}>Stutt bio ({form.shortBio.length}/{MAX_TEXT})</label>
        <textarea
          value={form.shortBio}
          maxLength={MAX_TEXT}
          onChange={e => setForm({ ...form, shortBio: e.target.value })}
          style={{ ...inputStyle, minHeight: '3rem', resize: 'vertical' }}
        />
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Uppáhalds viðbót</label>
        <select
          value={form.favoriteExpansion}
          onChange={e => setForm({ ...form, favoriteExpansion: e.target.value })}
          style={inputStyle}
        >
          <option value="">Engin valin</option>
          {expansions.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Uppáhaldsspil</label>
        <select
          value={form.favoriteCard}
          onChange={e => setForm({ ...form, favoriteCard: e.target.value })}
          style={inputStyle}
        >
          <option value="">Ekkert valið</option>
          {kingdomCardNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Eftirminnilegasti sigur</label>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          <select
            value={form.memorableVictory.gameNum}
            onChange={e => setForm({ ...form, memorableVictory: { ...form.memorableVictory, gameNum: e.target.value } })}
            style={{ ...inputStyle, width: '8rem' }}
          >
            <option value="">— leikur —</option>
            {winningGames.map(n => <option key={n} value={n}>#{n}</option>)}
          </select>
          <input
            type="text"
            value={form.memorableVictory.text}
            maxLength={MAX_TEXT}
            onChange={e => setForm({ ...form, memorableVictory: { ...form.memorableVictory, text: e.target.value } })}
            placeholder="Hvað gerðist?"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => setForm({ ...form, memorableVictory: { gameNum: '', text: '' } })}
            style={{ ...inputStyle, width: 'auto', background: 'var(--bg2)', cursor: 'pointer' }}
          >Hreinsa</button>
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Skemmtilegasta tapið</label>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          <select
            value={form.memorableLoss.gameNum}
            onChange={e => setForm({ ...form, memorableLoss: { ...form.memorableLoss, gameNum: e.target.value } })}
            style={{ ...inputStyle, width: '8rem' }}
          >
            <option value="">— leikur —</option>
            {allGames.map(n => <option key={n} value={n}>#{n}</option>)}
          </select>
          <input
            type="text"
            value={form.memorableLoss.text}
            maxLength={MAX_TEXT}
            onChange={e => setForm({ ...form, memorableLoss: { ...form.memorableLoss, text: e.target.value } })}
            placeholder="Hvað gerðist?"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => setForm({ ...form, memorableLoss: { gameNum: '', text: '' } })}
            style={{ ...inputStyle, width: 'auto', background: 'var(--bg2)', cursor: 'pointer' }}
          >Hreinsa</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '.3rem' }}>
        <button
          onClick={onCancel}
          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--dim)', borderRadius: 4, padding: '.35rem .7rem', cursor: 'pointer' }}
        >Hætta við</button>
        <button
          onClick={save}
          disabled={saving}
          style={{ background: 'var(--gold)', border: 'none', color: '#0d1117', borderRadius: 4, padding: '.35rem .7rem', cursor: 'pointer', fontWeight: 600 }}
        >{saving ? 'Vista…' : 'Vista'}</button>
      </div>
    </div>
  )
}
