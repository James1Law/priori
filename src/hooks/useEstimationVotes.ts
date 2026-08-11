import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { EstimationVote } from '../types/database'

interface UseEstimationVotesReturn {
  votes: EstimationVote[]
  loading: boolean
  error: string | null
  submitVote: (vote: number | null) => Promise<void>
  clearVotes: () => Promise<void>
}

export function useEstimationVotes(
  sessionId: string | null,
  itemId: string | null,
  participantName: string | null,
  forceRefreshKey?: number // Optional key to force re-fetch votes
): UseEstimationVotesReturn {
  const [votes, setVotes] = useState<EstimationVote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch votes for the current item
  const fetchVotes = useCallback(async () => {
    if (!sessionId || !itemId) {
      setVotes([])
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('estimation_votes')
        .select('*')
        .eq('item_id', itemId)

      if (fetchError) {
        throw fetchError
      }

      setVotes((data as EstimationVote[]) || [])
    } catch (err) {
      console.error('Error fetching estimation votes:', err)
      setError('Failed to load votes')
    } finally {
      setLoading(false)
    }
  }, [sessionId, itemId, forceRefreshKey])

  useEffect(() => {
    setLoading(true)
    fetchVotes()
  }, [fetchVotes])

  // Set up realtime subscription for votes
  useEffect(() => {
    if (!sessionId || !itemId) return

    const channel = supabase
      .channel(`estimation_votes:item_id=eq.${itemId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'estimation_votes',
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          const newVote = payload.new as EstimationVote
          setVotes((prev) => {
            // Don't add if already exists
            if (prev.some((v) => v.id === newVote.id)) {
              return prev
            }
            return [...prev, newVote]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'estimation_votes',
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          const updatedVote = payload.new as EstimationVote
          setVotes((prev) =>
            prev.map((v) => (v.id === updatedVote.id ? updatedVote : v))
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'estimation_votes',
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          const deletedVote = payload.old as EstimationVote
          setVotes((prev) => prev.filter((v) => v.id !== deletedVote.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, itemId])

  // Submit or update a vote — upsert keyed on the table's
  // UNIQUE(item_id, participant_name) constraint so rapid re-votes
  // and duplicate tabs can't race an insert into a constraint error
  const submitVote = useCallback(
    async (vote: number | null) => {
      if (!sessionId || !itemId || !participantName) return

      try {
        const { data, error: upsertError } = await supabase
          .from('estimation_votes')
          .upsert(
            {
              session_id: sessionId,
              item_id: itemId,
              participant_name: participantName,
              vote,
            } as never,
            { onConflict: 'item_id,participant_name' }
          )
          .select()
          .single()

        if (upsertError) {
          throw upsertError
        }

        const savedVote = data as EstimationVote
        setVotes((prev) => {
          const existing = prev.find(
            (v) => v.participant_name === participantName
          )
          if (existing) {
            return prev.map((v) =>
              v.participant_name === participantName ? { ...v, ...savedVote } : v
            )
          }
          return [...prev, savedVote]
        })
      } catch (err) {
        console.error('Error submitting vote:', err)
        setError('Failed to submit vote')
      }
    },
    [sessionId, itemId, participantName]
  )

  // Clear all votes for the current item (used after accepting estimate)
  const clearVotes = useCallback(async () => {
    if (!itemId) return

    try {
      const { error: deleteError } = await supabase
        .from('estimation_votes')
        .delete()
        .eq('item_id', itemId)

      if (deleteError) {
        throw deleteError
      }

      setVotes([])
    } catch (err) {
      console.error('Error clearing votes:', err)
      setError('Failed to clear votes')
    }
  }, [itemId])

  return {
    votes,
    loading,
    error,
    submitVote,
    clearVotes,
  }
}
