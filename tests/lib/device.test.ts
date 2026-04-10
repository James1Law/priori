import { describe, it, expect, vi, afterEach } from 'vitest'
import { isTouchDevice } from '../../src/lib/device'

describe('isTouchDevice', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when ontouchstart exists on window', () => {
    vi.stubGlobal('ontouchstart', null)
    vi.stubGlobal('navigator', { maxTouchPoints: 0 })
    expect(isTouchDevice()).toBe(true)
  })

  it('returns true when navigator.maxTouchPoints > 0', () => {
    // Remove ontouchstart if stubbed
    if ('ontouchstart' in window) {
      delete (window as Record<string, unknown>).ontouchstart
    }
    vi.stubGlobal('navigator', { maxTouchPoints: 2 })
    expect(isTouchDevice()).toBe(true)
  })

  it('returns false on desktop without touch support', () => {
    if ('ontouchstart' in window) {
      delete (window as Record<string, unknown>).ontouchstart
    }
    vi.stubGlobal('navigator', { maxTouchPoints: 0 })
    expect(isTouchDevice()).toBe(false)
  })
})
