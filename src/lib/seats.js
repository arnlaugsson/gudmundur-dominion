// Seat-aware helpers. A seat is one competitor in a game: a solo player or a
// team of 2+ people sharing a score (game.seats, written by the sync).
// Always use these for standings so team games are counted correctly.

export function seatOf(game, name) {
  return (game.seats || []).find(s => s.players.includes(name)) || null
}

export function placeOf(game, name) {
  return seatOf(game, name)?.place ?? null
}

export function isWinner(game, name) {
  return placeOf(game, name) === 1
}

export function opponentsOf(game, name) {
  const mine = seatOf(game, name)
  if (!mine) return []
  return (game.seats || []).filter(s => s !== mine).flatMap(s => s.players)
}

export function isTeamGame(game) {
  return (game.seats || []).some(s => s.players.length > 1)
}

// Seats that have a score, best place first, with a display name for teams
// ("Mummi & Halla"). Use for winner/runner-up/margin logic so a teammate is
// never mistaken for the runner-up.
export function scoredSeats(game) {
  return (game.seats || [])
    .filter(s => s.score != null)
    .sort((a, b) => a.place - b.place)
    .map(s => ({ name: s.players.join(' & '), players: s.players, place: s.place, score: s.score }))
}
