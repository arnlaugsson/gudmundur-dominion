import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SeatResults from './SeatResults'

const game = {
  seats: [
    { players: ['Mummi', 'Halla'], place: 1, score: 24 },
    { players: ['Skúli'], place: 2, score: 21 },
  ],
}

describe('SeatResults', () => {
  it('shows a team as one row with all members and the shared score', () => {
    render(<SeatResults game={game} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Mummi')
    expect(rows[0]).toHaveTextContent('Halla')
    expect(rows[0]).toHaveTextContent('24 stig')
    expect(rows[0]).toHaveTextContent('Lið')
  })

  it('shows rating changes and pre-game odds when given', () => {
    const rating = { players: [{ name: 'Mummi', delta: 28 }, { name: 'Halla', delta: 60 }, { name: 'Skúli', delta: -25 }], seatOdds: [0.62, 0.38] }
    render(<SeatResults game={game} rating={rating} />)
    expect(screen.getByText('+60')).toBeInTheDocument()
    expect(screen.getByText('−25')).toBeInTheDocument()
    expect(screen.getByText('38%')).toBeInTheDocument()
  })
})
