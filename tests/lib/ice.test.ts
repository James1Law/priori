import { describe, it, expect } from 'vitest'
import { calculateIceScore } from '../../src/lib/ice'

describe('calculateIceScore', () => {
  it('calculates ICE score as average of three values', () => {
    const result = calculateIceScore({
      impact: 8,
      confidence: 6,
      ease: 4,
    })

    // (8 + 6 + 4) / 3 = 6
    expect(result).toBe(6)
  })

  it('handles all values at maximum (10)', () => {
    const result = calculateIceScore({
      impact: 10,
      confidence: 10,
      ease: 10,
    })

    // (10 + 10 + 10) / 3 = 10
    expect(result).toBe(10)
  })

  it('handles all values at minimum (1)', () => {
    const result = calculateIceScore({
      impact: 1,
      confidence: 1,
      ease: 1,
    })

    // (1 + 1 + 1) / 3 = 1
    expect(result).toBe(1)
  })

  it('rounds to 2 decimal places', () => {
    const result = calculateIceScore({
      impact: 7,
      confidence: 5,
      ease: 4,
    })

    // (7 + 5 + 4) / 3 = 5.333...
    expect(result).toBeCloseTo(5.33, 2)
  })

  it('handles mixed high and low values', () => {
    const result = calculateIceScore({
      impact: 10,
      confidence: 1,
      ease: 5,
    })

    // (10 + 1 + 5) / 3 = 5.333...
    expect(result).toBeCloseTo(5.33, 2)
  })

  it('handles values in the middle range', () => {
    const result = calculateIceScore({
      impact: 5,
      confidence: 5,
      ease: 5,
    })

    // (5 + 5 + 5) / 3 = 5
    expect(result).toBe(5)
  })
})
