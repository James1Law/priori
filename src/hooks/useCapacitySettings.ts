import { useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '../types/database'

type CapacityUnit = 'days' | 'hours'

interface CapacitySettings {
  teamSize: number
  workingDays: number
  focusFactor: number
  contingency: number
  unit: CapacityUnit
  hoursPerDay: number
  setTeamSize: (value: number) => void
  setWorkingDays: (value: number) => void
  setFocusFactor: (value: number) => void
  setContingency: (value: number) => void
  setUnit: (value: CapacityUnit) => void
  setHoursPerDay: (value: number) => void
}

const DEFAULTS = {
  teamSize: 5,
  workingDays: 65,
  focusFactor: 0.6,
  contingency: 0.3,
  unit: 'days' as CapacityUnit,
  hoursPerDay: 8,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function useCapacitySettings(
  session: Session | null,
  onOptimisticUpdate: (updatedSession: Session) => void
): CapacitySettings {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persist = useCallback(
    (updates: Partial<Session>) => {
      if (!session) return

      // Debounce the Supabase write by 500ms
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(async () => {
        const { error } = await supabase
          .from('sessions')
          .update(updates as never)
          .eq('id', session.id)

        if (error) {
          console.error('Error updating capacity settings:', error)
        }
      }, 500)
    },
    [session]
  )

  const updateField = useCallback(
    (field: string, value: number | string) => {
      if (!session) return
      const updatedSession = { ...session, [field]: value }
      onOptimisticUpdate(updatedSession)
      persist({ [field]: value })
    },
    [session, onOptimisticUpdate, persist]
  )

  const setTeamSize = useCallback(
    (value: number) => updateField('capacity_team_size', clamp(value, 1, 100)),
    [updateField]
  )

  const setWorkingDays = useCallback(
    (value: number) => updateField('capacity_working_days', clamp(value, 1, 365)),
    [updateField]
  )

  const setFocusFactor = useCallback(
    (value: number) => updateField('capacity_focus_factor', clamp(value, 0.1, 1)),
    [updateField]
  )

  const setContingency = useCallback(
    (value: number) => updateField('capacity_contingency', clamp(value, 0, 2)),
    [updateField]
  )

  const setUnit = useCallback(
    (value: CapacityUnit) => updateField('capacity_unit', value),
    [updateField]
  )

  const setHoursPerDay = useCallback(
    (value: number) => updateField('capacity_hours_per_day', clamp(Math.round(value), 1, 24)),
    [updateField]
  )

  return useMemo(
    () => ({
      teamSize: session?.capacity_team_size ?? DEFAULTS.teamSize,
      workingDays: session?.capacity_working_days ?? DEFAULTS.workingDays,
      focusFactor: session?.capacity_focus_factor ?? DEFAULTS.focusFactor,
      contingency: session?.capacity_contingency ?? DEFAULTS.contingency,
      unit: (session?.capacity_unit === 'days' || session?.capacity_unit === 'hours'
        ? session.capacity_unit
        : DEFAULTS.unit) as CapacityUnit,
      hoursPerDay: session?.capacity_hours_per_day ?? DEFAULTS.hoursPerDay,
      setTeamSize,
      setWorkingDays,
      setFocusFactor,
      setContingency,
      setUnit,
      setHoursPerDay,
    }),
    [session, setTeamSize, setWorkingDays, setFocusFactor, setContingency, setUnit, setHoursPerDay]
  )
}
