export const BUCKET = 'dominon-1e56c.firebasestorage.app'

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

export const TABS = [
  { id: 'dashboard', label: '📊 Yfirlit' },
  { id: 'players',   label: '🏆 Leikmenn' },
  { id: 'cards',     label: '♣ Spil' },
  { id: 'history',   label: '📖 Leikasaga' },
  { id: 'funfacts',  label: '🌟 Skemmtilegt' },
  { id: 'suggester', label: '🎲 Ríkistillögur' },
]
