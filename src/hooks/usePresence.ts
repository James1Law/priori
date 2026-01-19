import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Participant {
  name: string
  joinedAt: string
}

interface PresencePayload {
  key: string
  newPresences?: Array<{ name: string; joinedAt: string }>
  leftPresences?: Array<{ name: string; joinedAt: string }>
}

interface UsePresenceOptions {
  onJoin?: (name: string) => void
  onLeave?: (name: string) => void
}

export function usePresence(
  sessionId: string | null,
  participantName: string | null,
  options?: UsePresenceOptions
) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const optionsRef = useRef(options)
  const initialSyncDoneRef = useRef(false)
  // Track pending events to debounce rapid join/leave sequences
  const pendingEventsRef = useRef<Map<string, { type: 'join' | 'leave'; timeout: NodeJS.Timeout }>>(new Map())

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    if (!sessionId || !participantName) return

    // Reset initial sync flag when session changes
    initialSyncDoneRef.current = false

    const presenceChannel = supabase.channel(`presence:${sessionId}`, {
      config: {
        presence: {
          key: participantName,
        },
      },
    })

    const handleJoinLeave = (name: string, type: 'join' | 'leave') => {
      // Clear any pending opposite event for this user
      const pending = pendingEventsRef.current.get(name)
      if (pending) {
        clearTimeout(pending.timeout)
        pendingEventsRef.current.delete(name)
        // If opposite event was pending, they cancel out (rapid disconnect/reconnect)
        if (pending.type !== type) {
          return
        }
      }

      // Debounce the event - wait 2 seconds before actually firing
      const timeout = setTimeout(() => {
        pendingEventsRef.current.delete(name)
        if (type === 'join') {
          optionsRef.current?.onJoin?.(name)
        } else {
          optionsRef.current?.onLeave?.(name)
        }
      }, 2000)

      pendingEventsRef.current.set(name, { type, timeout })
    }

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

        // Mark initial sync as done after a brief delay
        // This prevents join events from the initial sync from triggering messages
        if (!initialSyncDoneRef.current) {
          setTimeout(() => {
            initialSyncDoneRef.current = true
          }, 1000)
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }: PresencePayload) => {
        // Skip join events until initial sync is done
        if (!initialSyncDoneRef.current) return

        if (newPresences && optionsRef.current?.onJoin) {
          newPresences.forEach((presence) => {
            // Don't trigger for self
            if (presence.name && presence.name !== participantName) {
              handleJoinLeave(presence.name, 'join')
            }
          })
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }: PresencePayload) => {
        // Skip leave events until initial sync is done
        if (!initialSyncDoneRef.current) return

        if (leftPresences && optionsRef.current?.onLeave) {
          leftPresences.forEach((presence) => {
            // Don't trigger for self
            if (presence.name && presence.name !== participantName) {
              handleJoinLeave(presence.name, 'leave')
            }
          })
        }
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
      // Clear any pending events on cleanup
      pendingEventsRef.current.forEach(({ timeout }) => clearTimeout(timeout))
      pendingEventsRef.current.clear()
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
