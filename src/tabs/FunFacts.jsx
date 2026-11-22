import { useMemo } from 'react'
import DATA from '../data'
import { MONTHS_LONG, isSingular, plural } from '../lib/icelandic'

const TIMES_WORD = { 1: 'einu sinni', 2: 'tvisvar', 3: 'þrisvar' }

function formatMonth(yyyyMM) {
  const [y, m] = yyyyMM.split(/[-.]/)
  return `${MONTHS_LONG[parseInt(m, 10) - 1]} ${y}`
}

function timesText(n) {
  return TIMES_WORD[n] || plural(n, 'sinni', 'sinnum')
}

// Icelandic decimal comma: 34.5 -> "34,5"
function decimal(n) {
  return n.toFixed(1).replace('.', ',')
}

function Fact({ icon, title, value, desc, gameNums, onGameNav }) {
  return (
    <div className="fact-card">
      <div className="fi">{icon}</div>
      <div className="ft">{title}</div>
      {value && <div className="fv">{value}</div>}
      <div className="fd">{desc}</div>
      {gameNums?.length > 0 && onGameNav && (
        <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap', marginTop: '.25rem' }}>
          {gameNums.map(n => (
            <button
              key={n}
              onClick={() => onGameNav(n)}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '4px',
                padding: '.2rem .5rem', fontSize: '.72rem', color: 'var(--gold)', cursor: 'pointer',
                fontFamily: 'inherit', transition: 'border-color .15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              #{n} →
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FunFacts({ onGameNav }) {
  const { games, players, cards } = DATA

  const facts = useMemo(() => {
    const CLUB_OWNER = 'Mummi'
    const gamesByNum = [...games].sort((a, b) => a.game_num - b.game_num)
    const allScores = games.flatMap(g =>
      g.results.filter(r => r.score != null).map(r => ({ ...r, date: g.date, game: g.game_num }))
    )

    // ── Scores ──────────────────────────────────────────────────────────────
    const allHighScores = [...allScores].sort((a, b) => b.score - a.score)
    const highScoreOwner = allHighScores[0] || null
    const highScore = highScoreOwner?.name === CLUB_OWNER
      ? allHighScores.find(s => s.name !== CLUB_OWNER) || highScoreOwner
      : highScoreOwner
    const highScoreNote = highScoreOwner?.name === CLUB_OWNER && highScore !== highScoreOwner
      ? ` (${CLUB_OWNER}: ${highScoreOwner.score} stig)`
      : ''

    const allLowScores = [...allScores].sort((a, b) => a.score - b.score)
    const lowScoreOwner = allLowScores[0] || null
    const lowScore = lowScoreOwner?.name === CLUB_OWNER
      ? allLowScores.find(s => s.name !== CLUB_OWNER) || lowScoreOwner
      : lowScoreOwner
    const lowScoreNote = lowScoreOwner?.name === CLUB_OWNER && lowScore !== lowScoreOwner
      ? ` (${CLUB_OWNER}: ${lowScoreOwner.score} stig)`
      : ''

    // ── Blowout & Nail-biter ────────────────────────────────────────────────
    let biggestBlowout = null
    let biggestBlowoutOwner = null
    let nailBiter = null
    let nailBiterOwner = null
    let tiedGames = []

    games.forEach(g => {
      const scored = g.results.filter(r => r.score != null).sort((a, b) => a.place - b.place)
      if (scored.length < 2) return
      const gap = scored[0].score - scored[scored.length - 1].score
      const blowoutEntry = { gap, winner: scored[0].name, loser: scored[scored.length - 1].name,
        winnerScore: scored[0].score, loserScore: scored[scored.length - 1].score, game: g.game_num, date: g.date }
      if (!biggestBlowoutOwner || gap > biggestBlowoutOwner.gap) biggestBlowoutOwner = blowoutEntry
      if (scored[0].name !== CLUB_OWNER && (!biggestBlowout || gap > biggestBlowout.gap)) biggestBlowout = blowoutEntry

      const r1 = scored.find(r => r.place === 1)
      const r2 = scored.find(r => r.place === 2)
      if (r1 && r2) {
        const top2gap = r1.score - r2.score
        const nbEntry = { gap: top2gap, winner: r1.name, runnerUp: r2.name, game: g.game_num, date: g.date }
        if (!nailBiterOwner || top2gap < nailBiterOwner.gap) nailBiterOwner = nbEntry
        if (r1.name !== CLUB_OWNER && (!nailBiter || top2gap < nailBiter.gap)) nailBiter = nbEntry
        if (top2gap === 0) tiedGames.push(g)
      }
    })
    // Fall back to owner's entry if no non-owner blowout/nailbiter exists
    if (!biggestBlowout) biggestBlowout = biggestBlowoutOwner
    if (!nailBiter) nailBiter = nailBiterOwner
    const blowoutNote = biggestBlowoutOwner && biggestBlowout !== biggestBlowoutOwner
      ? ` (${CLUB_OWNER}: ${plural(biggestBlowoutOwner.gap, 'stigs', 'stiga')} munur í leik #${biggestBlowoutOwner.game})`
      : ''
    const nailBiterNote = nailBiterOwner && nailBiter !== nailBiterOwner
      ? ` (${CLUB_OWNER}: ${plural(nailBiterOwner.gap, 'stigs', 'stiga')} munur í leik #${nailBiterOwner.game})`
      : ''

    // ── Cards ────────────────────────────────────────────────────────────────
    const kingdomCards = cards.filter(c => !c.removed && !c.isSupplyCard)

    const maxUsage = kingdomCards.length
      ? Math.max(...kingdomCards.map(c => c.times_used))
      : 0
    const topCards = maxUsage > 0
      ? kingdomCards.filter(c => c.times_used === maxUsage)
      : []

    const usedCards = kingdomCards.filter(c => c.times_used > 0)
    const minUsage = usedCards.length ? Math.min(...usedCards.map(c => c.times_used)) : 0
    const leastUsedCards = minUsage > 0 ? usedCards.filter(c => c.times_used === minUsage) : []
    const neverUsed = kingdomCards.filter(c => c.times_used === 0)

    // Card power couple (most co-appearing pair in kingdoms)
    const pairCounts = {}
    games.forEach(g => {
      const names = g.kingdom.map(k => k.card).sort()
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const key = names[i] + '|||' + names[j]
          pairCounts[key] = (pairCounts[key] || 0) + 1
        }
      }
    })
    const maxPairCount = Math.max(0, ...Object.values(pairCounts))
    const topPairs = maxPairCount > 0
      ? Object.entries(pairCounts)
          .filter(([, count]) => count === maxPairCount)
          .map(([key]) => ({ cards: key.split('|||') }))
      : []

    // ── Players ───────────────────────────────────────────────────────────────
    const sortedBySecond = [...players].sort((a, b) => b.second - a.second)
    const runnerUpOwner = sortedBySecond[0] || null
    const runnerUp = runnerUpOwner?.name === CLUB_OWNER
      ? sortedBySecond.find(p => p.name !== CLUB_OWNER) || runnerUpOwner
      : runnerUpOwner
    const runnerUpNote = runnerUpOwner?.name === CLUB_OWNER && runnerUp !== runnerUpOwner
      ? ` (${CLUB_OWNER}: ${runnerUpOwner.second}×)`
      : ''

    // Last place finishes
    const lastCounts = {}
    games.forEach(g => {
      if (g.players.length < 2) return
      const maxPlace = Math.max(...g.results.map(r => r.place))
      g.results.filter(r => r.place === maxPlace).forEach(r => {
        lastCounts[r.name] = (lastCounts[r.name] || 0) + 1
      })
    })
    const sortedLastPlace = Object.entries(lastCounts).sort((a, b) => b[1] - a[1])
    const lastPlaceKingOwner = sortedLastPlace[0] || null
    const lastPlaceKing = lastPlaceKingOwner?.[0] === CLUB_OWNER
      ? sortedLastPlace.find(e => e[0] !== CLUB_OWNER) || lastPlaceKingOwner
      : lastPlaceKingOwner
    const lastPlaceNote = lastPlaceKingOwner?.[0] === CLUB_OWNER && lastPlaceKing !== lastPlaceKingOwner
      ? ` (${CLUB_OWNER}: ${lastPlaceKingOwner[1]}×)`
      : ''

    // Win streak
    const streaks = players.map(p => {
      let best = 0, cur = 0
      gamesByNum.forEach(g => {
        if (g.results[0]?.name === p.name) { cur++; best = Math.max(best, cur) }
        else if (g.players.includes(p.name)) cur = 0
      })
      return { name: p.name, streak: best }
    })
    const sortedStreaks = [...streaks].sort((a, b) => b.streak - a.streak)
    const topStreakOwner = sortedStreaks[0] || null
    const topStreak = topStreakOwner?.name === CLUB_OWNER
      ? sortedStreaks.find(s => s.name !== CLUB_OWNER) || topStreakOwner
      : topStreakOwner
    const streakNote = topStreakOwner?.name === CLUB_OWNER && topStreak !== topStreakOwner
      ? ` (${CLUB_OWNER}: ${topStreakOwner.streak} í röð)`
      : ''

    // Longest wait between a player's appearances
    let longestGap = null
    const sortedGames = [...games].sort((a, b) => a.game_num - b.game_num)
    const lastSeenGameNum = {}
    for (const g of sortedGames) {
      for (const name of (g.players || [])) {
        const prev = lastSeenGameNum[name]
        if (prev != null) {
          const gap = g.game_num - prev
          if (!longestGap || gap > longestGap.gap) {
            longestGap = { name, gap, fromGame: prev, toGame: g.game_num }
          }
        }
        lastSeenGameNum[name] = g.game_num
      }
    }

    // Never won (min 5 games, 0 wins)
    const neverWon = players.filter(p => p.games >= 5 && p.first === 0).sort((a, b) => b.games - a.games)

    // Best avg scorer (min 5 scored games)
    const sortedScorers = players.filter(p => (p.scores?.length ?? 0) >= 5)
      .sort((a, b) => (b.gpa ?? 0) - (a.gpa ?? 0))
    const bestScorerOwner = sortedScorers[0] || null
    const bestScorer = bestScorerOwner?.name === CLUB_OWNER
      ? sortedScorers.find(p => p.name !== CLUB_OWNER) || bestScorerOwner
      : bestScorerOwner
    const bestScorerNote = bestScorerOwner?.name === CLUB_OWNER && bestScorer !== bestScorerOwner
      ? ` (${CLUB_OWNER}: ${decimal(bestScorerOwner.gpa)} stig)`
      : ''

    // Expansion variety per player
    const playerExpSets = {}
    games.forEach(g => {
      g.players.forEach(p => {
        if (!playerExpSets[p]) playerExpSets[p] = new Set()
        g.expansions.forEach(e => playerExpSets[p].add(e))
      })
    })
    const sortedExplorers = Object.entries(playerExpSets)
      .map(([name, exps]) => ({ name, count: exps.size }))
      .sort((a, b) => b.count - a.count)
    const expExplorerOwner = sortedExplorers[0] || null
    const expExplorer = expExplorerOwner?.name === CLUB_OWNER
      ? sortedExplorers.find(e => e.name !== CLUB_OWNER) || expExplorerOwner
      : expExplorerOwner
    const expExplorerNote = expExplorerOwner?.name === CLUB_OWNER && expExplorer !== expExplorerOwner
      ? ` (${CLUB_OWNER}: ${expExplorerOwner.count})`
      : ''

    // ── Games & Venues ────────────────────────────────────────────────────────
    const biggestGame = games.length
      ? games.reduce((a, b) => (b.players.length > a.players.length ? b : a))
      : null

    const biggestKingdom = games.length
      ? games.reduce((a, b) => (b.kingdom.length > a.kingdom.length ? b : a))
      : null

    // Home turf
    const locationCounts = {}
    games.forEach(g => { if (g.location) locationCounts[g.location] = (locationCounts[g.location] || 0) + 1 })
    const topLocationEntry = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]

    // Most common player count
    const countDist = {}
    games.forEach(g => { countDist[g.players.length] = (countDist[g.players.length] || 0) + 1 })
    const mostCommonCount = Object.entries(countDist).sort((a, b) => b[1] - a[1])[0]

    // Busiest month
    const monthCounts = {}
    games.forEach(g => {
      if (g.date) {
        const m = g.date.slice(0, 7)
        monthCounts[m] = (monthCounts[m] || 0) + 1
      }
    })
    const busiestMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]

    // Highest single-game total score
    let maxTotalScore = null
    games.forEach(g => {
      const scores = g.results.filter(r => r.score != null).map(r => r.score)
      if (scores.length >= 2) {
        const total = scores.reduce((a, b) => a + b, 0)
        if (!maxTotalScore || total > maxTotalScore.total) {
          maxTotalScore = { total, game: g.game_num, date: g.date }
        }
      }
    })

    // Province vs Colony
    const provinceGames = games.filter(g => g.victory_type === 'Province').length
    const colonyGames = games.filter(g => g.victory_type === 'Colony').length

    // Average players per game
    const avgPlayers = games.length
      ? decimal(games.reduce((a, g) => a + g.players.length, 0) / games.length)
      : '–'

    // Most expansions in one game
    const mostExpGame = games.length
      ? games.reduce((a, b) => (b.expansions.length > a.expansions.length ? b : a))
      : null

    // Missing early games
    const firstKnownGame = gamesByNum[0]?.game_num ?? null
    const missingCount = firstKnownGame != null && firstKnownGame > 1 ? firstKnownGame - 1 : 0

    // ── Build facts list ──────────────────────────────────────────────────────
    return [
      // Saga & tímamörk
      missingCount > 0 && {
        icon: '📜', title: 'Týnt í sögunni',
        value: isSingular(missingCount) ? `${missingCount} leikur óskráður` : `${missingCount} leikir óskráðir`,
        desc: missingCount === 1
          ? `Skráningin hefst á leik #${firstKnownGame}. Fyrsti leikurinn var spilaður áður en nokkur fór að halda utan um úrslitin.`
          : `Skráningin hefst á leik #${firstKnownGame}. Fyrstu ${missingCount} leikirnir voru spilaðir áður en nokkur fór að halda utan um úrslitin.`,
      },
      topLocationEntry && {
        icon: '🏠', title: 'Heimavöllurinn',
        value: topLocationEntry[0],
        desc: `Uppáhaldsstaður klúbbsins, ${plural(topLocationEntry[1], 'leikur', 'leikir')} til þessa. Ekkert jafnast á við heimavöllinn!`,
      },
      busiestMonth && {
        icon: '📅', title: 'Annasamasti mánuðurinn',
        value: formatMonth(busiestMonth[0]),
        desc: `Flestir leikir á einum mánuði: ${busiestMonth[1]}.`,
      },

      // Stigamet
      highScore && {
        icon: '🏆', title: 'Stigamet',
        value: `${highScore.score} stig`,
        desc: `${highScore.name} í leik #${highScore.game}${highScore.date ? ` (${highScore.date})` : ''}${highScoreNote}`,
        gameNums: [highScore.game],
      },
      maxTotalScore && {
        icon: '💥', title: 'Stigahæsti leikurinn',
        value: `${maxTotalScore.total} stig samtals`,
        desc: `Leikur #${maxTotalScore.game}${maxTotalScore.date ? ` (${maxTotalScore.date})` : ''}. Flest stig samtals í einum leik.`,
        gameNums: [maxTotalScore.game],
      },
      lowScore && {
        icon: '😬', title: 'Lægsta skor',
        value: `${lowScore.score} stig`,
        desc: `${lowScore.name} í leik #${lowScore.game}${lowScore.date ? ` (${lowScore.date})` : ''}${lowScoreNote}. Við ræðum það ekki frekar.`,
        gameNums: [lowScore.game],
      },
      biggestBlowout && {
        icon: '🌊', title: 'Stærsti sigur',
        value: `${plural(biggestBlowout.gap, 'stigs', 'stiga')} munur`,
        desc: `Leikur #${biggestBlowout.game}: ${biggestBlowout.winner} fékk ${biggestBlowout.winnerScore} stig en ${biggestBlowout.loser} aðeins ${biggestBlowout.loserScore}${blowoutNote}`,
        gameNums: [biggestBlowout.game],
      },
      tiedGames.length > 0 && {
        icon: '🤝', title: 'Jafnt á toppnum',
        value: plural(tiedGames.length, 'jafn leikur', 'jafnir leikir'),
        desc: `${tiedGames.map(g => `#${g.game_num}`).join(', ')}: 1. og 2. sæti enduðu með jafnmörg stig. Þá þurfti að skera úr á annan hátt!`,
        gameNums: tiedGames.map(g => g.game_num),
      },
      nailBiter && nailBiter.gap > 0 && {
        icon: '😰', title: 'Æsispennandi leikur',
        value: `${plural(nailBiter.gap, 'stigs', 'stiga')} munur`,
        desc: `Leikur #${nailBiter.game}${nailBiter.date ? ` (${nailBiter.date})` : ''}: ${nailBiter.winner} vann með aðeins ${plural(nailBiter.gap, 'stigs', 'stiga')} mun og ${nailBiter.runnerUp} endaði í 2. sæti${nailBiterNote}`,
        gameNums: [nailBiter.game],
      },
      bestScorer && {
        icon: '💰', title: 'Hæsta meðalskor',
        value: `${decimal(bestScorer.gpa)} stig`,
        desc: `${bestScorer.name} fær að meðaltali ${decimal(bestScorer.gpa)} stig í leik (minnst 5 leikir með skráð stig)${bestScorerNote}`,
      },

      // Leikmannamet
      topStreak && topStreak.streak > 1 && {
        icon: '🔥', title: 'Lengsta sigurganga',
        value: `${topStreak.streak} í röð`,
        desc: `${topStreak.name} var óstöðvandi: ${plural(topStreak.streak, 'sigur', 'sigrar')} í röð${streakNote}`,
      },
      longestGap && {
        icon: '⏳', title: 'Lengsta hléið',
        value: plural(longestGap.gap, 'leikur', 'leikir'),
        desc: `${longestGap.name} mætti aftur eftir ${plural(longestGap.gap, 'leiks', 'leikja')} hlé (leikur #${longestGap.fromGame} → #${longestGap.toGame})`,
        gameNums: [longestGap.toGame],
      },
      runnerUp && {
        icon: '🥈', title: 'Eilíft silfur',
        value: `${runnerUp.second}× í 2. sæti`,
        desc: `${runnerUp.name} hefur oftar en nokkur annar endað í 2. sæti${runnerUpNote}. Svo nálægt, svo oft!`,
      },
      lastPlaceKing && {
        icon: '🎯', title: 'Fastagestur á botninum',
        value: `${timesText(lastPlaceKing[1])} neðst`,
        desc: `${lastPlaceKing[0]} hefur ${timesText(lastPlaceKing[1])} endað í neðsta sæti${lastPlaceNote}. Einhver þarf að halda egóinu hjá hinum í skefjum!`,
      },
      neverWon.length > 0 && {
        icon: '🌱', title: 'Fyrsti sigurinn bíður',
        value: plural(neverWon.length, 'leikmaður', 'leikmenn'),
        desc: `${neverWon.map(p => `${p.name} (${plural(p.games, 'leikur', 'leikir')})`).join(', ')}. Enginn sigur enn, en öll byrja einhvers staðar!`,
      },
      expExplorer && {
        icon: '🗺️', title: 'Landkönnuðurinn',
        value: `${expExplorer.name}`,
        desc: `Hefur spilað með ${plural(expExplorer.count, 'viðbót', 'viðbótum')}, fleiri en nokkur annar${expExplorerNote}`,
      },

      // Spil
      topCards.length > 0 && {
        icon: '♣', title: 'Vinsælustu spilin',
        value: topCards.length === 1 ? topCards[0].name : `${topCards.length} spil jöfn`,
        desc: topCards.length === 1
          ? `Hefur verið í ${plural(maxUsage, 'ríki', 'ríkjum')}. Uppáhald klúbbsins!`
          : `${topCards.slice(0, 3).map(c => c.name).join(', ')}${topCards.length > 3 ? ` og ${topCards.length - 3} til viðbótar` : ''}. Hvert þeirra hefur verið í ${plural(maxUsage, 'ríki', 'ríkjum')}.`,
      },
      topPairs.length > 0 && {
        icon: '🔗', title: 'Óaðskiljanleg spil',
        value: topPairs.length === 1
          ? `${topPairs[0].cards[0]} + ${topPairs[0].cards[1]}`
          : `${topPairs.length} pör jöfn`,
        desc: topPairs.length === 1
          ? `Þessi tvö spil hafa ${timesText(maxPairCount)} verið saman í ríki. Sköpuð hvort fyrir annað!`
          : `${topPairs.slice(0, 2).map(p => `${p.cards[0]} + ${p.cards[1]}`).join(', ')}${topPairs.length > 2 ? ` og ${topPairs.length - 2} til viðbótar` : ''}. Hvert par hefur ${timesText(maxPairCount)} verið saman í ríki.`,
      },
      leastUsedCards.length > 0 && {
        icon: '🦗', title: 'Gleymdu spilin',
        value: leastUsedCards.length === 1 ? leastUsedCards[0].name : `${leastUsedCards.length} spil jöfn`,
        desc: leastUsedCards.length === 1
          ? `Hefur aðeins ${timesText(minUsage)} verið í ríki. Greinilega ekki vinsælt!`
          : `${leastUsedCards.slice(0, 3).map(c => c.name).join(', ')}${leastUsedCards.length > 3 ? ` og ${leastUsedCards.length - 3} til viðbótar` : ''}. Hvert þeirra hefur aðeins ${timesText(minUsage)} verið í ríki.`,
      },
      neverUsed.length > 0 && {
        icon: '👻', title: 'Ósnert spil',
        value: `${neverUsed.length} af ${plural(kingdomCards.length, 'spili', 'spilum')}`,
        desc: `${neverUsed.slice(0, 3).map(c => c.name).join(', ')}${neverUsed.length > 3 ? ` og ${neverUsed.length - 3} til viðbótar` : ''} ${neverUsed.length === 1 ? 'hefur' : 'hafa'} aldrei verið í ríki.`,
      },

      // Leiksnið
      biggestGame && {
        icon: '🎉', title: 'Fjölmennasti leikurinn',
        value: plural(biggestGame.players.length, 'leikmaður', 'leikmenn'),
        desc: `Leikur #${biggestGame.game_num}: ${biggestGame.players.join(', ')}`,
        gameNums: [biggestGame.game_num],
      },
      biggestKingdom && biggestKingdom.kingdom.length > 10 && {
        icon: '👑', title: 'Stærsta ríkið',
        value: `${biggestKingdom.kingdom.length} spil`,
        desc: `Leikur #${biggestKingdom.game_num} var með flest spil í ríkinu`,
        gameNums: [biggestKingdom.game_num],
      },
      mostCommonCount && {
        icon: '👥', title: 'Algengasti fjöldinn',
        value: `${mostCommonCount[0]} leikmenn`,
        desc: `${mostCommonCount[1]} af ${plural(games.length, 'leik', 'leikjum')} (${Math.round(mostCommonCount[1] / games.length * 100)}%) eru ${mostCommonCount[0]} manna leikir.`,
      },
      {
        icon: '📊', title: 'Meðalfjöldi leikmanna',
        value: `${avgPlayers} í leik`,
        desc: 'Að meðaltali við borðið í hverjum leik',
      },
      provinceGames + colonyGames > 0 && {
        icon: '🏛️', title: 'Province eða Colony',
        value: `${provinceGames} gegn ${colonyGames}`,
        desc: provinceGames > colonyGames
          ? 'Flestum leikjum lýkur á Province. Colony-leikir eru sjaldgæfir!'
          : 'Colony-leikir eru óvænt algengir!',
      },
      mostExpGame && mostExpGame.expansions.length > 2 && {
        icon: '📦', title: 'Flestar viðbætur í einum leik',
        value: plural(mostExpGame.expansions.length, 'viðbót', 'viðbætur'),
        desc: `Leikur #${mostExpGame.game_num}: ${mostExpGame.expansions.join(', ')}`,
        gameNums: [mostExpGame.game_num],
      },
    ].filter(Boolean)
  }, [games, players, cards])

  return (
    <section className="section active">
      <h2 className="section-title">Fróðleikur og met klúbbsins</h2>
      <div className="facts-grid">
        {facts.map((f, i) => (
          <Fact key={i} {...f} onGameNav={onGameNav} />
        ))}
      </div>
    </section>
  )
}
