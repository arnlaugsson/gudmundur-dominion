// Heuristics that classify cards from their rules text.

// Detect attack and curse-giving cards from card text
export function isAttackCard(text) {
  if (!text) return false
  const lower = text.toLowerCase()
  const idx = lower.indexOf('each other player')
  if (idx === -1) return false
  const after = lower.slice(idx)
  // "may trash/discard...to draw/gain" = optional benefit, not attack
  if (/may (trash|discard).*to (draw|gain)/i.test(after)) return false
  if (/may trash a card from their hand\./i.test(after)) return false
  // Negative effects on other players = attack
  return /discards?\b|trash|gains? a (curse|ruins)|puts? .*(back|onto)|down to|name a card|does nothing|instead of following/i.test(after)
}

export function isCurseGiver(text) {
  if (!text) return false
  return /gains? a curse/i.test(text)
}

// Detect Duration cards from card text. Hallmarks: effects that span turns
// — "at the start of your next/each turn", taking an extra turn (Outpost),
// or effects "for the rest of the game" (Hireling).
export function isDurationCard(text) {
  if (!text) return false
  return /at the (start|beginning) of (your )?(next|each)( of your)? turn|now and at the start|while this is in play|take an extra turn|for the rest of (this|the) game/i.test(text)
}

// Victory cards whose +XVP is printed (not tokens) — excluded from token detection.
const VICTORY_CARDS = new Set([
  'Gardens', 'Great Hall', 'Duke', 'Harem', 'Nobles', 'Island', 'Vineyard',
  'Fairgrounds', 'Tunnel', 'Silk Road', 'Farmland', 'Feodum', 'Distant Lands',
  'Cemetery', 'Colony', 'Curse', 'Estate', 'Duchy', 'Province',
])

export function isTokenCard(text, card) {
  if (VICTORY_CARDS.has(card?.name)) return false
  if (card?.debt > 0) return true
  if (!text) return false
  if (/coffers|villagers?\b|\bexile\b|\btavern\s*mat\b|\breserve\b/i.test(text)) return true
  if (/\btake\b.*\bvp\b|\badd\b.*\bvp\b/i.test(text)) return true
  if (/\bvp\s*tokens?\b/i.test(text)) return true
  if (/\+\d+\s*vp\b/i.test(text)) return true
  return false
}
