import type { Item, ItemWithScore, Framework } from '../types/database'
import RiceScoring from './RiceScoring'

interface ItemListProps {
  items: ItemWithScore[]
  framework: Framework
  onEdit: (item: Item) => void
  onDelete: (itemId: string) => void
  onScoreUpdate?: (itemId: string, scores: { reach: number; impact: number; confidence: number; effort: number }) => void
  updatingScores?: Set<string>
}

export default function ItemList({ items, framework, onEdit, onDelete, onScoreUpdate, updatingScores }: ItemListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          No items yet. Add your first item to get started!
        </p>
      </div>
    )
  }

  const getDefaultScores = (item: ItemWithScore) => {
    if (item.score && item.score.criteria) {
      return {
        reach: (item.score.criteria.reach as number) || 0,
        impact: (item.score.criteria.impact as number) || 1,
        confidence: (item.score.criteria.confidence as number) || 0.8,
        effort: (item.score.criteria.effort as number) || 1,
      }
    }
    return { reach: 0, impact: 1, confidence: 0.8, effort: 1 }
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg mb-1">
                {item.title}
              </h3>
              {item.description && (
                <p className="text-gray-600 text-sm">{item.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(item)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Delete
              </button>
            </div>
          </div>

          {/* RICE Scoring */}
          {framework === 'rice' && onScoreUpdate && (
            <RiceScoring
              {...getDefaultScores(item)}
              onChange={(scores) => onScoreUpdate(item.id, scores)}
              isUpdating={updatingScores?.has(item.id)}
            />
          )}
        </article>
      ))}
    </div>
  )
}
