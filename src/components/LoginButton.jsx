import { useAuth } from '../context/AuthContext'

export default function LoginButton() {
  const { user, loading, login, logout, authError } = useAuth()

  if (loading) return null

  if (user) {
    return (
      <div className="login-user">
        <img
          src={user.photoURL}
          alt={user.displayName}
          className="login-avatar"
          referrerPolicy="no-referrer"
        />
        <button className="login-btn" onClick={logout}>
          Útskrá
        </button>
      </div>
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
