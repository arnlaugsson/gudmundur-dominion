import { useMemo } from 'react'
import DATA from '../data'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatMonth(yyyyMM) {
  const [y, m] = yyyyMM.split('.')
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`
}

function Fact({ icon, title, value, desc }) {
  return (
    <div className="fact-card">
      <div className="fi">{icon}</div>
      <div className="ft">{title}</div>
      {value && <div className="fv">{value}</div>}
      <div className="fd">{desc}</div>
    </div>
  )
}

export default function FunFacts() {
  const { games, players, cards } = DATA

  const facts = useMemo(() => {
    const gamesByNum = [...games].sort((a, b) => a.game_num - b.game_num)
    const allScores = games.flatMap(g =>
      g.results.filter(r => r.score != null).map(r => ({ ...r, date: g.date, game: g.game_num }))
    )

    // ── Scores ──────────────────────────────────────────────────────────────
    const highScore = allScores.length
      ? allScores.reduce((a, b) => (b.score > a.score ? b : a))
      : null

    const positiveScores = allScores.filter(s => s.score > 0)
    const lowScore = positiveScores.length
      ? positiveScores.reduce((a, b) => (b.score < a.score ? b : a))
      : null

    // ── Blowout & Nail-biter ────────────────────────────────────────────────
    let biggestBlowout = null
    let nailBiter = null
    let tiedGames = []

    games.forEach(g => {
      const scored = g.results.filter(r => r.score != null).sort((a, b) => a.place - b.place)
      if (scored.length < 2) return
      const gap = scored[0].score - scored[scored.length - 1].score
      if (!biggestBlowout || gap > biggestBlowout.gap) {
        biggestBlowout = { gap, winner: scored[0].name, loser: scored[scored.length - 1].name,
          winnerScore: scored[0].score, loserScore: scored[scored.length - 1].score, game: g.game_num, date: g.date }
      }

      const r1 = scored.find(r => r.place === 1)
      const r2 = scored.find(r => r.place === 2)
      if (r1 && r2) {
        const top2gap = r1.score - r2.score
        if (!nailBiter || top2gap < nailBiter.gap) {
          nailBiter = { gap: top2gap, winner: r1.name, runnerUp: r2.name, game: g.game_num, date: g.date }
        }
        if (top2gap === 0) tiedGames.push(g)
      }
    })

    // ── Cards ────────────────────────────────────────────────────────────────
    const kingdomCards = cards.filter(c => !c.removed && !c.isSupplyCard)

    const topCard = kingdomCards.length
      ? [...kingdomCards].sort((a, b) => b.times_used - a.times_used)[0]
      : null

    const leastUsed = kingdomCards.filter(c => c.times_used > 0).sort((a, b) => a.times_used - b.times_used)[0] || null
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
    const topPairEntry = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0]
    const topPair = topPairEntry
      ? { cards: topPairEntry[0].split('|||'), count: topPairEntry[1] }
      : null

    // ── Players ───────────────────────────────────────────────────────────────
    const runnerUp = [...players].sort((a, b) => b.second - a.second)[0] || null

    // Last place finishes
    const lastCounts = {}
    games.forEach(g => {
      if (g.players.length < 2) return
      const maxPlace = Math.max(...g.results.map(r => r.place))
      g.results.filter(r => r.place === maxPlace).forEach(r => {
        lastCounts[r.name] = (lastCounts[r.name] || 0) + 1
      })
    })
    const lastPlaceKing = Object.entries(lastCounts).sort((a, b) => b[1] - a[1])[0]

    // Win streak
    const streaks = players.map(p => {
      let best = 0, cur = 0
      gamesByNum.forEach(g => {
        if (g.results[0]?.name === p.name) { cur++; best = Math.max(best, cur) }
        else if (g.players.includes(p.name)) cur = 0
      })
      return { name: p.name, streak: best }
    })
    const topStreak = [...streaks].sort((a, b) => b.streak - a.streak)[0] || null

    // Never won (min 5 games, 0 wins)
    const neverWon = players.filter(p => p.games >= 5 && p.first === 0).sort((a, b) => b.games - a.games)

    // Best avg scorer (min 5 scored games)
    const bestScorer = players.filter(p => (p.scores?.length ?? 0) >= 5)
      .sort((a, b) => (b.gpa ?? 0) - (a.gpa ?? 0))[0] || null

    // Expansion variety per player
    const playerExpSets = {}
    games.forEach(g => {
      g.players.forEach(p => {
        if (!playerExpSets[p]) playerExpSets[p] = new Set()
        g.expansions.forEach(e => playerExpSets[p].add(e))
      })
    })
    const expExplorer = Object.entries(playerExpSets)
      .map(([name, exps]) => ({ name, count: exps.size }))
      .sort((a, b) => b.count - a.count)[0] || null

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
      ? (games.reduce((a, g) => a + g.players.length, 0) / games.length).toFixed(1)
      : '—'

    // Most expansions in one game
    const mostExpGame = games.length
      ? games.reduce((a, b) => (b.expansions.length > a.expansions.length ? b : a))
      : null

    // Missing early games
    const firstKnownGame = gamesByNum[0]?.game_num ?? null
    const missingCount = firstKnownGame != null && firstKnownGame > 1 ? firstKnownGame - 1 : 0

    // ── Build facts list ──────────────────────────────────────────────────────
    return [
      // History & milestones
      missingCount > 0 && {
        icon: '📜', title: 'Lost to History',
        value: `${missingCount} game${missingCount === 1 ? '' : 's'} unrecorded`,
        desc: `Records begin at game #${firstKnownGame}. The first ${missingCount} game${missingCount === 1 ? ' was' : 's were'} played before anyone thought to start a spreadsheet — lost to legend!`,
      },
      topLocationEntry && {
        icon: '🏠', title: 'Home Turf',
        value: topLocationEntry[0],
        desc: `The club's go-to venue — ${topLocationEntry[1]} games played there. There's no place like home for Dominion.`,
      },
      busiestMonth && {
        icon: '📅', title: 'Peak Season',
        value: formatMonth(busiestMonth[0]),
        desc: `The club's busiest month ever with ${busiestMonth[1]} games. Summer Dominion hits different!`,
      },

      // Score records
      highScore && {
        icon: '🏆', title: 'Highest Score Ever',
        value: `${highScore.score} pts`,
        desc: `${highScore.name} in game #${highScore.game}${highScore.date ? ` (${highScore.date})` : ''} — an all-time points record`,
      },
      maxTotalScore && {
        icon: '💥', title: 'Highest Scoring Game',
        value: `${maxTotalScore.total} pts total`,
        desc: `Game #${maxTotalScore.game}${maxTotalScore.date ? ` (${maxTotalScore.date})` : ''} — the most points ever scored across all players in a single game`,
      },
      lowScore && {
        icon: '😬', title: 'Lowest Score',
        value: `${lowScore.score} pts`,
        desc: `${lowScore.name} in game #${lowScore.game}${lowScore.date ? ` (${lowScore.date})` : ''} — we don't talk about this one`,
      },
      biggestBlowout && {
        icon: '🌊', title: 'Biggest Blowout',
        value: `${biggestBlowout.gap} pts`,
        desc: `Game #${biggestBlowout.game}: ${biggestBlowout.winner} (${biggestBlowout.winnerScore}) crushed ${biggestBlowout.loser} (${biggestBlowout.loserScore}). Absolutely dominant.`,
      },
      tiedGames.length > 0 && {
        icon: '🤝', title: 'Dead Heats',
        value: `${tiedGames.length} tied game${tiedGames.length === 1 ? '' : 's'}`,
        desc: `${tiedGames.map(g => `#${g.game_num}`).join(', ')} — 1st and 2nd place finished with the exact same score. A tiebreaker had to decide the winner!`,
      },
      nailBiter && nailBiter.gap > 0 && {
        icon: '😰', title: 'Nail-Biter',
        value: `${nailBiter.gap} pt margin`,
        desc: `Game #${nailBiter.game}: ${nailBiter.winner} edged out ${nailBiter.runnerUp} by just ${nailBiter.gap} point${nailBiter.gap === 1 ? '' : 's'}${nailBiter.date ? ` (${nailBiter.date})` : ''}`,
      },
      bestScorer && {
        icon: '💰', title: 'Highest Average Score',
        value: `${bestScorer.gpa.toFixed(1)} pts`,
        desc: `${bestScorer.name} averages ${bestScorer.gpa.toFixed(1)} pts per game (min 5 scored games)`,
      },

      // Player records
      topStreak && topStreak.streak > 1 && {
        icon: '🔥', title: 'Longest Win Streak',
        value: `${topStreak.streak} in a row`,
        desc: `${topStreak.name} went on an unstoppable run — ${topStreak.streak} consecutive wins`,
      },
      runnerUp && {
        icon: '🥈', title: 'Runner-up King',
        value: `${runnerUp.second}× second place`,
        desc: `${runnerUp.name} has finished 2nd more than anyone else. So close, so many times — a silver lining legend.`,
      },
      lastPlaceKing && {
        icon: '🎯', title: 'Generous Loser',
        value: `${lastPlaceKing[1]} last places`,
        desc: `${lastPlaceKing[0]} has generously donated ${lastPlaceKing[1]} last-place finishes to the statistics. Every club needs someone to keep the others' egos in check.`,
      },
      neverWon.length > 0 && {
        icon: '🌱', title: 'Still Searching for Glory',
        value: `${neverWon.length} player${neverWon.length === 1 ? '' : 's'}`,
        desc: `${neverWon.map(p => `${p.name} (${p.games} games)`).join(', ')} — yet to claim a first win. Every champion was once a beginner!`,
      },
      expExplorer && {
        icon: '🗺️', title: 'Expansion Explorer',
        value: `${expExplorer.name}`,
        desc: `Has played in games featuring ${expExplorer.count} different expansion sets — the most well-travelled player in the club`,
      },

      // Cards
      topCard && {
        icon: '♣', title: 'Most Beloved Card',
        value: topCard.name,
        desc: `Appeared in ${topCard.times_used} kingdoms — the club's undisputed favourite`,
      },
      topPair && {
        icon: '🔗', title: 'Power Couple',
        value: `${topPair.cards[0]} + ${topPair.cards[1]}`,
        desc: `These two cards have been in the same kingdom ${topPair.count} times — a match made in Dominion heaven`,
      },
      leastUsed && {
        icon: '🦗', title: 'Forgotten Card',
        value: leastUsed.name,
        desc: `Only appeared ${leastUsed.times_used} time${leastUsed.times_used === 1 ? '' : 's'} — clearly not a crowd-pleaser`,
      },
      neverUsed.length > 0 && {
        icon: '👻', title: 'Untouched Cards',
        value: `${neverUsed.length} cards`,
        desc: `${neverUsed.slice(0, 3).map(c => c.name).join(', ')}${neverUsed.length > 3 ? `… and ${neverUsed.length - 3} more` : ''} — never made it into a kingdom`,
      },

      // Game formats
      biggestGame && {
        icon: '🎉', title: 'Biggest Game',
        value: `${biggestGame.players.length} players`,
        desc: `Game #${biggestGame.game_num} — ${biggestGame.players.join(', ')}`,
      },
      biggestKingdom && biggestKingdom.kingdom.length > 10 && {
        icon: '👑', title: 'Largest Kingdom',
        value: `${biggestKingdom.kingdom.length} cards`,
        desc: `Game #${biggestKingdom.game_num} had the most kingdom cards`,
      },
      mostCommonCount && {
        icon: '👥', title: 'Favourite Format',
        value: `${mostCommonCount[0]}-player`,
        desc: `${mostCommonCount[1]} out of ${games.length} games (${Math.round(mostCommonCount[1] / games.length * 100)}%) have been ${mostCommonCount[0]}-player games. The club's sweet spot.`,
      },
      {
        icon: '📊', title: 'Average Game Size',
        value: `${avgPlayers} players`,
        desc: 'Average number of players per game',
      },
      provinceGames + colonyGames > 0 && {
        icon: '🏛️', title: 'Province vs Colony',
        value: `${provinceGames} vs ${colonyGames}`,
        desc: provinceGames > colonyGames
          ? 'Province victories reign supreme — Prosperity kingdoms are rare!'
          : 'Colony games are surprisingly common!',
      },
      mostExpGame && mostExpGame.expansions.length > 2 && {
        icon: '📦', title: 'Most Expansions in a Game',
        value: `${mostExpGame.expansions.length} expansions`,
        desc: `Game #${mostExpGame.game_num}: ${mostExpGame.expansions.join(', ')}`,
      },
    ].filter(Boolean)
  }, [games, players, cards])

  return (
    <section className="section active">
      <h2 className="section-title">Fun Facts &amp; Club Records</h2>
      <div className="facts-grid">
        {facts.map((f, i) => (
          <Fact key={i} {...f} />
        ))}
      </div>
    </section>
  )
}
