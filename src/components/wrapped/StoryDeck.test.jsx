import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StoryDeck from './StoryDeck'

const slides = [
  { key: 'a', content: <p>Fyrsta</p> },
  { key: 'b', content: <p>Önnur</p> },
  { key: 'c', content: <p>Þriðja</p> },
]

describe('StoryDeck', () => {
  it('shows the first slide and moves with the arrow keys', () => {
    render(<StoryDeck title="Árið" slides={slides} onClose={() => {}} />)
    expect(screen.getByText('Fyrsta')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByText('Önnur')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(screen.getByText('Fyrsta')).toBeInTheDocument()
  })

  it('does not go past the ends', () => {
    render(<StoryDeck title="Árið" slides={slides} onClose={() => {}} />)
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(screen.getByText('Fyrsta')).toBeInTheDocument()
    for (let i = 0; i < 5; i++) fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByText('Þriðja')).toBeInTheDocument()
  })

  it('has labelled next/previous buttons and a position indicator', () => {
    render(<StoryDeck title="Árið" slides={slides} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Næsta' }))
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fyrri' }))
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('closes on Escape and via the close button', () => {
    const onClose = vi.fn()
    render(<StoryDeck title="Árið" slides={slides} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Loka' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('is an accessible modal dialog', () => {
    render(<StoryDeck title="Árið 2026" slides={slides} onClose={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Árið 2026' })).toHaveAttribute('aria-modal', 'true')
  })
})
