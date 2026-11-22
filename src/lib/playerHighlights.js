// Year-in-review stats that don't depend on winning, so a story is fun for
// unlucky players and occasional guests too: best finish, near-wins,
// discoveries, personal bests, and a few honorary titles for everyone.
import { seatOf, placeOf, isWinner } from './seats'
import { plural } from './icelandic'

const CLOSE_CALL_POINTS = 3
const FEW_GAMES = 3
const MAX_TITLES = 3
const MUMMI = 'Mummi'

const yearOf = g => Number(String(g.date || '').slice(0, 4)) || null
const winnerScore = g => (g.seats || []).find(s => s.place === 1)?.score ?? null

function nearWins(myGames, name) {
  return myGames
    .filter(g => !isWinner(g, name))
    .map(g => ({ game_num: g.game_num, mine: seatOf(g, name)?.score, top: winnerScore(g) }))
    .filter(x => x.mine != null && x.top != null)
    .map(x => ({ game_num: x.game_num, gap: x.top - x.mine }))
}

function discoveries(allGames, myGames, name, year) {
  const seenBefore = new Set(
    allGames.filter(g => g.players.includes(name) && yearOf(g) < year).flatMap(g => g.kingdom.map(k => k.card)),
  )
  const found = []
  for (const g of myGames) {
    for (const { card } of g.kingdom) {
      if (!seenBefore.has(card)) {
        seenBefore.add(card)
        found.push(card)
      }
    }
  }
  return found
}

function bestEarlierScore(allGames, name, year) {
  const scores = allGames
    .filter(g => yearOf(g) < year && g.players.includes(name))
    .map(g => seatOf(g, name)?.score)
    .filter(s => s != null)
  return scores.length ? Math.max(...scores) : null
}

export function playerHighlights(allGames, myGames, name, year) {
  const places = myGames.map(g => placeOf(g, name)).filter(p => p != null)
  const near = nearWins(myGames, name)
  const bestThisYear = Math.max(-Infinity, ...myGames.map(g => seatOf(g, name)?.score).filter(s => s != null))
  const earlier = bestEarlierScore(allGames, name, year)
  return {
    bestPlace: places.length ? Math.min(...places) : null,
    closestToWin: near.reduce((best, x) => (!best || x.gap < best.gap ? x : best), null),
    closeCalls: near.filter(x => x.gap <= CLOSE_CALL_POINTS).length,
    cardsDiscovered: discoveries(allGames, myGames, name, year),
    expansionsPlayed: new Set(myGames.flatMap(g => g.expansions)).size,
    venues: new Set(myGames.map(g => g.location).filter(Boolean)).size,
    // Only meaningful with earlier scored games to beat.
    allTimeBest: earlier != null && bestThisYear > earlier,
    gameList: myGames.map(g => ({
      game_num: g.game_num, date: g.date, place: placeOf(g, name), score: seatOf(g, name)?.score ?? null, location: g.location,
    })),
  }
}

// Club-relative honours compare against everyone except Mummi (he plays every
// game, so he'd top every count); ties share the title.
const CLUB_TITLES = [
  { id: 'silver', icon: '🥈', title: 'Silfursætið', value: p => p.places[1] || 0, min: 2, text: n => `${plural(n, 'sinni', 'sinnum')} í 2. sæti, oftast allra.` },
  { id: 'close-calls', icon: '🤏', title: 'Hársbreidd frá sigri', value: p => p.closeCalls, min: 1, text: n => `${plural(n, 'sinni', 'sinnum')} innan við ${CLOSE_CALL_POINTS} stigum frá sigri. Heppnin hlýtur að snúast!` },
  { id: 'explorer', icon: '🧭', title: 'Landkönnuður ársins', value: p => p.cardsDiscovered.length, min: 1, text: n => `${plural(n, 'nýtt spil', 'ný spil')} sem þú hafðir aldrei séð áður.` },
  { id: 'variety', icon: '🎨', title: 'Mesta fjölbreytnin', value: p => p.expansionsPlayed, min: 2, text: n => `Spilaðir með ${plural(n, 'viðbót', 'viðbótum')}.` },
  { id: 'traveller', icon: '🧳', title: 'Ferðalangur ársins', value: p => p.venues, min: 2, text: n => `Spilaðir á ${plural(n, 'stað', 'stöðum')}.` },
]

const PERSONAL_TITLES = [
  { id: 'newcomer', icon: '🌱', title: 'Nýliði ársins', when: p => p.firstGameEver, text: () => 'Fyrsta árið þitt í klúbbnum. Gaman að fá þig í hópinn!' },
  { id: 'personal-best', icon: '📈', title: 'Persónulegt met', when: p => p.allTimeBest, text: p => `${p.bestScore.score} stig er þitt besta skor frá upphafi.` },
  { id: 'streak', icon: '🔥', title: 'Sigurganga', when: p => p.longestWinStreak >= 3, text: p => `${p.longestWinStreak} sigrar í röð.` },
]

export function funTitles(p, all) {
  const others = all.filter(o => o.name !== MUMMI)
  const club = p.name === MUMMI ? [] : CLUB_TITLES
    .filter(t => t.value(p) >= t.min && t.value(p) === Math.max(...others.map(t.value)))
    .map(t => ({ id: t.id, icon: t.icon, title: t.title, text: t.text(t.value(p)) }))
  const personal = PERSONAL_TITLES
    .filter(t => t.when(p))
    .map(t => ({ id: t.id, icon: t.icon, title: t.title, text: t.text(p) }))
  const earned = [...personal, ...club].slice(0, MAX_TITLES)
  if (earned.length) return earned
  return p.games <= FEW_GAMES
    ? [{ id: 'guest', icon: '🎟️', title: 'Sjaldséður gestur', text: 'Hver leikur með þér er viðburður.' }]
    : [{ id: 'loyal', icon: '🤝', title: 'Tryggur leikmaður', text: `${plural(p.games, 'leikur', 'leikir')} við borðið á árinu.` }]
}
