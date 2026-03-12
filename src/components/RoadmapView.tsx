import { useState, useRef, useCallback } from 'react'
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
import { getDirectChildren } from '../lib/hierarchy'

// Number of quadrants per period (fixed)
const QUADRANTS_PER_PERIOD = 4

interface RoadmapViewProps {
  periods: RoadmapPeriod[]
  items: ItemWithScore[]
  loading: boolean
  onAddPeriod: (name: string) => Promise<RoadmapPeriod | null>
  onUpdatePeriod: (id: string, updates: Partial<Pick<RoadmapPeriod, 'name' | 'width'>>) => Promise<void>
  onDeletePeriod: (id: string) => Promise<void>
  onScheduleItem: (itemId: string, startQuadrant: number, endQuadrant: number) => Promise<void>
  onUnscheduleItem: (itemId: string) => Promise<void>
}

// Get a colour for an item based on its index
const ITEM_COLOURS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-teal-500',
]

function getItemColour(index: number): string {
  return ITEM_COLOURS[index % ITEM_COLOURS.length]
}

// Level badge colours for dark backgrounds (white text variants)
const LEVEL_CHIP_STYLES: Record<number, string> = {
  0: 'bg-pink-400/30 text-pink-100',
  1: 'bg-blue-400/30 text-blue-100',
  2: 'bg-purple-400/30 text-purple-100',
  3: 'bg-amber-400/30 text-amber-100',
  4: 'bg-slate-400/30 text-slate-100',
}

