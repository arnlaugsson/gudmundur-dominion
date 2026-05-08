// Pure derivation: compute player achievement badges from games + players.
// Single chronological pass over games. No React, no DOM, no module-level state.

const GAMES_TIERS = [10, 25, 50, 100]
const WIN_TIERS = [1, 5, 10, 25, 50]
const STREAK_TIERS = [3, 5, 10]
const EXPANSION_TIERS = [5, 10] // plus 'all' computed dynamically
const VENUE_TIERS = [5]          // plus 'all' (≥3 games) computed dynamically
const OPPONENT_TIERS = [10]      // plus 'all' (active = ≥10 games) computed dynamically
const ACTIVE_PLAYER_MIN_GAMES = 10
const COMMON_VENUE_MIN_GAMES = 3

function buildAchievement({ id, category, icon, title, detail = null, earnedGameNum = null, earnedDate = null }) {
  return { id, category, icon, title, detail, earnedGameNum, earnedDate }
}

function computeVolumeAndWins(sortedGames, byPlayer) {
  // Walk games in chronological order, count games + wins per player,
  // emit one achievement when a player crosses each threshold.
  const counts = {}   // name -> games count
  const wins = {}     // name -> wins count
  for (const g of sortedGames) {
    for (const name of (g.players || [])) {
      counts[name] = (counts[name] || 0) + 1
      const newGames = counts[name]
      if (GAMES_TIERS.includes(newGames)) {
        byPlayer.get(name).push(buildAchievement({
          id: `games-${newGames}`,
          category: 'volume',
          icon: '🎯',
          title: `${newGames} leikir`,
          earnedGameNum: g.game_num,
          earnedDate: g.date || null,
        }))
      }
    }
    for (const r of (g.results || [])) {
      if (r.place !== 1) continue
      wins[r.name] = (wins[r.name] || 0) + 1
      const newWins = wins[r.name]
      if (WIN_TIERS.includes(newWins)) {
        byPlayer.get(r.name).push(buildAchievement({
          id: `wins-${newWins}`,
          category: 'wins',
          icon: '🥇',
          title: newWins === 1 ? 'Fyrsti sigur' : `${newWins} sigrar`,
          earnedGameNum: g.game_num,
          earnedDate: g.date || null,
        }))
      }
    }
  }
}

function computeRecords(sortedGames, byPlayer) {
  // Find the all-time record holder(s) for: max single-player score,
  // max gap (1st vs last), min gap (1st vs 2nd, ≥1), min winning score.
  let maxScore = -Infinity, maxScoreEntry = null
  let maxGap = -Infinity, maxGapEntry = null
  let minNail = Infinity, minNailEntry = null
  let minWin = Infinity, minWinEntry = null
  for (const g of sortedGames) {
    const scored = (g.results || []).filter(r => r.score != null)
    if (scored.length === 0) continue
    for (const r of scored) {
      if (r.score > maxScore) {
        maxScore = r.score
        maxScoreEntry = { name: r.name, score: r.score, game: g }
      }
    }
    const winners = scored.filter(r => r.place === 1)
    for (const w of winners) {
      if (w.score < minWin) {
        minWin = w.score
        minWinEntry = { name: w.name, score: w.score, game: g }
      }
    }
    if (scored.length >= 2) {
      const sorted = [...scored].sort((a, b) => a.place - b.place)
      const gap = sorted[0].score - sorted[sorted.length - 1].score
      if (gap > maxGap) {
        maxGap = gap
        maxGapEntry = { name: sorted[0].name, gap, game: g }
      }
      const top2 = sorted[0].score - sorted[1].score
      if (top2 >= 1 && top2 < minNail) {
        minNail = top2
        minNailEntry = { name: sorted[0].name, top2, game: g }
      }
    }
  }
  if (maxScoreEntry && byPlayer.has(maxScoreEntry.name)) {
    byPlayer.get(maxScoreEntry.name).push(buildAchievement({
      id: 'record-high-score', category: 'records', icon: '🏆', title: 'Stigamet',
      detail: `${maxScoreEntry.score} stig í leik #${maxScoreEntry.game.game_num}`,
      earnedGameNum: maxScoreEntry.game.game_num, earnedDate: maxScoreEntry.game.date || null,
    }))
  }
  if (maxGapEntry && byPlayer.has(maxGapEntry.name)) {
    byPlayer.get(maxGapEntry.name).push(buildAchievement({
      id: 'record-largest-victory', category: 'records', icon: '🌊', title: 'Stærsti sigur',
      detail: `${maxGapEntry.gap} stiga munur í leik #${maxGapEntry.game.game_num}`,
      earnedGameNum: maxGapEntry.game.game_num, earnedDate: maxGapEntry.game.date || null,
    }))
  }
  if (minNailEntry && byPlayer.has(minNailEntry.name)) {
    byPlayer.get(minNailEntry.name).push(buildAchievement({
      id: 'record-narrowest-victory', category: 'records', icon: '😰', title: 'Spennumesti sigur',
      detail: `${minNailEntry.top2} stiga munur í leik #${minNailEntry.game.game_num}`,
      earnedGameNum: minNailEntry.game.game_num, earnedDate: minNailEntry.game.date || null,
    }))
  }
  if (minWinEntry && byPlayer.has(minWinEntry.name)) {
    byPlayer.get(minWinEntry.name).push(buildAchievement({
      id: 'record-lowest-winning-score', category: 'records', icon: '📉', title: 'Lágmarks-sigur',
      detail: `${minWinEntry.score} stig í leik #${minWinEntry.game.game_num}`,
      earnedGameNum: minWinEntry.game.game_num, earnedDate: minWinEntry.game.date || null,
    }))
  }
}

