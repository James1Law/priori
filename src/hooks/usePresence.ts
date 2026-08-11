import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Participant {
  name: string
  joinedAt: string
  page?: string | null
}

// How long to wait before rebuilding a dead channel
const RETRY_DELAY_MS = 3000

export function usePresence(
  sessionId: string | null,
  participantName: string | null,
  page?: string | null
) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const mountedRef = useRef(true)
  const subscribedRef = useRef(false)
  const pageRef = useRef<string | null>(page ?? null)
  const joinedAtRef = useRef<string>(new Date().toISOString())

  // Keep the tracked page fresh on route changes — re-track on the live
  // channel rather than recreating it, so presence never flaps on navigation
  useEffect(() => {
    pageRef.current = page ?? null
    if (channelRef.current && subscribedRef.current && participantName) {
      channelRef.current.track({
        name: participantName,
        joinedAt: joinedAtRef.current,
        page: pageRef.current,
      })
    }
  }, [page, participantName])

  useEffect(() => {
    mountedRef.current = true
    if (!sessionId || !participantName) return

    let retryTimer: ReturnType<typeof setTimeout> | null = null
    joinedAtRef.current = new Date().toISOString()

    const syncState = () => {
      if (!mountedRef.current || !channelRef.current) return
      const presenceState = channelRef.current.presenceState()
      const participantList: Participant[] = []

      Object.entries(presenceState).forEach(([, presences]) => {
        const presence = presences[0] as unknown as Participant
        if (presence?.name) {
          participantList.push({
            name: presence.name,
            joinedAt: presence.joinedAt,
            page: presence.page ?? null,
          })
        }
      })

      setParticipants(participantList)
    }

    const setupChannel = () => {
      if (!mountedRef.current) return

      // Clean up any existing channel before creating a new one
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      subscribedRef.current = false

      const presenceChannel = supabase.channel(`presence:${sessionId}`, {
        config: {
          presence: {
            key: participantName,
          },
        },
      })
      channelRef.current = presenceChannel

      presenceChannel
        .on('presence', { event: 'sync' }, syncState)
        .on('presence', { event: 'join' }, syncState)
        .on('presence', { event: 'leave' }, syncState)
        .subscribe(async (status) => {
          if (!mountedRef.current) return
          if (status === 'SUBSCRIBED') {
            subscribedRef.current = true
            await presenceChannel.track({
              name: participantName,
              joinedAt: joinedAtRef.current,
              page: pageRef.current,
            })
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            // The channel is dead and will receive no more presence events —
            // rebuild it after a short delay so presence recovers without a
            // page refresh
            subscribedRef.current = false
            if (retryTimer) clearTimeout(retryTimer)
            retryTimer = setTimeout(() => {
              if (mountedRef.current) setupChannel()
            }, RETRY_DELAY_MS)
          }
        })
    }

    setupChannel()

    // Periodic re-sync to catch any missed presence events
    const interval = setInterval(syncState, 5000)

    return () => {
      mountedRef.current = false
      subscribedRef.current = false
      clearInterval(interval)
      if (retryTimer) clearTimeout(retryTimer)
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
        page: pageRef.current,
      })
    }
  }, [])

  return {
    participants,
    participantCount: participants.length,
    updateName,
  }
}
