import { useState, useMemo } from 'react'
import type { RoadmapPeriod, ItemWithScore, ItemLevel } from '../types/database'
import { ITEM_LEVEL_LABELS } from '../types/database'
import { countDescendants } from '../lib/hierarchy'
import { getUnscheduledGroups } from '../lib/roadmap-hierarchy'

const QUADRANTS_PER_PERIOD = 4

interface MobileRoadmapViewProps {
  periods: RoadmapPeriod[]
  items: ItemWithScore[]
  loading: boolean
  onItemClick?: (itemId: string) => void
}

// Level badge styles
const LEVEL_BADGE_STYLES: Record<number, string> = {
  0: 'bg-pink-100 text-pink-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-green-100 text-green-700',
}

// Bar fill styles by hierarchy level — colours match GIES badges
const LEVEL_BAR_FILLS: Record<number, string> = {
  0: 'bg-gradient-to-r from-pink-600 to-pink-500',
  1: 'bg-gradient-to-r from-blue-600 to-blue-500',
  2: 'bg-gradient-to-r from-purple-600 to-purple-500',
  3: 'bg-gradient-to-r from-green-600 to-green-500',
}

const FLAT_BAR_FILL = 'bg-gradient-to-r from-slate-500 to-slate-400'

// Calculate which periods an item spans and its position within each
function getItemPeriodsAndPositions(
  item: ItemWithScore,
  totalPeriods: number
): Array<{
  periodIndex: number
  localStart: number
  localEnd: number
  continuesFromPrev: boolean
  continuesToNext: boolean
}> {
  if (item.roadmap_start_quadrant == null || item.roadmap_end_quadrant == null) return []

  const startPeriod = Math.floor(item.roadmap_start_quadrant / QUADRANTS_PER_PERIOD)
  const endPeriod = Math.floor(item.roadmap_end_quadrant / QUADRANTS_PER_PERIOD)

  const result = []
  for (let p = startPeriod; p <= endPeriod && p < totalPeriods; p++) {
    const periodStart = p * QUADRANTS_PER_PERIOD
    const localStart = Math.max(0, item.roadmap_start_quadrant - periodStart)
    const localEnd = Math.min(QUADRANTS_PER_PERIOD - 1, item.roadmap_end_quadrant - periodStart)
    result.push({
      periodIndex: p,
      localStart,
      localEnd,
      continuesFromPrev: p > startPeriod,
      continuesToNext: p < endPeriod,
    })
  }
  return result
}

// Get items to display in a specific period, respecting hierarchy
function getItemsInPeriod(
  periodIndex: number,
  items: ItemWithScore[],
  expandedIds: Set<string>,
  totalPeriods: number
): ItemWithScore[] {
  // Get all items that have bars in this period
  const itemsInPeriod = items.filter((item) => {
    if (item.item_level >= 4) return false // Exclude subtasks
    const positions = getItemPeriodsAndPositions(item, totalPeriods)
    return positions.some((p) => p.periodIndex === periodIndex)
  })

  // Build tree structure and flatten respecting expand state
  const rootItems = itemsInPeriod.filter((i) => !i.parent_item_id || !itemsInPeriod.some((p) => p.id === i.parent_item_id))
  const childrenMap = new Map<string, ItemWithScore[]>()
  for (const item of itemsInPeriod) {
    if (item.parent_item_id && itemsInPeriod.some((p) => p.id === item.parent_item_id)) {
      const list = childrenMap.get(item.parent_item_id) ?? []
      list.push(item)
      childrenMap.set(item.parent_item_id, list)
    }
  }

  const result: ItemWithScore[] = []
  const walk = (itemList: ItemWithScore[]) => {
    for (const item of itemList) {
      result.push(item)
      if (expandedIds.has(item.id)) {
        const children = childrenMap.get(item.id) ?? []
        walk(children)
      }
    }
  }

  // Sort roots by start quadrant
  rootItems.sort((a, b) => (a.roadmap_start_quadrant ?? 0) - (b.roadmap_start_quadrant ?? 0))
  walk(rootItems)

  return result
}

