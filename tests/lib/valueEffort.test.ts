import { describe, it, expect } from 'vitest'
import { getQuadrant, Quadrant } from '../../src/lib/valueEffort'

describe('getQuadrant', () => {
  it('returns Quick Wins for high value, low effort', () => {
    expect(getQuadrant({ value: 8, effort: 3 })).toBe(Quadrant.QuickWins)
    expect(getQuadrant({ value: 10, effort: 1 })).toBe(Quadrant.QuickWins)
    expect(getQuadrant({ value: 6, effort: 5 })).toBe(Quadrant.QuickWins)
  })

  it('returns Big Bets for high value, high effort', () => {
    expect(getQuadrant({ value: 8, effort: 8 })).toBe(Quadrant.BigBets)
    expect(getQuadrant({ value: 10, effort: 10 })).toBe(Quadrant.BigBets)
    expect(getQuadrant({ value: 6, effort: 6 })).toBe(Quadrant.BigBets)
  })

  it('returns Fill-ins for low value, low effort', () => {
    expect(getQuadrant({ value: 3, effort: 3 })).toBe(Quadrant.FillIns)
    expect(getQuadrant({ value: 1, effort: 1 })).toBe(Quadrant.FillIns)
    expect(getQuadrant({ value: 5, effort: 5 })).toBe(Quadrant.FillIns)
  })

  it('returns Avoid for low value, high effort', () => {
    expect(getQuadrant({ value: 3, effort: 8 })).toBe(Quadrant.Avoid)
    expect(getQuadrant({ value: 1, effort: 10 })).toBe(Quadrant.Avoid)
    expect(getQuadrant({ value: 5, effort: 6 })).toBe(Quadrant.Avoid)
  })

  it('handles boundary values at midpoint (5.5)', () => {
    // Value 5.5 and effort 5.5 would be the exact center
    // Values > 5.5 are high, <= 5.5 are low
    expect(getQuadrant({ value: 6, effort: 5 })).toBe(Quadrant.QuickWins) // high value, low effort
    expect(getQuadrant({ value: 5, effort: 6 })).toBe(Quadrant.Avoid) // low value, high effort
  })
})
