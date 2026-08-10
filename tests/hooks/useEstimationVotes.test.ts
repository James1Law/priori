import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEstimationVotes } from '../../src/hooks/useEstimationVotes'

const { mockUpsert, mockSelectChain } = vi.hoisted(() => {
  const mockSelectChain = {
    single: vi.fn().mockResolvedValue({
      data: {
        id: 'vote-1',
        session_id: 'session-1',
        item_id: 'item-1',
        participant_name: 'James',
        vote: 5,
        created_at: '2024-01-01T00:00:00Z',
      },
      error: null,
    }),
  }
  const mockUpsert = vi.fn(() => ({ select: vi.fn(() => mockSelectChain) }))
  return { mockUpsert, mockSelectChain }
})

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
      upsert: mockUpsert,
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}))

describe('useEstimationVotes', () => {
  beforeEach(() => {
    mockUpsert.mockClear()
    mockSelectChain.single.mockClear()
  })

  it('submits votes with an upsert keyed on item and participant', async () => {
    const { result } = renderHook(() =>
      useEstimationVotes('session-1', 'item-1', 'James')
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.submitVote(5)
    })

    // A plain insert races the UNIQUE(item_id, participant_name) constraint
    // when the same participant votes twice quickly — upsert is atomic
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: 'session-1',
        item_id: 'item-1',
        participant_name: 'James',
        vote: 5,
      }),
      expect.objectContaining({ onConflict: 'item_id,participant_name' })
    )
  })

  it('updates local vote state after a successful submit', async () => {
    const { result } = renderHook(() =>
      useEstimationVotes('session-1', 'item-1', 'James')
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.submitVote(5)
    })

    expect(result.current.votes).toHaveLength(1)
    expect(result.current.votes[0].vote).toBe(5)
    expect(result.current.votes[0].participant_name).toBe('James')
  })
})
