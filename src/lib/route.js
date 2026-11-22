// Hash routing: "#<tab>" or "#<tab>/<encoded sub-path>", e.g. #history/141,
// #players/Mummi, #cards/Village. Deep links make games, players and cards
// shareable (e.g. in the club's Facebook group).
const DEFAULT_TAB = 'dashboard'

function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

export function parseRoute(hash, validTabs) {
  const raw = (hash || '').replace(/^#/, '')
  const slash = raw.indexOf('/')
  const head = slash === -1 ? raw : raw.slice(0, slash)
  if (!validTabs.has(head)) return { tab: DEFAULT_TAB, sub: null }
  const encodedSub = slash === -1 ? '' : raw.slice(slash + 1)
  const sub = encodedSub ? safeDecode(encodedSub) : null
  return { tab: head, sub: sub || null }
}

export function buildHash(tab, sub) {
  return sub == null || sub === '' ? tab : `${tab}/${encodeURIComponent(String(sub))}`
}

export function navigate(tab, sub) {
  window.location.hash = buildHash(tab, sub)
}
