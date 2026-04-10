import type { ItemWithScore } from '../types/database'

interface CurrentEstimationItemProps {
  item: ItemWithScore
}

export default function CurrentEstimationItem({ item }: CurrentEstimationItemProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
          Now estimating
        </span>
        {item.story_points !== null && item.story_points !== undefined && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {item.story_points} SP (previously estimated)
          </span>
        )}
      </div>
      <h2 className="text-xl lg:text-2xl font-semibold text-gray-900">
        {item.title}
      </h2>
      {item.description && (
        <p className="text-gray-600 mt-2 whitespace-pre-wrap">{item.description}</p>
      )}
    </div>
  )
}
