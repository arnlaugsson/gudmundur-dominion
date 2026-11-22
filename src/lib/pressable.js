// Props that make a non-button element (card tile, table row, list item)
// behave like a button for keyboard and screen-reader users: focusable,
// announced as a button, and activated with Enter or Space.
export function pressable(onPress, label) {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    onClick: onPress,
    onKeyDown: (e) => {
      if (e.target !== e.currentTarget) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onPress(e)
      }
    },
  }
}
