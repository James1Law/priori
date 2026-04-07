import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Participant {
  name: string
  joinedAt: string
}

export function usePresence(
  sessionId: string | null,
  participantName: string | null
) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    if (!sessionId || !participantName) return

    // Clean up any existing channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const presenceChannel = supabase.channel(`presence:${sessionId}`, {
      config: {
        presence: {
          key: participantName,
        },
      },
    })
    channelRef.current = presenceChannel

    const syncState = () => {
      if (!mountedRef.current) return
      const presenceState = presenceChannel.presenceState()
      const participantList: Participant[] = []

      Object.entries(presenceState).forEach(([, presences]) => {
        const presence = presences[0] as unknown as { name: string; joinedAt: string }
        if (presence?.name) {
          participantList.push({
            name: presence.name,
            joinedAt: presence.joinedAt,
          })
        }
      })

      setParticipants(participantList)
    }

    presenceChannel
      .on('presence', { event: 'sync' }, syncState)
      .on('presence', { event: 'join' }, syncState)
      .on('presence', { event: 'leave' }, syncState)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && mountedRef.current) {
          await presenceChannel.track({
            name: participantName,
            joinedAt: new Date().toISOString(),
          })
        }
      })

    // Periodic re-sync to catch any missed presence events
    const interval = setInterval(() => {
      if (mountedRef.current && presenceChannel) {
        syncState()
      }
    }, 5000)

    return () => {
      mountedRef.current = false
      clearInterval(interval)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [sessionId, participantName])

  const updateName = useCallback(async (newName: string) => {
    if (channelRef.current) {
      await channelRef.current.track({
        name: newName,
        joinedAt: new Date().toISOString(),
      })
    }
  }, [])

  return {
    participants,
    participantCount: participants.length,
    updateName,
  }
}
