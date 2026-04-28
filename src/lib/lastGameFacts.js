// Pure derivation: compute fun facts for a single game in the context
// of all known games. No React imports, no DOM access.

const ROUND_GAME_MILESTONES = new Set([10, 25, 50, 100, 150, 200, 250, 300])
const ROUND_WIN_MILESTONES = new Set([5, 10, 25, 50, 100])
const RETURN_GAP_THRESHOLD = 30
const STREAK_THRESHOLD = 3
const SPOTLIGHT_RARE_MAX = 3
const MAX_FACTS = 5
// Standard Dominion games hit these ceilings; only call out as a "record" when above the norm.
const KINGDOM_RECORD_MIN = 10
const EXPANSIONS_RECORD_MIN = 2

function buildRecordFacts(game, allGames) {
  const facts = []
  const scored = (game.results || []).filter(r => r.score != null)
  if (scored.length === 0) return [...facts, ...buildSetupRecords(game, allGames)]

  // All historical scores (single-player), max kingdom size, max expansions, max gap, etc.
  let maxScore = -Infinity
  let maxTotal = -Infinity
  let maxGap = -Infinity
  let minNailbiter = Infinity
  let maxKingdom = -Infinity
  let maxExpansions = -Infinity

  for (const g of allGames) {
    if (g === game) continue // exclude current game from the "previous" max
    const s = (g.results || []).filter(r => r.score != null)
    if (s.length > 0) {
      for (const r of s) if (r.score > maxScore) maxScore = r.score
      const total = s.reduce((a, b) => a + b.score, 0)
      if (total > maxTotal) maxTotal = total
      if (s.length >= 2) {
        const sorted = [...s].sort((a, b) => a.place - b.place)
        const gap = sorted[0].score - sorted[sorted.length - 1].score
        if (gap > maxGap) maxGap = gap
        const top2 = sorted[0].score - sorted[1].score
        if (top2 >= 1 && top2 < minNailbiter) minNailbiter = top2
      }
    }
    if ((g.kingdom?.length ?? 0) > maxKingdom) maxKingdom = g.kingdom?.length ?? 0
    if ((g.expansions?.length ?? 0) > maxExpansions) maxExpansions = g.expansions?.length ?? 0
  }

  // This game's values
  const sortedScored = [...scored].sort((a, b) => a.place - b.place)
  const thisMaxScore = Math.max(...scored.map(r => r.score))
  const thisTotal = scored.reduce((a, b) => a + b.score, 0)
  const thisGap = sortedScored.length >= 2
    ? sortedScored[0].score - sortedScored[sortedScored.length - 1].score
    : null
  const thisTop2 = sortedScored.length >= 2
    ? sortedScored[0].score - sortedScored[1].score
    : null
  const thisKingdom = game.kingdom?.length ?? 0
  const thisExpansions = game.expansions?.length ?? 0

  if (thisMaxScore >= maxScore && thisMaxScore !== -Infinity) {
    const top = scored.find(r => r.score === thisMaxScore)
    facts.push({ icon: '🏆', title: 'Stigamet', text: `${top.name} skoraði ${thisMaxScore} stig — met klúbbsins` })
  }
  if (thisTotal >= maxTotal && maxTotal !== -Infinity) {
    facts.push({ icon: '💥', title: 'Stigaríkasti leikurinn', text: `${thisTotal} stig samtals — met` })
  }
  if (thisGap != null && thisGap >= maxGap && maxGap !== -Infinity) {
    const winner = sortedScored[0]
    const loser = sortedScored[sortedScored.length - 1]
    facts.push({ icon: '🌊', title: 'Stærsti sigur', text: `${winner.name} vann ${loser.name} með ${thisGap} stiga mun — met` })
  }
  if (thisTop2 != null && thisTop2 >= 1 && thisTop2 <= minNailbiter && minNailbiter !== Infinity) {
    facts.push({ icon: '😰', title: 'Spennumesti leikurinn', text: `Aðeins ${thisTop2} stiga munur á 1. og 2. sæti — met` })
  }
  if (thisKingdom > KINGDOM_RECORD_MIN && thisKingdom >= maxKingdom && maxKingdom !== -Infinity) {
    facts.push({ icon: '👑', title: 'Stærsta ríkið', text: `${thisKingdom} ríkiskort — met` })
  }
  if (thisExpansions > EXPANSIONS_RECORD_MIN && thisExpansions >= maxExpansions && maxExpansions !== -Infinity) {
    facts.push({ icon: '📦', title: 'Flestar viðbætur', text: `${thisExpansions} viðbætur í einum leik — met` })
  }
  return facts
}

