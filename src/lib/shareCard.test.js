import { describe, it, expect } from 'vitest'
import { playerCardContent, clubCardContent } from './shareCard'

const player = {
  name: 'Skúli', year: 2026, games: 21, wins: 7, winRate: 33.3,
  bestScore: { score: 52, game_num: 120 }, rankByWins: 2, rankExMummi: 1, mummiWins: 14, playerCount: 27,
}

describe('playerCardContent', () => {
  it('has the year, name and the key numbers', () => {
    const c = playerCardContent(player)
    expect(c).toMatchObject({ year: 2026, title: 'Skúli' })
    expect(c.stats).toEqual([
      { value: '21', label: 'leikur' }, // 21 takes the singular
      { value: '7', label: 'sigrar' },
      { value: '33%', label: 'sigurhlutfall' },
      { value: '52', label: 'besta skor' },
    ])
  })

  it('uses Icelandic singular after 1, 21, …', () => {
    const c = playerCardContent({ ...player, games: 1, wins: 1 })
    expect(c.stats.slice(0, 2)).toEqual([{ value: '1', label: 'leikur' }, { value: '1', label: 'sigur' }])
  })

  it('mentions the rank outside Mummi when he leads', () => {
    expect(playerCardContent(player).footnote).toBe('Flestir sigrar utan Mumma (Mummi: 14)')
    expect(playerCardContent({ ...player, rankByWins: 1 }).footnote).toBe('Flestir sigrar í klúbbnum 👑')
    expect(playerCardContent({ ...player, rankByWins: 3, rankExMummi: 2 }).footnote).toBe('3. sæti af 27 í sigrum, 2. utan Mumma')
  })
})

describe('clubCardContent', () => {
  it('shows the club totals and the leader besides Mummi', () => {
    const club = {
      year: 2026, totalGames: 36, playerCount: 27,
      champion: { name: 'Skúli', wins: 7, mummi: { name: 'Mummi', wins: 14 } },
      topCards: [{ name: 'Village', count: 9 }],
    }
    const c = clubCardContent(club)
    expect(c.title).toBe('Árið hjá Guðmundi')
    expect(c.stats).toEqual([
      { value: '36', label: 'leikir' },
      { value: '27', label: 'spilarar' },
      { value: 'Skúli', label: 'flestir sigrar utan Mumma' },
      { value: 'Village', label: 'spil ársins' },
    ])
  })
})

describe('playerCardContent without wins', () => {
  const unlucky = {
    name: 'Krissi', year: 2026, games: 7, wins: 0, winRate: 0, bestPlace: 2,
    bestScore: { score: 41, game_num: 131 }, cardsDiscovered: ['Moat', 'Witch', 'Cellar'],
    rankByWins: 9, rankExMummi: 8, mummiWins: 14, playerCount: 27,
  }

  it('shows best finish and discoveries instead of zero wins', () => {
    const c = playerCardContent(unlucky, { icon: '🤏', title: 'Hársbreidd frá sigri' })
    expect(c.stats).toEqual([
      { value: '7', label: 'leikir' },
      { value: '2.', label: 'besta sæti' },
      { value: '41', label: 'besta skor' },
      { value: '3', label: 'ný spil' },
    ])
    expect(c.subtitle).toBe('🤏 Hársbreidd frá sigri')
    expect(c.footnote).toBeNull()
  })
})
