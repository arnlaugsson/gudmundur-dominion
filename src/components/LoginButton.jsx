import { useAuth } from '../context/AuthContext'

export default function LoginButton() {
  const { user, loading, login, logout } = useAuth()

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
    <button className="login-btn" onClick={login}>
      Innskrá
    </button>
  )
}
