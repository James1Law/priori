import { useState, useMemo, useCallback } from 'react'
import type { ItemWithScore, ItemLevel, Session } from '../types/database'
import { ITEM_LEVEL_LABELS } from '../types/database'
import { countDescendants } from '../lib/hierarchy'
import {
  getViewRange,
  getTimelineMonths,
  getTimelineWeeks,
  getRoadmapDateTree,
} from '../lib/roadmap-dates'

// ============================================
// Types
// ============================================

interface RoadmapMobileViewProps {
  items: ItemWithScore[]
  session: Session
  onItemClick: (itemId: string) => void
  onSetZoom: (zoom: string) => Promise<void>
}

// ============================================
// Constants
// ============================================

const ZOOM_PRESETS: { label: string; value: string }[] = [
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
  { label: 'Fit', value: 'fit' },
]

const HINT_STORAGE_KEY = 'priori-roadmap-hint-dismissed'
const ROW_HEIGHT = 44
const LEFT_PANEL_WIDTH = 140
const INDENT_PER_LEVEL = 16

const LEVEL_DOT_COLOURS: Record<number, string> = {
  0: 'bg-pink-500',
  1: 'bg-blue-500',
  2: 'bg-purple-500',
  3: 'bg-green-500',
}

const LEVEL_BAR_STYLES: Record<number, { height: number; classes: string }> = {
  0: { height: 32, classes: 'bg-gradient-to-r from-pink-600 to-pink-500 font-semibold' },
  1: { height: 28, classes: 'bg-gradient-to-r from-blue-600 to-blue-500' },
  2: { height: 24, classes: 'bg-gradient-to-r from-purple-600 to-purple-500' },
  3: { height: 22, classes: 'bg-gradient-to-r from-green-600 to-green-500' },
}

const LEVEL_CHIP_STYLES: Record<number, string> = {
  0: 'bg-white/20 text-white',
  1: 'bg-white/20 text-white',
}
const ZOOM_INNER_WIDTHS: Record<string, number> = {
  '3m': 600,
  '6m': 900,
  '1y': 1400,
  fit: 900,
  custom: 900,
}

// ============================================
// Component
// ============================================

