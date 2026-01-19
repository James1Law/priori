import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUnreadCount } from '../../src/hooks/useUnreadCount'
import type { Message } from '../../src/types/database'

describe('useUnreadCount', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createMessage = (
    id: string,
    createdAt: string,
    participantName = 'Alice'
  ): Message => ({
    id,
    session_id: 'session-1',
    participant_name: participantName,
    content: 'Test message',
    message_type: 'user',
    created_at: createdAt,
  })

  it('returns 0 when no messages after lastReadAt', () => {
    const now = new Date('2024-01-01T12:00:00Z')
    vi.setSystemTime(now)

    // Set lastReadAt to now
    localStorage.setItem(
      'priori_chat_lastRead_session-1',
      now.toISOString()
    )

    const messages = [
      createMessage('1', '2024-01-01T11:00:00Z'), // Before lastReadAt
      createMessage('2', '2024-01-01T11:30:00Z'), // Before lastReadAt
    ]

    const { result } = renderHook(() =>
      useUnreadCount('session-1', messages, false)
    )

    expect(result.current.unreadCount).toBe(0)
  })

  it('returns correct count of unread messages', () => {
    const lastReadAt = new Date('2024-01-01T11:00:00Z')
    localStorage.setItem(
      'priori_chat_lastRead_session-1',
      lastReadAt.toISOString()
    )

    const messages = [
      createMessage('1', '2024-01-01T10:00:00Z'), // Before lastReadAt
      createMessage('2', '2024-01-01T11:30:00Z'), // After lastReadAt
      createMessage('3', '2024-01-01T12:00:00Z'), // After lastReadAt
    ]

    const { result } = renderHook(() =>
      useUnreadCount('session-1', messages, false)
    )

    expect(result.current.unreadCount).toBe(2)
  })

  it('updates lastReadAt in localStorage when markAsRead called', () => {
    const now = new Date('2024-01-01T12:00:00Z')
    vi.setSystemTime(now)

    const messages = [createMessage('1', '2024-01-01T11:00:00Z')]

    const { result } = renderHook(() =>
      useUnreadCount('session-1', messages, false)
    )

    act(() => {
      result.current.markAsRead()
    })

    const stored = localStorage.getItem('priori_chat_lastRead_session-1')
    expect(stored).toBe(now.toISOString())
  })

  it('persists lastReadAt per session', () => {
    const session1LastRead = new Date('2024-01-01T10:00:00Z')
    const session2LastRead = new Date('2024-01-01T11:00:00Z')

    localStorage.setItem(
      'priori_chat_lastRead_session-1',
      session1LastRead.toISOString()
    )
    localStorage.setItem(
      'priori_chat_lastRead_session-2',
      session2LastRead.toISOString()
    )

    const messages1 = [
      createMessage('1', '2024-01-01T10:30:00Z'), // After session1's lastRead
      createMessage('2', '2024-01-01T11:30:00Z'), // After session1's lastRead
    ]

    const messages2 = [
      createMessage('3', '2024-01-01T10:30:00Z'), // Before session2's lastRead
      createMessage('4', '2024-01-01T11:30:00Z'), // After session2's lastRead
    ]

    const { result: result1 } = renderHook(() =>
      useUnreadCount('session-1', messages1, false)
    )

    const { result: result2 } = renderHook(() =>
      useUnreadCount('session-2', messages2, false)
    )

    expect(result1.current.unreadCount).toBe(2)
    expect(result2.current.unreadCount).toBe(1)
  })

  it('returns 0 when chat is open', () => {
    const lastReadAt = new Date('2024-01-01T11:00:00Z')
    localStorage.setItem(
      'priori_chat_lastRead_session-1',
      lastReadAt.toISOString()
    )

    const messages = [
      createMessage('1', '2024-01-01T11:30:00Z'), // Would be unread
      createMessage('2', '2024-01-01T12:00:00Z'), // Would be unread
    ]

    const { result } = renderHook(() =>
      useUnreadCount('session-1', messages, true) // Chat is open
    )

    expect(result.current.unreadCount).toBe(0)
  })

  it('marks as read when chat opens', () => {
    const now = new Date('2024-01-01T12:00:00Z')
    vi.setSystemTime(now)

    const lastReadAt = new Date('2024-01-01T11:00:00Z')
    localStorage.setItem(
      'priori_chat_lastRead_session-1',
      lastReadAt.toISOString()
    )

    const messages = [
      createMessage('1', '2024-01-01T11:30:00Z'),
    ]

    // Start with chat closed
    const { result, rerender } = renderHook(
      ({ isChatOpen }) => useUnreadCount('session-1', messages, isChatOpen),
      { initialProps: { isChatOpen: false } }
    )

    expect(result.current.unreadCount).toBe(1)

    // Open the chat
    rerender({ isChatOpen: true })

    // Should have marked as read
    const stored = localStorage.getItem('priori_chat_lastRead_session-1')
    expect(stored).toBe(now.toISOString())
  })

  it('returns all messages as unread when no lastReadAt exists', () => {
    // No localStorage entry for this session
    const messages = [
      createMessage('1', '2024-01-01T10:00:00Z'),
      createMessage('2', '2024-01-01T11:00:00Z'),
      createMessage('3', '2024-01-01T12:00:00Z'),
    ]

    const { result } = renderHook(() =>
      useUnreadCount('session-1', messages, false)
    )

    // All messages are unread since we've never opened chat
    expect(result.current.unreadCount).toBe(3)
  })

  it('returns 0 when sessionId is null', () => {
    const messages = [
      createMessage('1', '2024-01-01T10:00:00Z'),
    ]

    const { result } = renderHook(() =>
      useUnreadCount(null, messages, false)
    )

    expect(result.current.unreadCount).toBe(0)
  })

  it('returns 0 when messages array is empty', () => {
    const { result } = renderHook(() =>
      useUnreadCount('session-1', [], false)
    )

    expect(result.current.unreadCount).toBe(0)
  })
})
