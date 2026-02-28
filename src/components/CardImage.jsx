import { useState } from 'react'
import { cardImgUrl } from '../constants'

export default function CardImage({ name, className = '', style = {}, loading = 'lazy' }) {
  const [failed, setFailed] = useState(false)

  if (failed) return null

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
