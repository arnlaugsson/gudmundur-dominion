import { describe, it, expect } from 'vitest'
import { canViewStory } from './storyAccess'

const shared = new Set(['Skúli'])

describe('canViewStory', () => {
  it('members can view every story', () => {
    expect(canViewStory({ isMember: true, story: 'klubburinn', publicNames: new Set() })).toBe(true)
    expect(canViewStory({ isMember: true, story: 'Mummi', publicNames: new Set() })).toBe(true)
  })

  it('guests can view a player story only if that player shared it', () => {
    expect(canViewStory({ isMember: false, story: 'Skúli', publicNames: shared })).toBe(true)
    expect(canViewStory({ isMember: false, story: 'Mummi', publicNames: shared })).toBe(false)
  })

  it('the club story stays members-only (it names everyone)', () => {
    expect(canViewStory({ isMember: false, story: 'klubburinn', publicNames: new Set(['klubburinn']) })).toBe(false)
  })

  it('guests cannot see the landing page', () => {
    expect(canViewStory({ isMember: false, story: null, publicNames: shared })).toBe(false)
  })
})
