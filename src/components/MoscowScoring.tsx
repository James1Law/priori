import { MoscowCategory, MOSCOW_LABELS, MOSCOW_COLOURS, MOSCOW_ORDER } from '../lib/moscow'

interface MoscowScoringProps {
  category: string
  onChange: (scores: { category: string }) => void
  isUpdating?: boolean
}

export default function MoscowScoring({ category, onChange, isUpdating }: MoscowScoringProps) {
  const currentCategory = (category as MoscowCategory) || MoscowCategory.Must

  return (
    <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <label htmlFor="category" className="block text-xs font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            value={currentCategory}
            onChange={(e) => onChange({ category: e.target.value })}
            className={`w-full px-3 py-2.5 sm:py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${MOSCOW_COLOURS[currentCategory]}`}
          >
            {MOSCOW_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {MOSCOW_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {isUpdating && (
          <span className="text-xs text-amber-600 font-medium animate-pulse mt-5">
            Updating...
          </span>
        )}
      </div>
    </div>
  )
}
