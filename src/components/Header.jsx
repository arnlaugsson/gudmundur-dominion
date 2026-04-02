import DATA from '../data'

export default function Header() {
  const { lastUpdated, upcomingGames } = DATA
  return (
    <header>
      <h1>♛ Dominionklúbburinn Guðmundur ♛</h1>
      <p>Tölfræði og gagnvirk úrvinnsla</p>
      <div style={{ fontSize: '.7rem', color: 'var(--dim)', marginTop: '.3rem' }}>
        {lastUpdated && <span>Gögn uppfærð: {lastUpdated}</span>}
        {upcomingGames > 0 && (
          <span style={{ color: 'var(--gold)', marginLeft: lastUpdated ? '.75rem' : 0 }}>
            {upcomingGames} {upcomingGames === 1 ? 'leikur' : 'leikir'} í bið
          </span>
        )}
      </div>
    </header>
  )
}
