import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Minimal game factory. `order` lists players best-first; scores optional.
export function makeGame(game_num, order, { scores, date, location = 'Laugarás', kingdom = [], expansions = ['Base'] } = {}) {
  return {
    game_num,
    date: date || `2025-01-${String(game_num).padStart(2, '0')}`,
    location,
    players: [...order],
    results: order.map((name, i) => ({ place: i + 1, name, tied_with: null, score: scores ? scores[i] : null })),
    kingdom,
    expansions,
    victory_type: 'Province',
  }
}

export function loadRealData() {
  const read = f => JSON.parse(readFileSync(resolve(__dirname, '../../data', f), 'utf8'))
  return { raw: read('dominion_data.json'), cardTexts: read('card_texts.json') }
}
