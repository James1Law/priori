import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Participant {
  name: string
  joinedAt: string
}

export function usePresence(sessionId: string | null, participantName: string | null) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!sessionId || !participantName) return

    const presenceChannel = supabase.channel(`presence:${sessionId}`, {
      config: {
        presence: {
          key: participantName,
        },
      },
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
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
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            name: participantName,
            joinedAt: new Date().toISOString(),
          })
        }
      })

    setChannel(presenceChannel)

    return () => {
      presenceChannel.unsubscribe()
    }
  }, [sessionId, participantName])

  const updateName = useCallback(async (newName: string) => {
    if (channel) {
      await channel.track({
        name: newName,
        joinedAt: new Date().toISOString(),
      })
    }
  }, [channel])

  return {
    participants,
    participantCount: participants.length,
    updateName,
  }
}
