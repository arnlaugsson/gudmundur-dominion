import { Slide, Sub, Delta, MonthBars, CardStrip } from './SlideParts'
import { plural, MONTHS_LONG, joinNames } from '../../lib/icelandic'

const games = n => plural(n, 'leikur', 'leikir')
const wins = n => plural(n, 'sigur', 'sigrar')
const points = n => plural(n, 'stig', 'stig')

function intro(c) {
  return (
    <Slide kicker="Dominionklúbburinn Guðmundur" big={c.year} headline={`${games(c.totalGames)} spilaðir`}>
      <Delta now={c.totalGames} before={c.prevYearGames || null} yearBefore={c.year - 1} />
      <Sub>{plural(c.playerCount, 'spilari', 'spilarar')} settust við borðið á árinu.</Sub>
    </Slide>
  )
}

function calendar(c) {
  return (
    <Slide kicker="Spiladagatalið" headline={c.busiestMonth ? `${MONTHS_LONG[c.busiestMonth.month]} var heitastur` : 'Spiladagatalið'}>
      <MonthBars counts={c.gamesByMonth} highlight={c.busiestMonth?.month} />
      {c.busiestMonth && <Sub>{games(c.busiestMonth.count)} í {MONTHS_LONG[c.busiestMonth.month]}.</Sub>}
      {c.longestGap && c.longestGap.days > 0 && (
        <Sub>Lengsta hlé: {plural(c.longestGap.days, 'dagur', 'dagar')} milli leiks #{c.longestGap.fromGame} og #{c.longestGap.toGame}.</Sub>
      )}
    </Slide>
  )
}

function champion(c) {
  return (
    <Slide kicker="Meistari ársins" big="👑" headline={c.champion.name}>
      <Sub>{wins(c.champion.wins)} í {plural(c.champion.games, 'leik', 'leikjum')}.</Sub>
      {c.bestWinRate && c.bestWinRate.name !== c.champion.name && (
        <Sub>Hæsta sigurhlutfallið: {c.bestWinRate.name} með {Math.round(c.bestWinRate.rate)}%.</Sub>
      )}
      {c.mostGames && <Sub>Mætti oftast: {c.mostGames.name} ({games(c.mostGames.games)}).</Sub>}
    </Slide>
  )
}

function records(c) {
  return (
    <Slide kicker="Met ársins" headline="Stærstu stundirnar">
      <ul className="slide-list">
        {c.highestScore && <li><b>🏆 {points(c.highestScore.score)}</b> — {joinNames(c.highestScore.players)} í leik #{c.highestScore.game_num}</li>}
        {c.closestGame && <li><b>😰 {plural(c.closestGame.margin, 'stigs', 'stiga')} munur</b> — {joinNames(c.closestGame.winners)} rétt marði {joinNames(c.closestGame.runnersUp)} (#{c.closestGame.game_num})</li>}
        {c.biggestWin && <li><b>🌊 {plural(c.biggestWin.margin, 'stigs', 'stiga')} sigur</b> — {joinNames(c.biggestWin.winners)} í leik #{c.biggestWin.game_num}</li>}
      </ul>
    </Slide>
  )
}

function cards(c) {
  return (
    <Slide kicker="Spil ársins" headline={`${c.topCards[0].name} sást oftast`}>
      <CardStrip items={c.topCards.slice(0, 3)} />
      <Sub>{plural(c.newCards.length, 'spil', 'spil')} sáust í fyrsta sinn í sögu klúbbsins.</Sub>
      {c.debutExpansions.length > 0 && <Sub>Nýjar viðbætur á borðinu: {joinNames(c.debutExpansions)}.</Sub>}
    </Slide>
  )
}

function places(c) {
  const top = c.topLocations[0]
  return (
    <Slide kicker="Spilastaðir" big="📍" headline={top.name}>
      <Sub>{games(top.count)} spilaðir þar.</Sub>
      {c.topLocations.length > 1 && <Sub>Einnig: {joinNames(c.topLocations.slice(1).map(l => `${l.name} (${l.count})`))}.</Sub>}
    </Slide>
  )
}

function people(c) {
  return (
    <Slide kicker="Fólkið" headline={c.newcomers.length ? `Velkomin ${joinNames(c.newcomers)}!` : 'Kunnugleg andlit'}>
      {c.newcomers.length > 0 && <Sub>{plural(c.newcomers.length, 'nýliði', 'nýliðar')} spiluðu sinn fyrsta leik á árinu.</Sub>}
      {c.teamGames > 0 && <Sub>{plural(c.teamGames, 'liðaleikur', 'liðaleikir')} — þar sem fleiri en einn stýrðu sama stokknum.</Sub>}
    </Slide>
  )
}

function rivalry(c) {
  const r = c.rivalry
  return (
    <Slide kicker="Keppinautar ársins" headline={`${r.a} gegn ${r.b}`}>
      <div className="rivalry-score"><span>{r.aWins}</span><small>–</small><span>{r.bWins}</span></div>
      <Sub>Mættust í {plural(r.games, 'leik', 'leikjum')}. Talan sýnir hvor endaði ofar.</Sub>
    </Slide>
  )
}

function ratingsSlide(c) {
  return (
    <Slide kicker="Styrkleiki" headline={c.climber ? `${c.climber.name} klifraði hæst` : 'Óvæntasti sigurinn'}>
      {c.climber && <div className="slide-big">+{c.climber.change}</div>}
      {c.climber && <Sub>styrkleikastig á árinu.</Sub>}
      {c.upset && (
        <Sub>Óvæntasti sigurinn: {joinNames(c.upset.winners)} í leik #{c.upset.game_num}, með aðeins {Math.round(c.upset.odds * 100)}% sigurlíkur fyrir leik.</Sub>
      )}
    </Slide>
  )
}

export function buildClubSlides(c, outro) {
  if (!c.totalGames) return []
  const slides = [
    ['intro', intro],
    ['calendar', calendar],
    ['champion', c.champion && champion],
    ['records', (c.highestScore || c.closestGame) && records],
    ['cards', c.topCards.length > 0 && cards],
    ['places', c.topLocations.length > 0 && places],
    ['people', people],
    ['rivalry', c.rivalry && rivalry],
    ['ratings', (c.climber || c.upset) && ratingsSlide],
  ]
  return [
    ...slides.filter(([, render]) => render).map(([key, render]) => ({ key, content: render(c) })),
    { key: 'outro', content: outro },
  ]
}