// Draggable item chip for unscheduled/orphaned items
function DraggableItemChip({
  item,
  colour,
  isOrphaned = false,
  childCount = 0,
}: {
  item: ItemWithScore
  colour: string
  isOrphaned?: boolean
  childCount?: number
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `unscheduled-${item.id}`,
    data: { item },
  })

  const itemLevel = item.item_level ?? 0
  const isHierarchyItem = itemLevel > 0 || childCount > 0

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${isOrphaned ? 'bg-gray-400' : colour} text-white rounded-md px-3 py-1.5 text-sm font-medium shadow-sm cursor-grab active:cursor-grabbing transition-all flex items-center gap-1.5 ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow'
      }`}
    >
      {isHierarchyItem && (
        <span className={`px-1 py-0.5 rounded text-[9px] font-semibold ${LEVEL_CHIP_STYLES[itemLevel] ?? LEVEL_CHIP_STYLES[0]}`}>
          {ITEM_LEVEL_LABELS[(itemLevel as ItemLevel)] ?? 'Item'}
        </span>
      )}
      <span className="truncate">{item.title}</span>
      {childCount > 0 && (
        <span className="px-1 py-0.5 bg-white/20 rounded-full text-[9px] font-medium">
          {childCount}
        </span>
      )}
      {item.score?.calculated_score !== undefined && item.score.calculated_score > 0 && (
        <span className="text-white/70">
          ({item.score.calculated_score.toFixed(1)})
        </span>
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
  // For move: track which quadrant the mouse started in
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
  onUnscheduleItem,
}: RoadmapViewProps) {
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isAddingPeriod, setIsAddingPeriod] = useState(false)
  const [newPeriodName, setNewPeriodName] = useState('')
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [previewQuadrants, setPreviewQuadrants] = useState<{ start: number; end: number } | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  // dnd-kit state for dragging unscheduled items into roadmap
  const [dndDraggingItem, setDndDraggingItem] = useState<ItemWithScore | null>(null)
  const [dndOverQuadrant, setDndOverQuadrant] = useState<number | null>(null)

  // Calculate total quadrants based on periods
  const totalQuadrants = periods.length * QUADRANTS_PER_PERIOD

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

  // dnd-kit handlers for dragging unscheduled items into roadmap
  const handleDndDragStart = (event: DragStartEvent) => {
    const { active } = event
    const item = active.data.current?.item as ItemWithScore | undefined
    if (item) {
      setDndDraggingItem(item)
    }
  }

  const handleDndDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (over?.data.current?.quadrantIndex !== undefined) {
      setDndOverQuadrant(over.data.current.quadrantIndex as number)
    } else {
      setDndOverQuadrant(null)
    }
  }

  const handleDndDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    const item = active.data.current?.item as ItemWithScore | undefined
    const quadrantIndex = over?.data.current?.quadrantIndex as number | undefined

    if (item && quadrantIndex !== undefined) {
      // Schedule the item to span the entire period containing this quadrant
      // Calculate which period this quadrant belongs to
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

  // Get quadrant index at a given x position relative to timeline
  const getQuadrantAtPosition = useCallback((clientX: number): number | null => {
    if (!timelineRef.current || periods.length === 0) return null

    const rect = timelineRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const totalWidth = rect.width

    // Each period has 4 quadrants, total quadrants = periods * 4
    const totalQuads = periods.length * QUADRANTS_PER_PERIOD
    const quadWidth = totalWidth / totalQuads

    // Calculate which quadrant we're in
    const quadrantIndex = Math.floor(x / quadWidth)

    // Clamp to valid range
    return Math.max(0, Math.min(totalQuads - 1, quadrantIndex))
  }, [periods])

  // Start dragging a resize handle or the bar itself
  const handleDragStart = (item: ItemWithScore, mode: 'resize-start' | 'resize-end' | 'move', e?: React.MouseEvent) => {
    if (item.roadmap_start_quadrant === null || item.roadmap_start_quadrant === undefined ||
        item.roadmap_end_quadrant === null || item.roadmap_end_quadrant === undefined) return

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

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState || !previewQuadrants) return

    const quadrantIndex = getQuadrantAtPosition(e.clientX)
    if (quadrantIndex === null) return

    const maxQuadrant = totalQuadrants - 1

    if (dragState.mode === 'resize-start') {
      // Can't drag start past end
      if (quadrantIndex <= previewQuadrants.end) {
        setPreviewQuadrants({ start: quadrantIndex, end: previewQuadrants.end })
      }
    } else if (dragState.mode === 'resize-end') {
      // Can't drag end before start
      if (quadrantIndex >= previewQuadrants.start) {
        setPreviewQuadrants({ start: previewQuadrants.start, end: quadrantIndex })
      }
    } else if (dragState.mode === 'move') {
      // Move the entire bar - calculate offset from where we started
      const startMouseQuad = dragState.startMouseQuadrant ?? dragState.originalStartQuadrant
      const barLength = dragState.originalEndQuadrant - dragState.originalStartQuadrant

      // Calculate the offset from where the mouse started
      const offset = quadrantIndex - startMouseQuad

      // Calculate new positions
      let newStartQuad = dragState.originalStartQuadrant + offset
      let newEndQuad = dragState.originalEndQuadrant + offset

      // Clamp to valid range
      if (newStartQuad < 0) {
        newStartQuad = 0
        newEndQuad = barLength
      }
      if (newEndQuad > maxQuadrant) {
        newEndQuad = maxQuadrant
        newStartQuad = newEndQuad - barLength
      }

      // Ensure we stay in bounds
      newStartQuad = Math.max(0, newStartQuad)
      newEndQuad = Math.min(maxQuadrant, newEndQuad)

      setPreviewQuadrants({
        start: newStartQuad,
        end: newEndQuad,
      })
    }
  }, [dragState, previewQuadrants, getQuadrantAtPosition, totalQuadrants])

  // End drag and save
  const handleMouseUp = useCallback(async () => {
    if (!dragState || !previewQuadrants) return

    // Only save if something changed
    if (
      previewQuadrants.start !== dragState.originalStartQuadrant ||
      previewQuadrants.end !== dragState.originalEndQuadrant
    ) {
      await onScheduleItem(dragState.itemId, previewQuadrants.start, previewQuadrants.end)
    }

    setDragState(null)
    setPreviewQuadrants(null)
  }, [dragState, previewQuadrants, onScheduleItem])

  // Cancel drag on mouse leave
  const handleMouseLeave = useCallback(() => {
    if (dragState) {
      setDragState(null)
      setPreviewQuadrants(null)
    }
  }, [dragState])

  // Get unscheduled items (items without quadrant positions), sorted by level then title
  const unscheduledItems = items
    .filter((item) => item.roadmap_start_quadrant === null || item.roadmap_start_quadrant === undefined)
    .sort((a, b) => (a.item_level ?? 0) - (b.item_level ?? 0) || a.title.localeCompare(b.title))

  // Get scheduled items (have valid quadrant positions within current range)
  const scheduledItems = items.filter((item) => {
    if (item.roadmap_start_quadrant === null || item.roadmap_start_quadrant === undefined) return false
    if (item.roadmap_end_quadrant === null || item.roadmap_end_quadrant === undefined) return false
    // Check if quadrants are within valid range for current periods
    const maxQuadrant = totalQuadrants - 1
    return item.roadmap_start_quadrant <= maxQuadrant && item.roadmap_end_quadrant <= maxQuadrant
  })

  // Get orphaned items (have quadrant positions beyond current range - periods were deleted)
  const orphanedItems = items.filter((item) => {
    if (item.roadmap_start_quadrant === null || item.roadmap_start_quadrant === undefined) return false
    if (item.roadmap_end_quadrant === null || item.roadmap_end_quadrant === undefined) return false
    // Check if quadrants are beyond valid range
    const maxQuadrant = totalQuadrants - 1
    return item.roadmap_start_quadrant > maxQuadrant || item.roadmap_end_quadrant > maxQuadrant
  })

  // Sort scheduled items by start quadrant position, each item gets its own row
  const getSortedItems = () => {
    return [...scheduledItems].sort((a, b) => {
      const aStart = a.roadmap_start_quadrant ?? 0
      const bStart = b.roadmap_start_quadrant ?? 0
      return aStart - bStart
    })
  }

  // Calculate the position and width of an item bar based on quadrants
  const getItemBarStyle = (item: ItemWithScore, usePreview = false) => {
    let startQuadrant = item.roadmap_start_quadrant
    let endQuadrant = item.roadmap_end_quadrant

    // Use preview quadrants if this item is being dragged
    if (usePreview && dragState?.itemId === item.id && previewQuadrants) {
      startQuadrant = previewQuadrants.start
      endQuadrant = previewQuadrants.end
    }

    if (startQuadrant === null || startQuadrant === undefined) return null
    if (endQuadrant === null || endQuadrant === undefined) return null

    // Calculate position as percentage of total quadrants
    const totalQuads = periods.length * QUADRANTS_PER_PERIOD
    if (totalQuads === 0) return null

    const left = (startQuadrant / totalQuads) * 100
    const width = ((endQuadrant - startQuadrant + 1) / totalQuads) * 100

    return { left: `${left}%`, width: `${width}%` }
  }

  const sortedItems = getSortedItems()

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-100 rounded mb-4" />
        <div className="h-64 bg-gray-50 rounded" />
      </div>
    )
  }

  // Calculate quadrant width percentage (each quadrant is 1/totalQuadrants of the width)
  const quadrantWidthPercent = totalQuadrants > 0 ? 100 / totalQuadrants : 0

  // Build array of all quadrant indices for drop zones
  const allQuadrantIndices = Array.from({ length: totalQuadrants }, (_, i) => i)

  return (
    <DndContext
      onDragStart={handleDndDragStart}
      onDragOver={handleDndDragOver}
      onDragEnd={handleDndDragEnd}
      onDragCancel={handleDndDragCancel}
    >
    <div className="space-y-4">
      {/* Add Period button - positioned outside the grid for better alignment */}
      <div className="flex justify-end">
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
            <button
              onClick={handleAddPeriod}
              disabled={!newPeriodName.trim()}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={handleCancelAdd}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingPeriod(true)}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Period
          </button>
        )}
      </div>

      {/* Timeline Grid with integrated headers */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Period Headers - each period spans 4 quadrants */}
        <div className="flex border-b border-gray-200 bg-white">
          {periods.map((period) => (
            <div
              key={period.id}
              className="border-r border-gray-200 last:border-r-0 px-3 py-3"
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
                    className="flex-1 min-w-0 px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between group min-w-0">
                  <button
                    onClick={() => handleStartEdit(period)}
                    className="font-display font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-left truncate min-w-0 flex-shrink"
                    title={period.name}
                  >
                    {period.name}
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {/* Delete button */}
                    <button
                      onClick={() => onDeletePeriod(period.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete period"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Timeline area with quadrant grid */}
        <div
          ref={timelineRef}
          className={`relative bg-gray-50 ${dragState ? 'cursor-ew-resize' : ''}`}
          style={{ minHeight: Math.max(120, sortedItems.length * 44 + 20) }}
          onMouseMove={dragState ? handleMouseMove : undefined}
          onMouseUp={dragState ? handleMouseUp : undefined}
          onMouseLeave={dragState ? handleMouseLeave : undefined}
        >
          {/* Quadrant grid lines */}
          <div className="absolute inset-0 flex pointer-events-none">
            {allQuadrantIndices.map((quadIndex) => {
              const isLastInPeriod = (quadIndex + 1) % QUADRANTS_PER_PERIOD === 0
              const isLastQuadrant = quadIndex === totalQuadrants - 1
              return (
                <div
                  key={quadIndex}
                  className={`h-full ${
                    isLastQuadrant
                      ? ''
                      : isLastInPeriod
                        ? 'border-r border-gray-300'
                        : 'border-r border-dashed border-gray-200'
                  }`}
                  style={{ width: `${quadrantWidthPercent}%` }}
                />
              )
            })}
          </div>

          {/* Droppable quadrant overlays for dnd-kit - only visible when dragging */}
          {dndDraggingItem && (
            <div className="absolute inset-0 z-20 flex">
              {allQuadrantIndices.map((quadIndex) => {
                // When hovering over a quadrant, highlight the entire period (4 quadrants)
                // that the item will be placed in
                let isHighlighted = false
                if (dndOverQuadrant !== null) {
                  const hoveredPeriodIndex = Math.floor(dndOverQuadrant / QUADRANTS_PER_PERIOD)
                  const periodStartQuadrant = hoveredPeriodIndex * QUADRANTS_PER_PERIOD
                  const periodEndQuadrant = periodStartQuadrant + QUADRANTS_PER_PERIOD - 1
                  isHighlighted = quadIndex >= periodStartQuadrant && quadIndex <= periodEndQuadrant
                }
                return (
                  <DroppableQuadrantZone
                    key={quadIndex}
                    quadrantIndex={quadIndex}
                    left={`${quadIndex * quadrantWidthPercent}%`}
                    width={`${quadrantWidthPercent}%`}
                    isHighlighted={isHighlighted}
                  />
                )
              })}
            </div>
          )}

          {/* Item bars overlay - one item per row, sorted by start period */}
          <div className="absolute inset-0 pointer-events-none">
            {sortedItems.map((item, rowIndex) => {
              const style = getItemBarStyle(item, true)
              if (!style) return null

              const itemIndex = items.findIndex((i) => i.id === item.id)
              const colour = getItemColour(itemIndex)
              const isDragging = dragState?.itemId === item.id

              return (
                <div
                  key={item.id}
                  className={`absolute h-8 ${colour} rounded-md shadow-sm flex items-center pointer-events-auto group cursor-grab active:cursor-grabbing ${
                    isDragging ? 'ring-2 ring-white ring-opacity-50' : ''
                  }`}
                  style={{ left: style.left, width: style.width, top: rowIndex * 44 + 10 }}
                  onMouseDown={(e) => {
                    // Only start move if clicking the bar itself (not buttons/handles)
                    if ((e.target as HTMLElement).closest('button')) return
                    e.stopPropagation()
                    handleDragStart(item, 'move', e)
                  }}
                >
                  {/* Left resize handle */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-l-md z-10"
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      handleDragStart(item, 'resize-start', e)
                    }}
                    title="Drag to resize"
                  />

                  {/* Item content with level badge */}
                  <span className="text-white text-xs font-medium truncate flex-1 px-3 flex items-center gap-1">
                    {(item.item_level ?? 0) > 0 && (
                      <span className={`px-1 py-0.5 rounded text-[8px] font-semibold flex-shrink-0 ${LEVEL_CHIP_STYLES[item.item_level ?? 0] ?? LEVEL_CHIP_STYLES[0]}`}>
                        {ITEM_LEVEL_LABELS[((item.item_level ?? 0) as ItemLevel)] ?? 'Item'}
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
                    className="mr-1 p-0.5 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
                    title="Drag to resize"
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Empty state for timeline */}
        {scheduledItems.length === 0 && !dndDraggingItem && (
          <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
            {periods.length === 0
              ? 'First add a period, and then you can add items by dragging them onto the roadmap'
              : 'Drag an item from below to add it to the roadmap'}
          </div>
        )}
      </div>

      {/* Info about sorting - only show when items are scheduled */}
      {scheduledItems.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Items are sorted by start position</span>
        </div>
      )}

      {/* Orphaned Items (periods were deleted) */}
      {orphanedItems.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Orphaned Items ({orphanedItems.length})
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            These items were scheduled to periods that no longer exist. Drag to re-schedule.
          </p>
          <div className="flex flex-wrap gap-2">
            {orphanedItems.map((item) => {
              const itemIndex = items.findIndex((i) => i.id === item.id)
              const colour = getItemColour(itemIndex)
              return (
                <DraggableItemChip
                  key={item.id}
                  item={item}
                  colour={colour}
                  isOrphaned
                  childCount={getDirectChildren(item.id, items).length}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Unscheduled Items */}
      {unscheduledItems.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Unscheduled Items ({unscheduledItems.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {unscheduledItems.map((item) => {
              const itemIndex = items.findIndex((i) => i.id === item.id)
              const colour = getItemColour(itemIndex)
              return (
                <DraggableItemChip
                  key={item.id}
                  item={item}
                  colour={colour}
                  childCount={getDirectChildren(item.id, items).length}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No items yet. Add items in the Scoring view to schedule them here.</p>
        </div>
      )}

      {/* Drag overlay - shows the item being dragged */}
      <DragOverlay>
        {dndDraggingItem && (
          <div className={`${getItemColour(items.findIndex(i => i.id === dndDraggingItem.id))} text-white rounded-md px-3 py-1.5 text-sm font-medium shadow-lg cursor-grabbing`}>
            {dndDraggingItem.title}
            {dndDraggingItem.score?.calculated_score !== undefined && dndDraggingItem.score.calculated_score > 0 && (
              <span className="ml-1.5 text-white/70">
                ({dndDraggingItem.score.calculated_score.toFixed(1)})
              </span>
            )}
          </div>
        )}
      </DragOverlay>
    </div>
    </DndContext>
  )
}
