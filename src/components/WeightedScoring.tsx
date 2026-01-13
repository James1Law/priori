import { type WeightedCriterion, type WeightedItemScores, calculateWeightedScore } from '../lib/weighted'

interface WeightedScoringProps {
  criteria: WeightedCriterion[]
  scores: WeightedItemScores
  onChange: (scores: { scores: WeightedItemScores }) => void
  isUpdating?: boolean
}

export default function WeightedScoring({
  criteria,
  scores,
  onChange,
  isUpdating,
}: WeightedScoringProps) {
  const handleScoreChange = (criterionId: string, value: number) => {
    const newScores = { ...scores, [criterionId]: value }
    onChange({ scores: newScores })
  }

  const calculatedScore = calculateWeightedScore(criteria, scores)

  if (criteria.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500 italic">
          No criteria defined. Add criteria in the sidebar to start scoring.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">
          Weighted Score: {calculatedScore.toFixed(2)}
        </span>
        {isUpdating && (
          <span className="text-xs text-amber-600 font-medium animate-pulse">
            Updating...
          </span>
        )}
      </div>

      <div className="space-y-3">
        {criteria.map((criterion) => {
          const score = scores[criterion.id] ?? 5
          return (
            <div key={criterion.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor={`score-${criterion.id}`}
                    className="text-xs font-medium text-gray-700 truncate"
                    title={criterion.name}
                  >
                    {criterion.name}
                    <span className="text-gray-400 ml-1">(w:{criterion.weight})</span>
                  </label>
                  <span className="text-xs font-semibold text-indigo-600 ml-2">
                    {score}
                  </span>
                </div>
                <input
                  id={`score-${criterion.id}`}
                  type="range"
                  min="1"
                  max="10"
                  value={score}
                  onChange={(e) =>
                    handleScoreChange(criterion.id, parseInt(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