// Setup-only records (kingdom size, expansions) for games without scored results
function buildSetupRecords(game, allGames) {
  const facts = []
  let maxKingdom = -Infinity
  let maxExpansions = -Infinity
  for (const g of allGames) {
    if (g === game) continue
    if ((g.kingdom?.length ?? 0) > maxKingdom) maxKingdom = g.kingdom?.length ?? 0
    if ((g.expansions?.length ?? 0) > maxExpansions) maxExpansions = g.expansions?.length ?? 0
  }
  const thisKingdom = game.kingdom?.length ?? 0
  const thisExpansions = game.expansions?.length ?? 0
  if (thisKingdom > KINGDOM_RECORD_MIN && thisKingdom >= maxKingdom && maxKingdom !== -Infinity) {
    facts.push({ icon: '👑', title: 'Stærsta ríkið', text: `${thisKingdom} ríkiskort — met` })
  }
  if (thisExpansions > EXPANSIONS_RECORD_MIN && thisExpansions >= maxExpansions && maxExpansions !== -Infinity) {
    facts.push({ icon: '📦', title: 'Flestar viðbætur', text: `${thisExpansions} viðbætur í einum leik — met` })
  }
  return facts
}

function buildMilestoneFacts(game, allGames) {
  const facts = []
  const sortedHistory = [...allGames].sort((a, b) => a.game_num - b.game_num)
  const thisIdx = sortedHistory.indexOf(game)
  const previousGames = sortedHistory.slice(0, thisIdx)

  // Tally history per player
  const gamesPlayed = {}
  const winsCount = {}
  const lastSeenIdx = {}
  previousGames.forEach((g, i) => {
    g.players?.forEach(name => {
      gamesPlayed[name] = (gamesPlayed[name] || 0) + 1
      lastSeenIdx[name] = i
    })
    g.results?.forEach(r => { if (r.place === 1) winsCount[r.name] = (winsCount[r.name] || 0) + 1 })
  })

  const seenPlayers = new Set() // ensure one milestone per player

  // First appearance ever
  for (const name of (game.players || [])) {
    if (!seenPlayers.has(name) && (gamesPlayed[name] || 0) === 0) {
      facts.push({ icon: '🌟', title: 'Fyrsti leikur', text: `${name} spilaði sinn fyrsta leik` })
      seenPlayers.add(name)
    }
  }

  // First win ever
  for (const r of (game.results || [])) {
    if (r.place !== 1 || seenPlayers.has(r.name)) continue
    if ((winsCount[r.name] || 0) === 0 && (gamesPlayed[r.name] || 0) > 0) {
      facts.push({ icon: '🥇', title: 'Fyrsti sigur', text: `${r.name} vann í fyrsta sinn (eftir ${gamesPlayed[r.name]} leiki)` })
      seenPlayers.add(r.name)
    }
  }

  // Round-number game count (after this game)
  for (const name of (game.players || [])) {
    if (seenPlayers.has(name)) continue
    const total = (gamesPlayed[name] || 0) + 1 // include this game
    if (ROUND_GAME_MILESTONES.has(total)) {
      facts.push({ icon: '🎯', title: `${total}. leikur`, text: `${name} náði ${total} leikjum í klúbbnum` })
      seenPlayers.add(name)
    }
  }

  // Round-number win count
  for (const r of (game.results || [])) {
    if (r.place !== 1 || seenPlayers.has(r.name)) continue
    const total = (winsCount[r.name] || 0) + 1
    if (ROUND_WIN_MILESTONES.has(total)) {
      facts.push({ icon: '🎖️', title: `${total}. sigur`, text: `${r.name} náði ${total} sigrum` })
      seenPlayers.add(r.name)
    }
  }

  // Win streak ≥ STREAK_THRESHOLD for this game's winner
  const winner = (game.results || []).find(r => r.place === 1)
  if (winner && !seenPlayers.has(winner.name)) {
    let streak = 1
    for (let i = previousGames.length - 1; i >= 0; i--) {
      const g = previousGames[i]
      if (!g.players?.includes(winner.name)) continue
      const w = g.results?.find(r => r.place === 1)
      if (w?.name === winner.name) streak++
      else break
    }
    if (streak >= STREAK_THRESHOLD) {
      facts.push({ icon: '🔥', title: 'Sigurröð', text: `${winner.name} hefur unnið ${streak} leiki í röð` })
      seenPlayers.add(winner.name)
    }
  }

  // Returning player after long gap
  for (const name of (game.players || [])) {
    if (seenPlayers.has(name)) continue
    const last = lastSeenIdx[name]
    if (last == null) continue // first-timer (already covered)
    const gap = thisIdx - last
    if (gap >= RETURN_GAP_THRESHOLD) {
      facts.push({ icon: '👋', title: 'Aftur eftir hlé', text: `${name} mætti aftur eftir ${gap} leiki` })
      seenPlayers.add(name)
    }
  }

  return facts
}

