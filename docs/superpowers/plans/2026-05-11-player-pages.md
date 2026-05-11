# Player Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-player pages with editable avatar (from tagged photos) + 5-field bio, plus a head-to-head opponent list. Logged-in players can edit their own profile via an email→player mapping; admins can edit anyone's.

**Architecture:** New `playerProfiles/{playerName}` Firestore collection + a `playerName` field on `allowedUsers`. Hash sub-route `#players/<name>` renders a new `PlayerPage` component. Existing `PlayerModal` keeps working as a quick peek and gains a link to the page.

**Tech Stack:** React 18, Vite 5, Firebase Auth + Firestore + Storage. No test runner — verification is manual via `npm run build` and the browser.

**Spec:** [`docs/superpowers/specs/2026-05-11-player-pages-design.md`](../specs/2026-05-11-player-pages-design.md).

---

## Task 1: Firestore rules — playerProfiles + helpers

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add the helper functions and playerProfiles match block**

Open `firestore.rules`. After the existing `isAdmin()` function and before the closing brace of the `service cloud.firestore` block, change:

```ruby
    function isAllowed() {
      return request.auth != null
        && exists(/databases/$(database)/documents/allowedUsers/$(request.auth.token.email));
    }

    function isAdmin() {
      return request.auth != null
        && get(/databases/$(database)/documents/allowedUsers/$(request.auth.token.email)).data.admin == true;
    }
```

to:

```ruby
    function isAllowed() {
      return request.auth != null
        && exists(/databases/$(database)/documents/allowedUsers/$(request.auth.token.email));
    }

    function isAdmin() {
      return request.auth != null
        && get(/databases/$(database)/documents/allowedUsers/$(request.auth.token.email)).data.admin == true;
    }

    function callerPlayerName() {
      return get(/databases/$(database)/documents/allowedUsers/$(request.auth.token.email)).data.playerName;
    }
```

Then add this new match block right after the existing `match /memories/{memoryId}` block:

```ruby
    match /playerProfiles/{playerName} {
      allow read: if isAllowed();
      allow create, update: if isAllowed()
        && (isAdmin() || callerPlayerName() == playerName);
      allow delete: if isAdmin();
    }
```

- [ ] **Step 2: Verify the rules syntax compiles**

These rules deploy via Firebase CLI separately from the app; we can't fully test locally without `firebase emulators`. Visually verify the syntax matches the existing style. Run `npm run build` (which doesn't run rules, but confirms the file change didn't accidentally break anything else).

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(rules): allow players to edit their own playerProfiles doc"
```

---

## Task 2: AuthContext — surface playerName

**Files:**
- Modify: `src/context/AuthContext.jsx`

- [ ] **Step 1: Add `playerName` to the role object**

Open `src/context/AuthContext.jsx`. In the `loadUserRole` function, change:

```js
async function loadUserRole(firebaseUser) {
  if (!firebaseUser) return null
  const userDoc = await getDoc(doc(db, 'allowedUsers', firebaseUser.email))
  if (!userDoc.exists()) return null
  const data = userDoc.data()
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    allowed: true,
    admin: data.admin === true,
  }
}
```

to:

```js
async function loadUserRole(firebaseUser) {
  if (!firebaseUser) return null
  const userDoc = await getDoc(doc(db, 'allowedUsers', firebaseUser.email))
  if (!userDoc.exists()) return null
  const data = userDoc.data()
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    allowed: true,
    admin: data.admin === true,
    playerName: data.playerName || null,
  }
}
```

- [ ] **Step 2: Build**

Run `npm run build`. Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/context/AuthContext.jsx
git commit -m "feat(auth): surface playerName from allowedUsers on the user object"
```

---

## Task 3: usePlayerProfiles hook

**Files:**
- Create: `src/hooks/usePlayerProfiles.js`

Mirror the existing `useMemories` pattern: one-shot `getDocs` on mount, expose `refetch()` for callers to invoke after writes.

- [ ] **Step 1: Create the file**

