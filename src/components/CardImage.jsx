import { useState } from 'react'
import { cardImgUrl, cardThumbUrl } from '../constants'
import TextCard from './TextCard'

// Tries the small thumbnail first, then the full scan (e.g. a card added after
// thumbnails were generated), then a text placeholder.
const SOURCES = { thumb: [cardThumbUrl, cardImgUrl], full: [cardImgUrl] }

export default function CardImage({ name, className = '', style = {}, loading = 'lazy', size = 'thumb' }) {
  const sources = SOURCES[size] || SOURCES.thumb
  const [attempt, setAttempt] = useState(0)

  if (attempt >= sources.length) {
    return <TextCard name={name} className={className} style={style} />
  }

  return (
    <img
      src={sources[attempt](name)}
      alt={name}
      loading={loading}
      decoding="async"
      className={className}
      style={style}
      onError={() => setAttempt(a => a + 1)}
    />
  )
}
