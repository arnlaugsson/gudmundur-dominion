import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyBvnYE8JKdOg-gdgph74WlA7st1Hvrf2J8',
  authDomain: 'dominon-1e56c.firebaseapp.com',
  projectId: 'dominon-1e56c',
  storageBucket: 'dominon-1e56c.firebasestorage.app',
  messagingSenderId: '647100592549',
  appId: '1:647100592549:web:01b13e8f7258ff7f7ef84c',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
export const storage = getStorage(app)
