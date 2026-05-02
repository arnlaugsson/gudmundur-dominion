import { useState } from 'react'
import { cardImgUrl } from '../constants'

export default function CardImage({ name, className = '', style = {}, loading = 'lazy' }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={`card-image-fallback ${className}`}
        style={style}
        title={`Engin mynd: ${name}`}
      >
        <span className="card-image-fallback-name">{name}</span>
      </div>
    )
  }

  return (
    <img
      src={cardImgUrl(name)}
      alt={name}
      loading={loading}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  )
}
