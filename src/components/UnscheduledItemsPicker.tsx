import { ItemWithScore } from '../types/database'
import BottomSheet from './BottomSheet'

// Colour palette matching MobileRoadmapView
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

interface UnscheduledItemsPickerProps {
  isOpen: boolean
  onClose: () => void
  periodName: string
  items: ItemWithScore[]
  onSelectItem: (item: ItemWithScore) => void
}

export default function UnscheduledItemsPicker({
  isOpen,
  onClose,
  periodName,
  items,
  onSelectItem,
}: UnscheduledItemsPickerProps) {
  // Filter to only unscheduled items
  const unscheduledItems = items.filter(
    (item) => item.roadmap_start_quadrant === null || item.roadmap_start_quadrant === undefined
  )

  const handleSelectItem = (item: ItemWithScore) => {
    onSelectItem(item)
    onClose()
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`Add to ${periodName}`}>
      <p className="text-sm text-slate-500 mb-4">Select an item to schedule</p>

      {unscheduledItems.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">✓</span>
          </div>
          <p className="text-slate-600 font-medium">All items scheduled</p>
          <p className="text-sm text-slate-400 mt-1">
            Every item is already on the roadmap
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {unscheduledItems.map((item, index) => {
            const colourClass = ITEM_COLOURS[index % ITEM_COLOURS.length]
            const score = item.score?.calculated_score

            return (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
              >
                {/* Colour indicator */}
                <div className={`w-1 h-8 rounded-full ${colourClass}`} />

                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{item.title}</div>
                  {item.description && (
                    <div className="text-sm text-slate-500 truncate">{item.description}</div>
                  )}
                </div>

                {/* Score badge */}
                {score !== null && score !== undefined && (
                  <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded">
                    {score.toFixed(1)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </BottomSheet>
  )
}
