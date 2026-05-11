import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '../firebase'

const AuthContext = createContext(null)

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const role = await loadUserRole(firebaseUser)
          setUser(role)
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = async () => {
    setAuthError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const role = await loadUserRole(result.user)
      if (!role) {
        await signOut(auth)
        setAuthError('Þú hefur ekki aðgang. Hafðu samband við stjórnanda.')
        return
      }
      setUser(role)
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError('Innskráning mistókst.')
      }
    }
  }

  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, authError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
