import { useState, useRef, useCallback, createContext, useContext } from 'react'
import { RoadmapPeriod, ItemWithScore, ItemLevel } from '../types/database'
import { ITEM_LEVEL_LABELS } from '../types/database'
import UnscheduledItemsPicker from './UnscheduledItemsPicker'
import PeriodSelector from './PeriodSelector'
import PeriodEditModal from './PeriodEditModal'

const QUADRANTS_PER_PERIOD = 4

// Colour palette matching desktop RoadmapView
const ITEM_COLOURS = [
  'from-indigo-500 to-indigo-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
  'from-purple-500 to-purple-600',
  'from-orange-500 to-orange-600',
  'from-teal-500 to-teal-600',
]

// Context to share period refs for cross-period resize calculations
interface PeriodRefsContextType {
  registerPeriodRef: (periodIndex: number, ref: HTMLDivElement | null) => void
  getQuadrantFromPosition: (clientX: number, clientY: number) => number
  totalPeriods: number
}

const PeriodRefsContext = createContext<PeriodRefsContextType | null>(null)

interface MobileRoadmapViewProps {
  periods: RoadmapPeriod[]
  items: ItemWithScore[]
  loading: boolean
  onScheduleItem?: (itemId: string, startQuadrant: number, endQuadrant: number) => Promise<void>
  onAddPeriod?: (name: string) => Promise<RoadmapPeriod | null>
  onUpdatePeriod?: (id: string, updates: Partial<Pick<RoadmapPeriod, 'name'>>) => Promise<void>
  onDeletePeriod?: (id: string) => Promise<void>
}

// Calculate which periods an item spans and its position within each
function getItemPeriodsAndPositions(
  item: ItemWithScore,
  periods: RoadmapPeriod[]
): Array<{
  periodId: string
  periodIndex: number
  localStartQuadrant: number // 0-3 within this period
  localEndQuadrant: number // 0-3 within this period
  continuesFromPrevious: boolean
  continuesToNext: boolean
}> {
  if (item.roadmap_start_quadrant === null || item.roadmap_end_quadrant === null) {
    return []
  }

  const result: Array<{
    periodId: string
    periodIndex: number
    localStartQuadrant: number
    localEndQuadrant: number
    continuesFromPrevious: boolean
    continuesToNext: boolean
  }> = []

  const startPeriodIndex = Math.floor(item.roadmap_start_quadrant / QUADRANTS_PER_PERIOD)
  const endPeriodIndex = Math.floor(item.roadmap_end_quadrant / QUADRANTS_PER_PERIOD)

  for (let periodIndex = startPeriodIndex; periodIndex <= endPeriodIndex; periodIndex++) {
    if (periodIndex < 0 || periodIndex >= periods.length) continue

    const period = periods[periodIndex]
    const periodStartQuadrant = periodIndex * QUADRANTS_PER_PERIOD

    // Calculate local quadrant positions within this period (0-3)
    const localStart = Math.max(0, item.roadmap_start_quadrant - periodStartQuadrant)
    const localEnd = Math.min(3, item.roadmap_end_quadrant - periodStartQuadrant)

    result.push({
      periodId: period.id,
      periodIndex,
      localStartQuadrant: localStart,
      localEndQuadrant: localEnd,
      continuesFromPrevious: periodIndex > startPeriodIndex,
      continuesToNext: periodIndex < endPeriodIndex,
    })
  }

  return result
}

