import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import DATA from '../data'

export default function UserManager({ onClose }) {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newAdmin, setNewAdmin] = useState(false)
  const [saving, setSaving] = useState(false)

  const playerNames = useMemo(
    () => [...DATA.players].sort((a, b) => a.name.localeCompare(b.name)).map((p) => p.name),
    [],
  )

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'allowedUsers'))
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  const addUser = async () => {
    const email = newEmail.trim().toLowerCase()
    if (!email) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'allowedUsers', email), {
        email,
        name: newName.trim() || email.split('@')[0],
        admin: newAdmin,
      })
      setNewEmail('')
      setNewName('')
      setNewAdmin(false)
      await loadUsers()
    } catch (err) {
      alert('Villa: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const removeUser = async (email) => {
    if (email === user.email) {
      alert('Þú getur ekki fjarlægt sjálfan þig.')
      return
    }
    if (!confirm(`Fjarlægja ${email}?`)) return
    try {
      await deleteDoc(doc(db, 'allowedUsers', email))
      await loadUsers()
    } catch (err) {
      alert('Villa: ' + err.message)
    }
  }

  const toggleAdmin = async (u) => {
    if (u.email === user.email) {
      alert('Þú getur ekki breytt eigin réttindum.')
      return
    }
    try {
      await setDoc(doc(db, 'allowedUsers', u.email), {
        ...u,
        admin: !u.admin,
      })
      await loadUsers()
    } catch (err) {
      alert('Villa: ' + err.message)
    }
  }

  const setPlayerName = async (u, value) => {
    try {
      await setDoc(doc(db, 'allowedUsers', u.email), {
        ...u,
        playerName: value || null,
      })
      await loadUsers()
    } catch (err) {
      alert('Villa: ' + err.message)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="cinzel gold" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
          Notendur
        </h2>

        {loading ? (
          <div style={{ color: 'var(--dim)', fontSize: '0.85rem' }}>Hleður...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
            {users.map((u) => (
              <div
                key={u.email}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'var(--bg3)', borderRadius: '6px', padding: '0.5rem 0.75rem',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem' }}>{u.name || u.email}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>{u.email}</div>
                </div>
                <select
                  value={u.playerName || ''}
                  onChange={(e) => setPlayerName(u, e.target.value)}
                  title="Tengja við leikmann"
                  style={{
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    color: 'var(--text)', borderRadius: '3px', padding: '2px 4px',
                    fontSize: '0.75rem', fontFamily: 'inherit', maxWidth: '110px',
                  }}
                >
                  <option value="">(óvalinn)</option>
                  {playerNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <button
                  className={u.admin ? 'memory-tag' : 'memory-add-tag'}
                  onClick={() => toggleAdmin(u)}
                  title={u.admin ? 'Stjórnandi — smelltu til að breyta' : 'Smelltu til að gera stjórnanda'}
                >
                  {u.admin ? 'Stjórnandi' : 'Lesandi'}
                </button>
                <button
                  onClick={() => removeUser(u.email)}
                  style={{
                    background: 'none', border: '1px solid var(--border)', color: 'var(--red)',
                    borderRadius: '3px', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px',
                  }}
                >✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={{
          borderTop: '1px solid var(--border)', paddingTop: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--dim)' }}>Bæta við notanda:</div>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
            placeholder="Netfang (Google)"
            style={{
              width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
              color: 'var(--text)', borderRadius: '4px', padding: '0.4rem 0.5rem',
              fontSize: '16px', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
            placeholder="Nafn"
            style={{
              width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
              color: 'var(--text)', borderRadius: '4px', padding: '0.4rem 0.5rem',
              fontSize: '16px', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
          <label style={{ fontSize: '0.8rem', color: 'var(--dim)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={newAdmin}
              onChange={(e) => setNewAdmin(e.target.checked)}
            />
            Stjórnandi (getur breytt minningum)
          </label>
          <button
            className="memory-save-btn"
            onClick={addUser}
            disabled={saving || !newEmail.trim()}
            style={{ alignSelf: 'flex-start', padding: '0.4rem 1rem' }}
          >
            {saving ? 'Bæti við...' : 'Bæta við'}
          </button>
        </div>
      </div>
    </div>
  )
}
