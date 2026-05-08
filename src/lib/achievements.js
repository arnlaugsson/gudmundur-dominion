// Pure derivation: compute player achievement badges from games + players.
// Single chronological pass over games. No React, no DOM, no module-level state.

const GAMES_TIERS = [10, 25, 50, 100]
const WIN_TIERS = [1, 5, 10, 25, 50]

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

export function computeAchievements(games = [], players = []) {
  const byPlayer = new Map()
  for (const p of players) byPlayer.set(p.name, [])
  if (games.length === 0) return byPlayer
  const sortedGames = [...games].sort((a, b) => a.game_num - b.game_num)
  computeVolumeAndWins(sortedGames, byPlayer)
  return byPlayer
}
