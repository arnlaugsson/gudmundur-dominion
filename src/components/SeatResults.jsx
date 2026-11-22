// Standings of one game, one row per seat (a solo player or a team).
// Optionally shows each player's rating change and each seat's pre-game odds.
const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

function Delta({ value }) {
  if (value == null) return null
  const cls = value > 0 ? 'seat-delta up' : value < 0 ? 'seat-delta down' : 'seat-delta'
  return <span className={cls} title="Breyting á styrkleika">{value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '±0'}</span>
}

export default function SeatResults({ game, rating, compact = false }) {
  const seats = game.seats || []
  if (!seats.length) return null
  const deltaByName = new Map((rating?.players || []).map(p => [p.name, p.delta]))
  return (
    <ol className={`seat-results${compact ? ' compact' : ''}`}>
      {seats.map((seat, i) => (
        <li key={seat.players.join('+')} className={`seat-row place-${seat.place}`}>
          <span className="seat-medal" aria-label={`${seat.place}. sæti`}>{MEDALS[seat.place] || `${seat.place}.`}</span>
          <span className="seat-names">
            {seat.players.map((name, j) => (
              <span key={name} className="seat-name">
                {j > 0 && <span className="seat-amp" aria-hidden="true"> & </span>}
                {name}
                <Delta value={deltaByName.get(name)} />
              </span>
            ))}
            {seat.players.length > 1 && <span className="seat-team-tag">Lið</span>}
          </span>
          {seat.score != null && <span className="seat-score">{seat.score} stig</span>}
          {rating?.seatOdds && !compact && (
            <span className="seat-odds" title="Sigurlíkur fyrir leikinn, út frá styrkleika">{Math.round(rating.seatOdds[i] * 100)}%</span>
          )}
        </li>
      ))}
    </ol>
  )
}