function isFlat(item: ItemWithScore, items: ItemWithScore[]) {
  return !item.parent_item_id && !items.some((i) => i.parent_item_id === item.id)
}

export default function MobileRoadmapView({
  periods,
  items,
  loading,
  onItemClick,
}: MobileRoadmapViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const unscheduledGroups = useMemo(() => getUnscheduledGroups(items), [items])

  const toggleExpand = (itemId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const handleItemTap = (itemId: string) => {
    setSelectedItemId(selectedItemId === itemId ? null : itemId)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  const totalPeriods = periods.length

  return (
    <div className="space-y-3">
      {/* Period Cards */}
      {periods.map((period, periodIndex) => {
        const periodItems = getItemsInPeriod(periodIndex, items, expandedIds, totalPeriods)

        return (
          <div key={period.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Period header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50/80 border-b border-gray-100">
              <span className="font-display font-semibold text-sm text-gray-900">{period.name}</span>
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {periodItems.length} item{periodItems.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Items in this period */}
            {periodItems.length > 0 ? (
              <div className="px-3 py-2 space-y-1.5">
                {periodItems.map((item) => {
                  const positions = getItemPeriodsAndPositions(item, totalPeriods)
                  const periodPos = positions.find((p) => p.periodIndex === periodIndex)
                  if (!periodPos) return null

                  const itemIsFlat = isFlat(item, items)
                  const hasKids = items.some((i) => i.parent_item_id === item.id && i.item_level < 4)
                  const isExpanded = expandedIds.has(item.id)
                  const childCount = countDescendants(item.id, items)
                  const isSelected = selectedItemId === item.id

                  // Calculate bar position within this period (each period = 4 quadrants)
                  const barLeft = (periodPos.localStart / QUADRANTS_PER_PERIOD) * 100
                  const barWidth = ((periodPos.localEnd - periodPos.localStart + 1) / QUADRANTS_PER_PERIOD) * 100
                  const barHeight = item.item_level === 0 && !itemIsFlat ? 8 : 6
                  const barFill = itemIsFlat ? FLAT_BAR_FILL : (LEVEL_BAR_FILLS[item.item_level] ?? LEVEL_BAR_FILLS[3])

                  // Indent based on hierarchy depth within this period's context
                  const indent = item.parent_item_id ? Math.min(item.item_level * 0.75, 2.25) : 0

                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg transition-colors ${isSelected ? 'bg-indigo-50 ring-1 ring-indigo-200' : ''}`}
                      style={{ paddingLeft: `${indent}rem` }}
                    >
                      {/* Item label row */}
                      <div
                        className="flex items-center gap-1.5 py-1 px-1"
                        onClick={() => handleItemTap(item.id)}
                      >
                        {/* Expand/collapse toggle */}
                        {hasKids ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleExpand(item.id)
                            }}
                            className="w-5 h-5 flex items-center justify-center text-gray-400 active:bg-gray-100 rounded flex-shrink-0 text-[11px]"
                          >
                            {isExpanded ? '▾' : '▸'}
                          </button>
                        ) : (
                          <span className="w-5 flex-shrink-0" />
                        )}

                        {/* Level badge */}
                        {!itemIsFlat && (
                          <span className={`px-1 py-0.5 rounded text-[8px] font-semibold uppercase flex-shrink-0 ${LEVEL_BADGE_STYLES[item.item_level] ?? LEVEL_BADGE_STYLES[0]}`}>
                            {ITEM_LEVEL_LABELS[(item.item_level as ItemLevel)]?.[0] ?? 'I'}
                          </span>
                        )}

                        {/* Title */}
                        <span className={`text-xs truncate min-w-0 ${item.item_level === 0 && !itemIsFlat ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                          {item.title}
                        </span>

                        {/* Child count */}
                        {childCount > 0 && (
                          <span className="text-[9px] text-gray-400 bg-gray-100 px-1 rounded flex-shrink-0">
                            {childCount}
                          </span>
                        )}
                      </div>

                      {/* Mini timeline bar */}
                      <div className="px-1 pb-1.5">
                        <div className={`relative bg-gray-100 rounded-full overflow-hidden`} style={{ height: barHeight }}>
                          <div
                            className={`absolute top-0 bottom-0 rounded-full ${barFill}`}
                            style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                          />
                        </div>
                        {/* Overflow indicators */}
                        {(periodPos.continuesFromPrev || periodPos.continuesToNext) && (
                          <div className="flex justify-between mt-0.5">
                            <span className="text-[9px] text-gray-400">
                              {periodPos.continuesFromPrev ? `← ${periods[periodIndex - 1]?.name ?? 'prev'}` : ''}
                            </span>
                            <span className="text-[9px] text-gray-400">
                              {periodPos.continuesToNext ? `${periods[periodIndex + 1]?.name ?? 'next'} →` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Selected item actions */}
                      {isSelected && (
                        <div className="flex gap-2 px-1 pb-2">
                          <button
                            onClick={() => onItemClick?.(item.id)}
                            className="flex-1 py-2 text-xs font-medium bg-indigo-500 text-white rounded-lg active:bg-indigo-600"
                          >
                            View Details
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-gray-400">No items scheduled</p>
                <p className="text-[10px] text-gray-300 mt-1">Schedule items from the backlog on desktop</p>
              </div>
            )}
          </div>
        )
      })}

      {/* Unscheduled section */}
      {unscheduledGroups.some((g) => g.children.length > 0 || g.parentItem) && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Unscheduled</h3>
            <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
              {unscheduledGroups.reduce((sum, g) => sum + g.children.length, 0)}
            </span>
          </div>
          <div className="space-y-2.5">
            {unscheduledGroups.map((group) => {
              if (group.children.length === 0 && !group.parentItem) return null
              return (
                <div key={group.parentId ?? 'standalone'}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {group.parentId !== null && group.parentLevel !== null && (
                      <span className={`px-1 py-0.5 rounded text-[8px] font-semibold uppercase ${LEVEL_BADGE_STYLES[group.parentLevel] ?? LEVEL_BADGE_STYLES[0]}`}>
                        {ITEM_LEVEL_LABELS[(group.parentLevel as ItemLevel)]?.[0]}
                      </span>
                    )}
                    <span className={`text-xs font-medium ${group.parentId ? 'text-gray-700' : 'text-gray-500'}`}>
                      {group.parentTitle ?? 'Standalone'}
                    </span>
                    {group.parentId && group.totalChildren > 0 && (
                      <span className="text-[10px] text-amber-600">
                        {group.children.length}/{group.totalChildren} unscheduled
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Render unscheduled parent as a tappable chip */}
                    {group.parentItem && (
                      <div
                        key={group.parentItem.id}
                        className="bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-600 flex items-center gap-1.5 min-h-[36px] font-medium"
                        onClick={() => onItemClick?.(group.parentItem!.id)}
                      >
                        <span className={`px-1 py-0.5 rounded text-[8px] font-semibold uppercase ${LEVEL_BADGE_STYLES[group.parentItem.item_level] ?? ''}`}>
                          {ITEM_LEVEL_LABELS[(group.parentItem.item_level as ItemLevel)]?.[0]}
                        </span>
                        <span className="truncate">{group.parentItem.title}</span>
                      </div>
                    )}
                    {group.children.map((child) => (
                      <div
                        key={child.id}
                        className="bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-xs text-gray-600 flex items-center gap-1.5 min-h-[36px]"
                        onClick={() => onItemClick?.(child.id)}
                      >
                        {child.item_level > 0 && (
                          <span className={`px-1 py-0.5 rounded text-[8px] font-semibold uppercase ${LEVEL_BADGE_STYLES[child.item_level] ?? ''}`}>
                            {ITEM_LEVEL_LABELS[(child.item_level as ItemLevel)]?.[0]}
                          </span>
                        )}
                        <span className="truncate">{child.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {periods.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-sm text-gray-500">No periods yet</p>
          <p className="text-xs text-gray-400 mt-1">Add periods on desktop to start building your roadmap</p>
        </div>
      )}

      {items.length === 0 && periods.length > 0 && (
        <div className="text-center py-4 text-xs text-gray-400">
          No items yet. Add items in the Backlog view.
        </div>
      )}
    </div>
  )
}
