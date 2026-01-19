import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Message } from '../types/database'

const STORAGE_KEY_PREFIX = 'priori_chat_lastRead_'

interface UseUnreadCountReturn {
  unreadCount: number
  markAsRead: () => void
}

export function useUnreadCount(
  sessionId: string | null,
  messages: Message[],
  isChatOpen: boolean
): UseUnreadCountReturn {
  // Initialize without reading localStorage - effect will hydrate
  const [lastReadAt, setLastReadAt] = useState<Date | null>(null)

  // Update lastReadAt when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      setLastReadAt(null)
      return
    }
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${sessionId}`)
    setLastReadAt(stored ? new Date(stored) : null)
  }, [sessionId])

  // Mark as read when chat opens or when new messages arrive while chat is open
  useEffect(() => {
    if (isChatOpen && sessionId && messages.length > 0) {
      const now = new Date()
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${sessionId}`, now.toISOString())
      setLastReadAt(now)
    }
  }, [isChatOpen, sessionId, messages.length])

  const markAsRead = useCallback(() => {
    if (!sessionId) return
    const now = new Date()
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${sessionId}`, now.toISOString())
    setLastReadAt(now)
  }, [sessionId])

  const unreadCount = useMemo(() => {
    if (!sessionId || isChatOpen || messages.length === 0) return 0

    // If we've never opened chat, all messages are unread
    if (!lastReadAt) return messages.length

    return messages.filter((msg) => {
      const msgDate = new Date(msg.created_at)
      return msgDate > lastReadAt
    }).length
  }, [sessionId, messages, lastReadAt, isChatOpen])

  return {
    unreadCount,
    markAsRead,
  }
}
