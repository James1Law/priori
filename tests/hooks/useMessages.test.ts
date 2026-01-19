import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMessages } from '../../src/hooks/useMessages'

// Mock Supabase - define mocks before vi.mock
vi.mock('../../src/lib/supabase', () => {
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockOrder = vi.fn()
  const mockLimit = vi.fn()
  const mockEq = vi.fn()
  const mockSingle = vi.fn()

  // Setup default mock chain
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ order: mockOrder })
  mockOrder.mockReturnValue({ limit: mockLimit })
  mockLimit.mockResolvedValue({ data: [], error: null })
  mockInsert.mockReturnValue({
    select: vi.fn().mockReturnValue({ single: mockSingle }),
  })
  mockSingle.mockResolvedValue({ data: null, error: null })

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'messages') {
          return {
            select: mockSelect,
            insert: mockInsert,
          }
        }
        return { select: mockSelect, insert: mockInsert }
      }),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      })),
      removeChannel: vi.fn(),
    },
    // Export mocks for test access
    __mocks__: {
      mockSelect,
      mockInsert,
      mockOrder,
      mockLimit,
      mockEq,
      mockSingle,
    },
  }
})

// Import mocks after vi.mock
import { __mocks__ } from '../../src/lib/supabase'
const { mockSelect, mockInsert, mockOrder, mockLimit, mockEq, mockSingle } = __mocks__ as {
  mockSelect: ReturnType<typeof vi.fn>
  mockInsert: ReturnType<typeof vi.fn>
  mockOrder: ReturnType<typeof vi.fn>
  mockLimit: ReturnType<typeof vi.fn>
  mockEq: ReturnType<typeof vi.fn>
  mockSingle: ReturnType<typeof vi.fn>
}

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock chain
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ order: mockOrder })
    mockOrder.mockReturnValue({ limit: mockLimit })
    mockLimit.mockResolvedValue({ data: [], error: null })
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({ single: mockSingle }),
    })
    mockSingle.mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('fetches messages for session on mount', async () => {
    const mockMessages = [
      {
        id: '1',
        session_id: 'session-1',
        participant_name: 'Alice',
        content: 'Hello',
        message_type: 'user',
        created_at: '2024-01-01T10:00:00Z',
      },
    ]

    mockLimit.mockResolvedValueOnce({
      data: mockMessages,
      error: null,
    })

    const { result } = renderHook(() =>
      useMessages('session-1', 'Bob')
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockEq).toHaveBeenCalledWith('session_id', 'session-1')
    expect(result.current.messages).toEqual(mockMessages)
  })

  it('returns empty array when no messages', async () => {
    mockLimit.mockResolvedValueOnce({
      data: [],
      error: null,
    })

    const { result } = renderHook(() =>
      useMessages('session-1', 'Bob')
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.messages).toEqual([])
  })

  it('returns empty array when sessionId is null', async () => {
    const { result } = renderHook(() =>
      useMessages(null, 'Bob')
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.messages).toEqual([])
  })

  it('sendMessage creates message in database', async () => {
    const newMessage = {
      id: 'new-1',
      session_id: 'session-1',
      participant_name: 'Bob',
      content: 'Hello world',
      message_type: 'user',
      created_at: '2024-01-01T10:00:00Z',
    }

    mockLimit.mockResolvedValueOnce({ data: [], error: null })
    mockSingle.mockResolvedValueOnce({ data: newMessage, error: null })

    const { result } = renderHook(() =>
      useMessages('session-1', 'Bob')
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.sendMessage('Hello world')
    })

    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        session_id: 'session-1',
        participant_name: 'Bob',
        content: 'Hello world',
        message_type: 'user',
      }),
    ])
  })

  it('sendMessage adds message to local state optimistically', async () => {
    const newMessage = {
      id: 'new-1',
      session_id: 'session-1',
      participant_name: 'Bob',
      content: 'Hello world',
      message_type: 'user',
      created_at: '2024-01-01T10:00:00Z',
    }

    mockLimit.mockResolvedValueOnce({ data: [], error: null })
    mockSingle.mockResolvedValueOnce({ data: newMessage, error: null })

    const { result } = renderHook(() =>
      useMessages('session-1', 'Bob')
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.sendMessage('Hello world')
    })

    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].content).toBe('Hello world')
  })

  it('handles send failure gracefully', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    })

    const { result } = renderHook(() =>
      useMessages('session-1', 'Bob')
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.sendMessage('Hello world')
    })

    expect(result.current.error).toBe('Failed to send message')
  })

  it('limits initial fetch to 100 messages', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    renderHook(() => useMessages('session-1', 'Bob'))

    await waitFor(() => {
      expect(mockLimit).toHaveBeenCalledWith(100)
    })
  })

  it('orders messages by created_at ascending', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    renderHook(() => useMessages('session-1', 'Bob'))

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true })
    })
  })

  it('does not send message when participantName is null', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    const { result } = renderHook(() =>
      useMessages('session-1', null)
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.sendMessage('Hello world')
    })

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('does not send empty messages', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    const { result } = renderHook(() =>
      useMessages('session-1', 'Bob')
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.sendMessage('')
    })

    expect(mockInsert).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.sendMessage('   ')
    })

    expect(mockInsert).not.toHaveBeenCalled()
  })
})
