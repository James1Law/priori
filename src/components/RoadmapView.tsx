import { useState, useRef, useCallback, useMemo } from 'react'
import type { ItemWithScore, ItemLevel, Session } from '../types/database'
import { ITEM_LEVEL_LABELS } from '../types/database'
import { countDescendants } from '../lib/hierarchy'
import {
  canResizeDateChild,
  canResizeDateParent,
  getParentDateSpan,
  getRoadmapDateTree,
  pixelToDate,
  getViewRange,
  getTimelineMonths,
  getTimelineWeeks,
} from '../lib/roadmap-dates'

// ============================================
// Types
// ============================================

interface RoadmapViewProps {
  items: ItemWithScore[]
  loading: boolean
  session: Session
  onSetItemDates: (itemId: string, startDate: string, endDate: string) => Promise<void>
  onMoveItem: (itemId: string, startDate: string, endDate: string) => Promise<void>
  onClearItemDates: (itemId: string) => Promise<void>
  onSetZoom: (zoom: string, customStart?: string, customEnd?: string) => Promise<void>
  onItemClick?: (itemId: string) => void
}

interface DragState {
  itemId: string
  mode: 'move' | 'resize-start' | 'resize-end'
  originalStart: string
  originalEnd: string
  startMouseX: number
}

// ============================================
// Constants & Style Maps
// ============================================

const ROW_HEIGHT = 40
const LEFT_PANEL_WIDTH = 260
const INDENT_PER_LEVEL = 18
const MIN_CONTAINER_WIDTH = 600

