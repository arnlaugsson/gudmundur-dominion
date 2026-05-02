import { SPLIT_PILE_MEMBERS } from '../constants'

// Detect which Dominion "side pieces" should be set up alongside the
// chosen kingdom + extras. There are three kinds:
//
// 1. Side piles — non-Supply piles shared across triggering cards
//    (Loots, Spoils, Ruins, Imps, Spirits, Wishes, Madman, Mercenary,
//    Prizes, Travelers, Zombies, Bat, Black Market deck, Boons, Hexes).
//
// 2. Heirlooms — Treasure cards added to a player's starting deck when
//    a specific Nocturne kingdom card is in play.
//
// 3. Named targets — a specific card chosen from the supply for cards
//    like Way of the Mouse, Riverboat, and Young Witch's Bane.

// ── Side piles ─────────────────────────────────────────────────────────────

// Regex on card_text. Each entry is { pile, regex, icon }.
// The regex is matched against the card_text of every kingdom + extras card.
const REGEX_TRIGGERS = [
  { pile: 'Loots',   regex: /\bgain.{0,30}\bLoot\b/i,    icon: '🪙' },
  { pile: 'Spoils',  regex: /\bgain.{0,30}\bSpoils\b/i,  icon: '💰' },
  { pile: 'Ruins',   regex: /\bgain.{0,30}\bRuins?\b/i,  icon: '🏚️' },
  { pile: 'Imps',    regex: /\bgain.{0,30}\bImp\b/i,     icon: '👹' },
  { pile: 'Spirits', regex: /\bgain.{0,30}\bSpirit/i,    icon: '👻' },
  { pile: 'Wishes',  regex: /\bgain.{0,30}\bWish\b/i,    icon: '💫' },
]

// Specific kingdom card name → side pile(s) and icon.
const NAME_TRIGGERS = {
  'Hermit':       [{ pile: 'Madman',             icon: '🤪' }],
  'Urchin':       [{ pile: 'Mercenary',          icon: '💸' }],
  'Tournament':   [{ pile: 'Prizes',             icon: '🏆' }],
  'Page':         [{ pile: 'Travelers (Page)',   icon: '🛤️' }],
  'Peasant':      [{ pile: 'Travelers (Peasant)', icon: '🛤️' }],
  'Necromancer':  [{ pile: 'Zombies',            icon: '🧟' }],
  'Vampire':      [{ pile: 'Bat',                icon: '🦇' }],
  'Black Market': [{ pile: 'Black Market deck',  icon: '🃏' }],
}

// Type categories that trigger a deck once any qualifying card is in the kingdom.
const FATE_CARDS = new Set([
  'Druid', 'Bard', 'Pixie', 'Pooka', 'Sacred Grove', 'Skulk', 'Tracker', 'Idol',
])
const DOOM_CARDS = new Set([
  'Cursed Village', 'Familiar', 'Idol', 'Leprechaun', 'Skulk',
  'Tormentor', 'Vampire', 'Werewolf', "Devil's Workshop",
])

// ── Heirlooms ─────────────────────────────────────────────────────────────

const HEIRLOOMS = {
  'Cemetery':    'Haunted Mirror',
  'Fool':        'Lucky Coin',
  'Pixie':       'Goat',
  'Pooka':       'Cursed Gold',
  'Secret Cave': 'Magic Lamp',
  'Shepherd':    'Pasture',
  'Tracker':     'Pouch',
}

// ── Named targets ─────────────────────────────────────────────────────────

// Card name → predicate building a candidate pool of kingdom cards from outside
// the current kingdom. Returns null when no eligible candidate exists.
const NAMED_TARGETS = {
  'Way of the Mouse': {
    label: 'Mús-spil',
    icon: '🐭',
    pool: c => [2, 3].includes(c.cost) && !c.isAttack,
  },
  'Riverboat': {
    label: 'Bátsmaður-spil',
    icon: '🚣',
    pool: c => c.cost === 5 && !c.isAttack,
  },
  'Young Witch': {
    label: 'Bane',
    icon: '🧙',
    pool: c => c.cost === 3,
  },
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Detect side piles triggered by a kingdom + extras combination.
 * Returns an array of { pile, icon } in stable order.
 */
export function detectSidePiles(kingdom = [], extras = []) {
  const found = new Map() // pile → { pile, icon } (preserves insertion order)
  const all = [...kingdom, ...extras]

  for (const { pile, regex, icon } of REGEX_TRIGGERS) {
    if (all.some(c => c.card_text && regex.test(c.card_text))) {
      found.set(pile, { pile, icon })
    }
  }
  for (const c of all) {
    const triggers = NAME_TRIGGERS[c.name]
    if (!triggers) continue
    for (const t of triggers) found.set(t.pile, t)
  }
  if (kingdom.some(c => FATE_CARDS.has(c.name))) {
    found.set('Boons', { pile: 'Boons', icon: '🌟' })
  }
  if (kingdom.some(c => DOOM_CARDS.has(c.name))) {
    found.set('Hexes', { pile: 'Hexes', icon: '🔮' })
  }
  return [...found.values()]
}

/**
 * Detect heirlooms triggered by the kingdom.
 * Returns an array of { kingdomCard, heirloom }.
 */
export function detectHeirlooms(kingdom = []) {
  return kingdom
    .filter(c => HEIRLOOMS[c.name])
    .map(c => ({ kingdomCard: c.name, heirloom: HEIRLOOMS[c.name] }))
}

/**
 * Pick named-target cards (Way of the Mouse target, Riverboat target,
 * Young Witch bane). Looks at every card in `kingdom + extras` and, for
 * each that has a named-target rule, picks a random eligible card from
 * `allCards` that is not already in `kingdom`.
 *
 * Returns an array of { source, target, label, icon }.
 *   - source: the trigger card (e.g., the Way of the Mouse card object)
 *   - target: the picked card object
 */
export function pickNamedTargets(kingdom = [], extras = [], allCards = []) {
  const inKingdom = new Set(kingdom.map(c => c.name))
  const out = []
  for (const c of [...kingdom, ...extras]) {
    const rule = NAMED_TARGETS[c.name]
    if (!rule) continue
    const pool = allCards.filter(x =>
      x.card_type === 'Kingdom' &&
      !x.isSupplyCard &&
      !x.removed &&
      !SPLIT_PILE_MEMBERS.has(x.name) &&
      !inKingdom.has(x.name) &&
      x.name !== c.name &&
      rule.pool(x)
    )
    if (pool.length === 0) continue
    const target = pool[Math.floor(Math.random() * pool.length)]
    out.push({ source: c, target, label: rule.label, icon: rule.icon })
    // Reserve the target so two named targets don't collide.
    inKingdom.add(target.name)
  }
  return out
}

export const __test_internals = { REGEX_TRIGGERS, NAME_TRIGGERS, FATE_CARDS, DOOM_CARDS, HEIRLOOMS, NAMED_TARGETS }
