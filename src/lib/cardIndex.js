// Card lookup by name for components that only get a name (e.g. the image
// placeholder). data.js registers the card list once it has loaded.
let byName = new Map()

export function registerCards(cards) {
  byName = new Map(cards.map(c => [c.name, c]))
}

export function getCard(name) {
  return byName.get(name) || null
}
