import { useMemo } from 'react'
import DATA from '../data'
import { availableYears, computeClubYear, computePlayerYear, earnedInYear, gamesInYear } from '../lib/yearInReview'
import { plural } from '../lib/icelandic'
import { pressable } from '../lib/pressable'
import { openModalRoute, closeModalRoute } from '../lib/route'
import { CLUB_STORY, yearHash, parseYearSub } from '../lib/yearRoute'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import StoryDeck from '../components/wrapped/StoryDeck'
import { Slide, Sub, ShareButton } from '../components/wrapped/SlideParts'
import { buildClubSlides } from '../components/wrapped/clubSlides'
import { buildPlayerSlides } from '../components/wrapped/playerSlides'

const go = hash => { window.location.hash = hash }
const openStory = (year, story) => openModalRoute('arid', `${year}/${story}`)

function Outro({ year, url, text, onPlayers }) {
  return (
    <Slide kicker={`Árið ${year}`} big="♛" headline="Takk fyrir spilin!">
      <Sub>Sjáumst við borðið á næsta ári.</Sub>
      <div className="story-actions">
        <ShareButton url={url} text={text} />
        {onPlayers && <button className="story-cta story-cta-ghost" onClick={onPlayers}>Sjá árið hjá hverjum spilara</button>}
      </div>
    </Slide>
  )
}

function ClubStory({ club, onClose }) {
  const url = `${window.location.origin}/#${yearHash(club.year, CLUB_STORY)}`
  const slides = buildClubSlides(club, <Outro year={club.year} url={url} text={`Árið ${club.year} hjá Guðmundi`} onPlayers={onClose} />)
  return <StoryDeck title={`Árið ${club.year} — klúbburinn`} slides={slides} onClose={onClose} />
}

function PlayerStory({ year, name, onClose }) {
  const { games, players } = DATA
  const summary = useMemo(() => computePlayerYear(games, year, name), [games, year, name])
  const earned = useMemo(
    () => (summary ? earnedInYear(games, year, players.map(p => p.name)).get(name) || [] : []),
    [games, players, year, name, summary],
  )
  if (!summary) return null
  const url = `${window.location.origin}/#${yearHash(year, name)}`
  const slides = buildPlayerSlides(summary, earned, <Outro year={year} url={url} text={`Árið ${year} hjá ${name}`} />)
  return <StoryDeck title={`Árið ${year} — ${name}`} slides={slides} onClose={onClose} />
}

function PlayerGrid({ year, rows }) {
  return (
    <div className="wrapped-players">
      {rows.map(r => (
        <div key={r.name} className="wrapped-player" {...pressable(() => openStory(year, r.name))}>
          <Avatar name={r.name} size={44} />
          <div>
            <div className="wrapped-player-name">{r.name}</div>
            <div className="wrapped-player-meta">{plural(r.games, 'leikur', 'leikir')} · {plural(r.wins, 'sigur', 'sigrar')}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function YearInReview({ sub }) {
  const { games } = DATA
  const years = useMemo(() => availableYears(games), [games])
  const { year, story } = parseYearSub(sub, years)
  if (year == null) {
    return <section className="section active"><EmptyState icon="🎁">Engir leikir skráðir enn.</EmptyState></section>
  }
  return <YearView year={year} story={story} />
}

function YearView({ year, story }) {
  const { games } = DATA
  const years = useMemo(() => availableYears(games), [games])
  const club = useMemo(() => computeClubYear(games, year), [games, year])
  const rows = useMemo(() => {
    const yearGames = gamesInYear(games, year)
    const names = [...new Set(yearGames.flatMap(g => g.players))]
    return names
      .map(name => computePlayerYear(games, year, name))
      .sort((a, b) => b.games - a.games || b.wins - a.wins || a.name.localeCompare(b.name, 'is'))
  }, [games, year])

  const close = () => closeModalRoute('arid', String(year))

  return (
    <section className="section active">
      <h2 className="section-title">🎁 Árið {year}</h2>
      <div className="year-pills" role="tablist" aria-label="Veldu ár">
        {years.map(y => (
          <button key={y} role="tab" aria-selected={y === year} className={`year-pill${y === year ? ' active' : ''}`} onClick={() => go(yearHash(y))}>
            {y}
          </button>
        ))}
      </div>

      <div className="wrapped-hero" {...pressable(() => openStory(year, CLUB_STORY))}>
        <div className="wrapped-hero-year">{year}</div>
        <div>
          <div className="wrapped-hero-title">Árið hjá Guðmundi</div>
          <div className="wrapped-hero-sub">
            {plural(club.totalGames, 'leikur', 'leikir')} · {plural(club.playerCount, 'spilari', 'spilarar')}
            {club.champion && <> · meistari: {club.champion.name}</>}
          </div>
        </div>
        <span className="wrapped-hero-play" aria-hidden="true">▶</span>
      </div>

      <h3 className="wrapped-subtitle">Árið hjá hverjum spilara</h3>
      <PlayerGrid year={year} rows={rows} />

      {story === CLUB_STORY && <ClubStory key={`${year}/club`} club={club} onClose={close} />}
      {story && story !== CLUB_STORY && <PlayerStory key={`${year}/${story}`} year={year} name={story} onClose={close} />}
    </section>
  )
}
