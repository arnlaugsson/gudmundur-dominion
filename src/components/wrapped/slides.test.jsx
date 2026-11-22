import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { buildData } from '../../lib/buildData'
import { availableYears, computeClubYear, computePlayerYear, earnedInYear, gamesInYear } from '../../lib/yearInReview'
import { buildClubSlides } from './clubSlides'
import { buildPlayerSlides } from './playerSlides'
import { loadRealData } from '../../test/fixtures'

const { raw, cardTexts } = loadRealData()
const { games, players } = buildData(raw, cardTexts)
const names = players.map(p => p.name)

describe('year-in-review slides on the real data', () => {
  for (const year of availableYears(games)) {
    it(`renders every club and player slide for ${year}`, () => {
      const club = computeClubYear(games, year)
      const clubSlides = buildClubSlides(club, <p>outro</p>)
      expect(clubSlides.length).toBeGreaterThan(2)
      clubSlides.forEach(s => render(<div>{s.content}</div>).unmount())

      const earned = earnedInYear(games, year, names)
      const yearPlayers = [...new Set(gamesInYear(games, year).flatMap(g => g.players))]
      for (const name of yearPlayers) {
        const slides = buildPlayerSlides(computePlayerYear(games, year, name), earned.get(name) || [], <p>outro</p>)
        expect(slides[0].key).toBe('intro')
        slides.forEach(s => render(<div>{s.content}</div>).unmount())
      }
    })
  }
})
