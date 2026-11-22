import { describe, it, expect, vi, afterEach } from 'vitest'
import { shareStory } from './share'

const blob = new Blob(['png'], { type: 'image/png' })
const render = vi.fn(async () => blob)
const nav = overrides => ({ share: undefined, canShare: undefined, clipboard: { writeText: vi.fn(async () => {}) }, ...overrides })

afterEach(() => vi.clearAllMocks())

describe('shareStory', () => {
  it('shares the image (with the link in the text) when the device can share files', async () => {
    const share = vi.fn(async () => {})
    const result = await shareStory({ url: 'https://x/#arid/2026', text: 'Árið 2026', fileName: 'arid-2026.png', render, nav: nav({ share, canShare: () => true }) })
    expect(result).toBe('shared')
    const arg = share.mock.calls[0][0]
    expect(arg.files[0].name).toBe('arid-2026.png')
    expect(arg.text).toContain('https://x/#arid/2026')
  })

  it('falls back to sharing the link when files are not supported', async () => {
    const share = vi.fn(async () => {})
    const result = await shareStory({ url: 'u', text: 't', fileName: 'f.png', render, nav: nav({ share, canShare: () => false }) })
    expect(result).toBe('shared')
    expect(share.mock.calls[0][0]).toEqual({ title: 't', text: 't', url: 'u' })
  })

  it('treats a cancelled share sheet as cancelled, not an error', async () => {
    const share = vi.fn(async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }) })
    const result = await shareStory({ url: 'u', text: 't', fileName: 'f.png', render, nav: nav({ share, canShare: () => true }) })
    expect(result).toBe('cancelled')
  })

  it('on desktop downloads the image and copies the link', async () => {
    const download = vi.fn()
    const n = nav()
    const result = await shareStory({ url: 'u', text: 't', fileName: 'f.png', render, nav: n, download })
    expect(result).toBe('downloaded')
    expect(download).toHaveBeenCalledWith(blob, 'f.png')
    expect(n.clipboard.writeText).toHaveBeenCalledWith('u')
  })
})
