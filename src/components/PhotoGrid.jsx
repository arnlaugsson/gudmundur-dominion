import { useState, useEffect } from 'react'

export default function PhotoGrid({ photos }) {
  const [lightboxIndex, setLightboxIndex] = useState(null)

  if (!photos || photos.length === 0) return null

  const sorted = [...photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const isOpen = lightboxIndex !== null

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowRight' && lightboxIndex < sorted.length - 1) setLightboxIndex(lightboxIndex + 1)
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, lightboxIndex, sorted.length])

  return (
    <>
      <div className="photo-grid">
        {sorted.map((photo, i) => (
          <div
            key={photo.url || i}
            className="photo-item"
            onClick={() => setLightboxIndex(i)}
          >
            <img src={photo.url} alt={photo.caption || ''} loading="lazy" />
            {photo.taggedPlayers?.length > 0 && (
              <div className="photo-tags">
                {photo.taggedPlayers.map((player) => (
                  <span key={player} className="photo-tag">{player}</span>
                ))}
              </div>
            )}
            {photo.caption && (
              <div className="photo-caption">{photo.caption}</div>
            )}
          </div>
        ))}
      </div>
      {isOpen && (
        <div className="photo-lightbox" onClick={() => setLightboxIndex(null)}>
          <button
            className="lightbox-close"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null) }}
          >✕</button>
          {lightboxIndex > 0 && (
            <button
              className="lightbox-nav lightbox-prev"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1) }}
            >‹</button>
          )}
          <img
            src={sorted[lightboxIndex].url}
            alt=""
            onClick={(e) => e.stopPropagation()}
          />
          {lightboxIndex < sorted.length - 1 && (
            <button
              className="lightbox-nav lightbox-next"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1) }}
            >›</button>
          )}
          {sorted[lightboxIndex].caption && (
            <div className="lightbox-caption">{sorted[lightboxIndex].caption}</div>
          )}
          <div className="lightbox-counter">
            {lightboxIndex + 1} / {sorted.length}
          </div>
        </div>
      )}
    </>
  )
}
