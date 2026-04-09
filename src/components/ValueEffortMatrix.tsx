import type { ItemWithScore } from '../types/database'

interface ValueEffortMatrixProps {
  items: ItemWithScore[]
  onItemClick: (itemId: string) => void
  selectedItemId?: string
}

export default function ValueEffortMatrix({ items, onItemClick, selectedItemId }: ValueEffortMatrixProps) {
  // Filter items that have value/effort scores
  const itemsWithScores = items.filter(
    (item) =>
      item.score?.criteria?.value !== undefined &&
      item.score?.criteria?.effort !== undefined
  )

  // Calculate position as percentage (1-10 scale to 0-100%)
  const getPosition = (value: number) => {
    // Convert 1-10 to percentage (with some padding)
    return ((value - 1) / 9) * 100
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Value vs Effort Matrix</h3>

      <div className="relative">
        {/* Y-axis label (Value) */}
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-gray-500">
          Value
        </div>

        {/* Matrix container */}
        <div className="ml-6 mr-2">
          {/* Top row: Quick Wins | Big Bets */}
          <div className="grid grid-cols-2 h-32">
            {/* Quick Wins (high value, low effort) */}
            <div className="bg-green-50 border border-green-200 rounded-tl-lg relative">
              <span className="absolute top-1 left-1 text-xs font-medium text-green-700">
                Quick Wins
              </span>
            </div>
            {/* Big Bets (high value, high effort) */}
            <div className="bg-blue-50 border border-blue-200 border-l-0 rounded-tr-lg relative">
              <span className="absolute top-1 right-1 text-xs font-medium text-blue-700">
                Big Bets
              </span>
            </div>
          </div>

          {/* Bottom row: Fill-ins | Avoid */}
          <div className="grid grid-cols-2 h-32">
            {/* Fill-ins (low value, low effort) */}
            <div className="bg-amber-50 border border-amber-200 border-t-0 rounded-bl-lg relative">
              <span className="absolute bottom-1 left-1 text-xs font-medium text-amber-700">
                Fill-ins
              </span>
            </div>
            {/* Avoid (low value, high effort) */}
            <div className="bg-red-50 border border-red-200 border-l-0 border-t-0 rounded-br-lg relative">
              <span className="absolute bottom-1 right-1 text-xs font-medium text-red-700">
                Avoid
              </span>
            </div>
          </div>

          {/* Item dots overlay */}
          <div className="absolute inset-0 ml-6 mr-2 mt-8 pointer-events-none" style={{ height: '256px' }}>
            {itemsWithScores.map((item) => {
              const value = item.score?.criteria?.value as number
              const effort = item.score?.criteria?.effort as number
              const xPos = getPosition(effort)
              const yPos = 100 - getPosition(value) // Invert Y (high value = top)

              return (
                <button
                  key={item.id}
                  title={item.title}
                  onClick={() => onItemClick(item.id)}
                  className={`absolute w-4 h-4 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer transition-[colors,transform]
                    ${selectedItemId === item.id
                      ? 'bg-indigo-600 ring-4 ring-indigo-300 z-10'
                      : 'bg-indigo-500 hover:bg-indigo-600 hover:scale-110'
                    }`}
                  style={{
                    left: `${xPos}%`,
                    top: `${yPos}%`,
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* X-axis label (Effort) */}
        <div className="text-center text-xs font-medium text-gray-500 mt-2 ml-6">
          Effort
        </div>
      </div>
    </div>
  )
}
