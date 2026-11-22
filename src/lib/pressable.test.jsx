import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { pressable } from './pressable'

describe('pressable', () => {
  it('is focusable and announced as a button', () => {
    render(<div {...pressable(() => {}, 'Opna leik')}>x</div>)
    const el = screen.getByRole('button', { name: 'Opna leik' })
    expect(el).toHaveAttribute('tabindex', '0')
  })

  it('activates on click, Enter and Space but not other keys', () => {
    const onPress = vi.fn()
    render(<div {...pressable(onPress)}>x</div>)
    const el = screen.getByRole('button')
    fireEvent.click(el)
    fireEvent.keyDown(el, { key: 'Enter' })
    fireEvent.keyDown(el, { key: ' ' })
    fireEvent.keyDown(el, { key: 'a' })
    expect(onPress).toHaveBeenCalledTimes(3)
  })

  it('ignores key presses that bubble up from nested controls', () => {
    const onPress = vi.fn()
    render(<div {...pressable(onPress)}><input aria-label="inner" /></div>)
    fireEvent.keyDown(screen.getByLabelText('inner'), { key: 'Enter' })
    expect(onPress).not.toHaveBeenCalled()
  })
})
