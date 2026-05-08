export const BUCKET = 'dominon-1e56c.firebasestorage.app'

export function expansionImgUrl(filename) {
  const path = encodeURIComponent('expansions/' + filename)
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${path}?alt=media`
}

export function cardImgUrl(name) {
  const slug = name.replace(/ /g, '_').replace(/\//g, '_')
  const path = encodeURIComponent('cards/' + slug + '.jpg')
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${path}?alt=media`
}

export function wikiUrl(name) {
  return 'https://wiki.dominionstrategy.com/index.php/' + encodeURIComponent(name.replace(/ /g, '_'))
}

export const PALETTE = {
  gold: '#c9a84c',
  goldLight: '#f0cb6c',
  bg: '#0d1117',
  bg2: '#161b22',
  bg3: '#21262d',
  border: '#30363d',
  text: '#e6edf3',
  dim: '#8b949e',
  red: '#f85149',
  green: '#3fb950',
  blue: '#58a6ff',
}

// Split-pile member cards. Kingdoms reference the parent pile name
// (e.g., "Augurs"), so members like "Herb Gatherer" never appear in
// any kingdom and have no card image of their own. Anything that picks
// random kingdom cards should skip these.
export const SPLIT_PILE_MEMBERS = new Set([
  // Knights (Dark Ages)
  'Sir Bailey', 'Sir Destry', 'Sir Martin', 'Sir Michael', 'Sir Vander',
  'Dame Anna', 'Dame Josephine', 'Dame Molly', 'Dame Natalie', 'Dame Sylvia',
  // Castles (Empires)
  'Humble Castle', 'Crumbling Castle', 'Small Castle', 'Haunted Castle',
  'Opulent Castle', 'Sprawling Castle', 'Grand Castle', "King's Castle",
  // Allies split piles
  'Herb Gatherer', 'Acolyte', 'Sorceress', 'Lich',                 // Augurs
  'Battle Plan', 'Archer', 'Warlord', 'Territory',                  // Clashes
  'Tent', 'Garrison', 'Hill Fort', 'Stronghold',                    // Forts
  'Old Map', 'Voyage', 'Sunken Treasure', 'Distant Shore',          // Odysseys
  'Town Crier', 'Blacksmith', 'Miller', 'Elder',                    // Townsfolk
  'Student', 'Conjurer', 'Sorcerer',                                // Wizards (Lich shared with Augurs above)
])

export const TABS = [
  { id: 'dashboard',   label: '📊 Yfirlit' },
  { id: 'history',     label: '📖 Spilasaga' },
  { id: 'players',     label: '🏆 Leikmenn' },
  { id: 'cards',       label: '♣ Spil' },
  { id: 'expansions',  label: '📦 Viðbætur' },
  { id: 'funfacts',    label: '🌟 Skemmtilegt' },
  { id: 'afrek',       label: '🎖️ Afrek' },
  { id: 'suggester',   label: '🎲 Ríkistillögur' },
]
