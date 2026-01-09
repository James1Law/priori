import { calculateRiceScore } from '../lib/rice'

interface RiceScoringProps {
  reach: number
  impact: number
  confidence: number
  effort: number
  onChange: (scores: { reach: number; impact: number; confidence: number; effort: number }) => void
  isUpdating?: boolean
}

const IMPACT_OPTIONS = [
  { value: 0.25, label: 'Minimal (0.25x)' },
  { value: 0.5, label: 'Low (0.5x)' },
  { value: 1, label: 'Medium (1x)' },
  { value: 2, label: 'High (2x)' },
  { value: 3, label: 'Massive (3x)' },
]

const CONFIDENCE_OPTIONS = [
  { value: 0.5, label: 'Low (50%)' },
  { value: 0.8, label: 'Medium (80%)' },
  { value: 1, label: 'High (100%)' },
]

export default function RiceScoring({ reach, impact, confidence, effort, onChange, isUpdating }: RiceScoringProps) {
  const score = calculateRiceScore({ reach, impact, confidence, effort })

  const handleChange = (field: string, value: number) => {
    onChange({
      reach,
      impact,
      confidence,
      effort,
      [field]: value,
    })
  }

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-2 gap-3">
        {/* Reach */}
        <div>
          <label htmlFor="reach" className="block text-xs font-medium text-gray-700 mb-1">
            Reach
          </label>
          <input
            id="reach"
            type="number"
            min="0"
            value={reach}
            onChange={(e) => handleChange('reach', Number(e.target.value))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Users/quarter"
          />
        </div>

        {/* Effort */}
        <div>
          <label htmlFor="effort" className="block text-xs font-medium text-gray-700 mb-1">
            Effort
          </label>
          <input
            id="effort"
            type="number"
            min="0"
            step="0.5"
            value={effort}
            onChange={(e) => handleChange('effort', Number(e.target.value))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Person-months"
          />
        </div>

        {/* Impact */}
        <div>
          <label htmlFor="impact" className="block text-xs font-medium text-gray-700 mb-1">
            Impact
          </label>
          <select
            id="impact"
            value={impact}
            onChange={(e) => handleChange('impact', Number(e.target.value))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            {IMPACT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Confidence */}
        <div>
          <label htmlFor="confidence" className="block text-xs font-medium text-gray-700 mb-1">
            Confidence
          </label>
          <select
            id="confidence"
            value={confidence}
            onChange={(e) => handleChange('confidence', Number(e.target.value))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            {CONFIDENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Score Display */}
      <div className="pt-2 border-t border-gray-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">Score:</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-indigo-600">{score}</span>
            {isUpdating && (
              <span className="text-xs text-amber-600 font-medium animate-pulse">
                Updating...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
