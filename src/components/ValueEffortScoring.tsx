import { getQuadrant } from '../lib/valueEffort'

interface ValueEffortScoringProps {
  value: number
  effort: number
  onChange: (scores: { value: number; effort: number }) => void
  isUpdating?: boolean
}

export default function ValueEffortScoring({ value, effort, onChange, isUpdating }: ValueEffortScoringProps) {
  const quadrant = getQuadrant({ value, effort })

  const handleChange = (field: string, newValue: number) => {
    onChange({
      value,
      effort,
      [field]: newValue,
    })
  }

  // Colour coding for quadrants
  const getQuadrantColour = () => {
    switch (quadrant) {
      case 'Quick Wins':
        return 'text-green-600 bg-green-50'
      case 'Big Bets':
        return 'text-blue-600 bg-blue-50'
      case 'Fill-ins':
        return 'text-amber-600 bg-amber-50'
      case 'Avoid':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
      <div className="space-y-4">
        {/* Value */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="value" className="block text-xs font-medium text-gray-700">
              Value
            </label>
            <span className="text-xs font-semibold text-indigo-600">{value}</span>
          </div>
          <input
            id="value"
            type="range"
            min="1"
            max="10"
            value={value}
            onChange={(e) => handleChange('value', Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {/* Effort */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="effort" className="block text-xs font-medium text-gray-700">
              Effort
            </label>
            <span className="text-xs font-semibold text-indigo-600">{effort}</span>
          </div>
          <input
            id="effort"
            type="range"
            min="1"
            max="10"
            value={effort}
            onChange={(e) => handleChange('effort', Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>
      </div>

      {/* Quadrant Display */}
      <div className="pt-2 border-t border-gray-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">Quadrant:</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold px-2 py-1 rounded ${getQuadrantColour()}`}>
              {quadrant}
            </span>
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
