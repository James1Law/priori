import { useCallback } from 'react'
import type { Session, Item } from '../types/database'
import { supabase } from '../lib/supabase'
import { exportCapacityCsv } from '../lib/exportCsv'
import { useCapacitySettings } from '../hooks/useCapacitySettings'
import { useCapacityMetrics } from '../hooks/useCapacityMetrics'
import CapacitySettings from './CapacitySettings'
import CapacitySummaryCards from './CapacitySummaryCards'
import CapacityItemList from './CapacityItemList'
import UtilisationBar from './UtilisationBar'

interface CapacityViewProps {
  session: Session
  items: Item[]
  onSessionUpdate: (session: Session) => void
  onItemUpdate: (itemId: string, updates: Partial<Item>) => void
}

export default function CapacityView({ session, items, onSessionUpdate, onItemUpdate }: CapacityViewProps) {
  const settings = useCapacitySettings(session, onSessionUpdate)
  const metrics = useCapacityMetrics(items, settings)

  const handleEstimateChange = useCallback(
    async (itemId: string, estimate: number | null) => {
      // Optimistic update
      onItemUpdate(itemId, { effort_estimate: estimate })

      // Persist to database
      const { error } = await supabase
        .from('items')
        .update({ effort_estimate: estimate } as never)
        .eq('id', itemId)

      if (error) {
        console.error('Error updating effort estimate:', error)
      }
    },
    [onItemUpdate]
  )

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <CapacitySummaryCards
        netCapacity={metrics.netCapacity}
        baseEffort={metrics.baseEffort}
        totalEffort={metrics.totalEffort}
        utilisation={metrics.utilisation}
        estimatedCount={metrics.estimatedCount}
        totalCount={metrics.totalCount}
        remaining={metrics.remaining}
        status={metrics.status}
        statusColour={metrics.statusColour}
        statusLabel={metrics.statusLabel}
        unit={settings.unit}
        teamSize={settings.teamSize}
        workingDays={settings.workingDays}
        focusFactor={settings.focusFactor}
        contingency={settings.contingency}
        hoursPerDay={settings.hoursPerDay}
      />

      {/* Capacity Settings */}
      <CapacitySettings
        teamSize={settings.teamSize}
        workingDays={settings.workingDays}
        focusFactor={settings.focusFactor}
        contingency={settings.contingency}
        unit={settings.unit}
        hoursPerDay={settings.hoursPerDay}
        onTeamSizeChange={settings.setTeamSize}
        onWorkingDaysChange={settings.setWorkingDays}
        onFocusFactorChange={settings.setFocusFactor}
        onContingencyChange={settings.setContingency}
        onUnitChange={settings.setUnit}
        onHoursPerDayChange={settings.setHoursPerDay}
        onExportCsv={() =>
          exportCapacityCsv({
            items,
            sessionName: session.name || session.slug,
            teamSize: settings.teamSize,
            workingDays: settings.workingDays,
            focusFactor: settings.focusFactor,
            contingency: settings.contingency,
            unit: settings.unit,
            hoursPerDay: settings.hoursPerDay,
            netCapacity: metrics.netCapacity,
            totalEffort: metrics.totalEffort,
            baseEffort: metrics.baseEffort,
            utilisation: metrics.utilisation,
            estimatedCount: metrics.estimatedCount,
            totalCount: metrics.totalCount,
          })
        }
        exportDisabled={metrics.estimatedCount === 0}
      />

      {/* Item List with Estimates */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow p-8 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">No items yet</p>
          <p className="text-xs text-gray-400 mt-1">Add items to your backlog to start capacity planning.</p>
        </div>
      ) : (
        <>
          <CapacityItemList
            items={items}
            unit={settings.unit}
            estimatedCount={metrics.estimatedCount}
            totalCount={metrics.totalCount}
            baseEffort={metrics.baseEffort}
            onEstimateChange={handleEstimateChange}
          />

          {/* Hint when no items are estimated */}
          {metrics.estimatedCount === 0 && items.length > 0 && (
            <p className="text-sm text-gray-400 text-center">
              Add estimates to see capacity utilisation.
            </p>
          )}

          {/* Utilisation Bar */}
          <UtilisationBar
            totalEffort={metrics.totalEffort}
            netCapacity={metrics.netCapacity}
            utilisation={metrics.utilisation}
            statusColour={metrics.statusColour}
            unit={settings.unit}
          />
        </>
      )}
    </div>
  )
}