export default function RoadmapMobileView({
  items,
  session,
  onItemClick,
  onSetZoom,
}: RoadmapMobileViewProps) {
  const [hintDismissed, setHintDismissed] = useState(
    () => localStorage.getItem(HINT_STORAGE_KEY) === 'true'
  )

  const handleDismissHint = () => {
    setHintDismissed(true)
    localStorage.setItem(HINT_STORAGE_KEY, 'true')
  }

  // Filter out subtasks (level 4)
  const filteredItems = useMemo(() => items.filter(i => i.item_level < 4), [items])

  // Expand/collapse state — auto-expand parents with scheduled children
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const parents = new Set<string>()
    for (const item of filteredItems) {
      if (item.parent_item_id && item.start_date) {
        parents.add(item.parent_item_id)
      }
    }
    return parents
  })

  const itemHasChildren = useCallback(
    (itemId: string) => filteredItems.some(i => i.parent_item_id === itemId),
    [filteredItems]
  )

  const toggleExpand = useCallback((itemId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }, [])

  // Build display tree
  const displayItems = useMemo(() => getRoadmapDateTree(filteredItems, expandedIds), [filteredItems, expandedIds])

  // View range & timeline headers
  const zoom = session.roadmap_zoom ?? 'fit'
  const viewRange = useMemo(
    () => getViewRange(items, zoom, session.roadmap_start_date ?? undefined, session.roadmap_end_date ?? undefined),
    [items, zoom, session.roadmap_start_date, session.roadmap_end_date]
  )
  const months = useMemo(() => getTimelineMonths(viewRange.start, viewRange.end), [viewRange])
  const weeks = useMemo(() => getTimelineWeeks(viewRange.start, viewRange.end), [viewRange])
  const showWeeks = zoom !== '1y'
  const timelineWidth = ZOOM_INNER_WIDTHS[zoom] ?? 900

  // Today marker
  const today = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])
  const todayInRange = today >= viewRange.start && today <= viewRange.end
  const todayPct = useMemo(() => {
    if (!todayInRange) return 0
    const rangeMs = new Date(viewRange.end).getTime() - new Date(viewRange.start).getTime()
    if (rangeMs <= 0) return 0
    return ((new Date(today).getTime() - new Date(viewRange.start).getTime()) / rangeMs) * 100
  }, [today, todayInRange, viewRange])

  return (
    <div className="flex flex-col h-full">
      {/* Zoom bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
        {ZOOM_PRESETS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onSetZoom(value)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
              session.roadmap_zoom === value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-500 border-gray-300 active:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Scroll hint */}
      {!hintDismissed && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border-b border-indigo-200 text-xs text-indigo-700">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span className="flex-1">Scroll to pan, tap bars to edit dates</span>
          <button
            aria-label="Dismiss hint"
            onClick={handleDismissHint}
            className="p-0.5 text-indigo-400 hover:text-indigo-600"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No items yet</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Add items to see them on the roadmap timeline.
          </p>
        </div>
      )}

      {/* Scrollable Gantt container */}
      {filteredItems.length > 0 && (
      <div
        data-testid="gantt-scroll-container"
        className="flex-1 overflow-x-auto overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onScroll={!hintDismissed ? handleDismissHint : undefined}
      >
        <div style={{ minWidth: LEFT_PANEL_WIDTH + timelineWidth }}>
          {/* Timeline header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200" style={{ marginLeft: LEFT_PANEL_WIDTH }}>
            {/* Month row */}
            <div data-testid="timeline-months" className="flex border-b border-gray-100" style={{ height: 22 }}>
              {months.map((m, i) => (
                <div
                  key={i}
                  data-testid="month-cell"
                  className="text-[10px] font-semibold text-gray-500 text-center border-r border-gray-100 truncate"
                  style={{ width: `${m.widthPercent}%`, paddingTop: 4 }}
                >
                  {m.label}
                </div>
              ))}
            </div>
            {/* Week row */}
            {showWeeks && (
              <div data-testid="timeline-weeks" className="flex" style={{ height: 18 }}>
                {weeks.map((w, i) => (
                  <div
                    key={i}
                    data-testid="week-cell"
                    className="text-[9px] text-gray-400 text-center border-r border-gray-50"
                    style={{ width: `${w.widthPercent}%`, paddingTop: 2 }}
                  >
                    {w.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gantt rows */}
          <div className="relative">
            {/* Today marker */}
            {todayInRange && (
              <div
                data-testid="today-marker"
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-[4] pointer-events-none"
                style={{ left: LEFT_PANEL_WIDTH + (todayPct / 100) * timelineWidth }}
              >
                <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-red-500 bg-white px-1 rounded whitespace-nowrap">
                  Today
                </span>
              </div>
            )}

            {displayItems.map((item) => {
              const indent = item.item_level * INDENT_PER_LEVEL
              const canExpand = itemHasChildren(item.id)
              const isExpanded = expandedIds.has(item.id)
              const childCount = countDescendants(item.id, filteredItems)

              const isScheduled = !!(item.start_date && item.end_date)

              return (
                <div
                  key={item.id}
                  data-testid="gantt-row"
                  className={`flex items-center border-b border-gray-100 ${isScheduled ? '' : 'bg-amber-50'}`}
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Pinned label */}
                  <div
                    className={`sticky left-0 z-[5] flex items-center gap-1 border-r border-gray-200 flex-shrink-0 ${isScheduled ? 'bg-white' : 'bg-amber-50'}`}
                    style={{
                      width: LEFT_PANEL_WIDTH,
                      minWidth: LEFT_PANEL_WIDTH,
                      height: ROW_HEIGHT,
                      paddingLeft: 6 + indent,
                      paddingRight: 4,
                    }}
                    onClick={() => onItemClick(item.id)}
                  >
                    {/* Expand/collapse */}
                    {canExpand ? (
                      <button
                        aria-label="Toggle expand"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpand(item.id)
                        }}
                        className="w-4 h-4 flex items-center justify-center text-gray-400 flex-shrink-0"
                      >
                        <span className="text-[10px]">{isExpanded ? '▾' : '▸'}</span>
                      </button>
                    ) : (
                      <span className="w-4 flex-shrink-0" />
                    )}

                    {/* Level dot */}
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${LEVEL_DOT_COLOURS[item.item_level] ?? LEVEL_DOT_COLOURS[3]}`} />

                    {/* Title */}
                    <span
                      className={`text-[11px] truncate ${
                        item.item_level === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      {item.title}
                    </span>

                    {/* Child count */}
                    {childCount > 0 && (
                      <span className="text-[9px] text-gray-400 flex-shrink-0">{childCount}</span>
                    )}
                  </div>

                  {/* Bar area */}
                  <div
                    className="flex-1 relative"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => onItemClick(item.id)}
                  >
                    {item.start_date && item.end_date ? (() => {
                      const rangeStartMs = new Date(viewRange.start).getTime()
                      const rangeEndMs = new Date(viewRange.end).getTime()
                      const rangeDuration = rangeEndMs - rangeStartMs
                      if (rangeDuration <= 0) return null

                      const barStartMs = new Date(item.start_date).getTime()
                      const barEndMs = new Date(item.end_date).getTime() + 86400000 // +1 day inclusive
                      const leftPct = ((barStartMs - rangeStartMs) / rangeDuration) * 100
                      const widthPct = ((barEndMs - barStartMs) / rangeDuration) * 100

                      const barStyle = LEVEL_BAR_STYLES[item.item_level] ?? LEVEL_BAR_STYLES[3]

                      return (
                        <div
                          data-testid="gantt-bar"
                          className={`absolute rounded-md flex items-center px-1.5 cursor-pointer ${barStyle.classes}`}
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            minWidth: 44,
                            top: (ROW_HEIGHT - barStyle.height) / 2,
                            height: barStyle.height,
                          }}
                        >
                          {/* Level chip */}
                          {item.item_level <= 1 && (
                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0 mr-1 ${LEVEL_CHIP_STYLES[item.item_level] ?? ''}`}>
                              {ITEM_LEVEL_LABELS[item.item_level as ItemLevel]?.[0]}
                            </span>
                          )}
                          <span className="text-white text-[10px] font-medium truncate">
                            {item.title}
                          </span>
                        </div>
                      )
                    })() : (
                      <div className="flex items-center h-full px-2">
                        <span className="text-[10px] text-amber-600 italic">No dates set</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
