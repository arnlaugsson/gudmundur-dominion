import { useState, useEffect, useMemo, useCallback } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export function usePlayerProfiles() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    if (!user?.allowed) {
      setProfiles([])
      return Promise.resolve()
    }
    setLoading(true)
    setError(null)
    return getDocs(collection(db, 'playerProfiles'))
      .then(snapshot => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        setProfiles(docs)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [user?.allowed])

  useEffect(() => {
    let cancelled = false
    if (!user?.allowed) {
      setProfiles([])
      return
    }
    setLoading(true)
    setError(null)
    getDocs(collection(db, 'playerProfiles'))
      .then(snapshot => {
        if (cancelled) return
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        setProfiles(docs)
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.allowed])

  const byName = useMemo(() => {
    const map = new Map()
    for (const p of profiles) map.set(p.id, p)
    return map
  }, [profiles])

  return { byName, refetch: load, loading, error }
}
