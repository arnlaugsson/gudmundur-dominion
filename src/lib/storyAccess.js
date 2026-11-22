import { CLUB_STORY } from './yearRoute'

// Members see everything. Guests see a player's story only if that player
// chose to share it; the club story names everyone, so it stays members-only.
export function canViewStory({ isMember, story, publicNames }) {
  if (isMember) return true
  if (!story || story === CLUB_STORY) return false
  return publicNames.has(story)
}
