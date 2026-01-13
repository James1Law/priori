import { useState, useRef, useCallback, useEffect } from 'react'

interface UseSwipeToDeleteOptions {
  threshold?: number // Distance to trigger delete reveal (default: 80px)
  maxSwipe?: number // Maximum swipe distance (default: 100px)
  enabled?: boolean // Whether swipe is enabled (default: true on touch devices)
}

interface SwipeState {
  translateX: number
  isRevealed: boolean
}

export function useSwipeToDelete(options: UseSwipeToDeleteOptions = {}) {
  const {
    threshold = 80,
    maxSwipe = 100,
    enabled = typeof window !== 'undefined' && 'ontouchstart' in window,
  } = options

  const [state, setState] = useState<SwipeState>({
    translateX: 0,
    isRevealed: false,
  })

  const elementRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number>(0)
  const startYRef = useRef<number>(0)
  const currentXRef = useRef<number>(0)
  const isSwipingRef = useRef<boolean>(false)
  const isVerticalScrollRef = useRef<boolean>(false)

  const reset = useCallback(() => {
    setState({ translateX: 0, isRevealed: false })
  }, [])

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return

      const touch = e.touches[0]
      startXRef.current = touch.clientX
      startYRef.current = touch.clientY
      currentXRef.current = touch.clientX
      isSwipingRef.current = true
      isVerticalScrollRef.current = false
    },
    [enabled]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isSwipingRef.current) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - startXRef.current
      const deltaY = touch.clientY - startYRef.current

      // Determine if this is a vertical scroll on first significant movement
      if (!isVerticalScrollRef.current && Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
        isVerticalScrollRef.current = true
        isSwipingRef.current = false
        return
      }

      // Only allow left swipe (negative deltaX)
      if (deltaX > 0) {
        // If swiping right and was revealed, allow it to close
        if (state.isRevealed) {
          const newX = Math.min(0, -maxSwipe + (touch.clientX - currentXRef.current))
          setState((prev) => ({ ...prev, translateX: newX }))
        }
        return
      }

      // Prevent default to stop page scroll during horizontal swipe
      if (Math.abs(deltaX) > 10) {
        e.preventDefault()
      }

      // Calculate new position with resistance after threshold
      let newX = deltaX
      if (Math.abs(deltaX) > maxSwipe) {
        const overflow = Math.abs(deltaX) - maxSwipe
        newX = -(maxSwipe + overflow * 0.2) // Add resistance
      }

      // Cap at maxSwipe
      newX = Math.max(newX, -maxSwipe - 20)

      setState((prev) => ({ ...prev, translateX: newX }))
    },
    [enabled, maxSwipe, state.isRevealed]
  )

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isSwipingRef.current) return

    isSwipingRef.current = false

    // Determine final state based on distance
    if (Math.abs(state.translateX) >= threshold) {
      // Snap to revealed
      setState({ translateX: -maxSwipe, isRevealed: true })
    } else {
      // Snap back to closed
      setState({ translateX: 0, isRevealed: false })
    }
  }, [enabled, state.translateX, threshold, maxSwipe])

  // Attach touch event listeners
  useEffect(() => {
    const element = elementRef.current
    if (!element || !enabled) return

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  // Close when clicking outside
  useEffect(() => {
    if (!state.isRevealed) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (elementRef.current && !elementRef.current.contains(e.target as Node)) {
        reset()
      }
    }

    document.addEventListener('touchstart', handleClickOutside, { passive: true })
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [state.isRevealed, reset])

  return {
    ref: elementRef,
    style: {
      transform: `translateX(${state.translateX}px)`,
      transition: isSwipingRef.current ? 'none' : 'transform 0.2s ease-out',
    } as React.CSSProperties,
    isRevealed: state.isRevealed,
    reset,
    enabled,
  }
}
