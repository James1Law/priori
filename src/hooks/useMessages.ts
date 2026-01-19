import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Message } from '../types/database'

interface UseMessagesReturn {
  messages: Message[]
  loading: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  sendSystemMessage: (content: string) => Promise<void>
}

export function useMessages(
  sessionId: string | null,
  participantName: string | null
): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch messages for the session
  const fetchMessages = useCallback(async () => {
    if (!sessionId) {
      setMessages([])
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (fetchError) {
        throw fetchError
      }

      setMessages((data as Message[]) || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    setLoading(true)
    fetchMessages()
  }, [fetchMessages])

  // Set up realtime subscription for messages
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`messages:session_id=eq.${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((prev) => {
            // Don't add if already exists (optimistic update already added it)
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev
            }
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionId || !participantName) return

      const trimmedContent = content.trim()
      if (!trimmedContent) return

      try {
        const { data, error: insertError } = await supabase
          .from('messages')
          .insert([
            {
              session_id: sessionId,
              participant_name: participantName,
              content: trimmedContent,
              message_type: 'user',
            } as never,
          ])
          .select()
          .single()

        if (insertError) {
          throw insertError
        }

        // Optimistic update - add to local state
        setMessages((prev) => [...prev, data as Message])
      } catch (err) {
        console.error('Error sending message:', err)
        setError('Failed to send message')
      }
    },
    [sessionId, participantName]
  )

  // Send a system message (for join/leave events)
  const sendSystemMessage = useCallback(
    async (content: string) => {
      if (!sessionId) return

      try {
        await supabase
          .from('messages')
          .insert([
            {
              session_id: sessionId,
              participant_name: 'System',
              content,
              message_type: 'system',
            } as never,
          ])
        // Don't add to local state - realtime subscription will handle it
      } catch (err) {
        console.error('Error sending system message:', err)
      }
    },
    [sessionId]
  )

  return {
    messages,
    loading,
    error,
    sendMessage,
    sendSystemMessage,
  }
}
