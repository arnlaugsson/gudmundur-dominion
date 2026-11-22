import { useState, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'

const UserManager = lazy(() => import('./UserManager'))

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
        {/* Portal: the header is its own stacking context (z-index 1), which
            would trap the modal under the sticky nav. */}
        {showUsers && createPortal(
          <Suspense fallback={null}>
            <UserManager onClose={() => setShowUsers(false)} />
          </Suspense>,
          document.body,
        )}
      </>
    )
  }

  return (
    <span className="login-anon">
      {authError && <span className="login-error" role="alert">{authError}</span>}
      <button className="login-btn" onClick={login}>
        Innskrá
      </button>
    </span>
  )
}
