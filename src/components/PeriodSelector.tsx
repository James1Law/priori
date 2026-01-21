import { RoadmapPeriod } from '../types/database'
import BottomSheet from './BottomSheet'

interface PeriodSelectorProps {
  isOpen: boolean
  onClose: () => void
  periods: RoadmapPeriod[]
  onSelectPeriod: (periodIndex: number) => void
}

export default function PeriodSelector({
  isOpen,
  onClose,
  periods,
  onSelectPeriod,
}: PeriodSelectorProps) {
  // Sort periods by position
  const sortedPeriods = [...periods].sort((a, b) => a.position - b.position)

  const handleSelectPeriod = (index: number) => {
    onSelectPeriod(index)
    onClose()
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Add Item to Period">
      <p className="text-sm text-slate-500 mb-4">Select a period to add an item to</p>

      {sortedPeriods.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">📅</span>
          </div>
          <p className="text-slate-600 font-medium">No periods yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Create a period first to schedule items
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedPeriods.map((period, index) => (
            <button
              key={period.id}
              onClick={() => handleSelectPeriod(index)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors text-left border border-slate-200"
            >
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-indigo-600 font-semibold text-sm">{index + 1}</span>
              </div>
              <span className="font-medium text-slate-900">{period.name}</span>
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
