import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export function useMemories() {
  const { user } = useAuth()
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.allowed) {
      setMemories([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getDocs(collection(db, 'memories'))
      .then((snapshot) => {
        if (cancelled) return
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setMemories(docs)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [user?.allowed])

  const memoriesByGameNum = useMemo(() => {
    const map = new Map()
    for (const memory of memories) {
      for (const gameNum of memory.gameNums) {
        const existing = map.get(gameNum) || []
        map.set(gameNum, [...existing, memory])
      }
    }
    return map
  }, [memories])

  const photosByPlayer = useMemo(() => {
    const map = new Map()
    for (const memory of memories) {
      for (const photo of memory.photos || []) {
        for (const player of photo.taggedPlayers || []) {
          const existing = map.get(player) || []
          map.set(player, [...existing, { ...photo, gameNums: memory.gameNums }])
        }
      }
    }
    return map
  }, [memories])

  const refetch = () => {
    if (!user?.allowed) return
    setLoading(true)
    getDocs(collection(db, 'memories'))
      .then((snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setMemories(docs)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  return { memories, memoriesByGameNum, photosByPlayer, loading, error, refetch }
}