Create `src/hooks/usePlayerProfiles.js`:

```js
import { useState, useEffect, useMemo, useCallback } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export function usePlayerProfiles() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    if (!user?.allowed) {
      setProfiles([])
      return Promise.resolve()
    }
    setLoading(true)
    setError(null)
    return getDocs(collection(db, 'playerProfiles'))
      .then(snapshot => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        setProfiles(docs)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [user?.allowed])

  useEffect(() => {
    let cancelled = false
    if (!user?.allowed) {
      setProfiles([])
      return
    }
    setLoading(true)
    setError(null)
    getDocs(collection(db, 'playerProfiles'))
      .then(snapshot => {
        if (cancelled) return
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        setProfiles(docs)
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.allowed])

  const byName = useMemo(() => {
    const map = new Map()
    for (const p of profiles) map.set(p.id, p)
    return map
  }, [profiles])

  return { byName, refetch: load, loading, error }
}
```

- [ ] **Step 2: Build**

Run `npm run build`. Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePlayerProfiles.js
git commit -m "feat(hooks): usePlayerProfiles — Firestore-backed profiles map"
```

---

## Task 4: Avatar component + CSS

**Files:**
- Create: `src/components/Avatar.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: Create the component**

Create `src/components/Avatar.jsx`:

```jsx
import { useState } from 'react'

function initialsFor(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function colorFor(name) {
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return `hsl(${h % 360}, 55%, 50%)`
}

export default function Avatar({ name, src, size = 60, onClick }) {
  const [failed, setFailed] = useState(false)
  const clickable = !!onClick
  const style = {
    width: size,
    height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: src && !failed ? 'var(--bg3)' : colorFor(name || ''),
    color: '#fff',
    fontWeight: 600,
    fontSize: size * 0.4,
    flexShrink: 0,
    cursor: clickable ? 'pointer' : 'default',
  }
  return (
    <div className="avatar" style={style} onClick={onClick} title={name || ''}>
      {src && !failed
        ? <img src={src} alt={name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setFailed(true)} />
        : <span>{initialsFor(name)}</span>}
    </div>
  )
}
```

- [ ] **Step 2: Add CSS hover hint for clickable avatars**

Open `src/index.css`. Add this block alongside the other component styles (near the existing photo / memory styles):

```css
/* ── AVATAR ── */
.avatar { transition: box-shadow .15s, transform .15s; }
.avatar:hover[style*="cursor: pointer"] { box-shadow: 0 0 0 2px var(--gold); }
```

- [ ] **Step 3: Build**

