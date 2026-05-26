import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '../firebase'

const AuthContext = createContext(null)

const LAST_SEEN_THROTTLE_MS = 60 * 60 * 1000

async function loadUserRole(firebaseUser) {
  if (!firebaseUser) return null
  const userRef = doc(db, 'allowedUsers', firebaseUser.email)
  const userDoc = await getDoc(userRef)
  if (!userDoc.exists()) return null
  const data = userDoc.data()
  const lastSeenMs = data.lastSeen?.toMillis?.() ?? 0
  if (Date.now() - lastSeenMs > LAST_SEEN_THROTTLE_MS) {
    setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true })
      .catch((err) => console.error('Failed to update lastSeen:', err))
  }
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
  const [allowedUsers, setAllowedUsers] = useState(null)

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

  useEffect(() => {
    if (!user?.admin) {
      setAllowedUsers(null)
      return
    }
    const unsubscribe = onSnapshot(
      collection(db, 'allowedUsers'),
      (snap) => setAllowedUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('Failed to subscribe to allowedUsers:', err),
    )
    return unsubscribe
  }, [user?.admin])

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
    <AuthContext.Provider value={{ user, loading, login, logout, authError, allowedUsers }}>
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
