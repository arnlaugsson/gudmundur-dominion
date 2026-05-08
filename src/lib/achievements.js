// Pure derivation: compute player achievement badges from games + players.
// Single chronological pass over games. No React, no DOM, no module-level state.

const GAMES_TIERS = [10, 25, 50, 100]
const WIN_TIERS = [1, 5, 10, 25, 50]
const STREAK_TIERS = [3, 5, 10]

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

export function computeAchievements(games = [], players = []) {
  const byPlayer = new Map()
  for (const p of players) byPlayer.set(p.name, [])
  if (games.length === 0) return byPlayer
  const sortedGames = [...games].sort((a, b) => a.game_num - b.game_num)
  computeVolumeAndWins(sortedGames, byPlayer)
  computeRecords(sortedGames, byPlayer)
  computeStreaks(sortedGames, byPlayer)
  return byPlayer
}