function computeStreaks(sortedGames, byPlayer) {
  // For each player, walk their games in order; track current consecutive
  // win streak; emit a tier achievement the FIRST time each threshold is hit.
  const cur = {}    // name -> current streak
  const earned = {} // name -> Set of tier numbers already earned
  for (const g of sortedGames) {
    const winner = (g.results || []).find(r => r.place === 1)
    for (const name of (g.players || [])) {
      if (!byPlayer.has(name)) continue
      if (winner && winner.name === name) {
        cur[name] = (cur[name] || 0) + 1
      } else {
        cur[name] = 0
      }
      const streak = cur[name]
      const earnedSet = earned[name] || (earned[name] = new Set())
      for (const tier of STREAK_TIERS) {
        if (streak >= tier && !earnedSet.has(tier)) {
          earnedSet.add(tier)
          byPlayer.get(name).push(buildAchievement({
            id: `streak-${tier}`,
            category: 'streaks',
            icon: '🔥',
            title: `${tier} sigrar í röð`,
            earnedGameNum: g.game_num,
            earnedDate: g.date || null,
          }))
        }
      }
    }
  }
}

function computeVariety(sortedGames, byPlayer, totalsForVariety) {
  // For each player, track:
  //   - distinct expansions across games they WON
  //   - distinct venues they've played at
  //   - distinct opponents they've played against
  // Emit tier achievements the first time each threshold is crossed.
  const wonExp = {}      // name -> Set of expansion names from games they won
  const venues = {}      // name -> Set of venues
  const opponents = {}   // name -> Set of other player names
  const earned = {}      // name -> Set of achievement ids already emitted

  const allExpansions = totalsForVariety.allExpansions
  const commonVenues = totalsForVariety.commonVenues
  const activePlayers = totalsForVariety.activePlayers

  function emitOnce(name, ach) {
    const e = earned[name] || (earned[name] = new Set())
    if (e.has(ach.id)) return
    e.add(ach.id)
    byPlayer.get(name).push(ach)
  }

  for (const g of sortedGames) {
    const winnerName = g.results?.find(r => r.place === 1)?.name || null
    for (const name of (g.players || [])) {
      if (!byPlayer.has(name)) continue
      // Venues
      if (g.location) {
        if (!venues[name]) venues[name] = new Set()
        if (!venues[name].has(g.location)) {
          venues[name].add(g.location)
          const c = venues[name].size
          if (VENUE_TIERS.includes(c)) {
            emitOnce(name, buildAchievement({
              id: `variety-venues-${c}`, category: 'variety', icon: '📍',
              title: `Spilað á ${c} stöðum`,
              earnedGameNum: g.game_num, earnedDate: g.date || null,
            }))
          }
          if (commonVenues.size > 0 && [...commonVenues].every(v => venues[name].has(v))) {
            emitOnce(name, buildAchievement({
              id: 'variety-venues-all', category: 'variety', icon: '📍',
              title: 'Spilað á öllum venjulegum stöðum',
              detail: `${commonVenues.size} staðir`,
              earnedGameNum: g.game_num, earnedDate: g.date || null,
            }))
          }
        }
      }
      // Opponents
      if (!opponents[name]) opponents[name] = new Set()
      const before = opponents[name].size
      for (const other of g.players) if (other !== name) opponents[name].add(other)
      if (opponents[name].size !== before) {
        const c = opponents[name].size
        if (OPPONENT_TIERS.includes(c)) {
          emitOnce(name, buildAchievement({
            id: `variety-opponents-${c}`, category: 'variety', icon: '🤝',
            title: `Spilað við ${c} keppinauta`,
            earnedGameNum: g.game_num, earnedDate: g.date || null,
          }))
        }
        if (activePlayers.size > 0 && [...activePlayers].every(p => p === name || opponents[name].has(p))) {
          emitOnce(name, buildAchievement({
            id: 'variety-opponents-all', category: 'variety', icon: '🤝',
            title: 'Spilað við alla virka klúbbmeðlimi',
            detail: `${activePlayers.size} leikmenn`,
            earnedGameNum: g.game_num, earnedDate: g.date || null,
          }))
        }
      }
    }
    // Expansions — only credit the winner of this game
    if (winnerName && byPlayer.has(winnerName)) {
      if (!wonExp[winnerName]) wonExp[winnerName] = new Set()
      const beforeExp = wonExp[winnerName].size
      for (const e of (g.expansions || [])) wonExp[winnerName].add(e)
      if (wonExp[winnerName].size !== beforeExp) {
        const c = wonExp[winnerName].size
        for (const tier of EXPANSION_TIERS) {
          if (c >= tier) {
            emitOnce(winnerName, buildAchievement({
              id: `variety-expansions-${tier}`, category: 'variety', icon: '🎲',
              title: `Sigur með ${tier} viðbótum`,
              earnedGameNum: g.game_num, earnedDate: g.date || null,
            }))
          }
        }
        if (allExpansions.size > 0 && [...allExpansions].every(e => wonExp[winnerName].has(e))) {
          emitOnce(winnerName, buildAchievement({
            id: 'variety-expansions-all', category: 'variety', icon: '🎲',
            title: 'Sigur með öllum viðbótum',
            detail: `${allExpansions.size} viðbætur`,
            earnedGameNum: g.game_num, earnedDate: g.date || null,
          }))
        }
      }
    }
  }
}

