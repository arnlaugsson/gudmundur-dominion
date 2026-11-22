import { useState, useEffect, useCallback } from 'react'
import { fetchPublicStoryNames, setStoryPublic } from '../lib/publicStories'

export function usePublicStories() {
  const [names, setNames] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchPublicStoryNames()
      .then(found => { if (!cancelled) setNames(found) })
      .catch(err => {
        console.error('Failed to load public stories:', err)
        if (!cancelled) setError('Ekki tókst að sækja upplýsingar um opinber ár.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Optimistic toggle; rolls back and reports if the write fails.
  const setPublic = useCallback(async (playerName, isPublic) => {
    const update = on => prev => {
      const next = new Set(prev)
      if (on) next.add(playerName)
      else next.delete(playerName)
      return next
    }
    setNames(update(isPublic))
    setError(null)
    try {
      await setStoryPublic(playerName, isPublic)
    } catch (err) {
      console.error('Failed to update story visibility:', err)
      setNames(update(!isPublic))
      setError('Ekki tókst að vista stillinguna. Reyndu aftur.')
    }
  }, [])

  return { names, loading, error, setPublic }
}
