import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCapacityMetrics } from '../../src/hooks/useCapacityMetrics'
import type { Item } from '../../src/types/database'

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: `item-${Math.random()}`,
    session_id: 'session-1',
    title: 'Test Item',
    description: null,
    position: 0,
    backlog_position: null,
    status: 'todo',
    created_by: null,
    created_at: '2026-01-01',
    roadmap_start_period: null,
    roadmap_end_period: null,
    roadmap_start_quadrant: null,
    roadmap_end_quadrant: null,
    roadmap_row: 0,
    story_points: null,
    effort_estimate: null,
    ...overrides,
  }
}

describe('useCapacityMetrics', () => {
  const defaultSettings = {
    teamSize: 7,
    workingDays: 65,
    focusFactor: 0.6,
    contingency: 0.3,
    unit: 'days' as const,
    hoursPerDay: 8,
  }

  it('calculates net capacity correctly', () => {
    const { result } = renderHook(() => useCapacityMetrics([], defaultSettings))

    // 7 × 65 × 0.6 = 273
    expect(result.current.netCapacity).toBe(273)
  })

  it('calculates total effort with contingency', () => {
    const items = [
      makeItem({ effort_estimate: 100 }),
      makeItem({ effort_estimate: 50 }),
    ]
    const { result } = renderHook(() => useCapacityMetrics(items, defaultSettings))

    // sum = 150, with 30% contingency = 150 × 1.3 = 195
    expect(result.current.baseEffort).toBe(150)
    expect(result.current.totalEffort).toBe(195)
  })

  it('calculates utilisation percentage', () => {
    const items = [
      makeItem({ effort_estimate: 100 }),
      makeItem({ effort_estimate: 50 }),
    ]
    const { result } = renderHook(() => useCapacityMetrics(items, defaultSettings))

    // 195 / 273 × 100 ≈ 71.4%
    expect(result.current.utilisation).toBeCloseTo(71.43, 1)
  })

  it('calculates coverage correctly', () => {
    const items = [
      makeItem({ effort_estimate: 10 }),
      makeItem({ effort_estimate: 20 }),
      makeItem({ effort_estimate: null }),
    ]
    const { result } = renderHook(() => useCapacityMetrics(items, defaultSettings))

    expect(result.current.estimatedCount).toBe(2)
    expect(result.current.totalCount).toBe(3)
  })

  it('calculates remaining capacity', () => {
    const items = [makeItem({ effort_estimate: 100 })]
    const { result } = renderHook(() =>
      useCapacityMetrics(items, defaultSettings)
    )

    // net = 273, effort = 100 × 1.3 = 130, remaining = 273 - 130 = 143
    expect(result.current.remaining).toBe(143)
  })

  it('returns green status when utilisation < 80%', () => {
    const items = [makeItem({ effort_estimate: 50 })]
    const { result } = renderHook(() => useCapacityMetrics(items, defaultSettings))

    expect(result.current.status).toBe('healthy')
    expect(result.current.statusColour).toBe('#10b981')
  })

  it('returns amber status when utilisation 80-99%', () => {
    // Need total effort ≈ 80-99% of 273 = ~218-270
    // With 30% contingency: base = 218/1.3 ≈ 168
    const items = [makeItem({ effort_estimate: 170 })]
    const { result } = renderHook(() => useCapacityMetrics(items, defaultSettings))

    // 170 × 1.3 = 221, 221/273 = 80.9%
    expect(result.current.status).toBe('at-risk')
    expect(result.current.statusColour).toBe('#f59e0b')
  })

  it('returns red status when utilisation >= 100%', () => {
    const items = [makeItem({ effort_estimate: 300 })]
    const { result } = renderHook(() => useCapacityMetrics(items, defaultSettings))

    expect(result.current.status).toBe('over-capacity')
    expect(result.current.statusColour).toBe('#ef4444')
  })

  it('handles zero items', () => {
    const { result } = renderHook(() => useCapacityMetrics([], defaultSettings))

    expect(result.current.baseEffort).toBe(0)
    expect(result.current.totalEffort).toBe(0)
    expect(result.current.utilisation).toBe(0)
    expect(result.current.estimatedCount).toBe(0)
    expect(result.current.totalCount).toBe(0)
  })

  it('handles all items unestimated', () => {
    const items = [
      makeItem({ effort_estimate: null }),
      makeItem({ effort_estimate: null }),
    ]
    const { result } = renderHook(() => useCapacityMetrics(items, defaultSettings))

    expect(result.current.baseEffort).toBe(0)
    expect(result.current.totalEffort).toBe(0)
    expect(result.current.utilisation).toBe(0)
    expect(result.current.estimatedCount).toBe(0)
    expect(result.current.totalCount).toBe(2)
  })

  it('handles zero net capacity without division by zero', () => {
    const items = [makeItem({ effort_estimate: 10 })]
    const { result } = renderHook(() =>
      useCapacityMetrics(items, { ...defaultSettings, teamSize: 0 })
    )

    // Should not throw, utilisation should be 0 or Infinity handled gracefully
    expect(result.current.netCapacity).toBe(0)
    expect(result.current.utilisation).toBe(0)
  })

  it('ignores items with null effort_estimate in sum', () => {
    const items = [
      makeItem({ effort_estimate: 10 }),
      makeItem({ effort_estimate: null }),
      makeItem({ effort_estimate: 20 }),
    ]
    const { result } = renderHook(() => useCapacityMetrics(items, defaultSettings))

    expect(result.current.baseEffort).toBe(30)
  })

  it('handles zero contingency', () => {
    const items = [makeItem({ effort_estimate: 100 })]
    const { result } = renderHook(() =>
      useCapacityMetrics(items, { ...defaultSettings, contingency: 0 })
    )

    expect(result.current.baseEffort).toBe(100)
    expect(result.current.totalEffort).toBe(100)
  })

  it('multiplies capacity by hoursPerDay when unit is hours', () => {
    const { result } = renderHook(() =>
      useCapacityMetrics([], { ...defaultSettings, unit: 'hours', hoursPerDay: 8 })
    )

    // 7 × 65 × 0.6 × 8 = 2184
    expect(result.current.netCapacity).toBe(2184)
  })

  it('does not multiply by hoursPerDay when unit is days', () => {
    const { result } = renderHook(() =>
      useCapacityMetrics([], { ...defaultSettings, unit: 'days', hoursPerDay: 8 })
    )

    // 7 × 65 × 0.6 = 273 (hoursPerDay ignored)
    expect(result.current.netCapacity).toBe(273)
  })
})