export function computeAchievements(games = [], players = []) {
  const byPlayer = new Map()
  for (const p of players) byPlayer.set(p.name, [])
  if (games.length === 0) return byPlayer
  const sortedGames = [...games].sort((a, b) => a.game_num - b.game_num)

  // Pre-compute global sets used by variety thresholds.
  const allExpansions = new Set()
  const venueGameCounts = {}
  const playerGameCounts = {}
  for (const g of sortedGames) {
    for (const e of (g.expansions || [])) allExpansions.add(e)
    if (g.location) venueGameCounts[g.location] = (venueGameCounts[g.location] || 0) + 1
    for (const p of (g.players || [])) playerGameCounts[p] = (playerGameCounts[p] || 0) + 1
  }
  const commonVenues = new Set(Object.entries(venueGameCounts).filter(([, n]) => n >= COMMON_VENUE_MIN_GAMES).map(([v]) => v))
  const activePlayers = new Set(Object.entries(playerGameCounts).filter(([, n]) => n >= ACTIVE_PLAYER_MIN_GAMES).map(([p]) => p))

  computeVolumeAndWins(sortedGames, byPlayer)
  computeRecords(sortedGames, byPlayer)
  computeStreaks(sortedGames, byPlayer)
  computeVariety(sortedGames, byPlayer, { allExpansions, commonVenues, activePlayers })
  return byPlayer
}
