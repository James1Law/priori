import { describe, it, expect } from 'vitest'
import { calculateRiceScore } from '../../src/lib/rice'

describe('calculateRiceScore', () => {
  it('calculates RICE score correctly', () => {
    const result = calculateRiceScore({
      reach: 1000,
      impact: 2,
      confidence: 0.8,
      effort: 4,
    })

    // (1000 * 2 * 0.8) / 4 = 400
    expect(result).toBe(400)
  })

  it('handles minimal impact (0.25)', () => {
    const result = calculateRiceScore({
      reach: 100,
      impact: 0.25,
      confidence: 1,
      effort: 1,
    })

    // (100 * 0.25 * 1) / 1 = 25
    expect(result).toBe(25)
  })

  it('handles low confidence (50%)', () => {
    const result = calculateRiceScore({
      reach: 1000,
      impact: 1,
      confidence: 0.5,
      effort: 2,
    })

    // (1000 * 1 * 0.5) / 2 = 250
    expect(result).toBe(250)
  })

  it('returns 0 when effort is 0', () => {
    const result = calculateRiceScore({
      reach: 1000,
      impact: 2,
      confidence: 0.8,
      effort: 0,
    })

    expect(result).toBe(0)
  })

  it('returns 0 when reach is 0', () => {
    const result = calculateRiceScore({
      reach: 0,
      impact: 2,
      confidence: 0.8,
      effort: 4,
    })

    expect(result).toBe(0)
  })

  it('handles decimal results', () => {
    const result = calculateRiceScore({
      reach: 100,
      impact: 1,
      confidence: 0.8,
      effort: 3,
    })

    // (100 * 1 * 0.8) / 3 = 26.666...
    expect(result).toBeCloseTo(26.67, 2)
  })

  it('handles massive impact (3)', () => {
    const result = calculateRiceScore({
      reach: 500,
      impact: 3,
      confidence: 1,
      effort: 2,
    })

    // (500 * 3 * 1) / 2 = 750
    expect(result).toBe(750)
  })
})