Run `npm run build`. Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/components/Avatar.jsx src/index.css
git commit -m "feat(components): Avatar — image or initials circle with hover"
```

---

## Task 5: AvatarPicker component

**Files:**
- Create: `src/components/AvatarPicker.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/AvatarPicker.jsx`:

```jsx
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function AvatarPicker({ playerName, photosByPlayer, onChange }) {
  const { user } = useAuth()
  const photos = photosByPlayer?.get(playerName) || []

  async function pick(photo) {
    try {
      await setDoc(
        doc(db, 'playerProfiles', playerName),
        {
          avatarUrl: photo?.url || null,
          avatarPhotoStoragePath: photo?.storagePath || null,
          updatedAt: Timestamp.now(),
          updatedBy: user?.email || null,
        },
        { merge: true },
      )
      onChange?.()
    } catch (err) {
      console.error('Failed to set avatar:', err)
      alert('Villa við að vista prófílmynd: ' + err.message)
    }
  }

  if (photos.length === 0) {
    return (
      <div style={{ fontSize: '.85rem', color: 'var(--dim)', padding: '.75rem 0' }}>
        Engar myndir til að velja úr. Bættu þér við sem tag á einhverri mynd fyrst.
      </div>
    )
  }

  return (
    <div style={{ marginTop: '.5rem' }}>
      <div style={{ fontSize: '.7rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.4rem' }}>
        Veldu prófílmynd
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
        {photos.map((p, i) => (
          <img
            key={p.url + '-' + i}
            src={p.url}
            alt=""
            onClick={() => pick(p)}
            style={{
              width: 60, height: 60, borderRadius: 6, objectFit: 'cover',
              cursor: 'pointer', border: '1px solid var(--border)',
            }}
          />
        ))}
        <button
          onClick={() => pick(null)}
          style={{
            width: 60, height: 60, borderRadius: 6,
            background: 'var(--bg2)', border: '1px dashed var(--border)',
            color: 'var(--dim)', fontSize: '.7rem', cursor: 'pointer',
          }}
        >
          Engin
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run `npm run build`. Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/AvatarPicker.jsx
git commit -m "feat(components): AvatarPicker — pick avatar from tagged photos"
```

---

## Task 6: PlayerBio component (read-only)

**Files:**
- Create: `src/components/PlayerBio.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/PlayerBio.jsx`:

```jsx
function navigateToGame(gameNum) {
  // Reuse the History tab's targetGame mechanism: set hash, then App's
  // existing handleGameNav can be triggered by listening at App-level.
  // Simpler: just set the hash to history and open the game modal there.
  window.location.hash = 'history'
  // Future enhancement: pre-target the game (not in this PR).
  // For now, navigation to History is enough; the user can find the game.
  // To avoid silent failure, log so we know when this is used.
  console.debug('Navigate to game #' + gameNum)
}

export default function PlayerBio({ bio, onEdit, canEdit }) {
  const filled = !!(bio?.shortBio || bio?.favoriteExpansion || bio?.favoriteCard || bio?.memorableVictory || bio?.memorableLoss)

  if (!filled) {
    return (
      <div style={{ color: 'var(--dim)', fontSize: '.85rem', padding: '.4rem 0' }}>
        Engar prófíl-upplýsingar enn.
        {canEdit && (
          <button
            onClick={onEdit}
            style={{
              marginLeft: '.5rem', background: 'none', border: 'none',
              color: 'var(--gold)', cursor: 'pointer', fontSize: '.85rem', padding: 0,
            }}
          >
            [Bæta við]
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', fontSize: '.88rem' }}>
      {bio.shortBio && (
        <div>{bio.shortBio}</div>
      )}
      {bio.favoriteExpansion && (
        <div><span style={{ color: 'var(--dim)' }}>Uppáhalds viðbót: </span>{bio.favoriteExpansion}</div>
      )}
      {bio.favoriteCard && (
        <div><span style={{ color: 'var(--dim)' }}>Uppáhaldsspil: </span>{bio.favoriteCard}</div>
      )}
      {bio.memorableVictory?.gameNum != null && (
        <div>
          <span style={{ color: 'var(--dim)' }}>Eftirminnilegasti sigur: </span>
          <button
            onClick={() => navigateToGame(bio.memorableVictory.gameNum)}
            style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: 0, font: 'inherit' }}
          >
            leikur #{bio.memorableVictory.gameNum}
          </button>
          {bio.memorableVictory.text && <span> — "{bio.memorableVictory.text}"</span>}
        </div>
      )}
      {bio.memorableLoss?.gameNum != null && (
        <div>
          <span style={{ color: 'var(--dim)' }}>Skemmtilegasta tapið: </span>
          <button
            onClick={() => navigateToGame(bio.memorableLoss.gameNum)}
            style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: 0, font: 'inherit' }}
          >
            leikur #{bio.memorableLoss.gameNum}
          </button>
          {bio.memorableLoss.text && <span> — "{bio.memorableLoss.text}"</span>}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run `npm run build`. Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlayerBio.jsx
git commit -m "feat(components): PlayerBio — read-only bio display"
```

---

## Task 7: PlayerBioEditor component

**Files:**
- Create: `src/components/PlayerBioEditor.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/PlayerBioEditor.jsx`:

```jsx
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
```

- [ ] **Step 2: Build**

Run `npm run build`. Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlayerBioEditor.jsx
git commit -m "feat(components): PlayerBioEditor — edit the 5 bio fields"
```

---

## Task 8: HeadToHeadList component

**Files:**
- Create: `src/components/HeadToHeadList.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/HeadToHeadList.jsx`:

```jsx
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
```

- [ ] **Step 2: Build**

Run `npm run build`. Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeadToHeadList.jsx
git commit -m "feat(components): HeadToHeadList — opponents with avatars + record"
```

---

## Task 9: PlayerPage + hash sub-routing

**Files:**
- Create: `src/tabs/PlayerPage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create the PlayerPage component**

Create `src/tabs/PlayerPage.jsx`:

```jsx
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
```

- [ ] **Step 2: Extend hash parsing in App.jsx**

Open `src/App.jsx`. Replace the `getTabFromHash` function:

```jsx
function getTabFromHash() {
  const hash = window.location.hash.slice(1)
  return VALID_TABS.has(hash) ? hash : 'dashboard'
}
```

with:

```jsx
function parseHash() {
  const raw = window.location.hash.slice(1)
  const [head, sub] = raw.split('/')
  const tab = VALID_TABS.has(head) ? head : 'dashboard'
  const playerName = head === 'players' && sub ? decodeURIComponent(sub) : null
  return { tab, playerName }
}
```

Then replace the `useState`/`useEffect` that consume the old function. Find:

```jsx
const [activeTab, setActiveTab] = useState(getTabFromHash)
```

and the hashchange listener. Change them to:

```jsx
const [route, setRoute] = useState(parseHash)
const activeTab = route.tab
const viewPlayerName = route.playerName

const navigateTo = useCallback((tab) => {
  window.location.hash = tab
}, [])

useEffect(() => {
  const onHashChange = () => setRoute(parseHash())
  window.addEventListener('hashchange', onHashChange)
  return () => window.removeEventListener('hashchange', onHashChange)
}, [])
```

- [ ] **Step 3: Route the new component in App.jsx**

In the lazy-imports near the top, add:

```jsx
const PlayerPage = lazy(() => import('./tabs/PlayerPage'))
```

In the render switch (inside `<Suspense>`), replace the existing `players` line:

```jsx
{activeTab === 'players' && <Players />}
```

with:

```jsx
{activeTab === 'players' && (viewPlayerName
  ? <PlayerPage playerName={viewPlayerName} />
  : <Players />)}
```

- [ ] **Step 4: Build**

Run `npm run build`. Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/tabs/PlayerPage.jsx src/App.jsx
git commit -m "feat(players): PlayerPage + hash sub-route #players/<name>"
```

---

## Task 10: Players.jsx — row click → hash navigation

**Files:**
- Modify: `src/tabs/Players.jsx`

- [ ] **Step 1: Replace modal navigation with hash navigation**

Open `src/tabs/Players.jsx`. Locate the row's onClick that currently does `setSelectedPlayer(...)`. Two changes:

(a) The state `[selectedPlayer, setSelectedPlayer]` and its `<PlayerModal>` consumer can stay so the file still works when the Afrek tab opens a modal (out of scope of this task). But the Players list itself should now navigate.

Find the row onClick — the line that opens the modal. It's likely `onClick={() => setSelectedPlayer(p.name)}`. Replace with:

```jsx
onClick={() => { window.location.hash = `players/${encodeURIComponent(p.name)}` }}
```

(b) If a `PlayerModal` render at the bottom of `Players.jsx` is *only* triggered from the row click (i.e., nothing else uses it), it's now dead code and can be removed in this task. Inspect the file and remove the modal render only if it's not referenced from another component or state path. If unsure, leave it — the modal still works, just won't open from this tab anymore.

- [ ] **Step 2: Build**

Run `npm run build`. Expected: success.

- [ ] **Step 3: Verify in the browser** — substitute with `npm run build`. Functional verification later.

- [ ] **Step 4: Commit**

```bash
git add src/tabs/Players.jsx
git commit -m "feat(players): row click → navigate to player page"
```

---

## Task 11: PlayerModal — add "Sjá fulla síðu →" link

**Files:**
- Modify: `src/components/PlayerModal.jsx`

- [ ] **Step 1: Add the link at the top of the modal body**

Open `src/components/PlayerModal.jsx`. Find the modal body. Near the player name header (the `<h2>` element rendering `{p.name}`), add a link button right above or below the header:

```jsx
<button
  onClick={() => {
    window.location.hash = `players/${encodeURIComponent(p.name)}`
    onClose?.()
  }}
  style={{
    background: 'none', border: 'none', color: 'var(--gold)',
    cursor: 'pointer', padding: 0, fontSize: '.82rem', marginBottom: '.4rem',
  }}
>Sjá fulla síðu →</button>
```

Place it directly under the `<button className="modal-close">…</button>` and before the `<h2>` so it sits at the top of the body.

- [ ] **Step 2: Build**

Run `npm run build`. Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlayerModal.jsx
git commit -m "feat(player-modal): add 'Sjá fulla síðu' link to player page"
```

---

## Task 12: UserManager — playerName column

**Files:**
- Modify: `src/components/UserManager.jsx`

This task adds an admin control to assign player names to allowed users. Read the file first to understand its layout — it's the existing admin tool for managing the `allowedUsers` collection.

- [ ] **Step 1: Read the current UserManager.jsx**

Use the Read tool. Identify:
- Where the table/list of users is rendered.
- Where existing fields (e.g., admin toggle) are edited and saved via `setDoc` / `updateDoc`.

- [ ] **Step 2: Add a player-name select control to each row**

For each row of the allowed-users table, add a new cell with a `<select>` populated from `DATA.players.map(p => p.name).sort()`. The first option is `<option value="">(óvalinn)</option>`. The select's current value is the user's `playerName` (or empty string).

On change, persist via the same pattern the existing admin toggle uses. Skeleton:

```jsx
import DATA from '../data'
// ...
const playerNames = useMemo(
  () => [...DATA.players].sort((a, b) => a.name.localeCompare(b.name)).map(p => p.name),
  [],
)
// ...
async function setPlayerName(email, value) {
  await updateDoc(doc(db, 'allowedUsers', email), { playerName: value || null })
  refetch()
}
// ...
<select
  value={u.playerName || ''}
  onChange={e => setPlayerName(u.id, e.target.value)}
>
  <option value="">(óvalinn)</option>
  {playerNames.map(n => <option key={n} value={n}>{n}</option>)}
</select>
```

Use whatever `useMemo` / state names already exist in the file — match its style.

- [ ] **Step 3: Build**

Run `npm run build`. Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/components/UserManager.jsx
git commit -m "feat(user-manager): admin can assign playerName per allowed user"
```

---

## Task 13: Final verification + push + PR

**Files:** none — verification + ship.

- [ ] **Step 1: Confirm clean tree**

Run `git status --porcelain` from the worktree. Expected: empty.

- [ ] **Step 2: Production build**

Run `npm run build`. Expected: success.

- [ ] **Step 3: Manual visual sweep with `npm run dev`**

Navigate to `http://localhost:5173/` and verify:

- Players tab list still renders, row click navigates to `#players/<name>` and shows the PlayerPage.
- PlayerPage renders for every named player (try Mummi and a player with few games).
- Logged-out / non-mapped user: no edit affordances visible.
- Logged-in user with their `playerName` set (test by manually editing `allowedUsers/{email}` in the Firebase console to set `playerName: 'YourName'`):
  - "Breyta prófíl" button visible only on their own page.
  - Clicking it opens `PlayerBioEditor`; Vista saves, Hætta við discards.
  - Clicking the 120px avatar opens `AvatarPicker`. Selecting a thumbnail sets the avatar. "Engin" clears it.
- Admin user: "Breyta prófíl" visible on every page.
- HeadToHeadList shows opponents with ≥3 shared games, sorted by total. Click row → navigates to that opponent.
- PlayerModal (still used by Afrek leaderboard) shows the new "Sjá fulla síðu →" link at the top.
- UserManager admin UI shows a new player-name dropdown next to each allowed user; selecting one persists.

- [ ] **Step 4: Branch summary + push**

```bash
git log --oneline main..HEAD
git push -u origin feat/player-pages
```

- [ ] **Step 5: Open the PR**

```bash
gh pr create --title "Player pages with editable bio + avatar (#17)" --body "$(cat <<'EOF'
Implements the design at docs/superpowers/specs/2026-05-11-player-pages-design.md (merged in PR #41).

## Summary

- New \`playerProfiles/{playerName}\` Firestore collection holding avatar URL + 5-field bio.
- Email → player mapping via \`playerName\` on \`allowedUsers/{email}\`; admin sets it in \`UserManager\`.
- New hash sub-route \`#players/<name>\` renders \`PlayerPage\` — avatar (120px) + name + stats + bio + achievements + recent games + head-to-head opponents + tagged photo gallery.
- Players list row click navigates to the page. Existing \`PlayerModal\` retained for quick peek (used by Afrek leaderboard) and gains a "Sjá fulla síðu →" link.
- Avatar picker shows the player's own tagged photos; pick any one and it's saved as the profile photo.
- Bio editor saves all 5 fields (uppáhalds viðbót, uppáhaldsspil, eftirminnilegasti sigur with game-pick, skemmtilegasta tapið with game-pick, stutt bio).
- Head-to-head list sorted by shared-game count, only shows opponents with ≥3 games.
- Firestore rules enforce per-player edit permissions; admins can edit any profile.

## Test plan

- [ ] Players tab → click row → PlayerPage renders for that player.
- [ ] Direct hash visit \`#players/Mummi\` works.
- [ ] Logged-out: read-only everywhere.
- [ ] Logged-in non-mapped user: no edits anywhere.
- [ ] Logged-in mapped user: edits on own page, read-only on others.
- [ ] Admin: edits anywhere.
- [ ] Avatar picker: shows tagged photos, sets/clears avatar.
- [ ] Bio editor: saves and re-renders all 5 fields.
- [ ] H2H rows clickable → other player's page.
- [ ] UserManager: playerName dropdown saves.
- [ ] PlayerModal still works from Afrek leaderboard; "Sjá fulla síðu →" link navigates.
EOF
)"
```

## Self-Review Notes

Spec coverage check:

- ✅ `playerProfiles/{playerName}` collection — Tasks 1, 5, 7
- ✅ `playerName` on `allowedUsers` — Tasks 1, 2, 12
- ✅ Hash sub-route `#players/<name>` — Task 9
- ✅ `Avatar` — Task 4
- ✅ `AvatarPicker` — Task 5
- ✅ `PlayerBio` — Task 6
- ✅ `PlayerBioEditor` — Task 7
- ✅ `HeadToHeadList` — Task 8
- ✅ `PlayerPage` — Task 9
- ✅ `Players.jsx` row-click change — Task 10
- ✅ `PlayerModal` link — Task 11
- ✅ `UserManager` dropdown — Task 12
- ✅ Firestore rules — Task 1
- ✅ `AuthContext` playerName surface — Task 2
- ✅ `usePlayerProfiles` — Task 3
- ✅ Manual verification + ship — Task 13

Type / name consistency:
- `computeAchievements(games, players)` signature consistent ✅
- `Achievement` shape consistent with the achievements module ✅
- `bio` field names consistent across editor / display / Firestore: `shortBio`, `favoriteExpansion`, `favoriteCard`, `memorableVictory.{gameNum,text}`, `memorableLoss.{gameNum,text}` ✅
- Avatar props `{ name, src, size, onClick }` consistent across consumers (PlayerPage 120px, HeadToHeadList 32px) ✅
- `usePlayerProfiles` returns `{ byName, refetch, loading, error }` — consumers (PlayerPage, HeadToHeadList) use `byName` and `refetch` ✅

No placeholders found.
