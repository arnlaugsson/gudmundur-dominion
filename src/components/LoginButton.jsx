import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import UserManager from './UserManager'

export default function LoginButton() {
  const { user, loading, login, logout, authError } = useAuth()
  const [showUsers, setShowUsers] = useState(false)

  if (loading) return null

  if (user) {
    return (
      <>
        <div className="login-user">
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="login-avatar"
            referrerPolicy="no-referrer"
          />
          {user.admin && (
            <button className="login-btn" onClick={() => setShowUsers(true)}>
              Notendur
            </button>
          )}
          <button className="login-btn" onClick={logout}>
            Útskrá
          </button>
        </div>
        {showUsers && <UserManager onClose={() => setShowUsers(false)} />}
      </>
    )
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      {authError && <span style={{ color: 'var(--red)', fontSize: '0.75rem' }}>{authError}</span>}
      <button className="login-btn" onClick={login}>
        Innskrá
      </button>
    </span>
  )
}
