import { useState, useEffect, useRef, useCallback } from 'react'

const SWIPE_MIN_PX = 40
const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

// Keep Tab inside the dialog (it is aria-modal).
function trapTab(e, container) {
  const items = [...container.querySelectorAll(FOCUSABLE)]
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  const inside = container.contains(document.activeElement)
  if (e.shiftKey && (!inside || document.activeElement === first)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
    e.preventDefault()
    first.focus()
  }
}

// Focus the close button, lock page scroll, and give focus back to whatever
// opened the deck when it closes.
function useModalFocus(closeRef) {
  useEffect(() => {
    const opener = document.activeElement
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus()
    }
  }, [closeRef])
}

// Full-screen, story-style slide viewer (think "Wrapped"). Navigate with the
// arrow keys, the on-screen buttons, tapping the left/right edge, or swiping.
export default function StoryDeck({ title, slides, onClose, initialIndex = 0 }) {
  const [rawIndex, setIndex] = useState(initialIndex)
  const frameRef = useRef(null)
  const closeRef = useRef(null)
  const touchStart = useRef(null)
  const last = slides.length - 1
  // Clamp: the deck can shrink under us (e.g. switching player via the URL).
  const index = Math.max(0, Math.min(rawIndex, last))

  const go = useCallback(delta => setIndex(i => Math.min(last, Math.max(0, Math.min(i, last) + delta))), [last])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1)
      else if (e.key === 'Tab' && frameRef.current) trapTab(e, frameRef.current)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [go, onClose])

  useModalFocus(closeRef)

  if (!slides.length) return null

  const onTouchStart = e => { touchStart.current = e.touches[0].clientX }
  const onTouchEnd = e => {
    if (touchStart.current == null) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    touchStart.current = null
    if (Math.abs(dx) >= SWIPE_MIN_PX) go(dx < 0 ? 1 : -1)
  }

  const slide = slides[index]
  return (
    <div className="story-overlay" role="dialog" aria-modal="true" aria-label={title}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="story-frame" ref={frameRef}>
        <div className="story-progress" aria-hidden="true">
          {slides.map((s, i) => <span key={s.key} className={i <= index ? 'done' : ''} />)}
        </div>
        <div className="story-top">
          <span className="story-title">{title}</span>
          <span className="story-count" aria-live="polite">{index + 1} / {slides.length}</span>
          <button ref={closeRef} className="story-close" onClick={onClose} aria-label="Loka">✕</button>
        </div>
        <div className="story-slide" key={slide.key}>{slide.content}</div>
        <button className="story-edge story-edge-prev" onClick={() => go(-1)} disabled={index === 0} aria-label="Fyrri">‹</button>
        <button className="story-edge story-edge-next" onClick={() => go(1)} disabled={index === last} aria-label="Næsta">›</button>
      </div>
    </div>
  )
}
