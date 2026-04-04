import { useState } from 'react'

export default function PhotoGrid({ photos }) {
  const [lightboxUrl, setLightboxUrl] = useState(null)

  if (!photos || photos.length === 0) return null

  const sorted = [...photos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <>
      <div className="photo-grid">
        {sorted.map((photo, i) => (
          <div
            key={photo.url || i}
            className="photo-item"
            onClick={() => setLightboxUrl(photo.url)}
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
      {lightboxUrl && (
        <div className="photo-lightbox" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" />
        </div>
      )}
    </>
  )
}