// Get items for a specific period
function getItemsInPeriod(
  items: ItemWithScore[],
  periodIndex: number,
  periods: RoadmapPeriod[]
): Array<{
  item: ItemWithScore
  itemIndex: number
  localStartQuadrant: number
  localEndQuadrant: number
  continuesFromPrevious: boolean
  continuesToNext: boolean
}> {
  const result: Array<{
    item: ItemWithScore
    itemIndex: number
    localStartQuadrant: number
    localEndQuadrant: number
    continuesFromPrevious: boolean
    continuesToNext: boolean
  }> = []

  items.forEach((item, itemIndex) => {
    const positions = getItemPeriodsAndPositions(item, periods)
    const positionInThisPeriod = positions.find((p) => p.periodIndex === periodIndex)
    if (positionInThisPeriod) {
      result.push({
        item,
        itemIndex,
        localStartQuadrant: positionInThisPeriod.localStartQuadrant,
        localEndQuadrant: positionInThisPeriod.localEndQuadrant,
        continuesFromPrevious: positionInThisPeriod.continuesFromPrevious,
        continuesToNext: positionInThisPeriod.continuesToNext,
      })
    }
  })

  // Sort by local start position
  result.sort((a, b) => a.localStartQuadrant - b.localStartQuadrant)

  return result
}

// Calculate bar width and offset as percentages
function getBarStyle(localStart: number, localEnd: number): { width: string; marginLeft: string } {
  // Each quadrant is 25% of the period width
  const widthPercent = ((localEnd - localStart + 1) / QUADRANTS_PER_PERIOD) * 100
  const marginPercent = (localStart / QUADRANTS_PER_PERIOD) * 100

  return {
    width: `${widthPercent}%`,
    marginLeft: `${marginPercent}%`,
  }
}

interface ItemBarProps {
  item: ItemWithScore
  itemIndex: number
  localStartQuadrant: number
  localEndQuadrant: number
  continuesFromPrevious: boolean
  continuesToNext: boolean
  isSelected: boolean
  onSelect: () => void
  onResize: (newStart: number, newEnd: number) => void
}

