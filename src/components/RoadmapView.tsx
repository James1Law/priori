import { useState, useRef, useCallback, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import type { RoadmapPeriod, ItemWithScore, ItemLevel } from '../types/database'
import { ITEM_LEVEL_LABELS } from '../types/database'
import { getDirectChildren, countDescendants } from '../lib/hierarchy'
import {
  getParentSpan,
  canResizeChild,
  canResizeParent,
  getRoadmapTree,
  getUnscheduledGroups,
} from '../lib/roadmap-hierarchy'

// Number of quadrants per period (fixed)
const QUADRANTS_PER_PERIOD = 4

// Max hierarchy level shown on roadmap (exclude subtasks)
const MAX_ROADMAP_LEVEL = 3

interface RoadmapViewProps {
  periods: RoadmapPeriod[]
  items: ItemWithScore[]
  loading: boolean
  onAddPeriod: (name: string) => Promise<RoadmapPeriod | null>
  onUpdatePeriod: (id: string, updates: Partial<Pick<RoadmapPeriod, 'name' | 'width'>>) => Promise<void>
  onDeletePeriod: (id: string) => Promise<void>
  onScheduleItem: (itemId: string, startQuadrant: number, endQuadrant: number) => Promise<void>
  onMoveItem: (itemId: string, startQuadrant: number, endQuadrant: number) => Promise<void>
  onUnscheduleItem: (itemId: string) => Promise<void>
  onItemClick?: (itemId: string) => void
}

// Bar height and styles by hierarchy level — colours match GIES badges
const LEVEL_BAR_STYLES: Record<number, { height: number; classes: string }> = {
  0: { height: 32, classes: 'bg-gradient-to-r from-pink-600 to-pink-500 shadow-md shadow-pink-200/50 font-semibold' },
  1: { height: 26, classes: 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-sm shadow-blue-200/50' },
  2: { height: 22, classes: 'bg-gradient-to-r from-purple-600 to-purple-500 shadow-sm shadow-purple-200/50' },
  3: { height: 18, classes: 'bg-gradient-to-r from-green-600 to-green-500' },
}


// Level badge styles for the label column
const LEVEL_BADGE_STYLES: Record<number, string> = {
  0: 'bg-pink-100 text-pink-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-green-100 text-green-700',
}

// Level badge styles for on-bar display (lighter for dark backgrounds)
const LEVEL_CHIP_STYLES: Record<number, string> = {
  0: 'bg-white/20 text-white',
  1: 'bg-white/20 text-white',
  2: 'bg-white/20 text-white',
  3: 'bg-white/20 text-white',
}

function getBarStyle(item: ItemWithScore) {
  return LEVEL_BAR_STYLES[item.item_level] ?? LEVEL_BAR_STYLES[3]
}

// Indentation per level in the label column (px)
const INDENT_PER_LEVEL = 18

// Draggable item chip for unscheduled panel
function DraggableItemChip({
  item,
  childCount = 0,
  context,
}: {
  item: ItemWithScore
  childCount?: number
  context?: string
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `unscheduled-${item.id}`,
    data: { item },
  })

  const itemLevel = item.item_level ?? 0
  // Show badge if item is part of a hierarchy: has a parent, has children, or level > 0.
  // Level 0 items only show "Goal" badge if they actually have children — otherwise they're flat.
  const showBadge = item.parent_item_id != null || childCount > 0 || itemLevel > 0

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium cursor-grab active:cursor-grabbing transition-all flex items-center gap-1.5 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-sm ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
    >
      {showBadge && (
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${LEVEL_BADGE_STYLES[itemLevel] ?? LEVEL_BADGE_STYLES[0]}`}>
          {ITEM_LEVEL_LABELS[(itemLevel as ItemLevel)] ?? 'Item'}
        </span>
      )}
      <span className="truncate text-gray-700">{item.title}</span>
      {childCount > 0 && (
        <span className="px-1 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-medium">
          {childCount}
        </span>
      )}
      {context && (
        <span className="text-[10px] text-gray-400 ml-0.5">in {context}</span>
      )}
    </div>
  )
}

// Droppable quadrant zone for drag-and-drop
function DroppableQuadrantZone({
  quadrantIndex,
  left,
  width,
  isHighlighted,
}: {
  quadrantIndex: number
  left: string
  width: string
  isHighlighted: boolean
}) {
  const { setNodeRef } = useDroppable({
    id: `quadrant-${quadrantIndex}`,
    data: { quadrantIndex },
  })

  return (
    <div
      ref={setNodeRef}
      className={`absolute top-0 bottom-0 transition-colors ${
        isHighlighted ? 'bg-indigo-200/50' : 'bg-transparent'
      }`}
      style={{ left, width }}
    />
  )
}

interface DragState {
  itemId: string
  mode: 'resize-start' | 'resize-end' | 'move'
  originalStartQuadrant: number
  originalEndQuadrant: number
  startMouseQuadrant?: number
}

export default function RoadmapView({
  periods,
  items,
  loading,
  onAddPeriod,
  onUpdatePeriod,
  onDeletePeriod,
  onScheduleItem,
  onMoveItem,
  onUnscheduleItem,
  onItemClick,
}: RoadmapViewProps) {
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isAddingPeriod, setIsAddingPeriod] = useState(false)
  const [newPeriodName, setNewPeriodName] = useState('')
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [previewQuadrants, setPreviewQuadrants] = useState<{ start: number; end: number } | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const timelineRef = useRef<HTMLDivElement>(null)

  // dnd-kit state
  const [dndDraggingItem, setDndDraggingItem] = useState<ItemWithScore | null>(null)
  const [dndOverQuadrant, setDndOverQuadrant] = useState<number | null>(null)

  const totalQuadrants = periods.length * QUADRANTS_PER_PERIOD

  // Build the display tree respecting expand/collapse
  const displayItems = useMemo(
    () => getRoadmapTree(items, expandedIds),
    [items, expandedIds]
  )

  // Unscheduled groups for the bottom panel
  const unscheduledGroups = useMemo(
    () => getUnscheduledGroups(items),
    [items]
  )

  // Toggle expand/collapse for a parent item
  const toggleExpand = (itemId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const collapseAll = () => setExpandedIds(new Set())
  const expandAll = () => {
    const parentIds = items
      .filter((i) => items.some((c) => c.parent_item_id === i.id) && i.item_level < MAX_ROADMAP_LEVEL)
      .map((i) => i.id)
    setExpandedIds(new Set(parentIds))
  }

  // Period editing handlers
  const handleStartEdit = (period: RoadmapPeriod) => {
    setEditingPeriodId(period.id)
    setEditingName(period.name)
  }

  const handleSaveEdit = async () => {
    if (!editingPeriodId || !editingName.trim()) return
    await onUpdatePeriod(editingPeriodId, { name: editingName.trim() })
    setEditingPeriodId(null)
    setEditingName('')
  }

  const handleCancelEdit = () => {
    setEditingPeriodId(null)
    setEditingName('')
  }

  const handleAddPeriod = async () => {
    if (!newPeriodName.trim()) return
    await onAddPeriod(newPeriodName.trim())
    setNewPeriodName('')
    setIsAddingPeriod(false)
  }

  const handleCancelAdd = () => {
    setNewPeriodName('')
    setIsAddingPeriod(false)
  }

  // dnd-kit handlers
  const handleDndDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current?.item as ItemWithScore | undefined
    if (item) setDndDraggingItem(item)
  }

  const handleDndDragOver = (event: DragOverEvent) => {
    const qi = event.over?.data.current?.quadrantIndex
    setDndOverQuadrant(qi !== undefined ? (qi as number) : null)
  }

  const handleDndDragEnd = async (event: DragEndEvent) => {
    const item = event.active.data.current?.item as ItemWithScore | undefined
    const quadrantIndex = event.over?.data.current?.quadrantIndex as number | undefined

    if (item && quadrantIndex !== undefined) {
      const periodIndex = Math.floor(quadrantIndex / QUADRANTS_PER_PERIOD)
      const startQuadrant = periodIndex * QUADRANTS_PER_PERIOD
      const endQuadrant = startQuadrant + QUADRANTS_PER_PERIOD - 1
      await onScheduleItem(item.id, startQuadrant, endQuadrant)
    }

    setDndDraggingItem(null)
    setDndOverQuadrant(null)
  }

  const handleDndDragCancel = () => {
    setDndDraggingItem(null)
    setDndOverQuadrant(null)
  }

  // Quadrant position calculation
  const getQuadrantAtPosition = useCallback((clientX: number): number | null => {
    if (!timelineRef.current || periods.length === 0) return null
    const rect = timelineRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const totalQuads = periods.length * QUADRANTS_PER_PERIOD
    const quadWidth = rect.width / totalQuads
    const quadrantIndex = Math.floor(x / quadWidth)
    return Math.max(0, Math.min(totalQuads - 1, quadrantIndex))
  }, [periods])

  // Start dragging a bar (resize or move)
  const handleDragStart = (item: ItemWithScore, mode: 'resize-start' | 'resize-end' | 'move', e?: React.MouseEvent) => {
    if (item.roadmap_start_quadrant == null || item.roadmap_end_quadrant == null) return

    const startMouseQuadrant = e ? getQuadrantAtPosition(e.clientX) : undefined

    setDragState({
      itemId: item.id,
      mode,
      originalStartQuadrant: item.roadmap_start_quadrant,
      originalEndQuadrant: item.roadmap_end_quadrant,
      startMouseQuadrant: startMouseQuadrant ?? undefined,
    })
    setPreviewQuadrants({
      start: item.roadmap_start_quadrant,
      end: item.roadmap_end_quadrant,
    })
  }

  // Handle mouse move during drag with hierarchy constraints
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState || !previewQuadrants) return

    const quadrantIndex = getQuadrantAtPosition(e.clientX)
    if (quadrantIndex === null) return

    const maxQuadrant = totalQuadrants - 1
    const dragItem = items.find((i) => i.id === dragState.itemId)
    if (!dragItem) return

    // Helper: find tightest ancestor bounds for a child item
    const getAncestorBounds = (item: ItemWithScore) => {
      let minStart = 0
      let maxEnd = totalQuadrants - 1
      let pid: string | null = item.parent_item_id
      while (pid) {
        const anc = items.find((i) => i.id === pid)
        if (!anc) break
        if (anc.roadmap_start_quadrant != null && anc.roadmap_end_quadrant != null) {
          minStart = Math.max(minStart, anc.roadmap_start_quadrant)
          maxEnd = Math.min(maxEnd, anc.roadmap_end_quadrant)
        }
        pid = anc.parent_item_id
      }
      return { minStart, maxEnd }
    }

    if (dragState.mode === 'resize-start') {
      let newStart = Math.min(quadrantIndex, previewQuadrants.end)
      // Hierarchy constraint: child can't extend past any ancestor
      if (!canResizeChild(dragState.itemId, newStart, previewQuadrants.end, items)) {
        const bounds = getAncestorBounds(dragItem)
        newStart = Math.max(newStart, bounds.minStart)
      }
      setPreviewQuadrants({ start: newStart, end: previewQuadrants.end })
    } else if (dragState.mode === 'resize-end') {
      let newEnd = Math.max(quadrantIndex, previewQuadrants.start)
      // Hierarchy constraint: child can't extend past any ancestor
      if (!canResizeChild(dragState.itemId, previewQuadrants.start, newEnd, items)) {
        const bounds = getAncestorBounds(dragItem)
        newEnd = Math.min(newEnd, bounds.maxEnd)
      }
      // Hierarchy constraint: parent can't shrink past children
      if (!canResizeParent(dragState.itemId, previewQuadrants.start, newEnd, items)) {
        const childSpan = getParentSpan(dragState.itemId, items)
        if (childSpan) newEnd = Math.max(newEnd, childSpan.end)
      }
      setPreviewQuadrants({ start: previewQuadrants.start, end: newEnd })
    } else if (dragState.mode === 'move') {
      const startMouseQuad = dragState.startMouseQuadrant ?? dragState.originalStartQuadrant
      const barLength = dragState.originalEndQuadrant - dragState.originalStartQuadrant
      const offset = quadrantIndex - startMouseQuad

      let newStartQuad = dragState.originalStartQuadrant + offset
      let newEndQuad = dragState.originalEndQuadrant + offset

      // Clamp to valid range
      if (newStartQuad < 0) { newStartQuad = 0; newEndQuad = barLength }
      if (newEndQuad > maxQuadrant) { newEndQuad = maxQuadrant; newStartQuad = newEndQuad - barLength }
      newStartQuad = Math.max(0, newStartQuad)
      newEndQuad = Math.min(maxQuadrant, newEndQuad)

      // Hierarchy constraint: child can't move outside parent
      if (!canResizeChild(dragState.itemId, newStartQuad, newEndQuad, items)) {
        return // Don't update preview — keeps bar at last valid position
      }

      setPreviewQuadrants({ start: newStartQuad, end: newEndQuad })
    }
  }, [dragState, previewQuadrants, getQuadrantAtPosition, totalQuadrants, items])

  // End drag and save — with proportional child moves for parents
  const handleMouseUp = useCallback(async () => {
    if (!dragState || !previewQuadrants) return

    const changed = previewQuadrants.start !== dragState.originalStartQuadrant ||
                    previewQuadrants.end !== dragState.originalEndQuadrant

    if (changed) {
      if (dragState.mode === 'move') {
        // Move handles parent + all descendants atomically in SessionPage
        await onMoveItem(dragState.itemId, previewQuadrants.start, previewQuadrants.end)
      } else {
        // Resize — only update this item, let SessionPage constrain descendants
        await onScheduleItem(dragState.itemId, previewQuadrants.start, previewQuadrants.end)
      }
    }

    setDragState(null)
    setPreviewQuadrants(null)
  }, [dragState, previewQuadrants, onScheduleItem, onMoveItem])

  const handleMouseLeave = useCallback(() => {
    if (dragState) {
      setDragState(null)
      setPreviewQuadrants(null)
    }
  }, [dragState])

  // Calculate bar position as percentage
  const getItemBarStyle = (item: ItemWithScore, usePreview = false) => {
    let startQ = item.roadmap_start_quadrant
    let endQ = item.roadmap_end_quadrant

    if (usePreview && dragState?.itemId === item.id && previewQuadrants) {
      startQ = previewQuadrants.start
      endQ = previewQuadrants.end
    }

    if (startQ == null || endQ == null) return null
    const totalQuads = periods.length * QUADRANTS_PER_PERIOD
    if (totalQuads === 0) return null

    const left = (startQ / totalQuads) * 100
    const width = ((endQ - startQ + 1) / totalQuads) * 100
    return { left: `${left}%`, width: `${width}%` }
  }

  // Check if an item is a parent with children
  const hasChildren = (itemId: string) => items.some((i) => i.parent_item_id === itemId)

  // Whether the item is scheduled
  const isScheduled = (item: ItemWithScore) =>
    item.roadmap_start_quadrant != null && item.roadmap_end_quadrant != null

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-100 rounded mb-4" />
        <div className="h-64 bg-gray-50 rounded" />
      </div>
    )
  }

  const quadrantWidthPercent = totalQuadrants > 0 ? 100 / totalQuadrants : 0
  const allQuadrantIndices = Array.from({ length: totalQuadrants }, (_, i) => i)
  const hasAnyScheduled = items.some(isScheduled)
  const hasUnscheduled = unscheduledGroups.some((g) => g.children.length > 0)

  // Row height varies by level; calculate cumulative top offsets
  const ROW_GAP = 6
  const ROW_PADDING = 8

  const getRowTop = (rowIndex: number) => {
    let top = ROW_PADDING
    for (let i = 0; i < rowIndex; i++) {
      const item = displayItems[i]
      if (!item) continue
      const barStyle = getBarStyle(item)
      top += barStyle.height + ROW_GAP
    }
    return top
  }

  const totalTimelineHeight = (() => {
    let h = ROW_PADDING * 2
    for (const item of displayItems) {
      const barStyle = getBarStyle(item)
      h += barStyle.height + ROW_GAP
    }
    return Math.max(120, h)
  })()

  // Label column width
  const LABEL_COL_WIDTH = 200

  return (
    <DndContext
      onDragStart={handleDndDragStart}
      onDragOver={handleDndDragOver}
      onDragEnd={handleDndDragEnd}
      onDragCancel={handleDndDragCancel}
    >
      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={expandedIds.size > 0 ? collapseAll : expandAll}
              className="text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2 py-1 rounded-md hover:bg-gray-200 font-medium"
            >
              {expandedIds.size > 0 ? '▾ Collapse All' : '▸ Expand All'}
            </button>
            <span className="text-xs text-gray-400">
              {displayItems.length} items across {periods.length} periods
            </span>
          </div>
          <div>
            {isAddingPeriod ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newPeriodName}
                  onChange={(e) => setNewPeriodName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddPeriod()
                    if (e.key === 'Escape') handleCancelAdd()
                  }}
                  placeholder="Period name"
                  className="w-40 px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
                <button onClick={handleAddPeriod} disabled={!newPeriodName.trim()} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium disabled:opacity-50">Add</button>
                <button onClick={handleCancelAdd} className="text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setIsAddingPeriod(true)} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Period
              </button>
            )}
          </div>
        </div>

        {/* Timeline grid */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          {/* Period headers */}
          <div className="flex border-b border-gray-200" style={{ paddingLeft: LABEL_COL_WIDTH }}>
            {periods.map((period) => (
              <div
                key={period.id}
                className="border-l border-gray-200 first:border-l-0 px-3 py-2.5 bg-gray-50/80"
                style={{ width: `${QUADRANTS_PER_PERIOD * quadrantWidthPercent}%` }}
              >
                {editingPeriodId === period.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit()
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      className="flex-1 min-w-0 px-2 py-0.5 text-sm border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      autoFocus
                    />
                    <button onClick={handleSaveEdit} className="text-indigo-600 text-xs font-medium">Save</button>
                    <button onClick={handleCancelEdit} className="text-gray-400 text-xs">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between group min-w-0">
                    <button
                      onClick={() => handleStartEdit(period)}
                      className="font-display font-semibold text-sm text-gray-900 hover:text-indigo-600 transition-colors text-left truncate min-w-0"
                      title={`Click to rename "${period.name}"`}
                    >
                      {period.name}
                    </button>
                    <button
                      onClick={() => onDeletePeriod(period.id)}
                      className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      title="Delete period"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Timeline body: label column + grid area */}
          <div className="flex" style={{ minHeight: totalTimelineHeight }}>
            {/* Label column */}
            <div className="flex-shrink-0 border-r border-gray-200 bg-white" style={{ width: LABEL_COL_WIDTH }}>
              {displayItems.map((item) => {
                const barStyle = getBarStyle(item)
                const indent = (item.parent_item_id ? item.item_level : 0) * INDENT_PER_LEVEL
                const hasKids = hasChildren(item.id)
                const isExpanded = expandedIds.has(item.id)
                const childCountNum = countDescendants(item.id, items)
                const itemScheduled = isScheduled(item)

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-1 overflow-hidden border-b border-gray-50 ${
                      item.item_level === 0 ? 'bg-pink-50/30' : ''
                    } ${!itemScheduled ? 'bg-amber-50/50' : ''}`}
                    style={{
                      height: barStyle.height + ROW_GAP,
                      paddingLeft: indent + 8,
                      paddingRight: 4,
                    }}
                  >
                    {/* Expand/collapse toggle */}
                    {hasKids && item.item_level < MAX_ROADMAP_LEVEL ? (
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded flex-shrink-0 text-[10px]"
                      >
                        {isExpanded ? '▾' : '▸'}
                      </button>
                    ) : (
                      <span className="w-4 flex-shrink-0" />
                    )}

                    {/* Level badge — always shown */}
                    <span className={`px-1 py-0.5 rounded text-[8px] font-semibold uppercase flex-shrink-0 ${LEVEL_BADGE_STYLES[item.item_level] ?? LEVEL_BADGE_STYLES[0]}`}>
                      {ITEM_LEVEL_LABELS[(item.item_level as ItemLevel)]?.[0] ?? 'I'}
                    </span>

                    {/* Title */}
                    <span
                      className={`text-xs truncate min-w-0 ${itemScheduled ? 'text-gray-700' : 'text-amber-700'} ${item.item_level === 0 ? 'font-medium' : ''}`}
                      title={item.title}
                    >
                      {item.title}
                    </span>

                    {/* Child count */}
                    {childCountNum > 0 && (
                      <span className="text-[9px] text-gray-400 bg-gray-100 px-1 rounded flex-shrink-0">
                        {childCountNum}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Timeline grid area */}
            <div
              ref={timelineRef}
              className={`relative flex-1 bg-gray-50/50 ${dragState ? 'cursor-ew-resize' : ''}`}
              onMouseMove={dragState ? handleMouseMove : undefined}
              onMouseUp={dragState ? handleMouseUp : undefined}
              onMouseLeave={dragState ? handleMouseLeave : undefined}
            >
              {/* Quadrant grid lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {allQuadrantIndices.map((qi) => {
                  const isLastInPeriod = (qi + 1) % QUADRANTS_PER_PERIOD === 0
                  const isLast = qi === totalQuadrants - 1
                  return (
                    <div
                      key={qi}
                      className={`h-full ${isLast ? '' : isLastInPeriod ? 'border-r border-gray-200' : 'border-r border-dashed border-gray-100'}`}
                      style={{ width: `${quadrantWidthPercent}%` }}
                    />
                  )
                })}
              </div>

              {/* Drop zones (visible only when dragging from unscheduled) */}
              {dndDraggingItem && (
                <div className="absolute inset-0 z-20 flex">
                  {allQuadrantIndices.map((qi) => {
                    let isHighlighted = false
                    if (dndOverQuadrant !== null) {
                      const pIdx = Math.floor(dndOverQuadrant / QUADRANTS_PER_PERIOD)
                      const pStart = pIdx * QUADRANTS_PER_PERIOD
                      const pEnd = pStart + QUADRANTS_PER_PERIOD - 1
                      isHighlighted = qi >= pStart && qi <= pEnd
                    }
                    return (
                      <DroppableQuadrantZone
                        key={qi}
                        quadrantIndex={qi}
                        left={`${qi * quadrantWidthPercent}%`}
                        width={`${quadrantWidthPercent}%`}
                        isHighlighted={isHighlighted}
                      />
                    )
                  })}
                </div>
              )}

              {/* Item bars */}
              <div className="absolute inset-0 pointer-events-none">
                {displayItems.map((item, rowIndex) => {
                  const style = getItemBarStyle(item, true)
                  if (!style) {
                    // Unscheduled child of expanded parent — show hint row
                    const barDims = getBarStyle(item)
                    const top = getRowTop(rowIndex)
                    return (
                      <div
                        key={item.id}
                        className="absolute flex items-center px-2 pointer-events-auto"
                        style={{ top, height: barDims.height, left: 0, right: 0 }}
                      >
                        <span className="text-[10px] text-amber-500 italic">
                          Not yet scheduled — drag from below or click to place
                        </span>
                      </div>
                    )
                  }

                  const barDims = getBarStyle(item)
                  const isDragging = dragState?.itemId === item.id
                  const top = getRowTop(rowIndex)

                  return (
                    <div
                      key={item.id}
                      className={`absolute rounded-md flex items-center pointer-events-auto group cursor-grab active:cursor-grabbing transition-shadow ${barDims.classes} ${
                        isDragging ? 'ring-2 ring-indigo-300 ring-offset-1 z-10' : 'hover:shadow-md'
                      }`}
                      style={{
                        left: style.left,
                        width: style.width,
                        top,
                        height: barDims.height,
                        borderRadius: item.item_level === 0 ? 8 : 6,
                      }}
                      onMouseDown={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return
                        e.stopPropagation()
                        handleDragStart(item, 'move', e)
                      }}
                      onClick={() => onItemClick?.(item.id)}
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
                      <span className="text-white text-[11px] font-medium truncate flex-1 px-2.5 flex items-center gap-1">
                        {item.item_level <= 1 && (
                          <span className={`px-1 py-0.5 rounded text-[8px] font-semibold flex-shrink-0 ${LEVEL_CHIP_STYLES[item.item_level] ?? ''}`}>
                            {ITEM_LEVEL_LABELS[(item.item_level as ItemLevel)]?.[0]}
                          </span>
                        )}
                        <span className="truncate">{item.title}</span>
                      </span>

                      {/* Unschedule button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onUnscheduleItem(item.id)
                        }}
                        className="mr-0.5 p-0.5 text-white opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity z-10"
                        title="Remove from roadmap"
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
                  )
                })}
              </div>
            </div>
          </div>

          {/* Empty state */}
          {!hasAnyScheduled && !dndDraggingItem && (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm border-t border-gray-100">
              {periods.length === 0
                ? 'Add a period to start scheduling items on the roadmap'
                : 'Drag items from below to schedule them on the timeline'}
            </div>
          )}

          {/* Unscheduled panel */}
          {hasUnscheduled && (
            <div className="border-t-2 border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Unscheduled Items
                </h3>
                <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                  {unscheduledGroups.reduce((sum, g) => sum + g.children.length + (g.parentItem ? 1 : 0), 0)}
                </span>
              </div>
              <div className="space-y-3">
                {unscheduledGroups.map((group) => {
                  if (group.children.length === 0 && !group.parentItem) return null

                  return (
                    <div key={group.parentId ?? 'standalone'}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {group.parentId !== null && group.parentLevel !== null && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${LEVEL_BADGE_STYLES[group.parentLevel] ?? LEVEL_BADGE_STYLES[0]}`}>
                            {ITEM_LEVEL_LABELS[(group.parentLevel as ItemLevel)]?.[0]}
                          </span>
                        )}
                        <span className={`text-xs font-medium ${group.parentId ? 'text-gray-700' : 'text-gray-500'}`}>
                          {group.parentTitle ?? 'Standalone Items'}
                        </span>
                        {group.parentId && group.totalChildren > 0 && (
                          <span className="text-[10px] text-amber-600">
                            — {group.children.length} of {group.totalChildren} unscheduled
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-1">
                        {/* Render the parent itself as a draggable chip if it's unscheduled */}
                        {group.parentItem && (
                          <DraggableItemChip
                            key={group.parentItem.id}
                            item={group.parentItem}
                            childCount={getDirectChildren(group.parentItem.id, items).length}
                          />
                        )}
                        {group.children.map((child) => (
                          <DraggableItemChip
                            key={child.id}
                            item={child}
                            childCount={getDirectChildren(child.id, items).length}
                            context={group.parentId && group.isParentScheduled ? group.parentTitle ?? undefined : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sort info */}
        {hasAnyScheduled && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Items sorted by start position. Drag bars to move or resize. Expand parents to see children.
          </div>
        )}

        {/* No items at all */}
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No items yet. Add items in the Backlog view to schedule them here.
          </div>
        )}

        {/* Drag overlay */}
        <DragOverlay>
          {dndDraggingItem && (
            <div className="bg-indigo-500 text-white rounded-md px-3 py-1.5 text-sm font-medium shadow-lg cursor-grabbing">
              {dndDraggingItem.title}
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  )
}
