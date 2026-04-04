import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdTokenResult()
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          allowed: token.claims.allowed === true,
          admin: token.claims.admin === true,
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const [authError, setAuthError] = useState(null)

  const login = async () => {
    setAuthError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const email = result.user.email
      const userDoc = await getDoc(doc(db, 'allowedUsers', email))
      if (!userDoc.exists()) {
        await signOut(auth)
        setAuthError('Þú hefur ekki aðgang. Hafðu samband við stjórnanda.')
        return
      }
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
