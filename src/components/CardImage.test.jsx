import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CardImage from './CardImage'

describe('CardImage', () => {
  it('loads the thumbnail first, then the full image, then a text fallback', () => {
    render(<CardImage name="Fool's Gold" />)
    const img = screen.getByAltText("Fool's Gold")
    expect(img.src).toContain('cards-thumb%2FFool\'s_Gold.webp')
    fireEvent.error(img)
    expect(screen.getByAltText("Fool's Gold").src).toContain('cards%2FFool\'s_Gold.jpg')
    fireEvent.error(screen.getByAltText("Fool's Gold"))
    expect(screen.getByRole('img', { name: "Fool's Gold" })).toBeInTheDocument()
  })

  it('size="full" skips the thumbnail', () => {
    render(<CardImage name="Village" size="full" />)
    expect(screen.getByAltText('Village').src).toContain('cards%2FVillage.jpg')
  })
})

describe('CardImage text-card fallback', () => {
  it('shows name, cost and rules text from the card list when no image loads', async () => {
    const { registerCards } = await import('../lib/cardIndex')
    registerCards([{ name: 'Receive Tribute', card_type: 'Event', cost: 5, card_text: 'If you have at least 6 cards in hand, +1 Buy.' }])
    render(<CardImage name="Receive Tribute" />)
    fireEvent.error(screen.getByAltText('Receive Tribute'))
    fireEvent.error(screen.getByAltText('Receive Tribute'))
    const card = screen.getByRole('img', { name: 'Receive Tribute' })
    expect(card).toHaveTextContent('5')
    expect(card).toHaveTextContent('If you have at least 6 cards')
    expect(card).toHaveTextContent('Event')
    expect(card.className).toContain('landscape')
  })
})
