import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePresence } from '../../src/hooks/usePresence'

interface MockChannel {
  topic: string
  handlers: Map<string, (payload?: unknown) => void>
  subscribeCb: ((status: string) => void) | null
  track: ReturnType<typeof vi.fn>
  presenceState: ReturnType<typeof vi.fn>
  on: (type: string, filter: { event: string }, cb: () => void) => MockChannel
  subscribe: (cb: (status: string) => void) => MockChannel
  unsubscribe: () => void
}

const { channels, createMockChannel } = vi.hoisted(() => {
  const channels: MockChannel[] = []
  const createMockChannel = (topic: string): MockChannel => {
    const channel: MockChannel = {
      topic,
      handlers: new Map(),
      subscribeCb: null,
      track: vi.fn().mockResolvedValue('ok'),
      presenceState: vi.fn(() => ({})),
      on(type: string, filter: { event: string }, cb: () => void) {
        channel.handlers.set(`${type}:${filter.event}`, cb)
        return channel
      },
      subscribe(cb: (status: string) => void) {
        channel.subscribeCb = cb
        return channel
      },
      unsubscribe: () => {},
    }
    channels.push(channel)
    return channel
  }
  return { channels, createMockChannel }
})

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    channel: vi.fn((topic: string) => createMockChannel(topic)),
    removeChannel: vi.fn(),
  },
}))

describe('usePresence', () => {
  beforeEach(() => {
    channels.length = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('includes the current page in the tracked presence payload', async () => {
    renderHook(() => usePresence('session-1', 'James', '/s/abc/estimate'))

    expect(channels).toHaveLength(1)
    await act(async () => {
      channels[0].subscribeCb?.('SUBSCRIBED')
    })

    expect(channels[0].track).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'James', page: '/s/abc/estimate' })
    )
  })

  it('re-tracks when the page changes without recreating the channel', async () => {
    const { rerender } = renderHook(
      ({ page }: { page: string }) => usePresence('session-1', 'James', page),
      { initialProps: { page: '/s/abc' } }
    )

    await act(async () => {
      channels[0].subscribeCb?.('SUBSCRIBED')
    })
    channels[0].track.mockClear()

    rerender({ page: '/s/abc/estimate' })

    await waitFor(() => {
      expect(channels[0].track).toHaveBeenCalledWith(
        expect.objectContaining({ page: '/s/abc/estimate' })
      )
    })
    // Still a single channel — page moves must not tear presence down
    expect(channels).toHaveLength(1)
  })

  it('retries the subscription after a channel error', async () => {
    vi.useFakeTimers()
    renderHook(() => usePresence('session-1', 'James', '/s/abc'))

    expect(channels).toHaveLength(1)
    act(() => {
      channels[0].subscribeCb?.('CHANNEL_ERROR')
    })

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    // A fresh channel replaces the dead one
    expect(channels.length).toBeGreaterThanOrEqual(2)
  })

  it('exposes each participant page from presence state', async () => {
    const { result } = renderHook(() =>
      usePresence('session-1', 'James', '/s/abc/estimate')
    )

    channels[0].presenceState.mockReturnValue({
      James: [{ name: 'James', joinedAt: '2024-01-01', page: '/s/abc/estimate' }],
      Sarah: [{ name: 'Sarah', joinedAt: '2024-01-01', page: '/s/abc' }],
    })

    await act(async () => {
      channels[0].handlers.get('presence:sync')?.()
    })

    expect(result.current.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'James', page: '/s/abc/estimate' }),
        expect.objectContaining({ name: 'Sarah', page: '/s/abc' }),
      ])
    )
  })
})
