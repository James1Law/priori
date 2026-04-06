import type { ItemWithScore } from '../types/database'

interface EstimationQueueProps {
  items: ItemWithScore[]
  currentItemId: string | null
  selectedItemId: string | null
  onStartEstimation: () => void
  onSelectItem: (itemId: string) => void
  onConfirmItem: (itemId: string) => void
  isHost: boolean
}

type EstimationStatus = 'pending' | 'in_progress' | 'completed'

function getEstimationStatus(
  item: ItemWithScore,
  currentItemId: string | null
): EstimationStatus {
  if (item.id === currentItemId) {
    return 'in_progress'
  }
  if (item.story_points !== null && item.story_points !== undefined) {
    return 'completed'
  }
  return 'pending'
}

function StatusBadge({ status }: { status: EstimationStatus }) {
  if (status === 'completed') {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    )
  }
  if (status === 'in_progress') {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-600">
        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
      </span>
    )
  }
  return (
    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400">
      <span className="w-2 h-2 rounded-full bg-gray-300" />
    </span>
  )
}

function StoryPointsBadge({ points }: { points: number }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded bg-indigo-100 text-indigo-700 text-xs font-semibold">
      {points} SP
    </span>
  )
}

export default function EstimationQueue({
  items,
  currentItemId,
  selectedItemId,
  onStartEstimation,
  onSelectItem,
  onConfirmItem,
  isHost,
}: EstimationQueueProps) {
  // Sort items by backlog_position if set, otherwise by position
  const sortedItems = [...items].sort((a, b) => {
    const posA = a.backlog_position ?? a.position
    const posB = b.backlog_position ?? b.position
    return posA - posB
  })

  const estimatedCount = items.filter(
    (item) => item.story_points !== null && item.story_points !== undefined
  ).length
  const totalCount = items.length
  const hasCurrentItem = currentItemId !== null

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No items to estimate.</p>
        <p className="text-sm mt-1">Add items in the Scoring view first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{estimatedCount}</span> of{' '}
          <span className="font-medium">{totalCount}</span> estimated
        </div>
        {!hasCurrentItem && estimatedCount < totalCount && isHost && (
          <button
            onClick={onStartEstimation}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-1.5 px-3 rounded-lg transition-colors"
          >
            Start Estimation
          </button>
        )}
        {!hasCurrentItem && estimatedCount < totalCount && !isHost && (
          <span className="text-xs text-gray-500">Waiting for host...</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${totalCount > 0 ? (estimatedCount / totalCount) * 100 : 0}%` }}
        />
      </div>

      {/* Item queue */}
      <ul className="space-y-2" role="list">
        {sortedItems.map((item) => {
          const status = getEstimationStatus(item, currentItemId)
          const isCurrentItem = status === 'in_progress'
          const isSelected = item.id === selectedItemId && !isCurrentItem

          return (
            <li key={item.id}>
              <div
                role={isHost ? 'button' : undefined}
                tabIndex={isHost ? 0 : undefined}
                onClick={() => isHost && onSelectItem(item.id)}
                onKeyDown={(e) => { if (isHost && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelectItem(item.id) } }}
                className={`
                  w-full text-left p-3 rounded-lg border transition-colors
                  ${isCurrentItem
                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                    : isSelected
                      ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400'
                      : isHost
                        ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                        : 'border-gray-200 cursor-default'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <StatusBadge status={status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium truncate ${
                          isCurrentItem ? 'text-indigo-900' : isSelected ? 'text-amber-900' : 'text-gray-900'
                        }`}
                      >
                        {item.title}
                      </span>
                      {status === 'completed' && item.story_points !== null && (
                        <StoryPointsBadge points={item.story_points} />
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-500 truncate mt-0.5">
                        {item.description}
                      </p>
                    )}
                    {/* Confirm button for selected item */}
                    {isSelected && isHost && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onConfirmItem(item.id)
                        }}
                        className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-1 px-3 rounded transition-colors"
                      >
                        Estimate This
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Completion message */}
      {estimatedCount === totalCount && totalCount > 0 && (
        <div className="text-center py-4 bg-green-50 rounded-lg border border-green-200">
          <span className="text-green-700 font-medium">
            All items estimated!
          </span>
        </div>
      )}
    </div>
  )
}
