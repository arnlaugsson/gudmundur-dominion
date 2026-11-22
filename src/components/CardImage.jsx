import { useState } from 'react'
import { cardImgUrl, cardThumbUrl } from '../constants'

// Tries the small thumbnail first, then the full scan (e.g. a card added after
// thumbnails were generated), then a text placeholder.
const SOURCES = { thumb: [cardThumbUrl, cardImgUrl], full: [cardImgUrl] }

export default function CardImage({ name, className = '', style = {}, loading = 'lazy', size = 'thumb' }) {
  const sources = SOURCES[size] || SOURCES.thumb
  const [attempt, setAttempt] = useState(0)

  if (attempt >= sources.length) {
    return (
      <div className={`card-image-fallback ${className}`} style={style} title={`Engin mynd: ${name}`}>
        <span className="card-image-fallback-name">{name}</span>
      </div>
    )
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
