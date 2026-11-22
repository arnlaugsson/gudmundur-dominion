// Share image for the year-in-review stories: a 1080×1350 PNG drawn on a
// canvas in the browser (links can't carry per-story previews: crawlers
// ignore the #fragment and the stories are members-only).
import { isSingular } from './icelandic'

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350
const SITE = 'dominion.arnlaugsson.info'
const word = (n, one, many) => (isSingular(n) ? one : many)

function winsFootnote(p) {
  if (p.rankByWins === 1) return 'Flestir sigrar í klúbbnum 👑'
  const base = `${p.rankByWins}. sæti af ${p.playerCount} í sigrum`
  if (p.mummiWins == null || p.name === 'Mummi' || p.rankExMummi === p.rankByWins) return base
  return p.rankExMummi === 1 ? `Flestir sigrar utan Mumma (Mummi: ${p.mummiWins})` : `${base}, ${p.rankExMummi}. utan Mumma`
}

// A winless year leads with best finish and discoveries rather than zeros.
function playerStats(p) {
  const best = p.bestScore ? [{ value: String(p.bestScore.score), label: 'besta skor' }] : []
  const games = { value: String(p.games), label: word(p.games, 'leikur', 'leikir') }
  if (p.wins === 0) {
    const found = p.cardsDiscovered?.length || 0
    return [
      games,
      ...(p.bestPlace ? [{ value: `${p.bestPlace}.`, label: 'besta sæti' }] : []),
      ...best,
      ...(found ? [{ value: String(found), label: word(found, 'nýtt spil', 'ný spil') }] : []),
    ]
  }
  return [
    games,
    { value: String(p.wins), label: word(p.wins, 'sigur', 'sigrar') },
    { value: `${Math.round(p.winRate)}%`, label: 'sigurhlutfall' },
    ...best,
  ]
}

export function playerCardContent(p, topTitle = null) {
  return {
    year: p.year,
    title: p.name,
    subtitle: topTitle ? `${topTitle.icon} ${topTitle.title}` : null,
    stats: playerStats(p),
    footnote: p.wins === 0 ? null : winsFootnote(p),
  }
}

export function clubCardContent(c) {
  return {
    year: c.year,
    title: 'Árið hjá Guðmundi',
    subtitle: null,
    stats: [
      { value: String(c.totalGames), label: word(c.totalGames, 'leikur', 'leikir') },
      { value: String(c.playerCount), label: word(c.playerCount, 'spilari', 'spilarar') },
      ...(c.champion ? [{ value: c.champion.name, label: c.champion.mummi ? 'flestir sigrar utan Mumma' : 'meistari ársins' }] : []),
      ...(c.topCards?.[0] ? [{ value: c.topCards[0].name, label: 'spil ársins' }] : []),
    ],
    footnote: null,
  }
}

const GOLD = '#c9a84c'
const GOLD_LIGHT = '#f0cb6c'
const TEXT = '#e6edf3'
const DIM = '#8b949e'

function drawBackground(ctx) {
  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT)
  bg.addColorStop(0, '#1a1f2e')
  bg.addColorStop(0.7, '#0d1117')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  const glow = ctx.createRadialGradient(CARD_WIDTH * 0.2, 0, 0, CARD_WIDTH * 0.2, 0, CARD_WIDTH)
  glow.addColorStop(0, 'rgba(240,203,108,0.28)')
  glow.addColorStop(1, 'rgba(240,203,108,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  ctx.strokeStyle = 'rgba(201,168,76,0.5)'
  ctx.lineWidth = 4
  ctx.strokeRect(36, 36, CARD_WIDTH - 72, CARD_HEIGHT - 72)
}

// Shrink the font until the text fits the width.
function fitText(ctx, text, weight, family, maxSize, maxWidth) {
  let size = maxSize
  do {
    ctx.font = `${weight} ${size}px ${family}`
    size -= 4
  } while (ctx.measureText(text).width > maxWidth && size > 24)
}

function drawStats(ctx, stats, top) {
  const colWidth = (CARD_WIDTH - 160) / 2
  stats.forEach((s, i) => {
    const x = 80 + (i % 2) * colWidth + colWidth / 2
    const y = top + Math.floor(i / 2) * 230
    ctx.fillStyle = GOLD_LIGHT
    fitText(ctx, s.value, 700, 'Cinzel, serif', 110, colWidth - 40)
    ctx.fillText(s.value, x, y)
    ctx.fillStyle = DIM
    ctx.font = '500 36px Inter, sans-serif'
    ctx.fillText(s.label.toUpperCase(), x, y + 60)
  })
}

export function drawShareCard(ctx, content) {
  drawBackground(ctx)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = GOLD
  ctx.font = '600 38px Cinzel, serif'
  ctx.fillText('♛  DOMINIONKLÚBBURINN GUÐMUNDUR  ♛', CARD_WIDTH / 2, 150)
  ctx.font = '700 230px Cinzel, serif'
  ctx.fillStyle = GOLD
  ctx.fillText(String(content.year), CARD_WIDTH / 2, 400)
  ctx.fillStyle = TEXT
  fitText(ctx, content.title, 700, 'Cinzel, serif', 96, CARD_WIDTH - 200)
  ctx.fillText(content.title, CARD_WIDTH / 2, 530)
  if (content.subtitle) {
    ctx.fillStyle = GOLD_LIGHT
    fitText(ctx, content.subtitle, 600, 'Inter, sans-serif', 44, CARD_WIDTH - 200)
    ctx.fillText(content.subtitle, CARD_WIDTH / 2, 610)
  }
  drawStats(ctx, content.stats, 760)
  if (content.footnote) {
    ctx.fillStyle = TEXT
    ctx.font = '500 40px Inter, sans-serif'
    ctx.fillText(content.footnote, CARD_WIDTH / 2, 1180)
  }
  ctx.fillStyle = DIM
  ctx.font = '400 32px Inter, sans-serif'
  ctx.fillText(SITE, CARD_WIDTH / 2, 1260)
}

// Render to a PNG Blob (waits for the web fonts so Cinzel is used).
export async function renderShareCard(content) {
  if (document.fonts?.load) {
    await Promise.all([document.fonts.load('700 100px Cinzel'), document.fonts.load('500 36px Inter')]).catch(() => {})
  }
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  drawShareCard(canvas.getContext('2d'), content)
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not render share image'))), 'image/png')
  })
}