function buildSpotlightFact(game, allGames, cards) {
  const kingdom = game.kingdom || []
  if (kingdom.length === 0) return null
  const sortedHistory = [...allGames].sort((a, b) => a.game_num - b.game_num)
  const thisIdx = sortedHistory.indexOf(game)
  const previousGames = sortedHistory.slice(0, thisIdx)

  // Count historical kingdom appearances of each card name (ignore extras for spotlight)
  const priorUsage = {}
  for (const g of previousGames) {
    g.kingdom?.forEach(k => { priorUsage[k.card] = (priorUsage[k.card] || 0) + 1 })
  }

  // Frumraun: any card with prior usage 0
  const debutCard = kingdom.find(k => (priorUsage[k.card] || 0) === 0)
  if (debutCard) {
    return { icon: '✨', title: 'Frumraun', text: `${debutCard.card} kom í ríki í fyrsta sinn` }
  }

  // Sjaldgæft: card with the lowest prior usage among kingdom cards, if ≤ SPOTLIGHT_RARE_MAX
  let rare = null
  for (const k of kingdom) {
    const u = priorUsage[k.card] || 0
    if (u <= SPOTLIGHT_RARE_MAX && (rare == null || u < rare.count)) {
      rare = { card: k.card, count: u }
    }
  }
  if (rare) {
    const desc = rare.count === 1
      ? `${rare.card} hafði aðeins komið einu sinni áður í ríki`
      : `${rare.card} hafði aðeins komið ${rare.count} sinnum áður í ríki`
    return { icon: '🦗', title: 'Sjaldgæft spil', text: desc }
  }

  return null
}

function buildResultSnippet(game) {
  const scored = (game.results || []).filter(r => r.score != null).sort((a, b) => a.place - b.place)
  if (scored.length === 0) {
    // No scores recorded — fall back to listing players
    const players = (game.players || []).join(', ')
    return players
      ? { icon: '🎲', title: 'Niðurstaða', text: `Spilarar: ${players}` }
      : null
  }
  const winner = scored[0]
  const runnerUp = scored[1]
  const gap = runnerUp ? winner.score - runnerUp.score : null
  const victory = game.victory_type ? ` — ${game.victory_type} sigur` : ''
  const gapText = runnerUp != null
    ? ` (${gap} yfir ${runnerUp.name})`
    : ''
  return {
    icon: '🎲',
    title: 'Niðurstaða',
    text: `${winner.name} vann með ${winner.score} stigum${gapText}${victory}`,
  }
}

export function computeLastGameFacts(game, allGames, players, cards) {
  if (!game) return []
  const records = buildRecordFacts(game, allGames)
  const milestones = buildMilestoneFacts(game, allGames)
  const result = buildResultSnippet(game)
  const spotlight = buildSpotlightFact(game, allGames, cards)

  const ordered = [
    ...records,
    ...milestones,
    ...(result ? [result] : []),
    ...(spotlight ? [spotlight] : []),
  ]
  return ordered.slice(0, MAX_FACTS)
}
