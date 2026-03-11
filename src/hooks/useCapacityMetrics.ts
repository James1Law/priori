import { useMemo } from 'react'
import type { Item } from '../types/database'

type CapacityUnit = 'days' | 'hours'

interface CapacitySettingsInput {
  teamSize: number
  workingDays: number
  focusFactor: number
  contingency: number
  unit: CapacityUnit
  hoursPerDay: number
}

type CapacityStatus = 'healthy' | 'at-risk' | 'over-capacity'

interface CapacityMetrics {
  netCapacity: number
  baseEffort: number
  totalEffort: number
  utilisation: number
  estimatedCount: number
  totalCount: number
  remaining: number
  status: CapacityStatus
  statusColour: string
  statusLabel: string
}

export function useCapacityMetrics(
  items: Item[],
  settings: CapacitySettingsInput
): CapacityMetrics {
  return useMemo(() => {
    const hoursMultiplier = settings.unit === 'hours' ? settings.hoursPerDay : 1
    const netCapacity = settings.teamSize * settings.workingDays * settings.focusFactor * hoursMultiplier

    const baseEffort = items.reduce(
      (sum, item) => sum + (item.effort_estimate ?? 0),
      0
    )
    const totalEffort = Math.round(baseEffort * (1 + settings.contingency) * 100) / 100

    const utilisation = netCapacity > 0 ? (totalEffort / netCapacity) * 100 : 0

    const estimatedCount = items.filter((item) => item.effort_estimate != null).length
    const totalCount = items.length

    const remaining = netCapacity - totalEffort

    let status: CapacityStatus
    let statusColour: string
    let statusLabel: string

    if (utilisation >= 100) {
      status = 'over-capacity'
      statusColour = '#ef4444'
      statusLabel = 'Over Capacity'
    } else if (utilisation >= 80) {
      status = 'at-risk'
      statusColour = '#f59e0b'
      statusLabel = 'At Risk'
    } else {
      status = 'healthy'
      statusColour = '#10b981'
      statusLabel = 'Healthy'
    }

    return {
      netCapacity,
      baseEffort,
      totalEffort,
      utilisation,
      estimatedCount,
      totalCount,
      remaining,
      status,
      statusColour,
      statusLabel,
    }
  }, [items, settings])
}
