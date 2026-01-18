import { calculateIceScore } from '../lib/ice'

interface IceScoringProps {
  impact: number
  confidence: number
  ease: number
  onChange: (scores: { impact: number; confidence: number; ease: number }) => void
  isUpdating?: boolean
}

export default function IceScoring({ impact, confidence, ease, onChange, isUpdating }: IceScoringProps) {
  const score = calculateIceScore({ impact, confidence, ease })

  const handleChange = (field: string, value: number) => {
    onChange({
      impact,
      confidence,
      ease,
      [field]: value,
    })
  }

  return (
    <div className="space-y-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
      <div className="space-y-4 sm:space-y-3">
        {/* Impact */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="impact" className="block text-xs font-medium text-gray-700">
              Impact
            </label>
            <span className="text-xs font-semibold text-indigo-600">{impact}</span>
          </div>
          <input
            id="impact"
            type="range"
            min="1"
            max="10"
            value={impact}
            onChange={(e) => handleChange('impact', Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {/* Confidence */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="confidence" className="block text-xs font-medium text-gray-700">
              Confidence
            </label>
            <span className="text-xs font-semibold text-indigo-600">{confidence}</span>
          </div>
          <input
            id="confidence"
            type="range"
            min="1"
            max="10"
            value={confidence}
            onChange={(e) => handleChange('confidence', Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {/* Ease */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="ease" className="block text-xs font-medium text-gray-700">
              Ease
            </label>
            <span className="text-xs font-semibold text-indigo-600">{ease}</span>
          </div>
          <input
            id="ease"
            type="range"
            min="1"
            max="10"
            value={ease}
            onChange={(e) => handleChange('ease', Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
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
                Reordering...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
