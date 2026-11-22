// Pure helpers for the kingdom suggester (no React).

export const MODES = [
  { id: 'random',    icon: '🎲', name: 'Hrein tilviljun', desc: 'Ríki valið algjörlega af handahófi' },
  { id: 'least',     icon: '🦗', name: 'Gleymdu spilin',  desc: 'Spilin sem hafa sjaldnast verið í ríkinu' },
  { id: 'favorites', icon: '⭐', name: 'Uppáhald allra',  desc: 'Vinsælustu spilin í sögu klúbbsins' },
  { id: 'balanced',  icon: '⚖️', name: 'Í jafnvægi',      desc: 'Blanda af nýjum og kunnuglegum spilum' },
]

export const SPECIAL_TYPES = new Set(['Event', 'Landmark', 'Project', 'Way', 'Ally', 'Trait', 'Prophecy'])

export const TYPE_COLOR = {
  Event: '#f97316', Landmark: '#3fb950', Project: '#58a6ff',
  Way: '#a78bfa', Ally: '#f43f5e', Trait: '#06b6d4', Prophecy: '#e879f9',
}

// Subtypes not exposed in the card data. Liaisons summon an Ally; Omens summon a Prophecy.
export const LIAISON_NAMES = new Set([
  'Bauble', 'Sycophant', 'Importer', 'Underling', 'Broker', 'Contract',
  'Emissary', 'Galleria', 'Guildmaster', 'Wizards', 'Hunter', 'Modify',
  'Specialist', 'Swap',
])
export const OMEN_NAMES = new Set([
  'Aristocrat', 'Artist', 'Daimyo', 'Gold mine', 'Imperial envoy',
  'Mountain shrine', 'Snake witch', 'Tanuki',
])

// Unbiased Fisher–Yates sample (sort(() => Math.random() - 0.5) is biased).
export function pickRandom(arr, n, random = Math.random) {
  if (arr.length === 0 || n <= 0) return []
  const copy = [...arr]
  const count = Math.min(n, copy.length)
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (copy.length - i))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, count)
}

export function pickLandscapeCards(extrasPool, kingdom) {
  const byType = { Event: [], Landmark: [], Project: [], Way: [], Trait: [], Ally: [], Prophecy: [] }
  for (const c of extrasPool) {
    if (byType[c.card_type]) byType[c.card_type].push(c)
  }

  const picked = []

  // Always include 1 Way (kingdom-wide modifier from Menagerie) if any are available
  picked.push(...pickRandom(byType.Way, 1))

  // Always include 1 Trait (attaches to a Kingdom pile, from Plunder) if any are available.
  // The trait modifies a single Kingdom pile per Dominion's Plunder rules — pair it with a
  // random kingdom card so the suggestion specifies which pile.
  const traitPicks = pickRandom(byType.Trait, 1)
  if (traitPicks.length > 0 && kingdom.length > 0) {
    const target = kingdom[Math.floor(Math.random() * kingdom.length)]
    picked.push({ ...traitPicks[0], _attachedCard: target.name })
  } else {
    picked.push(...traitPicks)
  }

  // 1 Ally only if the kingdom contains a Liaison (Allies expansion rule)
  if (kingdom.some(c => LIAISON_NAMES.has(c.name))) {
    picked.push(...pickRandom(byType.Ally, 1))
  }

  // 1 Prophecy only if the kingdom contains an Omen (Rising Sun rule)
  if (kingdom.some(c => OMEN_NAMES.has(c.name))) {
    picked.push(...pickRandom(byType.Prophecy, 1))
  }

  // 1–2 from Event/Landmark/Project combined (Dominion's standard 0–2 cap, biased toward inclusion)
  const elp = [...byType.Event, ...byType.Landmark, ...byType.Project]
  if (elp.length > 0) {
    const count = Math.random() < 0.5 ? 1 : 2
    picked.push(...pickRandom(elp, count))
  }

  return picked
}

export const PLAYER_MODES = [
  { id: 'unseen',    name: 'Óspilað',    desc: 'Spil sem valdir leikmenn hafa aldrei spilað' },
  { id: 'rare',      name: 'Sjaldséð',   desc: 'Spil sem valdir leikmenn hafa sjaldnast spilað' },
  { id: 'favorites', name: 'Uppáhald',   desc: 'Spil sem valdir leikmenn spila oftast' },
]

export function formatCost(card) {
  if (card.cost == null && !card.debt && !card.potion) return ''
  if (card.debt) return `${card.debt}D`
  if (card.potion) return `${card.cost ?? 0}S`
  return `${card.cost}`
}

export function formatColonyPlatinumLabel(playerCount) {
  const colonyCount = playerCount >= 2 ? (playerCount === 2 ? 8 : 12) : null
  const colonyLabel = colonyCount != null ? `Colony (${colonyCount})` : 'Colony (8 fyrir 2 leikmenn, annars 12)'
  return `${colonyLabel} & Platinum (12)`
}

export function buildExportText(kingdom, extras, sidePiles, heirlooms, namedTargets, colonyPlatinum, colonyCard, platinumCard, playerCount) {
  const lines = []
  lines.push('Ríkið:')
  for (const c of [...kingdom].sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0))) {
    const cost = formatCost(c)
    lines.push(`  ${c.name}${cost ? ` (${cost})` : ''} · ${c.expansion}`)
  }
  if (extras.length > 0) {
    lines.push('')
    lines.push('Aukaspil:')
    for (const c of extras) {
      const attached = c._attachedCard ? ` → ${c._attachedCard}` : ''
      lines.push(`  ${c.name} [${c.card_type}]${attached} · ${c.expansion}`)
    }
  }
  if (sidePiles.length > 0) {
    lines.push('')
    lines.push('Aukabunkar:')
    for (const p of sidePiles) lines.push(`  ${p.icon} ${p.pile}`)
  }
  if (heirlooms.length > 0) {
    lines.push('')
    lines.push('Heirlooms:')
    for (const h of heirlooms) lines.push(`  ${h.heirloom} (frá ${h.kingdomCard})`)
  }
  if (namedTargets.length > 0) {
    lines.push('')
    lines.push('Nefnd spil:')
    for (const nt of namedTargets) lines.push(`  ${nt.label} fyrir ${nt.source.name}: ${nt.target.name}`)
  }
  if (colonyPlatinum && colonyCard && platinumCard) {
    lines.push('')
    lines.push(`Prosperity: ${formatColonyPlatinumLabel(playerCount)}`)
  }
  return lines.join('\n')
}

/** Build a map: playerName → { cardName → timesPlayed } */
export function buildPlayerCardUsage(games) {
  const usage = {}
  for (const g of games) {
    const cardNames = (g.kingdom || []).map(k => k.card)
    for (const player of g.players) {
      if (!usage[player]) usage[player] = {}
      for (const card of cardNames) {
        usage[player][card] = (usage[player][card] || 0) + 1
      }
    }
  }
  return usage
}

/** Build a map: playerName → { expansion → timesPlayed } counting games where that expansion appeared */
export function buildPlayerExpUsage(games) {
  const usage = {}
  for (const g of games) {
    const exps = new Set((g.kingdom || []).map(k => k.expansion).filter(Boolean))
    for (const player of g.players) {
      if (!usage[player]) usage[player] = {}
      for (const exp of exps) {
        usage[player][exp] = (usage[player][exp] || 0) + 1
      }
    }
  }
  return usage
}
