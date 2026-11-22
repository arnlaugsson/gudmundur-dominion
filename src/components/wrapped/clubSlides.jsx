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

// " · Mummi: 14" when the stat's real leader was Mummi (see leaderBesidesMummi).
const vsMummi = (entry, format) => (entry?.mummi ? ` · Mummi: ${format(entry.mummi)}` : '')
const pct = e => `${Math.round(e.rate)}%`

function champion(c) {
  const ch = c.champion
  return (
    <Slide kicker={ch.mummi ? 'Flestir sigrar utan Mumma' : 'Meistari ársins'} big="👑" headline={ch.name}>
      <Sub>{wins(ch.wins)} í {plural(ch.games, 'leik', 'leikjum')}{vsMummi(ch, e => e.wins)}.</Sub>
      {c.bestWinRate && c.bestWinRate.name !== ch.name && (
        <Sub>Hæsta sigurhlutfallið{c.bestWinRate.mummi ? ' utan Mumma' : ''}: {c.bestWinRate.name} með {pct(c.bestWinRate)}{vsMummi(c.bestWinRate, pct)}.</Sub>
      )}
      {c.mostGames && (
        <Sub>Mætti oftast{c.mostGames.mummi ? ' utan Mumma' : ''}: {c.mostGames.name} ({games(c.mostGames.games)}{vsMummi(c.mostGames, e => e.games)}).</Sub>
      )}
    </Slide>
  )
}

function records(c) {
  return (
    <Slide kicker="Met ársins" headline="Stærstu stundirnar">
      <ul className="slide-list">
        {c.highestScore && (
          <li>
            <b>🏆 {points(c.highestScore.score)}</b>{c.highestScore.mummi ? ' (hæst utan Mumma)' : ''} — {joinNames(c.highestScore.players)} í leik #{c.highestScore.game_num}
            {c.highestScore.mummi && <> · Mummi: {c.highestScore.mummi.score} (#{c.highestScore.mummi.game_num})</>}
          </li>
        )}
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
  ]
  return [
    ...slides.filter(([, render]) => render).map(([key, render]) => ({ key, content: render(c) })),
    { key: 'outro', content: outro },
  ]
}
