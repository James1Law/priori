import { useState } from 'react'
import { type WeightedCriterion, createDefaultCriterion } from '../lib/weighted'

interface WeightedCriteriaEditorProps {
  criteria: WeightedCriterion[]
  onChange: (criteria: WeightedCriterion[]) => void
}

export default function WeightedCriteriaEditor({
  criteria,
  onChange,
}: WeightedCriteriaEditorProps) {
  const [newCriterionName, setNewCriterionName] = useState('')

  const handleAddCriterion = () => {
    if (!newCriterionName.trim()) return

    const newCriterion = createDefaultCriterion(newCriterionName.trim(), 5)
    onChange([...criteria, newCriterion])
    setNewCriterionName('')
  }

  const handleRemoveCriterion = (id: string) => {
    onChange(criteria.filter((c) => c.id !== id))
  }

  const handleUpdateCriterion = (id: string, updates: Partial<WeightedCriterion>) => {
    onChange(
      criteria.map((c) => (c.id === id ? { ...c, ...updates } : c))
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddCriterion()
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Scoring Criteria
      </h3>

      {/* Existing criteria */}
      {criteria.length > 0 && (
        <div className="space-y-2 mb-4">
          {criteria.map((criterion) => (
            <div
              key={criterion.id}
              className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200"
            >
              <input
                type="text"
                value={criterion.name}
                onChange={(e) =>
                  handleUpdateCriterion(criterion.id, { name: e.target.value })
                }
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Criterion name"
                aria-label={`Criterion name for ${criterion.name || 'unnamed criterion'}`}
              />
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-500">Weight:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={criterion.weight}
                  onChange={(e) =>
                    handleUpdateCriterion(criterion.id, {
                      weight: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)),
                    })
                  }
                  className="w-14 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  aria-label={`Weight for ${criterion.name || 'criterion'}`}
                />
              </div>
              <button
                onClick={() => handleRemoveCriterion(criterion.id)}
                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                aria-label={`Remove ${criterion.name || 'criterion'}`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new criterion */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newCriterionName}
          onChange={(e) => setNewCriterionName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add new criterion..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          aria-label="New criterion name"
        />
        <button
          onClick={handleAddCriterion}
          disabled={!newCriterionName.trim()}
          className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {criteria.length === 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Add criteria to start scoring items with weighted scoring.
        </p>
      )}
    </div>
  )
}
