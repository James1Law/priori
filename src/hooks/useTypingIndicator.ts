import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

const TYPING_TIMEOUT_MS = 3000

interface TypingPresence {
  name: string
  isTyping: boolean
}

interface UseTypingIndicatorReturn {
  typingParticipants: string[]
  setTyping: (isTyping: boolean) => void
}

export function useTypingIndicator(
  sessionId: string | null,
  participantName: string | null
): UseTypingIndicatorReturn {
  const [typingParticipants, setTypingParticipants] = useState<string[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  useEffect(() => {
    if (!sessionId || !participantName) return

    const typingChannel = supabase.channel(`typing:${sessionId}`, {
      config: {
        presence: {
          key: participantName,
        },
      },
    })

    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = typingChannel.presenceState()
        const typingList: string[] = []

        Object.entries(presenceState).forEach(([, presences]) => {
          const presence = presences[0] as unknown as TypingPresence
          if (
            presence?.name &&
            presence.isTyping &&
            presence.name !== participantName
          ) {
            typingList.push(presence.name)
          }
        })

        setTypingParticipants(typingList)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await typingChannel.track({
            name: participantName,
            isTyping: false,
          })
        }
      })

    channelRef.current = typingChannel

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      typingChannel.unsubscribe()
    }
  }, [sessionId, participantName])

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!sessionId || !participantName || !channelRef.current) return

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // Only broadcast if state changed
      if (isTyping && !isTypingRef.current) {
        isTypingRef.current = true
        channelRef.current.track({
          name: participantName,
          isTyping: true,
        })
      }

      if (isTyping) {
        // Set timeout to clear typing state
        timeoutRef.current = setTimeout(() => {
          isTypingRef.current = false
          channelRef.current?.track({
            name: participantName,
            isTyping: false,
          })
        }, TYPING_TIMEOUT_MS)
      } else if (!isTyping && isTypingRef.current) {
        // Immediately clear typing state
        isTypingRef.current = false
        channelRef.current.track({
          name: participantName,
          isTyping: false,
        })
      }
    },
    [sessionId, participantName]
  )

  return {
    typingParticipants,
    setTyping,
  }
}
