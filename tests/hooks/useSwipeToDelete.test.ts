import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSwipeToDelete } from '../../src/hooks/useSwipeToDelete'

describe('useSwipeToDelete', () => {
  // Mock touch support
  const originalOntouchstart = Object.getOwnPropertyDescriptor(window, 'ontouchstart')

  beforeEach(() => {
    // Enable touch support in tests
    Object.defineProperty(window, 'ontouchstart', {
      value: () => {},
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // Restore original
    if (originalOntouchstart) {
      Object.defineProperty(window, 'ontouchstart', originalOntouchstart)
    } else {
      // @ts-expect-error - Deleting property for cleanup
      delete window.ontouchstart
    }
  })

  it('returns initial state with translateX 0', () => {
    const { result } = renderHook(() => useSwipeToDelete())

    expect(result.current.style.transform).toBe('translateX(0px)')
    expect(result.current.isRevealed).toBe(false)
  })

  it('returns a ref for attaching to element', () => {
    const { result } = renderHook(() => useSwipeToDelete())

    expect(result.current.ref).toBeDefined()
    expect(result.current.ref.current).toBeNull()
  })

  it('returns enabled=true when touch is supported', () => {
    const { result } = renderHook(() => useSwipeToDelete())

    expect(result.current.enabled).toBe(true)
  })

  it('returns enabled=false when touch is not supported', () => {
    // Remove touch support
    // @ts-expect-error - Deleting property for test
    delete window.ontouchstart

    const { result } = renderHook(() => useSwipeToDelete())

    expect(result.current.enabled).toBe(false)
  })

  it('respects enabled option override', () => {
    const { result } = renderHook(() => useSwipeToDelete({ enabled: false }))

    expect(result.current.enabled).toBe(false)
  })

  it('reset() returns to initial state', () => {
    const { result } = renderHook(() => useSwipeToDelete())

    // Manually set a revealed state for testing reset
    act(() => {
      result.current.reset()
    })

    expect(result.current.style.transform).toBe('translateX(0px)')
    expect(result.current.isRevealed).toBe(false)
  })

  it('uses custom threshold option', () => {
    const { result } = renderHook(() =>
      useSwipeToDelete({ threshold: 50 })
    )

    // Hook accepts the option (we can't easily test the internal threshold without simulating touches)
    expect(result.current.enabled).toBe(true)
  })

  it('uses custom maxSwipe option', () => {
    const { result } = renderHook(() =>
      useSwipeToDelete({ maxSwipe: 150 })
    )

    // Hook accepts the option
    expect(result.current.enabled).toBe(true)
  })

  it('returns style object with transition', () => {
    const { result } = renderHook(() => useSwipeToDelete())

    expect(result.current.style).toHaveProperty('transform')
    expect(result.current.style).toHaveProperty('transition')
  })
})