function ItemBar({
  item,
  itemIndex,
  localStartQuadrant,
  localEndQuadrant,
  continuesFromPrevious,
  continuesToNext,
  isSelected,
  onSelect,
  onResize,
}: ItemBarProps) {
  const colourClass = ITEM_COLOURS[itemIndex % ITEM_COLOURS.length]
  const style = getBarStyle(localStartQuadrant, localEndQuadrant)
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null)
  const periodRefsContext = useContext(PeriodRefsContext)

  // Truncate title for display
  const maxLength = localEndQuadrant - localStartQuadrant >= 2 ? 20 : 12
  const displayTitle =
    item.title.length > maxLength ? item.title.substring(0, maxLength - 1) + '…' : item.title

  // Handle resize touch/drag
  const handleResizeStart = (side: 'left' | 'right') => (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation()
    if (!periodRefsContext) return

    setIsDragging(side)

    const originalStart = item.roadmap_start_quadrant!
    const originalEnd = item.roadmap_end_quadrant!
    const totalQuadrants = periodRefsContext.totalPeriods * QUADRANTS_PER_PERIOD

    const handleMove = (moveEvent: TouchEvent | MouseEvent) => {
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY
      const quadrant = periodRefsContext.getQuadrantFromPosition(clientX, clientY)

      if (side === 'left') {
        // Left handle adjusts start, can't go past end (minimum 1 quadrant)
        const newStart = Math.max(0, Math.min(originalEnd, quadrant))
        if (newStart !== originalStart) {
          onResize(newStart, originalEnd)
        }
      } else {
        // Right handle adjusts end, can't go before start (minimum 1 quadrant)
        const newEnd = Math.max(originalStart, Math.min(totalQuadrants - 1, quadrant))
        if (newEnd !== originalEnd) {
          onResize(originalStart, newEnd)
        }
      }
    }

    const handleEnd = () => {
      setIsDragging(null)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
    }

    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
  }

  return (
    <div
      className={`h-7 rounded-md bg-gradient-to-r ${colourClass} flex items-center text-xs font-medium text-white shadow-sm mb-1 last:mb-0 relative transition-all duration-150 motion-reduce:transition-none ${
        isSelected ? 'ring-2 ring-indigo-600 ring-offset-1 scale-[1.02]' : ''
      } ${isDragging ? 'z-10 opacity-90' : ''}`}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${item.title}${item.description ? `, ${item.description}` : ''}, spans quadrants ${localStartQuadrant + 1} to ${localEndQuadrant + 1}, tap to select and resize`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      {/* Left resize handle - only show when selected and not continuing from previous */}
      {isSelected && !continuesFromPrevious && (
        <div
          className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-5 bg-white rounded shadow-md flex items-center justify-center cursor-ew-resize touch-none animate-fade-in"
          onTouchStart={handleResizeStart('left')}
          onMouseDown={handleResizeStart('left')}
          role="slider"
          aria-label={`Resize ${item.title} start position`}
          aria-valuemin={0}
          aria-valuemax={localEndQuadrant}
          aria-valuenow={localStartQuadrant}
          tabIndex={0}
        >
          <div className="flex flex-col gap-0.5">
            <div className="w-0.5 h-2 bg-slate-400 rounded-full" />
          </div>
        </div>
      )}

      {continuesFromPrevious && <span className="ml-2 mr-1 opacity-70" aria-hidden="true">←</span>}
      <span className={`truncate flex-1 min-w-0 flex items-center gap-1 ${isSelected ? 'px-3' : 'px-2'}`}>
        {(item.item_level ?? 0) > 0 && (
          <span className="px-1 py-0.5 rounded text-[8px] font-semibold bg-white/20 flex-shrink-0">
            {ITEM_LEVEL_LABELS[((item.item_level ?? 0) as ItemLevel)] ?? 'Item'}
          </span>
        )}
        <span className="truncate">{displayTitle}</span>
      </span>
      {continuesToNext && <span className="ml-1 mr-2 opacity-70" aria-hidden="true">→</span>}

      {/* Right resize handle - only show when selected and not continuing to next */}
      {isSelected && !continuesToNext && (
        <div
          className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-5 bg-white rounded shadow-md flex items-center justify-center cursor-ew-resize touch-none animate-fade-in"
          onTouchStart={handleResizeStart('right')}
          onMouseDown={handleResizeStart('right')}
          role="slider"
          aria-label={`Resize ${item.title} end position`}
          aria-valuemin={localStartQuadrant}
          aria-valuemax={3}
          aria-valuenow={localEndQuadrant}
          tabIndex={0}
        >
          <div className="flex flex-col gap-0.5">
            <div className="w-0.5 h-2 bg-slate-400 rounded-full" />
          </div>
        </div>
      )}
    </div>
  )
}

interface PeriodCardProps {
  period: RoadmapPeriod
  periodIndex: number
  items: ItemWithScore[]
  periods: RoadmapPeriod[]
  selectedItemId: string | null
  onSelectItem: (itemId: string | null) => void
  onResizeItem: (itemId: string, newStart: number, newEnd: number) => void
  onAddItem: () => void
  onEditPeriod: () => void
}

function PeriodCard({
  period,
  periodIndex,
  items,
  periods,
  selectedItemId,
  onSelectItem,
  onResizeItem,
  onAddItem,
  onEditPeriod,
}: PeriodCardProps) {
  const itemsInPeriod = getItemsInPeriod(items, periodIndex, periods)
  const periodRefsContext = useContext(PeriodRefsContext)
  const contentRef = useRef<HTMLDivElement>(null)

  // Register this period's content ref
  const setContentRef = useCallback(
    (ref: HTMLDivElement | null) => {
      if (periodRefsContext) {
        periodRefsContext.registerPeriodRef(periodIndex, ref)
      }
      ;(contentRef as React.MutableRefObject<HTMLDivElement | null>).current = ref
    },
    [periodIndex, periodRefsContext]
  )

  return (
    <article
      className="bg-white rounded-xl shadow-sm overflow-hidden"
      aria-label={`${period.name} period with ${itemsInPeriod.length} item${itemsInPeriod.length === 1 ? '' : 's'}`}
    >
      {/* Period Header - tappable to edit */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onEditPeriod()
        }}
        className="w-full bg-slate-100 px-3 py-2 flex items-center justify-between hover:bg-slate-200 active:bg-slate-200 transition-colors motion-reduce:transition-none"
        aria-label={`Edit ${period.name} period`}
      >
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {period.name}
        </span>
        <span className="text-slate-400 text-xs" aria-hidden="true">✎</span>
      </button>

      {/* Period Content with quadrant grid lines */}
      <div
        ref={setContentRef}
        className="p-2 min-h-[48px]"
        style={{
          background: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent calc(25% - 0.5px),
            #e2e8f0 calc(25% - 0.5px),
            #e2e8f0 calc(25% + 0.5px)
          )`,
        }}
        onClick={() => onSelectItem(null)}
        role="region"
        aria-label={`Items in ${period.name}`}
      >
        {itemsInPeriod.length > 0 ? (
          itemsInPeriod.map(
            ({
              item,
              itemIndex,
              localStartQuadrant,
              localEndQuadrant,
              continuesFromPrevious,
              continuesToNext,
            }) => (
              <ItemBar
                key={`${item.id}-${periodIndex}`}
                item={item}
                itemIndex={itemIndex}
                localStartQuadrant={localStartQuadrant}
                localEndQuadrant={localEndQuadrant}
                continuesFromPrevious={continuesFromPrevious}
                continuesToNext={continuesToNext}
                isSelected={item.id === selectedItemId}
                onSelect={() => onSelectItem(item.id)}
                onResize={(newStart, newEnd) => onResizeItem(item.id, newStart, newEnd)}
              />
            )
          )
        ) : (
          <div className="flex flex-col items-center py-2">
            <span className="text-xs text-slate-400 mb-2">No items scheduled</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddItem()
              }}
              className="text-xs text-slate-500 px-3 py-1.5 border border-dashed border-slate-300 rounded-md hover:bg-slate-50 active:bg-slate-100 transition-colors motion-reduce:transition-none"
              aria-label={`Add item to ${period.name}`}
            >
              + Add Item
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

