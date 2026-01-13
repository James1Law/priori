import { ReactNode } from 'react'
import { useSwipeToDelete } from '../hooks/useSwipeToDelete'

interface SwipeableItemProps {
  children: ReactNode
  onDelete: () => void
  enabled?: boolean
}

export default function SwipeableItem({
  children,
  onDelete,
  enabled = true,
}: SwipeableItemProps) {
  const { ref, style, isRevealed, reset } = useSwipeToDelete({ enabled })

  const handleDelete = () => {
    reset()
    onDelete()
  }

  // If swipe is not enabled (desktop), just render children directly
  if (!enabled) {
    return <>{children}</>
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete action revealed behind the card */}
      <div
        className={`absolute inset-y-0 right-0 flex items-center bg-red-500 px-6 transition-opacity ${
          isRevealed ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          onClick={handleDelete}
          className="text-white font-semibold text-sm"
          aria-label="Delete item"
        >
          Delete
        </button>
      </div>

      {/* Swipeable content */}
      <div ref={ref} style={style} className="relative bg-white">
        {children}
      </div>
    </div>
  )
}
