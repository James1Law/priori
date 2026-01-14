import { ReactNode, useRef } from 'react'
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
  const deleteTriggeredRef = useRef(false)

  const handleDelete = () => {
    // Prevent double-firing from both touch and click events
    if (deleteTriggeredRef.current) return
    deleteTriggeredRef.current = true

    // Reset the flag after a short delay
    setTimeout(() => {
      deleteTriggeredRef.current = false
    }, 300)

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
        className={`absolute inset-y-0 right-0 z-20 flex items-center bg-red-500 transition-opacity ${
          isRevealed ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ width: '100px' }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleDelete()
          }}
          onTouchStart={(e) => {
            // Prevent the touch from reaching elements behind
            e.stopPropagation()
          }}
          className="w-full h-full text-white font-semibold text-sm flex items-center justify-center active:bg-red-600"
          aria-label="Delete item"
        >
          Delete
        </button>
      </div>

      {/* Swipeable content */}
      <div ref={ref} style={style} className="relative bg-white z-10">
        {children}
      </div>
    </div>
  )
}
