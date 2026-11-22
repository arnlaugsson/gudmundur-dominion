import { Slide, Sub, Delta, CardStrip, PlaceBars } from './SlideParts'
import AchievementBadge from '../AchievementBadge'
import { plural, joinNames, isSingular } from '../../lib/icelandic'
import { MUMMI } from '../../lib/yearInReview'

const games = n => plural(n, 'leikur', 'leikir')
const MAX_BADGES = 6

function intro(p) {
  return (
    <Slide kicker={`Árið ${p.year}`} headline={p.name} big={p.games}>
      <Sub>{isSingular(p.games) ? 'leikur spilaður' : 'leikir spilaðir'}{p.firstGameEver ? '. Fyrsta árið þitt í klúbbnum! 🎉' : '.'}</Sub>
      <Delta now={p.games} before={p.prevYear.games || null} yearBefore={p.year - 1} />
    </Slide>
  )
}

function winsRankText(p) {
  if (p.rankByWins === 1) return 'Flestir sigrar í klúbbnum á árinu! 👑'
  const base = `${p.rankByWins}. sæti af ${p.playerCount} í sigrum á árinu`
  if (p.name === MUMMI || p.mummiWins == null) return `${base}.`
  return p.rankExMummi === 1
    ? `${base}. Flestir sigrar utan Mumma! (Mummi: ${p.mummiWins})`
    : `${base}, ${p.rankExMummi}. sæti utan Mumma (Mummi: ${p.mummiWins}).`
}

function winsSlide(p) {
  return (
    <Slide kicker="Sigrar" big={p.wins} headline={`${Math.round(p.winRate)}% sigurhlutfall`}>
      <Delta now={Math.round(p.winRate)} before={p.prevYear.games ? Math.round(p.prevYear.winRate) : null} unit=" %-stig" yearBefore={p.year - 1} />
      <Sub>{winsRankText(p)}</Sub>
    </Slide>
  )
}

function placesSlide(p) {
  return (
    <Slide kicker="Sætin" headline="Svona endaðir þú">
      <PlaceBars places={p.places} />
      {p.longestWinStreak >= 2 && <Sub>Lengsta sigurganga: {plural(p.longestWinStreak, 'sigur', 'sigrar')} í röð 🔥</Sub>}
    </Slide>
  )
}

function scoreSlide(p) {
  return (
    <Slide kicker="Stigin" big={p.bestScore.score} headline="Besta skor ársins">
      <Sub>Í leik #{p.bestScore.game_num}.</Sub>
      {p.avgScore != null && <Sub>Meðalskor: {p.avgScore.toFixed(1).replace('.', ',')} stig.</Sub>}
    </Slide>
  )
}

function tasteSlide(p) {
  return (
    <Slide kicker="Smekkurinn" headline={p.favoriteExpansion ? `Uppáhaldsviðbót: ${p.favoriteExpansion.name}` : 'Smekkurinn'}>
      {p.mostSeenCard && <CardStrip items={[p.mostSeenCard]} />}
      {p.mostSeenCard && <Sub>{p.mostSeenCard.name} var í ríkinu í {plural(p.mostSeenCard.count, 'leik', 'leikjum')} hjá þér.</Sub>}
    </Slide>
  )
}

function rivalsSlide(p) {
  return (
    <Slide kicker="Keppinautar" headline="Vinir og óvinir">
      <ul className="slide-list">
        {p.nemesis && (
          <li>
            <b>😈 Erkióvinur{p.nemesis.mummi ? ' (utan Mumma)' : ''}: {p.nemesis.name}</b>, endaði ofar en þú {plural(p.nemesis.count, 'sinni', 'sinnum')}
            {p.nemesis.mummi && <> · Mummi: {plural(p.nemesis.mummi.count, 'sinni', 'sinnum')}</>}
          </li>
        )}
        {p.victim && (
          <li>
            <b>🎯 Uppáhaldsfórnarlamb{p.victim.mummi ? ' (utan Mumma)' : ''}: {p.victim.name}</b>, þú endaðir ofar {plural(p.victim.count, 'sinni', 'sinnum')}
            {p.victim.mummi && <> · Mummi: {plural(p.victim.mummi.count, 'sinni', 'sinnum')}</>}
          </li>
        )}
        {p.teammates.length > 0 && <li><b>🤝 Liðsfélagar:</b> {joinNames(p.teammates)}</li>}
      </ul>
    </Slide>
  )
}

function achievementsSlide(p, earned) {
  return (
    <Slide kicker="Afrek ársins" big={earned.length} headline={isSingular(earned.length) ? 'nýtt afrek' : 'ný afrek'}>
      <div className="slide-badges">
        {earned.slice(0, MAX_BADGES).map(a => <AchievementBadge key={a.id} achievement={a} />)}
      </div>
      {earned.length > MAX_BADGES && <Sub>…og {earned.length - MAX_BADGES} til viðbótar.</Sub>}
    </Slide>
  )
}

export function buildPlayerSlides(p, earned, outro) {
  if (!p) return []
  const slides = [
    ['intro', () => intro(p)],
    ['wins', () => winsSlide(p)],
    ['places', p.places.length > 0 && (() => placesSlide(p))],
    ['score', p.bestScore && (() => scoreSlide(p))],
    ['taste', (p.favoriteExpansion || p.mostSeenCard) && (() => tasteSlide(p))],
    ['rivals', (p.nemesis || p.victim || p.teammates.length) && (() => rivalsSlide(p))],
    ['achievements', earned.length > 0 && (() => achievementsSlide(p, earned))],
  ]
  return [
    ...slides.filter(([, render]) => render).map(([key, render]) => ({ key, content: render() })),
    { key: 'outro', content: outro },
  ]
}
