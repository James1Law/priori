import { useState, useCallback } from 'react'
import type { Item, ItemStatus, ItemLevel } from '../types/database'
import { ITEM_LEVEL_LABELS } from '../types/database'
import { getDirectChildren, getRolledUpEstimate, getMobileIndent, LEVEL_BORDER_COLOURS } from '../lib/hierarchy'
import InfoTooltip from './InfoTooltip'

type CapacityUnit = 'days' | 'hours'

// Level badge colours (matching BacklogList)
const LEVEL_BADGE_STYLES: Record<number, string> = {
  0: 'bg-pink-50 text-pink-700 border-pink-200',
  1: 'bg-blue-50 text-blue-700 border-blue-200',
  2: 'bg-purple-50 text-purple-700 border-purple-200',
  3: 'bg-amber-50 text-amber-700 border-amber-200',
  4: 'bg-slate-50 text-slate-600 border-slate-200',
}

interface CapacityItemListProps {
  items: Item[]
  unit: CapacityUnit
  estimatedCount: number
  totalCount: number
  baseEffort: number
  onEstimateChange: (itemId: string, estimate: number | null) => void
  onItemClick?: (item: Item) => void
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
  onItemClick,
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
        const itemLevel = item.item_level ?? 0
        const isHierarchyItem = true // All items show their level badge
        const hasChildren = getDirectChildren(item.id, items).length > 0
        const rolledUp = hasChildren ? getRolledUpEstimate(item.id, items) : null
        const levelBorderColour = LEVEL_BORDER_COLOURS[itemLevel] ?? LEVEL_BORDER_COLOURS[0]
        const mobileIndent = itemLevel > 0 ? getMobileIndent(itemLevel) : 0

        return (
          <div
            key={item.id}
            className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors ${onItemClick ? 'cursor-pointer' : ''}`}
            onClick={() => onItemClick?.(item)}
          >
            {/* ===== MOBILE LAYOUT (below sm) ===== */}
            <div
              className={`sm:hidden px-3 py-2.5 active:bg-gray-50 ${isHierarchyItem ? `border-l-[3px] ${levelBorderColour}` : ''}`}
              style={{ paddingLeft: mobileIndent > 0 ? `calc(${mobileIndent}rem + 12px)` : undefined }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  {/* Level badge + status inline */}
                  {isHierarchyItem && (
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`px-1 py-0.5 rounded text-[9px] font-semibold border flex-shrink-0 ${LEVEL_BADGE_STYLES[itemLevel] ?? LEVEL_BADGE_STYLES[0]}`}>
                        {ITEM_LEVEL_LABELS[(itemLevel as ItemLevel)] ?? 'Item'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusConfig.className}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  )}
                  {/* Title — wraps naturally, no truncation */}
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {item.title}
                  </p>
                  {/* Status for flat items (no level badge row) */}
                  {!isHierarchyItem && (
                    <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusConfig.className}`}>
                      {statusConfig.label}
                    </span>
                  )}
                </div>
                {/* Estimate — right aligned */}
                {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {hasChildren ? (
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-emerald-700">
                        {rolledUp !== null ? `${rolledUp} ${unit === 'days' ? 'd' : 'h'}` : '—'}
                      </span>
                      <span className="text-[9px] text-gray-400">rolled up</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        defaultValue={item.effort_estimate != null ? String(item.effort_estimate) : ''}
                        placeholder="—"
                        onBlur={(e) => {
                          const trimmed = e.target.value.trim()
                          if (trimmed === '') {
                            if (item.effort_estimate !== null) onEstimateChange(item.id, null)
                          } else {
                            const parsed = parseFloat(trimmed)
                            if (!isNaN(parsed) && parsed !== item.effort_estimate) onEstimateChange(item.id, parsed)
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        className={`w-10 h-8 text-right px-1.5 text-sm font-medium rounded border outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 ${
                          item.effort_estimate != null
                            ? 'border-gray-300 text-gray-900'
                            : 'border-dashed border-gray-300 text-gray-400'
                        }`}
                      />
                      <span className="text-[10px] text-gray-400">{unit === 'days' ? 'd' : 'h'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ===== DESKTOP LAYOUT (sm and above) ===== */}
            <div
              className="hidden sm:flex items-center px-5 py-3 gap-3"
              style={{ paddingLeft: itemLevel > 0 ? `${1.25 + itemLevel * 1}rem` : undefined }}
            >
              {/* Rank badge */}
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[13px] font-semibold text-gray-500 flex-shrink-0">
                {index + 1}
              </div>

              {/* Title with level badge */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {isHierarchyItem && (
                    <span className={`px-1 py-0.5 rounded text-[9px] font-semibold border flex-shrink-0 ${LEVEL_BADGE_STYLES[itemLevel] ?? LEVEL_BADGE_STYLES[0]}`}>
                      {ITEM_LEVEL_LABELS[(itemLevel as ItemLevel)] ?? 'Item'}
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {item.title}
                  </span>
                </div>
              </div>

              {/* Status badge */}
              <div className="w-24 text-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusConfig.className}`}>
                  {statusConfig.label}
                </span>
              </div>

              {/* Estimate */}
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div className="w-24" onClick={(e) => e.stopPropagation()}>
                {hasChildren ? (
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-emerald-700">
                      {rolledUp !== null ? `${rolledUp} ${unit}` : '—'}
                    </span>
                    <span className="text-[10px] text-gray-400 inline-flex items-center gap-0.5">
                      rolled up
                      <InfoTooltip text="This total is the sum of estimates from all leaf items (items without children) in this branch. Only leaf items can have estimates — parent items always show the rolled-up total." />
                    </span>
                  </div>
                ) : (
                  <EstimateInput
                    itemId={item.id}
                    value={item.effort_estimate}
                    unit={unit}
                    onSave={onEstimateChange}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Summary row */}
      <div className="flex items-center px-3 sm:px-5 py-3 sm:py-3.5 bg-gray-50 border-t-2 border-gray-200 gap-3">
        <div className="hidden sm:block w-8" />
        <div className="flex-1 text-xs sm:text-sm font-semibold text-gray-600">
          Total ({estimatedCount} of {totalCount} items)
        </div>
        <div className="font-display text-base font-bold text-gray-900 sm:w-24 text-right">
          {Math.round(baseEffort)} {unit}
        </div>
      </div>
    </div>
  )
}
