import { useState } from 'react'

function initialsFor(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function colorFor(name) {
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return `hsl(${h % 360}, 55%, 50%)`
}

export default function Avatar({ name, src, size = 60, onClick }) {
  const [failed, setFailed] = useState(false)
  const clickable = !!onClick
  const style = {
    width: size,
    height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: src && !failed ? 'var(--bg3)' : colorFor(name || ''),
    color: '#fff',
    fontWeight: 600,
    fontSize: size * 0.4,
    flexShrink: 0,
    cursor: clickable ? 'pointer' : 'default',
  }
  return (
    <div className="avatar" style={style} onClick={onClick} title={name || ''}>
      {src && !failed
        ? <img src={src} alt={name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setFailed(true)} />
        : <span>{initialsFor(name)}</span>}
    </div>
  )
}