const LEVEL_BAR_STYLES: Record<number, { height: number; classes: string }> = {
  0: { height: 28, classes: 'bg-gradient-to-r from-pink-600 to-pink-500 shadow-md shadow-pink-200/50 font-semibold' },
  1: { height: 24, classes: 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-sm shadow-blue-200/50' },
  2: { height: 20, classes: 'bg-gradient-to-r from-purple-600 to-purple-500 shadow-sm shadow-purple-200/50' },
  3: { height: 18, classes: 'bg-gradient-to-r from-green-600 to-green-500' },
}

const LEVEL_BADGE_STYLES: Record<number, string> = {
  0: 'bg-pink-100 text-pink-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-green-100 text-green-700',
}

const LEVEL_CHIP_STYLES: Record<number, string> = {
  0: 'bg-white/20 text-white',
  1: 'bg-white/20 text-white',
  2: 'bg-white/20 text-white',
  3: 'bg-white/20 text-white',
}

function getBarStyle(item: ItemWithScore) {
  return LEVEL_BAR_STYLES[item.item_level] ?? LEVEL_BAR_STYLES[3]
}

// ============================================
// Component
// ============================================

export default function RoadmapView({
  items,
  loading,
  session,
  onSetItemDates,
  onMoveItem,
  onClearItemDates,
  onSetZoom,
  onItemClick,
}: RoadmapViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Auto-expand all parents that have scheduled children
    const parentsWithChildren = new Set<string>()
    for (const item of items) {
      if (item.parent_item_id && item.start_date) {
        parentsWithChildren.add(item.parent_item_id)
      }
    }
    return parentsWithChildren
  })

  const [dragState, setDragState] = useState<DragState | null>(null)
  const [previewDates, setPreviewDates] = useState<{ start: string; end: string } | null>(null)
  const wasDraggingRef = useRef(false)
  const timelineRef = useRef<HTMLDivElement>(null)

  // View range from session zoom settings
  const zoom = session.roadmap_zoom ?? 'fit'
  const viewRange = useMemo(
    () => getViewRange(items, zoom, session.roadmap_start_date ?? undefined, session.roadmap_end_date ?? undefined),
    [items, zoom, session.roadmap_start_date, session.roadmap_end_date]
  )

  // Timeline headers
  const months = useMemo(() => getTimelineMonths(viewRange.start, viewRange.end), [viewRange])
  const weeks = useMemo(() => getTimelineWeeks(viewRange.start, viewRange.end), [viewRange])
  const showWeeks = zoom !== '1y'

  // Build display tree
  const displayItems = useMemo(() => getRoadmapDateTree(items, expandedIds), [items, expandedIds])
  // Stats
  const scheduledCount = items.filter((i) => i.start_date && i.end_date).length
  const totalCount = items.length

  // Today marker position
  const today = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  // ============================================
  // Expand / Collapse
  // ============================================

  const hasChildren = useCallback(
    (itemId: string) => items.some((i) => i.parent_item_id === itemId && i.item_level < 4),
    [items]
  )

  const toggleExpand = useCallback((itemId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    const allParentIds = items
      .filter((i) => hasChildren(i.id) && i.item_level < 4)
      .map((i) => i.id)
    const allExpanded = allParentIds.every((id) => expandedIds.has(id))
    setExpandedIds(allExpanded ? new Set() : new Set(allParentIds))
  }, [items, expandedIds, hasChildren])

  const allExpanded = useMemo(() => {
    const allParentIds = items.filter((i) => hasChildren(i.id)).map((i) => i.id)
    return allParentIds.length > 0 && allParentIds.every((id) => expandedIds.has(id))
  }, [items, expandedIds, hasChildren])

  // ============================================
  // Drag handlers
  // ============================================

  const handleDragStart = useCallback(
    (item: ItemWithScore, mode: DragState['mode'], e: React.MouseEvent) => {
      if (item.start_date == null || item.end_date == null) return
      wasDraggingRef.current = true
      setDragState({
        itemId: item.id,
        mode,
        originalStart: item.start_date,
        originalEnd: item.end_date,
        startMouseX: e.clientX,
      })
      setPreviewDates({ start: item.start_date, end: item.end_date })
    },
    []
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState || !previewDates || !timelineRef.current) return

      const rect = timelineRef.current.getBoundingClientRect()
      const containerWidth = rect.width

      // Convert mouse position to date
      const currentDate = pixelToDate(e.clientX - rect.left, viewRange.start, viewRange.end, containerWidth)
      const startDate = pixelToDate(dragState.startMouseX - rect.left, viewRange.start, viewRange.end, containerWidth)

      const dragItem = items.find((i) => i.id === dragState.itemId)
      if (!dragItem) return

      if (dragState.mode === 'move') {
        const origStartMs = new Date(dragState.originalStart).getTime()
        const origEndMs = new Date(dragState.originalEnd).getTime()
        const startMs = new Date(startDate).getTime()
        const currentMs = new Date(currentDate).getTime()
        const deltaMs = currentMs - startMs
        const newStartMs = origStartMs + deltaMs
        const newEndMs = origEndMs + deltaMs

        const newStart = formatLocalDate(new Date(newStartMs))
        const newEnd = formatLocalDate(new Date(newEndMs))

        // Hierarchy constraint: child can't move outside parent
        if (!canResizeDateChild(dragState.itemId, newStart, newEnd, items)) {
          return
        }

        setPreviewDates({ start: newStart, end: newEnd })
      } else if (dragState.mode === 'resize-start') {
        let newStart = currentDate
        // Can't go past end date
        if (newStart > previewDates.end) newStart = previewDates.end

        // Hierarchy: child can't extend past ancestor
        if (!canResizeDateChild(dragState.itemId, newStart, dragState.originalEnd, items)) {
          return
        }
        // Hierarchy: parent can't shrink past children
        if (!canResizeDateParent(dragState.itemId, newStart, dragState.originalEnd, items)) {
          const childSpan = getParentDateSpan(dragState.itemId, items)
          if (childSpan) newStart = newStart < childSpan.start ? newStart : childSpan.start
        }

        setPreviewDates({ start: newStart, end: dragState.originalEnd })
      } else if (dragState.mode === 'resize-end') {
        let newEnd = currentDate
        // Can't go before start date
        if (newEnd < previewDates.start) newEnd = previewDates.start

        // Hierarchy: child can't extend past ancestor
        if (!canResizeDateChild(dragState.itemId, dragState.originalStart, newEnd, items)) {
          return
        }
        // Hierarchy: parent can't shrink past children
        if (!canResizeDateParent(dragState.itemId, dragState.originalStart, newEnd, items)) {
          const childSpan = getParentDateSpan(dragState.itemId, items)
          if (childSpan) newEnd = newEnd > childSpan.end ? newEnd : childSpan.end
        }

        setPreviewDates({ start: dragState.originalStart, end: newEnd })
      }
    },
    [dragState, previewDates, items, viewRange]
  )

  const handleMouseUp = useCallback(async () => {
    if (!dragState || !previewDates) return

    const changed =
      previewDates.start !== dragState.originalStart || previewDates.end !== dragState.originalEnd

    if (changed) {
      if (dragState.mode === 'move') {
        await onMoveItem(dragState.itemId, previewDates.start, previewDates.end)
      } else {
        await onSetItemDates(dragState.itemId, previewDates.start, previewDates.end)
      }
    }

    setDragState(null)
    setPreviewDates(null)
    requestAnimationFrame(() => {
      wasDraggingRef.current = false
    })
  }, [dragState, previewDates, onMoveItem, onSetItemDates])

  const handleMouseLeave = useCallback(() => {
    if (dragState) {
      setDragState(null)
      setPreviewDates(null)
      requestAnimationFrame(() => {
        wasDraggingRef.current = false
      })
    }
  }, [dragState])

  // ============================================
  // Zoom controls
  // ============================================

  const handleZoomPreset = useCallback(
    (preset: string) => {
      onSetZoom(preset)
    },
    [onSetZoom]
  )

  const handleCustomDateChange = useCallback(
    (field: 'start' | 'end', value: string) => {
      if (field === 'start') {
        onSetZoom('custom', value, session.roadmap_end_date ?? viewRange.end)
      } else {
        onSetZoom('custom', session.roadmap_start_date ?? viewRange.start, value)
      }
    },
    [onSetZoom, session.roadmap_start_date, session.roadmap_end_date, viewRange]
  )

  // ============================================
  // Render helpers
  // ============================================

  const todayPercent = useMemo(() => {
    const totalDays =
      (new Date(viewRange.end).getTime() - new Date(viewRange.start).getTime()) / (1000 * 60 * 60 * 24)
    if (totalDays <= 0) return -1
    const dayOffset =
      (new Date(today).getTime() - new Date(viewRange.start).getTime()) / (1000 * 60 * 60 * 24)
    const pct = (dayOffset / totalDays) * 100
    if (pct < 0 || pct > 100) return -1
    return pct
  }, [viewRange, today])

  // ============================================
  // Loading state
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        Loading roadmap...
      </div>
    )
  }

  return (
    <div className="select-none">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50/80">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAll}
            className="text-xs text-gray-500 hover:text-indigo-600 font-medium"
          >
            {allExpanded ? '▾ Collapse All' : '▸ Expand All'}
          </button>
          <span className="text-xs text-gray-400">
            {scheduledCount} of {totalCount} items scheduled
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            className="px-2 py-1 text-xs border border-gray-300 rounded-md"
            value={zoom === 'custom' ? (session.roadmap_start_date ?? viewRange.start) : viewRange.start}
            onChange={(e) => handleCustomDateChange('start', e.target.value)}
          />
          <span className="text-xs text-gray-400">→</span>
          <input
            type="date"
            className="px-2 py-1 text-xs border border-gray-300 rounded-md"
            value={zoom === 'custom' ? (session.roadmap_end_date ?? viewRange.end) : viewRange.end}
            onChange={(e) => handleCustomDateChange('end', e.target.value)}
          />

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {(['3m', '6m', '1y', 'fit'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => handleZoomPreset(preset)}
              className={`px-2 py-1 text-xs font-medium rounded-md border transition-colors ${
                zoom === preset
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {preset === 'fit' ? 'Fit' : preset.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Gantt container */}
      <div className="flex" style={{ minHeight: Math.max(displayItems.length * ROW_HEIGHT + 56, 200) }}>
        {/* Left panel: item names */}
        <div
          className="flex-shrink-0 border-r-2 border-gray-200 bg-white overflow-hidden"
          style={{ width: LEFT_PANEL_WIDTH, minWidth: LEFT_PANEL_WIDTH }}
        >
          {/* Header */}
          <div className="h-14 border-b border-gray-200 flex items-center px-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</span>
          </div>

          {/* Rows */}
          {displayItems.map((item) => {
            const indent = item.item_level * INDENT_PER_LEVEL
            const isExpanded = expandedIds.has(item.id)
            const canExpand = hasChildren(item.id)
            const childCount = countDescendants(item.id, items)

            return (
              <div
                key={item.id}
                className="flex items-center border-b border-gray-50 hover:bg-gray-50 cursor-pointer group"
                style={{ height: ROW_HEIGHT, paddingLeft: 8 + indent }}
                onClick={() => {
                  if (!wasDraggingRef.current) onItemClick?.(item.id)
                }}
              >
                {/* Expand/collapse toggle */}
                {canExpand ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpand(item.id)
                    }}
                    className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0 mr-1"
                  >
                    <span className="text-[10px]">{isExpanded ? '▾' : '▸'}</span>
                  </button>
                ) : (
                  <span className="w-4 mr-1 flex-shrink-0" />
                )}

                {/* Level badge */}
                {item.item_level <= 2 && (
                  <span
                    className={`text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0 mr-1.5 ${
                      LEVEL_BADGE_STYLES[item.item_level] ?? ''
                    }`}
                  >
                    {ITEM_LEVEL_LABELS[item.item_level as ItemLevel]?.[0]}
                  </span>
                )}

                {/* Title */}
                <span
                  className={`text-xs truncate ${
                    item.item_level === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'
                  }`}
                >
                  {item.title}
                </span>

                {/* Child count */}
                {childCount > 0 && (
                  <span className="text-[9px] text-gray-400 ml-1 flex-shrink-0">{childCount}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Right panel: timeline */}
        <div
          ref={timelineRef}
          className={`flex-1 overflow-x-auto relative ${dragState ? 'cursor-ew-resize' : ''}`}
          style={{ minWidth: MIN_CONTAINER_WIDTH }}
          onMouseMove={dragState ? handleMouseMove : undefined}
          onMouseUp={dragState ? handleMouseUp : undefined}
          onMouseLeave={dragState ? handleMouseLeave : undefined}
        >
          {/* Timeline header */}
          <div className="h-14 border-b border-gray-200 sticky top-0 bg-white z-10">
            {/* Month row */}
            <div className="flex h-7 border-b border-gray-100">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="text-center text-[10px] font-semibold text-gray-600 flex items-center justify-center border-r border-gray-200 overflow-hidden"
                  style={{ width: `${m.widthPercent}%` }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Week row */}
            {showWeeks && (
              <div className="flex h-7">
                {weeks.map((w, i) => (
                  <div
                    key={i}
                    className="text-center text-[9px] text-gray-400 flex items-center justify-center border-r border-gray-50 overflow-hidden"
                    style={{ width: `${w.widthPercent}%` }}
                  >
                    {w.label}
                  </div>
                ))}
              </div>
            )}
            {!showWeeks && <div className="h-7" />}
          </div>

          {/* Timeline body */}
          <div className="relative">
            {/* Today marker */}
            {todayPercent >= 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                style={{ left: `${todayPercent}%` }}
              >
                <span className="absolute -top-5 left-0 -translate-x-1/2 bg-red-500 text-white text-[8px] font-semibold px-1 py-0.5 rounded whitespace-nowrap">
                  Today
                </span>
              </div>
            )}

            {/* Rows */}
            {displayItems.map((item) => {
              const isScheduled = item.start_date != null && item.end_date != null
              const isDragging = dragState?.itemId === item.id
              const barDims = getBarStyle(item)

              // Use preview dates if this item is being dragged
              const displayStart = isDragging && previewDates ? previewDates.start : item.start_date
              const displayEnd = isDragging && previewDates ? previewDates.end : item.end_date

              return (
                <div
                  key={item.id}
                  className={`relative border-b border-gray-50 ${
                    !isScheduled ? 'bg-amber-50/30' : 'hover:bg-gray-50/50'
                  }`}
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Bar */}
                  {isScheduled && displayStart && displayEnd && (
                    <div
                      className={`absolute rounded-md flex items-center pointer-events-auto group cursor-grab active:cursor-grabbing transition-shadow overflow-hidden ${barDims.classes} ${
                        isDragging ? 'ring-2 ring-indigo-300 ring-offset-1 z-10' : 'hover:shadow-md'
                      }`}
                      style={{
                        left: `${((new Date(displayStart).getTime() - new Date(viewRange.start).getTime()) / (new Date(viewRange.end).getTime() - new Date(viewRange.start).getTime())) * 100}%`,
                        width: `${(((new Date(displayEnd).getTime() - new Date(displayStart).getTime()) / (1000 * 60 * 60 * 24) + 1) / ((new Date(viewRange.end).getTime() - new Date(viewRange.start).getTime()) / (1000 * 60 * 60 * 24))) * 100}%`,
                        top: (ROW_HEIGHT - barDims.height) / 2,
                        height: barDims.height,
                        minWidth: 4,
                        borderRadius: item.item_level === 0 ? 7 : 5,
                      }}
                      onMouseDown={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return
                        e.stopPropagation()
                        handleDragStart(item, 'move', e)
                      }}
                      onClick={() => {
                        if (!wasDraggingRef.current) onItemClick?.(item.id)
                      }}
                    >
                      {/* Left resize handle */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-l-md z-10"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          handleDragStart(item, 'resize-start', e)
                        }}
                      />

                      {/* Bar content */}
                      <span className="text-white text-[10px] font-medium truncate flex-1 px-2 flex items-center gap-1">
                        {item.item_level <= 1 && (
                          <span
                            className={`px-1 py-0.5 rounded text-[7px] font-semibold flex-shrink-0 ${
                              LEVEL_CHIP_STYLES[item.item_level] ?? ''
                            }`}
                          >
                            {ITEM_LEVEL_LABELS[item.item_level as ItemLevel]?.[0]}
                          </span>
                        )}
                        <span className="truncate">{item.title}</span>
                      </span>

                      {/* Unschedule button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onClearItemDates(item.id)
                        }}
                        className="mr-0.5 p-0.5 text-white opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity z-10"
                        title="Remove dates"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      {/* Right resize handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-r-md z-10"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          handleDragStart(item, 'resize-end', e)
                        }}
                      />
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {displayItems.length === 0 && (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm border-t border-gray-100">
          Add items and set dates to see them on the roadmap
        </div>
      )}

    </div>
  )
}

/** Format a Date to YYYY-MM-DD */
function formatLocalDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
