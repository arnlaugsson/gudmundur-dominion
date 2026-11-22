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
    expect(screen.getByTitle("Engin mynd: Fool's Gold")).toBeInTheDocument()
  })

  it('size="full" skips the thumbnail', () => {
    render(<CardImage name="Village" size="full" />)
    expect(screen.getByAltText('Village').src).toContain('cards%2FVillage.jpg')
  })
})