export default function MobileRoadmapView({
  periods,
  items,
  loading,
  onScheduleItem,
  onAddPeriod,
  onUpdatePeriod,
  onDeletePeriod,
}: MobileRoadmapViewProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [pickerPeriodIndex, setPickerPeriodIndex] = useState<number | null>(null)
  // State for unscheduled items -> period selection flow
  const [selectedUnscheduledItem, setSelectedUnscheduledItem] = useState<ItemWithScore | null>(null)
  // State for period editing
  const [editingPeriod, setEditingPeriod] = useState<RoadmapPeriod | null>(null)
  const periodRefsMap = useRef<Map<number, HTMLDivElement>>(new Map())

  // Sort periods by position
  const sortedPeriods = [...periods].sort((a, b) => a.position - b.position)

  // Register period content refs
  const registerPeriodRef = useCallback((periodIndex: number, ref: HTMLDivElement | null) => {
    if (ref) {
      periodRefsMap.current.set(periodIndex, ref)
    } else {
      periodRefsMap.current.delete(periodIndex)
    }
  }, [])

  // Calculate quadrant from screen position across all periods
  const getQuadrantFromPosition = useCallback(
    (clientX: number, clientY: number): number => {
      const totalPeriods = sortedPeriods.length
      if (totalPeriods === 0) return 0

      // Get the first period's rect to use as reference for X calculation
      // (all periods have the same width)
      const firstPeriodRef = periodRefsMap.current.get(0)
      if (!firstPeriodRef) return 0
      const firstRect = firstPeriodRef.getBoundingClientRect()

      // Calculate X percentage using the first period as reference
      const relativeX = Math.max(0, Math.min(firstRect.width, clientX - firstRect.left))
      const percentX = relativeX / firstRect.width
      const localQuadrant = Math.min(3, Math.floor(percentX * QUADRANTS_PER_PERIOD))

      // Find which period based on Y position
      let targetPeriodIndex = 0

      for (let i = 0; i < totalPeriods; i++) {
        const periodRef = periodRefsMap.current.get(i)
        if (!periodRef) continue

        const rect = periodRef.getBoundingClientRect()

        // Check if Y is within or above this period
        if (clientY < rect.bottom) {
          targetPeriodIndex = i
          break
        }

        // Below this period - continue to next, or use this if it's the last
        targetPeriodIndex = i
      }

      return targetPeriodIndex * QUADRANTS_PER_PERIOD + localQuadrant
    },
    [sortedPeriods.length]
  )

  // Handle resize with database persist
  const handleResizeItem = useCallback(
    async (itemId: string, newStart: number, newEnd: number) => {
      if (onScheduleItem) {
        await onScheduleItem(itemId, newStart, newEnd)
      }
    },
    [onScheduleItem]
  )

  // Handle adding item from picker (for empty period "+ Add Item" button)
  const handleAddItemToPeriod = useCallback(
    async (item: ItemWithScore) => {
      if (pickerPeriodIndex === null || !onScheduleItem) return

      const startQuadrant = pickerPeriodIndex * QUADRANTS_PER_PERIOD
      const endQuadrant = startQuadrant + QUADRANTS_PER_PERIOD - 1

      await onScheduleItem(item.id, startQuadrant, endQuadrant)
    },
    [pickerPeriodIndex, onScheduleItem]
  )

  // Handle scheduling unscheduled item to selected period
  const handleScheduleUnscheduledItem = useCallback(
    async (periodIndex: number) => {
      if (!selectedUnscheduledItem || !onScheduleItem) return

      const startQuadrant = periodIndex * QUADRANTS_PER_PERIOD
      const endQuadrant = startQuadrant + QUADRANTS_PER_PERIOD - 1

      await onScheduleItem(selectedUnscheduledItem.id, startQuadrant, endQuadrant)
      setSelectedUnscheduledItem(null)
    },
    [selectedUnscheduledItem, onScheduleItem]
  )

  // Get unscheduled items, sorted by level then title
  const unscheduledItems = items
    .filter((item) => item.roadmap_start_quadrant === null || item.roadmap_end_quadrant === null)
    .sort((a, b) => (a.item_level ?? 0) - (b.item_level ?? 0) || a.title.localeCompare(b.title))

  // Get count of items in a period
  const getItemCountInPeriod = useCallback(
    (periodIndex: number): number => {
      return getItemsInPeriod(items, periodIndex, sortedPeriods).length
    },
    [items, sortedPeriods]
  )

  // Handle saving period name
  const handleSavePeriod = useCallback(
    async (name: string) => {
      if (!editingPeriod || !onUpdatePeriod) return
      await onUpdatePeriod(editingPeriod.id, { name })
    },
    [editingPeriod, onUpdatePeriod]
  )

  // Handle deleting period
  const handleDeletePeriod = useCallback(async () => {
    if (!editingPeriod || !onDeletePeriod) return
    await onDeletePeriod(editingPeriod.id)
  }, [editingPeriod, onDeletePeriod])

  // Handle adding new period
  const handleAddPeriod = useCallback(async () => {
    if (!onAddPeriod) return
    const periodNumber = sortedPeriods.length + 1
    await onAddPeriod(`Period ${periodNumber}`)
  }, [onAddPeriod, sortedPeriods.length])

  // Context value for period refs
  const periodRefsContextValue: PeriodRefsContextType = {
    registerPeriodRef,
    getQuadrantFromPosition,
    totalPeriods: sortedPeriods.length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (sortedPeriods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-4 text-center" role="region" aria-label="Empty roadmap">
        <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mb-4" aria-hidden="true">
          <span className="text-3xl">📅</span>
        </div>
        <h3 className="font-semibold text-slate-900 mb-2">No periods yet</h3>
        <p className="text-sm text-slate-500 mb-4">
          Create your first time period to start planning your roadmap.
        </p>
        <button
          onClick={handleAddPeriod}
          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors motion-reduce:transition-none"
          aria-label="Add first period to roadmap"
        >
          + Add Period
        </button>
      </div>
    )
  }

  return (
    <PeriodRefsContext.Provider value={periodRefsContextValue}>
      <main className="flex flex-col gap-3 p-4 pb-32" onClick={() => setSelectedItemId(null)} aria-label="Roadmap timeline">
        {sortedPeriods.map((period, index) => (
          <PeriodCard
            key={period.id}
            period={period}
            periodIndex={index}
            items={items}
            periods={sortedPeriods}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onResizeItem={handleResizeItem}
            onAddItem={() => setPickerPeriodIndex(index)}
            onEditPeriod={() => setEditingPeriod(period)}
          />
        ))}

        {/* Add Period Button */}
        <button
          className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-sm font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors motion-reduce:transition-none"
          onClick={(e) => {
            e.stopPropagation()
            handleAddPeriod()
          }}
          aria-label="Add new period to roadmap"
        >
          + Add Period
        </button>

        {/* Unscheduled Items Section */}
        {unscheduledItems.length > 0 && (
          <section className="mt-4" onClick={(e) => e.stopPropagation()} aria-label="Unscheduled items">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2 px-1">
              Unscheduled Items ({unscheduledItems.length})
            </h3>
            <div className="space-y-2" role="list">
              {unscheduledItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedUnscheduledItem(item)}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-slate-200 hover:border-indigo-300 active:bg-slate-50 transition-colors motion-reduce:transition-none text-left"
                  role="listitem"
                  aria-label={`${item.title}${item.description ? `, ${item.description}` : ''}${item.score?.calculated_score ? `, score ${item.score.calculated_score.toFixed(1)}` : ''}, tap to schedule`}
                >
                  <div
                    className={`w-2 h-8 rounded-full bg-gradient-to-b ${ITEM_COLOURS[index % ITEM_COLOURS.length]}`}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {(item.item_level ?? 0) > 0 && (
                        <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 flex-shrink-0">
                          {ITEM_LEVEL_LABELS[((item.item_level ?? 0) as ItemLevel)] ?? 'Item'}
                        </span>
                      )}
                      <p className="font-medium text-slate-900 truncate">{item.title}</p>
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-500 truncate">{item.description}</p>
                    )}
                  </div>
                  {item.score?.calculated_score !== undefined && item.score.calculated_score > 0 && (
                    <span className="flex-shrink-0 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full" aria-hidden="true">
                      {item.score.calculated_score.toFixed(1)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Hint text when item is selected */}
        {selectedItemId && (
          <div
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-xs shadow-lg z-20 animate-fade-in"
            role="status"
            aria-live="polite"
          >
            Drag handles to resize
          </div>
        )}
      </main>

      {/* Unscheduled items picker (for empty period "+ Add Item" button) */}
      <UnscheduledItemsPicker
        isOpen={pickerPeriodIndex !== null}
        onClose={() => setPickerPeriodIndex(null)}
        periodName={pickerPeriodIndex !== null ? sortedPeriods[pickerPeriodIndex]?.name ?? '' : ''}
        items={items}
        onSelectItem={handleAddItemToPeriod}
      />

      {/* Period selector (for tapping unscheduled items) */}
      <PeriodSelector
        isOpen={selectedUnscheduledItem !== null}
        onClose={() => setSelectedUnscheduledItem(null)}
        periods={sortedPeriods}
        onSelectPeriod={handleScheduleUnscheduledItem}
      />

      {/* Period edit modal */}
      {editingPeriod && (
        <PeriodEditModal
          period={editingPeriod}
          itemCount={getItemCountInPeriod(
            sortedPeriods.findIndex((p) => p.id === editingPeriod.id)
          )}
          onSave={handleSavePeriod}
          onDelete={handleDeletePeriod}
          onClose={() => setEditingPeriod(null)}
        />
      )}
    </PeriodRefsContext.Provider>
  )
}
