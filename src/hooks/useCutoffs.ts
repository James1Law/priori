import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Cutoff, CutoffColor } from '../types/database'

interface UseCutoffsReturn {
  cutoffs: Cutoff[]
  loading: boolean
  error: string | null
  addCutoff: (position: number, label?: string, color?: CutoffColor) => Promise<Cutoff | null>
  updateCutoff: (id: string, updates: Partial<Pick<Cutoff, 'position' | 'label' | 'color'>>) => Promise<void>
  deleteCutoff: (id: string) => Promise<void>
}

export function useCutoffs(sessionId: string | null): UseCutoffsReturn {
  const [cutoffs, setCutoffs] = useState<Cutoff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch cutoffs
  const fetchCutoffs = useCallback(async () => {
    if (!sessionId) {
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('cutoffs')
        .select('*')
        .eq('session_id', sessionId)
        .order('position', { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      setCutoffs((data as Cutoff[]) || [])
    } catch (err) {
      console.error('Error fetching cutoffs:', err)
      setError('Failed to load cutoffs')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchCutoffs()
  }, [fetchCutoffs])

  // Set up realtime subscription
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`cutoffs:session_id=eq.${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cutoffs',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newCutoff = payload.new as Cutoff
          setCutoffs((prev) => {
            if (prev.some((c) => c.id === newCutoff.id)) {
              return prev
            }
            const updated = [...prev, newCutoff]
            updated.sort((a, b) => a.position - b.position)
            return updated
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cutoffs',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedCutoff = payload.new as Cutoff
          setCutoffs((prev) => {
            const updated = prev.map((c) =>
              c.id === updatedCutoff.id ? updatedCutoff : c
            )
            updated.sort((a, b) => a.position - b.position)
            return updated
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'cutoffs',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const deletedCutoff = payload.old as Cutoff
          setCutoffs((prev) => prev.filter((c) => c.id !== deletedCutoff.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  const addCutoff = useCallback(async (
    position: number,
    label: string = 'Cutoff',
    color: CutoffColor = 'red'
  ): Promise<Cutoff | null> => {
    if (!sessionId) return null

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const tempCutoff: Cutoff = {
      id: tempId,
      session_id: sessionId,
      position,
      label,
      color,
      created_at: new Date().toISOString(),
    }
    setCutoffs((prev) => {
      const updated = [...prev, tempCutoff]
      updated.sort((a, b) => a.position - b.position)
      return updated
    })

    const { data, error: insertError } = await supabase
      .from('cutoffs')
      .insert([{
        session_id: sessionId,
        position,
        label,
        color,
      } as never])
      .select()
      .single()

    if (insertError) {
      console.error('Error adding cutoff:', insertError)
      // Rollback optimistic update
      setCutoffs((prev) => prev.filter((c) => c.id !== tempId))
      return null
    }

    const newCutoff = data as Cutoff
    // Replace temp with real cutoff
    setCutoffs((prev) => {
      const updated = prev.map((c) => c.id === tempId ? newCutoff : c)
      updated.sort((a, b) => a.position - b.position)
      return updated
    })
    return newCutoff
  }, [sessionId])

  const updateCutoff = useCallback(async (
    id: string,
    updates: Partial<Pick<Cutoff, 'position' | 'label' | 'color'>>
  ): Promise<void> => {
    // Optimistic update
    setCutoffs((prev) => {
      const updated = prev.map((c) => c.id === id ? { ...c, ...updates } : c)
      updated.sort((a, b) => a.position - b.position)
      return updated
    })

    const { error: updateError } = await supabase
      .from('cutoffs')
      .update(updates as never)
      .eq('id', id)

    if (updateError) {
      console.error('Error updating cutoff:', updateError)
      // Refetch to restore correct state
      fetchCutoffs()
    }
  }, [fetchCutoffs])

  const deleteCutoff = useCallback(async (id: string): Promise<void> => {
    // Optimistic update
    const previousCutoffs = cutoffs
    setCutoffs((prev) => prev.filter((c) => c.id !== id))

    const { error: deleteError } = await supabase
      .from('cutoffs')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting cutoff:', deleteError)
      // Rollback
      setCutoffs(previousCutoffs)
    }
  }, [cutoffs])

  return {
    cutoffs,
    loading,
    error,
    addCutoff,
    updateCutoff,
    deleteCutoff,
  }
}
