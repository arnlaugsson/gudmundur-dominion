import { describe, it, expect } from 'vitest'
import { seatOf, placeOf, isWinner, opponentsOf, isTeamGame } from './seats'

const teamGame = {
  players: ['A', 'B', 'C', 'D'],
  seats: [
    { players: ['A', 'B'], place: 1, score: 24 },
    { players: ['C'], place: 2, score: 21 },
    { players: ['D'], place: 2, score: 21 },
  ],
}

describe('seats helpers', () => {
  it('finds the seat and seat place of a player', () => {
    expect(seatOf(teamGame, 'B').players).toEqual(['A', 'B'])
    expect(placeOf(teamGame, 'D')).toBe(2)
    expect(placeOf(teamGame, 'Nobody')).toBeNull()
  })

  it('treats every member of the first seat as a winner', () => {
    expect(isWinner(teamGame, 'A')).toBe(true)
    expect(isWinner(teamGame, 'B')).toBe(true)
    expect(isWinner(teamGame, 'C')).toBe(false)
  })

  it('lists opponents excluding teammates', () => {
    expect(opponentsOf(teamGame, 'A')).toEqual(['C', 'D'])
    expect(opponentsOf(teamGame, 'C')).toEqual(['A', 'B', 'D'])
  })

  it('detects team games', () => {
    expect(isTeamGame(teamGame)).toBe(true)
    expect(isTeamGame({ seats: [{ players: ['A'], place: 1 }] })).toBe(false)
    expect(isTeamGame({})).toBe(false)
  })
})
