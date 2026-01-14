import type { Item, ItemWithScore, Framework, WeightedCriterionData } from '../types/database'
import RiceScoring from './RiceScoring'
import IceScoring from './IceScoring'
import ValueEffortScoring from './ValueEffortScoring'
import MoscowScoring from './MoscowScoring'
import WeightedScoring from './WeightedScoring'
import { MoscowCategory, MOSCOW_LABELS, MOSCOW_COLOURS, MOSCOW_ORDER } from '../lib/moscow'
import { type WeightedItemScores } from '../lib/weighted'

type RiceScores = { reach: number; impact: number; confidence: number; effort: number }
type IceScores = { impact: number; confidence: number; ease: number }
type ValueEffortScores = { value: number; effort: number }
type MoscowScores = { category: string }
type WeightedScores = { scores: WeightedItemScores }

interface ItemListProps {
  items: ItemWithScore[]
  framework: Framework
  onEdit: (item: Item) => void
  onDelete: (itemId: string) => void
  onScoreUpdate?: (itemId: string, scores: RiceScores | IceScores | ValueEffortScores | MoscowScores | WeightedScores) => void
  updatingScores?: Set<string>
  highlightedItemId?: string
  weightedCriteria?: WeightedCriterionData[]
}

export default function ItemList({ items, framework, onEdit, onDelete, onScoreUpdate, updatingScores, highlightedItemId, weightedCriteria = [] }: ItemListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          No items yet. Add your first item to get started!
        </p>
      </div>
    )
  }

  const getDefaultRiceScores = (item: ItemWithScore): RiceScores => {
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

  const getDefaultIceScores = (item: ItemWithScore): IceScores => {
    if (item.score && item.score.criteria) {
      return {
        impact: (item.score.criteria.impact as number) || 5,
        confidence: (item.score.criteria.confidence as number) || 5,
        ease: (item.score.criteria.ease as number) || 5,
      }
    }
    return { impact: 5, confidence: 5, ease: 5 }
  }

  const getDefaultValueEffortScores = (item: ItemWithScore): ValueEffortScores => {
    if (item.score && item.score.criteria) {
      return {
        value: (item.score.criteria.value as number) || 5,
        effort: (item.score.criteria.effort as number) || 5,
      }
    }
    return { value: 5, effort: 5 }
  }

  const getDefaultMoscowCategory = (item: ItemWithScore): string => {
    if (item.score && item.score.criteria) {
      return (item.score.criteria.category as string) || MoscowCategory.Must
    }
    return MoscowCategory.Must
  }

  const getDefaultWeightedScores = (item: ItemWithScore): WeightedItemScores => {
    if (item.score && item.score.criteria && item.score.criteria.scores) {
      return item.score.criteria.scores as WeightedItemScores
    }
    return {}
  }

  // Group items by MoSCoW category
  const groupedByCategory = MOSCOW_ORDER.reduce((acc, category) => {
    acc[category] = items.filter((item) => {
      const itemCategory = getDefaultMoscowCategory(item)
      return itemCategory === category
    })
    return acc
  }, {} as Record<MoscowCategory, ItemWithScore[]>)

  // Render a single item card
  const renderItemCard = (item: ItemWithScore) => (
    <article
      key={item.id}
      id={`item-${item.id}`}
      className={`border rounded-lg p-3 sm:p-4 hover:shadow-md transition-all ${
        highlightedItemId === item.id
          ? 'border-indigo-500 ring-2 ring-indigo-200'
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
              {item.title}
            </h3>
            {item.created_by && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                by {item.created_by}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-gray-600 text-sm">{item.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Edit button - text on desktop, hidden on mobile (scores editable inline) */}
          <button
            onClick={() => onEdit(item)}
            className="hidden sm:inline-block text-sm text-indigo-600 hover:text-indigo-800 font-medium py-1 px-2 -my-1 -mx-2"
          >
            Edit
          </button>
          {/* Delete button - icon on mobile, text on desktop */}
          <button
            onClick={() => onDelete(item.id)}
            className="sm:hidden p-2 -m-1 text-gray-400 hover:text-red-600 active:text-red-700 transition-colors"
            aria-label="Delete item"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="hidden sm:inline-block text-sm text-red-600 hover:text-red-800 font-medium py-1 px-2 -my-1 -mx-2"
          >
            Delete
          </button>
        </div>
      </div>

      {/* RICE Scoring */}
      {framework === 'rice' && onScoreUpdate && (
        <RiceScoring
          {...getDefaultRiceScores(item)}
          onChange={(scores) => onScoreUpdate(item.id, scores)}
          isUpdating={updatingScores?.has(item.id)}
        />
      )}

      {/* ICE Scoring */}
      {framework === 'ice' && onScoreUpdate && (
        <IceScoring
          {...getDefaultIceScores(item)}
          onChange={(scores) => onScoreUpdate(item.id, scores)}
          isUpdating={updatingScores?.has(item.id)}
        />
      )}

      {/* Value vs Effort Scoring */}
      {framework === 'value_effort' && onScoreUpdate && (
        <ValueEffortScoring
          {...getDefaultValueEffortScores(item)}
          onChange={(scores) => onScoreUpdate(item.id, scores)}
          isUpdating={updatingScores?.has(item.id)}
        />
      )}

      {/* MoSCoW Scoring */}
      {framework === 'moscow' && onScoreUpdate && (
        <MoscowScoring
          category={getDefaultMoscowCategory(item)}
          onChange={(scores) => onScoreUpdate(item.id, scores)}
          isUpdating={updatingScores?.has(item.id)}
        />
      )}

      {/* Weighted Scoring */}
      {framework === 'weighted' && onScoreUpdate && (
        <WeightedScoring
          criteria={weightedCriteria}
          scores={getDefaultWeightedScores(item)}
          onChange={(scores) => onScoreUpdate(item.id, scores)}
          isUpdating={updatingScores?.has(item.id)}
        />
      )}
    </article>
  )

  // For MoSCoW, render grouped by category
  if (framework === 'moscow') {
    return (
      <div className="space-y-6">
        {MOSCOW_ORDER.map((category) => {
          const categoryItems = groupedByCategory[category]
          return (
            <div key={category}>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 border ${MOSCOW_COLOURS[category]}`}>
                {MOSCOW_LABELS[category]} ({categoryItems.length})
              </div>
              {categoryItems.length > 0 ? (
                <div className="space-y-3">
                  {categoryItems.map(renderItemCard)}
                </div>
              ) : (
                <p className="text-gray-400 text-sm italic ml-1">No items</p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // For other frameworks, render flat list
  return (
    <div className="space-y-3">
      {items.map(renderItemCard)}
    </div>
  )
}
