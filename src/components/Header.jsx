import DATA from '../data'
import LoginButton from './LoginButton'
import ClubTitle from './ClubTitle'

const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/14f5TW05_jpnWGf6d3cAO7ChSrHPZl0dIbxyIO3qqe2A'
const FACEBOOK_URL = 'https://www.facebook.com/groups/754031125659182'

export default function Header() {
  const { lastUpdated, upcomingGames } = DATA
  return (
    <header>
      {/* Three columns: empty | title | login, so the login controls can
          never overlap the club name. */}
      <div className="header-top">
        <span className="header-spacer" aria-hidden="true" />
        <ClubTitle />
        <div className="header-login">
          <LoginButton />
        </div>
      </div>
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
    </header>
  )
}
