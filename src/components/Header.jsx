import DATA from '../data'
import LoginButton from './LoginButton'

const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/14f5TW05_jpnWGf6d3cAO7ChSrHPZl0dIbxyIO3qqe2A'
const FACEBOOK_URL = 'https://www.facebook.com/groups/754031125659182'

export default function Header() {
  const { lastUpdated, upcomingGames } = DATA
  return (
    <header>
      <h1>♛ Dominionklúbburinn Guðmundur ♛</h1>
      <p>Tölfræði og gagnvirk úrvinnsla</p>
      <div className="header-meta">
        {lastUpdated && <span>Gögn uppfærð: {lastUpdated}</span>}
        {upcomingGames > 0 && (
          <span className="highlight">
            {upcomingGames} {upcomingGames === 1 ? 'leikur' : 'leikir'} í bið
          </span>
        )}
        <a href={SPREADSHEET_URL} target="_blank" rel="noopener noreferrer">
          Gögn <span className="external-icon">↗</span>
        </a>
        <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
          Facebook <span className="external-icon">↗</span>
        </a>
      </div>
      <div className="header-login">
        <LoginButton />
      </div>
    </header>
  )
}
