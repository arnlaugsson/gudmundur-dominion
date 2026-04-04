import { useState } from 'react'
import DATA from '../data'

const allPlayerNames = DATA.players.map((p) => p.name)

export default function PlayerTagger({ tagged, gamePlayers, onToggle, onAdd }) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const otherTagged = tagged.filter((t) => !gamePlayers.includes(t))

  const suggestions = input.length > 0
    ? allPlayerNames.filter(
        (name) =>
          name.toLowerCase().includes(input.toLowerCase()) &&
          !tagged.includes(name) &&
          !gamePlayers.includes(name)
      )
    : []

  const addTag = (name) => {
    const trimmed = name.trim()
    if (trimmed && !tagged.includes(trimmed)) {
      onAdd(trimmed)
    }
    setInput('')
    setShowSuggestions(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions.length > 0) {
        addTag(suggestions[0])
      } else if (input.trim()) {
        addTag(input)
      }
    }
  }

  return (
    <div className="memory-tag-list">
      {gamePlayers.map((player) => (
        <button
          key={player}
          className={tagged.includes(player) ? 'memory-tag' : 'memory-add-tag'}
          onClick={() => onToggle(player)}
        >
          {player}
        </button>
      ))}
      {otherTagged.map((player) => (
        <button
          key={player}
          className="memory-tag"
          onClick={() => onToggle(player)}
        >
          {player}
        </button>
      ))}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="+ nafn"
          style={{
            width: '80px', background: 'var(--bg)', border: '1px solid var(--border)',
            color: 'var(--text)', borderRadius: '4px', padding: '2px 6px',
            fontSize: '0.7rem', fontFamily: 'inherit',
          }}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 10,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: '4px', maxHeight: '120px', overflowY: 'auto',
            minWidth: '120px', marginTop: '2px',
          }}>
            {suggestions.slice(0, 6).map((name) => (
              <div
                key={name}
                onMouseDown={() => addTag(name)}
                style={{
                  padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer',
                  color: 'var(--text)',
                }}
                onMouseEnter={(e) => { e.target.style.background = 'var(--bg3)' }}
                onMouseLeave={(e) => { e.target.style.background = 'transparent' }}
              >
                {name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
