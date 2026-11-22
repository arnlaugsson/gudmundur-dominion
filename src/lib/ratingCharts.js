// Chart.js configs for rating history (shared by the Players tab and player pages).
import { PALETTE } from '../constants'
import { RATING_BASE } from './ratings'

const LINE_COLORS = [PALETTE.gold, PALETTE.blue, PALETTE.green, '#f97316', '#a78bfa', '#f43f5e']

// One line per player over the club's game numbers; gaps where they didn't play.
export function ratingHistoryChart(players, games) {
  const gameNums = games.filter(g => (g.seats || []).length >= 2).map(g => g.game_num)
  return {
    type: 'line',
    data: {
      labels: gameNums.map(n => `#${n}`),
      datasets: players.map((p, i) => {
        const byGame = new Map(p.history.map(h => [h.game_num, h.display]))
        return {
          label: p.name,
          data: gameNums.map(n => byGame.get(n) ?? null),
          spanGaps: true,
          borderColor: LINE_COLORS[i % LINE_COLORS.length],
          backgroundColor: LINE_COLORS[i % LINE_COLORS.length],
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25,
        }
      }),
    },
    options: {
      interaction: { mode: 'nearest', intersect: false },
      plugins: { legend: { labels: { color: PALETTE.text, font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: PALETTE.dim, maxTicksLimit: 10 }, grid: { display: false } },
        y: { ticks: { color: PALETTE.dim }, grid: { color: PALETTE.border }, suggestedMin: RATING_BASE },
      },
    },
  }
}
