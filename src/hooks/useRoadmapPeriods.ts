import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RoadmapPeriod } from '../types/database'

const DEFAULT_PERIODS = [
  { name: 'Now', width: 4, position: 0 },
  { name: 'Next', width: 4, position: 1 },
  { name: 'Later', width: 4, position: 2 },
]

interface UseRoadmapPeriodsReturn {
  periods: RoadmapPeriod[]
  loading: boolean
  error: string | null
  addPeriod: (name: string) => Promise<RoadmapPeriod | null>
  updatePeriod: (id: string, updates: Partial<Pick<RoadmapPeriod, 'name' | 'width'>>) => Promise<void>
  deletePeriod: (id: string) => Promise<void>
  reorderPeriods: (periodIds: string[]) => Promise<void>
}

export function useRoadmapPeriods(sessionId: string | null): UseRoadmapPeriodsReturn {
  const [periods, setPeriods] = useState<RoadmapPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch periods and create defaults if none exist
  const fetchPeriods = useCallback(async () => {
    if (!sessionId) {
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('roadmap_periods')
        .select('*')
        .eq('session_id', sessionId)
        .order('position', { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      const existingPeriods = (data as RoadmapPeriod[]) || []

      // If no periods exist, create default ones
      if (existingPeriods.length === 0) {
        const periodsToInsert = DEFAULT_PERIODS.map((p) => ({
          session_id: sessionId,
          name: p.name,
          width: p.width,
          position: p.position,
        }))

        const { data: insertedData, error: insertError } = await supabase
          .from('roadmap_periods')
          .insert(periodsToInsert as never)
          .select()

        if (insertError) {
          throw insertError
        }

        const insertedPeriods = (insertedData as RoadmapPeriod[]) || []
        // Sort by position after insert
        insertedPeriods.sort((a, b) => a.position - b.position)
        setPeriods(insertedPeriods)
      } else {
        setPeriods(existingPeriods)
      }
    } catch (err) {
      console.error('Error fetching roadmap periods:', err)
      setError('Failed to load roadmap periods')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchPeriods()
  }, [fetchPeriods])

  // Set up realtime subscription
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`roadmap_periods:session_id=eq.${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'roadmap_periods',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newPeriod = payload.new as RoadmapPeriod
          setPeriods((prev) => {
            if (prev.some((p) => p.id === newPeriod.id)) {
              return prev
            }
            const updated = [...prev, newPeriod]
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
          table: 'roadmap_periods',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedPeriod = payload.new as RoadmapPeriod
          setPeriods((prev) => {
            const updated = prev.map((p) =>
              p.id === updatedPeriod.id ? updatedPeriod : p
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
          table: 'roadmap_periods',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const deletedPeriod = payload.old as RoadmapPeriod
          setPeriods((prev) => prev.filter((p) => p.id !== deletedPeriod.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  const addPeriod = useCallback(async (name: string): Promise<RoadmapPeriod | null> => {
    if (!sessionId) return null

    const nextPosition = periods.length > 0
      ? Math.max(...periods.map((p) => p.position)) + 1
      : 0

    const { data, error: insertError } = await supabase
      .from('roadmap_periods')
      .insert([{
        session_id: sessionId,
        name,
        width: 4,
        position: nextPosition,
      } as never])
      .select()
      .single()

    if (insertError) {
      console.error('Error adding period:', insertError)
      return null
    }

    const newPeriod = data as RoadmapPeriod
    setPeriods((prev) => [...prev, newPeriod])
    return newPeriod
  }, [sessionId, periods])

  const updatePeriod = useCallback(async (
    id: string,
    updates: Partial<Pick<RoadmapPeriod, 'name' | 'width'>>
  ): Promise<void> => {
    const { error: updateError } = await supabase
      .from('roadmap_periods')
      .update(updates as never)
      .eq('id', id)

    if (updateError) {
      console.error('Error updating period:', updateError)
      return
    }

    setPeriods((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )
  }, [])

  const deletePeriod = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('roadmap_periods')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting period:', deleteError)
      return
    }

    setPeriods((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const reorderPeriods = useCallback(async (periodIds: string[]): Promise<void> => {
    // Optimistically update local state
    const reordered = periodIds
      .map((id, index) => {
        const period = periods.find((p) => p.id === id)
        return period ? { ...period, position: index } : null
      })
      .filter((p): p is RoadmapPeriod => p !== null)

    setPeriods(reordered)

    // Persist to database
    for (let i = 0; i < periodIds.length; i++) {
      const { error: updateError } = await supabase
        .from('roadmap_periods')
        .update({ position: i } as never)
        .eq('id', periodIds[i])

      if (updateError) {
        console.error('Error reordering period:', updateError)
      }
    }
  }, [periods])

  return {
    periods,
    loading,
    error,
    addPeriod,
    updatePeriod,
    deletePeriod,
    reorderPeriods,
  }
}
