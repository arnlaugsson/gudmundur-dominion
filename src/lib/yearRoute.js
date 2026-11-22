// URL helpers for the year-in-review tab (#arid/<year>/<story>).

export const CLUB_STORY = 'klubburinn'

export function yearHash(year, story) {
  return story ? `arid/${year}/${encodeURIComponent(story)}` : `arid/${year}`
}

// sub is "2026", "2026/klubburinn" or "2026/<player>" (already decoded).
// An unknown year falls back to the newest year and drops the story, so a
// link never opens a different year's story under the wrong label.
export function parseYearSub(sub, years) {
  const [rawYear, ...rest] = (sub || '').split('/')
  const valid = years.includes(Number(rawYear))
  return { year: valid ? Number(rawYear) : years[0] ?? null, story: valid ? rest.join('/') || null : null }
}
