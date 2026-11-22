import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

vi.mock('../lib/publicStories', () => ({
  fetchPublicStoryNames: vi.fn(),
  setStoryPublic: vi.fn(),
}))
import { fetchPublicStoryNames, setStoryPublic } from '../lib/publicStories'
import { usePublicStories } from './usePublicStories'

beforeEach(() => vi.clearAllMocks())

describe('usePublicStories', () => {
  it('loads the names of players who shared', async () => {
    fetchPublicStoryNames.mockResolvedValue(new Set(['Skúli']))
    const { result } = renderHook(() => usePublicStories())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.names.has('Skúli')).toBe(true)
  })

  it('toggles optimistically and saves', async () => {
    fetchPublicStoryNames.mockResolvedValue(new Set())
    setStoryPublic.mockResolvedValue()
    const { result } = renderHook(() => usePublicStories())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.setPublic('Iðunn', true))
    expect(setStoryPublic).toHaveBeenCalledWith('Iðunn', true)
    expect(result.current.names.has('Iðunn')).toBe(true)
  })

  it('rolls back and shows an error when saving fails', async () => {
    fetchPublicStoryNames.mockResolvedValue(new Set())
    setStoryPublic.mockRejectedValue(new Error('permission-denied'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => usePublicStories())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.setPublic('Iðunn', true))
    expect(result.current.names.has('Iðunn')).toBe(false)
    expect(result.current.error).toMatch(/Ekki tókst/)
  })
})
