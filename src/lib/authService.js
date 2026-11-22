// All Firebase Auth + Firestore calls the AuthContext needs. This module is
// loaded with a dynamic import() after the first paint, so the ~500 KB of
// Firebase SDK never blocks the initial render of the statistics.
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut,
} from 'firebase/auth'
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '../firebase'

const LAST_SEEN_THROTTLE_MS = 60 * 60 * 1000

export async function loadUserRole(firebaseUser) {
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

export const watchAuthState = (callback) => onAuthStateChanged(auth, callback)

export const consumeRedirectResult = () => getRedirectResult(auth)

export const loginWithPopup = () => signInWithPopup(auth, googleProvider)

export const loginWithRedirect = () => signInWithRedirect(auth, googleProvider)

export const logout = () => signOut(auth)

export function watchAllowedUsers(onData, onError) {
  return onSnapshot(
    collection(db, 'allowedUsers'),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  )
}
