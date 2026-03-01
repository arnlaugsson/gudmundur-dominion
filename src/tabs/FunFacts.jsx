import { useMemo } from 'react'
import DATA from '../data'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatMonth(yyyyMM) {
  const [y, m] = yyyyMM.split(/[-.]/)
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`
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
      // Saga & tímamörk
      missingCount > 0 && {
        icon: '📜', title: 'Glatað í sögunni',
        value: `${missingCount} leik${missingCount === 1 ? 'ur' : 'ir'} óskráðir`,
        desc: `Færslur hefjast á leik #${firstKnownGame}. Fyrstu ${missingCount} leikirnir voru spilaðir áður en nokkur hugðist halda utan um þá — glataðir í sögunni!`,
      },
      topLocationEntry && {
        icon: '🏠', title: 'Heimavöllur',
        value: topLocationEntry[0],
        desc: `Uppáhaldsstaðurinn — ${topLocationEntry[1]} leikir spilaðir þar. Ekkert eins og heimavöllur!`,
      },
      busiestMonth && {
        icon: '📅', title: 'Fjölmennastur mánuður',
        value: formatMonth(busiestMonth[0]),
        desc: `Fjölmennasti mánuður klúbbsins með ${busiestMonth[1]} leiki. Sumarleg Dominion er sérstök!`,
      },

      // Stigamet
      highScore && {
        icon: '🏆', title: 'Hæsta skor nokkurnsinm',
        value: `${highScore.score} stig`,
        desc: `${highScore.name} í leik #${highScore.game}${highScore.date ? ` (${highScore.date})` : ''} — met í stigafjölda allra tíma`,
        gameNums: [highScore.game],
      },
      maxTotalScore && {
        icon: '💥', title: 'Stigaríkasti leikurinn',
        value: `${maxTotalScore.total} stig alls`,
        desc: `Leikur #${maxTotalScore.game}${maxTotalScore.date ? ` (${maxTotalScore.date})` : ''} — flestu stig á einum leik`,
        gameNums: [maxTotalScore.game],
      },
      lowScore && {
        icon: '😬', title: 'Lægsta skor',
        value: `${lowScore.score} stig`,
        desc: `${lowScore.name} í leik #${lowScore.game}${lowScore.date ? ` (${lowScore.date})` : ''} — við tölum ekki um þetta`,
        gameNums: [lowScore.game],
      },
      biggestBlowout && {
        icon: '🌊', title: 'Stærsti sigur',
        value: `${biggestBlowout.gap} stiga munur`,
        desc: `Leikur #${biggestBlowout.game}: ${biggestBlowout.winner} (${biggestBlowout.winnerScore}) bræðdi ${biggestBlowout.loser} (${biggestBlowout.loserScore}). Algert yfirburðaspil.`,
        gameNums: [biggestBlowout.game],
      },
      tiedGames.length > 0 && {
        icon: '🤝', title: 'Jafnar lokur',
        value: `${tiedGames.length} jafn${tiedGames.length === 1 ? 'ur leikur' : 'ir leikir'}`,
        desc: `${tiedGames.map(g => `#${g.game_num}`).join(', ')} — 1. og 2. sæti enduðu með sömu stig. Leikniður þurfti að ráða úrslitum!`,
        gameNums: tiedGames.map(g => g.game_num),
      },
      nailBiter && nailBiter.gap > 0 && {
        icon: '😰', title: 'Spennumesti leikurinn',
        value: `${nailBiter.gap} stiga munur`,
        desc: `Leikur #${nailBiter.game}: ${nailBiter.winner} vann yfir ${nailBiter.runnerUp} með aðeins ${nailBiter.gap} stigi${nailBiter.gap !== 1 ? 'um' : ''}${nailBiter.date ? ` (${nailBiter.date})` : ''}`,
        gameNums: [nailBiter.game],
      },
      bestScorer && {
        icon: '💰', title: 'Hæsta meðalskor',
        value: `${bestScorer.gpa.toFixed(1)} stig`,
        desc: `${bestScorer.name} er með ${bestScorer.gpa.toFixed(1)} meðalstig á leik (min. 5 metin leikir)`,
      },

      // Leikendamet
      topStreak && topStreak.streak > 1 && {
        icon: '🔥', title: 'Lengsta sigurröð',
        value: `${topStreak.streak} í röð`,
        desc: `${topStreak.name} fór á óstöðvanlegt skrið — ${topStreak.streak} sigurleikar í röð`,
      },
      runnerUp && {
        icon: '🥈', title: 'Smiður á 2. sæti',
        value: `${runnerUp.second}× í 2. sæti`,
        desc: `${runnerUp.name} hefur lokið í 2. sæti fleiri sinnum en nokkur annar. Svo nálægt, svo oft — silfursætisgengni!`,
      },
      lastPlaceKing && {
        icon: '🎯', title: 'Hinn góðgjarna taparinn',
        value: `${lastPlaceKing[1]} síðustu sæti`,
        desc: `${lastPlaceKing[0]} hefur gjöfult lagt ${lastPlaceKing[1]} síðustu sæti til tölfræðinnar. Sérhver klúbbur þarf einhvern til að halda egói annarra í skefjum.`,
      },
      neverWon.length > 0 && {
        icon: '🌱', title: 'Enn í leit að dýrðinni',
        value: `${neverWon.length} leikmaður${neverWon.length !== 1 ? 'menn' : ''}`,
        desc: `${neverWon.map(p => `${p.name} (${p.games} leikir)`).join(', ')} — hefur ekki unnið enn. Sérhver meistari var einu sinni byrjandi!`,
      },
      expExplorer && {
        icon: '🗺️', title: 'Viðbótar-rannsakandi',
        value: `${expExplorer.name}`,
        desc: `Hefur spilað í leikjum með ${expExplorer.count} mismunandi viðbætur — fjölbreyttastur leikmanna`,
      },

      // Spil
      topCard && {
        icon: '♣', title: 'Uppáhaldskortin',
        value: topCard.name,
        desc: `Kom fyrir í ${topCard.times_used} ríkjum — uppáhald klúbbsins`,
      },
      topPair && {
        icon: '🔗', title: 'Kraftapari',
        value: `${topPair.cards[0]} + ${topPair.cards[1]}`,
        desc: `Þessi tvö spil hafa verið í sama ríki ${topPair.count} sinnum — skapaðar fyrir hvort annað`,
      },
      leastUsed && {
        icon: '🦗', title: 'Gleymda kortið',
        value: leastUsed.name,
        desc: `Kom aðeins fyrir ${leastUsed.times_used} sinni${leastUsed.times_used !== 1 ? 'um' : ''} — greinilega ekki vinsælt`,
      },
      neverUsed.length > 0 && {
        icon: '👻', title: 'Ósnert spil',
        value: `${neverUsed.length} spil`,
        desc: `${neverUsed.slice(0, 3).map(c => c.name).join(', ')}${neverUsed.length > 3 ? `… og ${neverUsed.length - 3} til viðbótar` : ''} — hafa aldrei komið í ríki`,
      },

      // Leiksnið
      biggestGame && {
        icon: '🎉', title: 'Stærsti leikurinn',
        value: `${biggestGame.players.length} leikmenn`,
        desc: `Leikur #${biggestGame.game_num} — ${biggestGame.players.join(', ')}`,
        gameNums: [biggestGame.game_num],
      },
      biggestKingdom && biggestKingdom.kingdom.length > 10 && {
        icon: '👑', title: 'Stærsta ríkið',
        value: `${biggestKingdom.kingdom.length} spil`,
        desc: `Leikur #${biggestKingdom.game_num} var með flest ríkiskort`,
        gameNums: [biggestKingdom.game_num],
      },
      mostCommonCount && {
        icon: '👥', title: 'Uppáhalds snið',
        value: `${mostCommonCount[0]}-manns`,
        desc: `${mostCommonCount[1]} af ${games.length} leikjum (${Math.round(mostCommonCount[1] / games.length * 100)}%) eru ${mostCommonCount[0]}-manns leikir. Uppáhalds sniðið.`,
      },
      {
        icon: '📊', title: 'Meðalstærð leiks',
        value: `${avgPlayers} leikmenn`,
        desc: 'Meðalfjöldi leikenda á leik',
      },
      provinceGames + colonyGames > 0 && {
        icon: '🏛️', title: 'Héraðið vs Nýlendur',
        value: `${provinceGames} vs ${colonyGames}`,
        desc: provinceGames > colonyGames
          ? 'Héraðssigrar eru ríkjandi — Nýlenduríki eru sjaldgæf!'
          : 'Nýlenduleikir eru óvænt algengir!',
      },
      mostExpGame && mostExpGame.expansions.length > 2 && {
        icon: '📦', title: 'Flestar viðbætur í einum leik',
        value: `${mostExpGame.expansions.length} viðbætur`,
        desc: `Leikur #${mostExpGame.game_num}: ${mostExpGame.expansions.join(', ')}`,
        gameNums: [mostExpGame.game_num],
      },
    ].filter(Boolean)
  }, [games, players, cards])

  return (
    <section className="section active">
      <h2 className="section-title">Skemmtilegar staðreyndir &amp; met klúbbsins</h2>
      <div className="facts-grid">
        {facts.map((f, i) => (
          <Fact key={i} {...f} onGameNav={onGameNav} />
        ))}
      </div>
    </section>
  )
}
