import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

const AuthContext = createContext(null)

const NO_ACCESS_MSG = 'Þú hefur ekki aðgang. Hafðu samband við stjórnanda.'
const LOGIN_FAILED_MSG = 'Innskráning mistókst.'
const AUTH_UNAVAILABLE_MSG = 'Innskráning er ekki tiltæk í augnablikinu.'

// Firebase is loaded lazily and only once; every caller shares the promise.
let servicePromise = null
function loadAuthService() {
  if (!servicePromise) {
    servicePromise = import('../lib/authService').catch((err) => {
      servicePromise = null
      throw err
    })
  }
  return servicePromise
}

async function rejectIfNotAllowed(service, firebaseUser, setAuthError) {
  const role = await service.loadUserRole(firebaseUser)
  if (!role) {
    await service.logout()
    setAuthError(NO_ACCESS_MSG)
  }
  return role
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [allowedUsers, setAllowedUsers] = useState(null)

  useEffect(() => {
    let unsubscribe = () => {}
    let cancelled = false

    loadAuthService()
      .then((service) => {
        if (cancelled) return
        // Handle returning from signInWithRedirect (Safari fallback)
        service.consumeRedirectResult()
          .then((result) => result?.user && rejectIfNotAllowed(service, result.user, setAuthError))
          .catch((err) => console.error('Redirect sign-in failed:', err))

        unsubscribe = service.watchAuthState(async (firebaseUser) => {
          try {
            setUser(firebaseUser ? await service.loadUserRole(firebaseUser) : null)
          } catch (err) {
            console.error('Failed to load user role:', err)
            setUser(null)
          }
          setLoading(false)
        })
      })
      .catch((err) => {
        console.error('Failed to load Firebase auth:', err)
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user?.admin) {
      setAllowedUsers(null)
      return undefined
    }
    let unsubscribe = () => {}
    let cancelled = false
    loadAuthService().then((service) => {
      if (cancelled) return
      unsubscribe = service.watchAllowedUsers(
        setAllowedUsers,
        (err) => console.error('Failed to subscribe to allowedUsers:', err),
      )
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [user?.admin])

  const login = useCallback(async () => {
    setAuthError(null)
    let service
    try {
      service = await loadAuthService()
    } catch {
      setAuthError(AUTH_UNAVAILABLE_MSG)
      return
    }
    try {
      const result = await service.loginWithPopup()
      const role = await rejectIfNotAllowed(service, result.user, setAuthError)
      if (role) setUser(role)
    } catch (err) {
      if (err.code === 'auth/popup-blocked') {
        // Safari blocks popups — fall back to redirect flow
        service.loginWithRedirect()
      } else if (err.code !== 'auth/popup-closed-by-user') {
        console.error('Login failed:', err)
        setAuthError(LOGIN_FAILED_MSG)
      }
    }
  }, [])

  const logout = useCallback(() => loadAuthService().then((s) => s.logout()), [])

  const value = useMemo(
    () => ({ user, loading, login, logout, authError, allowedUsers }),
    [user, loading, login, logout, authError, allowedUsers],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
