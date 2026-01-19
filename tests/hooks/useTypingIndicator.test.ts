import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTypingIndicator } from '../../src/hooks/useTypingIndicator'

// Mock Supabase channel
const mockTrack = vi.fn().mockResolvedValue(undefined)
const mockPresenceState = vi.fn().mockReturnValue({})
const mockUnsubscribe = vi.fn()

// Store handlers to call them in tests
let syncHandler: (() => void) | null = null

const mockOn = vi.fn().mockImplementation((event, options, handler) => {
  if (event === 'presence' && options?.event === 'sync') {
    syncHandler = handler
  }
  return mockChannel
})

const mockSubscribe = vi.fn().mockImplementation((callback: (status: string) => void) => {
  callback('SUBSCRIBED')
  return mockChannel
})

const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
  track: mockTrack,
  presenceState: mockPresenceState,
}

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
  },
}))

describe('useTypingIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockPresenceState.mockReturnValue({})
    syncHandler = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty typing list initially', () => {
    const { result } = renderHook(() =>
      useTypingIndicator('session-1', 'Alice')
    )

    expect(result.current.typingParticipants).toEqual([])
  })

  it('broadcasts typing state when setTyping called', async () => {
    const { result } = renderHook(() =>
      useTypingIndicator('session-1', 'Alice')
    )

    await act(async () => {
      result.current.setTyping(true)
    })

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alice',
        isTyping: true,
      })
    )
  })

  it('debounces rapid typing updates', async () => {
    const { result } = renderHook(() =>
      useTypingIndicator('session-1', 'Alice')
    )

    await act(async () => {
      result.current.setTyping(true)
      result.current.setTyping(true)
      result.current.setTyping(true)
    })

    // Should only have called track once initially
    const typingCalls = mockTrack.mock.calls.filter(
      (call) => call[0]?.isTyping === true
    )
    expect(typingCalls.length).toBe(1)
  })

  it('clears typing state after timeout', async () => {
    const { result } = renderHook(() =>
      useTypingIndicator('session-1', 'Alice')
    )

    await act(async () => {
      result.current.setTyping(true)
    })

    // Fast-forward past the timeout (3 seconds)
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    // Should have broadcast isTyping: false
    expect(mockTrack).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: 'Alice',
        isTyping: false,
      })
    )
  })

  it('excludes self from typing list', () => {
    const { result } = renderHook(() =>
      useTypingIndicator('session-1', 'Alice')
    )

    // Mock presence state with self and another user typing
    mockPresenceState.mockReturnValue({
      alice: [{ name: 'Alice', isTyping: true }],
      bob: [{ name: 'Bob', isTyping: true }],
    })

    // Trigger sync
    act(() => {
      syncHandler?.()
    })

    // Alice should not be in her own typing list
    expect(result.current.typingParticipants).not.toContain('Alice')
    expect(result.current.typingParticipants).toContain('Bob')
  })

  it('returns list of currently typing participants', () => {
    const { result } = renderHook(() =>
      useTypingIndicator('session-1', 'Alice')
    )

    // Mock presence state with typing users
    mockPresenceState.mockReturnValue({
      bob: [{ name: 'Bob', isTyping: true }],
      carol: [{ name: 'Carol', isTyping: true }],
      dave: [{ name: 'Dave', isTyping: false }], // Not typing
    })

    // Trigger sync
    act(() => {
      syncHandler?.()
    })

    expect(result.current.typingParticipants).toContain('Bob')
    expect(result.current.typingParticipants).toContain('Carol')
    expect(result.current.typingParticipants).not.toContain('Dave')
  })

  it('does nothing when sessionId is null', () => {
    const { result } = renderHook(() =>
      useTypingIndicator(null, 'Alice')
    )

    expect(result.current.typingParticipants).toEqual([])

    act(() => {
      result.current.setTyping(true)
    })

    expect(mockTrack).not.toHaveBeenCalled()
  })

  it('does nothing when participantName is null', () => {
    const { result } = renderHook(() =>
      useTypingIndicator('session-1', null)
    )

    expect(result.current.typingParticipants).toEqual([])

    act(() => {
      result.current.setTyping(true)
    })

    expect(mockTrack).not.toHaveBeenCalled()
  })
})
