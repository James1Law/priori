import { useState, useCallback } from 'react'
import type { Item, ItemStatus } from '../types/database'

type CapacityUnit = 'days' | 'hours'

interface CapacityItemListProps {
  items: Item[]
  unit: CapacityUnit
  estimatedCount: number
  totalCount: number
  baseEffort: number
  onEstimateChange: (itemId: string, estimate: number | null) => void
}

const STATUS_CONFIG: Record<ItemStatus, { label: string; className: string }> = {
  todo: {
    label: 'To Do',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  done: {
    label: 'Done',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
}

function EstimateInput({
  itemId,
  value,
  unit,
  onSave,
}: {
  itemId: string
  value: number | null
  unit: CapacityUnit
  onSave: (itemId: string, estimate: number | null) => void
}) {
  const [localValue, setLocalValue] = useState(value != null ? String(value) : '')
  const hasValue = value != null

  const handleSave = useCallback(() => {
    const trimmed = localValue.trim()
    if (trimmed === '') {
      if (value !== null) onSave(itemId, null)
      return
    }
    const parsed = parseFloat(trimmed)
    if (!isNaN(parsed) && parsed !== value) {
      onSave(itemId, parsed)
    }
  }, [localValue, value, itemId, onSave])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave()
        ;(e.target as HTMLInputElement).blur()
      }
    },
    [handleSave]
  )

  return (
    <div className="flex items-center gap-1 justify-end">
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder="—"
        className={`w-[52px] h-11 sm:h-8 text-right px-2 text-sm font-medium rounded-md border outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${
          hasValue
            ? 'border-gray-300 text-gray-900'
            : 'border-dashed border-gray-300 text-gray-400'
        }`}
      />
      <span className="text-xs text-gray-400 font-medium w-7">{unit}</span>
    </div>
  )
}

export default function CapacityItemList({
  items,
  unit,
  estimatedCount,
  totalCount,
  baseEffort,
  onEstimateChange,
}: CapacityItemListProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow overflow-hidden">
      {/* Column headers (hidden on mobile) */}
      <div className="hidden sm:flex items-center px-5 py-3 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider gap-3">
        <div className="w-10 text-center">#</div>
        <div className="flex-1 min-w-0">Item</div>
        <div className="w-24 text-center">Status</div>
        <div className="w-24 text-right">Estimate</div>
      </div>

      {/* Item rows */}
      {items.map((item, index) => {
        const statusConfig = STATUS_CONFIG[item.status]
        return (
          <div
            key={item.id}
            className="flex items-center px-5 py-3 border-b border-gray-100 last:border-b-0 gap-3 hover:bg-gray-50 transition-colors"
          >
            {/* Rank badge */}
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[13px] font-semibold text-gray-500 flex-shrink-0">
              {index + 1}
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {item.title}
              </div>
            </div>

            {/* Status badge */}
            <div className="hidden sm:block w-24 text-center">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusConfig.className}`}
              >
                {statusConfig.label}
              </span>
            </div>

            {/* Estimate input */}
            <div className="w-24">
              <EstimateInput
                itemId={item.id}
                value={item.effort_estimate}
                unit={unit}
                onSave={onEstimateChange}
              />
            </div>
          </div>
        )
      })}

      {/* Summary row */}
      <div className="flex items-center px-5 py-3.5 bg-gray-50 border-t-2 border-gray-200 gap-3">
        <div className="w-8" />
        <div className="flex-1 text-sm font-semibold text-gray-600">
          Total ({estimatedCount} of {totalCount} items)
        </div>
        <div className="font-display text-base font-bold text-gray-900 w-24 text-right">
          {Math.round(baseEffort)} {unit}
        </div>
      </div>
    </div>
  )
}
