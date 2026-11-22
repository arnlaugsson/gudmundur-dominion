// Loads the synced game data at startup. The JSON is served as a separate,
// revalidated file (see vite.config.js) instead of being bundled into the JS,
// so a data sync no longer changes the app's code chunks and the browser keeps
// them cached. Top-level await: every module importing DATA waits for it.
import { buildData } from './lib/buildData'
import { registerCards } from './lib/cardIndex'

export const DATA_URL = '/data/dominion_data.json'
export const CARD_TEXTS_URL = '/data/card_texts.json'

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`)
  return res.json()
}

const [rawData, cardTexts] = await Promise.all([fetchJson(DATA_URL), fetchJson(CARD_TEXTS_URL)])

export const DATA = buildData(rawData, cardTexts)
registerCards(DATA.cards)

export default DATA
