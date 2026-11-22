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

// Like navigate(), but replaces the current history entry. Used when closing
// a modal (#history/141 → #history) so Back doesn't reopen it.
export function replaceRoute(tab, sub) {
  const url = `${window.location.pathname}${window.location.search}#${buildHash(tab, sub)}`
  window.history.replaceState(window.history.state, '', url)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

const MODAL_STATE = { modal: true }

// Open a modal route (#history/141) and mark the entry as opened in-app, so
// closing can step back instead of stacking another entry.
export function openModalRoute(tab, sub) {
  const url = `${window.location.pathname}${window.location.search}#${buildHash(tab, sub)}`
  window.history.pushState(MODAL_STATE, '', url)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

// Close a modal: go back if we opened it in-app, otherwise (deep link) replace
// the entry with the parent route. Either way Back won't reopen the modal.
export function closeModalRoute(tab, sub) {
  if (window.history.state?.modal) window.history.back()
  else replaceRoute(tab, sub)
}
