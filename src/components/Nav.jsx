import { useEffect, useRef } from 'react'
import { TABS } from '../constants'

export default function Nav({ tabs = TABS, active, onSelect }) {
  const activeRef = useRef(null)

  // On phones the tab strip scrolls sideways; keep the active tab in view.
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'center' })
  }, [active])

  return (
    <nav aria-label="Aðalvalmynd">
      {tabs.map(t => (
        <button
          key={t.id}
          ref={active === t.id ? activeRef : null}
          className={`tab-btn${active === t.id ? ' active' : ''}`}
          aria-current={active === t.id ? 'page' : undefined}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
