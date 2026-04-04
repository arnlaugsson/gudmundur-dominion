import DATA from '../data'

const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/14f5TW05_jpnWGf6d3cAO7ChSrHPZl0dIbxyIO3qqe2A'
const FACEBOOK_URL = 'https://www.facebook.com/groups/754031125659182'

export default function Header() {
  const { lastUpdated, upcomingGames } = DATA
  return (
    <header>
      <h1>♛ Dominionklúbburinn Guðmundur ♛</h1>
      <p>Tölfræði og gagnvirk úrvinnsla</p>
      <div style={{ fontSize: '.7rem', color: 'var(--dim)', marginTop: '.3rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        {lastUpdated && <span>Gögn uppfærð: {lastUpdated}</span>}
        {upcomingGames > 0 && (
          <span style={{ color: 'var(--gold)' }}>
            {upcomingGames} {upcomingGames === 1 ? 'leikur' : 'leikir'} í bið
          </span>
        )}
        <a href={SPREADSHEET_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
          Gögn <span className="external-icon">↗</span>
        </a>
        <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
          Facebook <span className="external-icon">↗</span>
        </a>
      </div>
    </header>
  )
}
