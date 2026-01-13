import { describe, it, expect } from 'vitest'
import {
  calculateWeightedScore,
  generateCriterionId,
  createDefaultCriterion,
  type WeightedCriterion,
  type WeightedItemScores,
} from '../../src/lib/weighted'

describe('calculateWeightedScore', () => {
  it('calculates weighted average correctly', () => {
    const criteria: WeightedCriterion[] = [
      { id: 'c1', name: 'Criterion 1', weight: 10 },
      { id: 'c2', name: 'Criterion 2', weight: 5 },
    ]
    const scores: WeightedItemScores = {
      c1: 8,
      c2: 6,
    }

    // (8 * 10 + 6 * 5) / (10 + 5) = (80 + 30) / 15 = 110 / 15 = 7.33
    expect(calculateWeightedScore(criteria, scores)).toBe(7.33)
  })

  it('returns 0 for empty criteria', () => {
    expect(calculateWeightedScore([], {})).toBe(0)
  })

  it('returns 0 when all weights are zero', () => {
    const criteria: WeightedCriterion[] = [
      { id: 'c1', name: 'Criterion 1', weight: 0 },
      { id: 'c2', name: 'Criterion 2', weight: 0 },
    ]
    const scores: WeightedItemScores = {
      c1: 8,
      c2: 6,
    }

    expect(calculateWeightedScore(criteria, scores)).toBe(0)
  })

  it('ignores criteria with zero weight', () => {
    const criteria: WeightedCriterion[] = [
      { id: 'c1', name: 'Criterion 1', weight: 10 },
      { id: 'c2', name: 'Criterion 2', weight: 0 },
    ]
    const scores: WeightedItemScores = {
      c1: 8,
      c2: 1, // Should be ignored because weight is 0
    }

    // (8 * 10) / 10 = 8
    expect(calculateWeightedScore(criteria, scores)).toBe(8)
  })

  it('handles missing scores gracefully', () => {
    const criteria: WeightedCriterion[] = [
      { id: 'c1', name: 'Criterion 1', weight: 10 },
      { id: 'c2', name: 'Criterion 2', weight: 5 },
    ]
    const scores: WeightedItemScores = {
      c1: 8,
      // c2 is missing
    }

    // Only c1 contributes: (8 * 10) / 10 = 8
    expect(calculateWeightedScore(criteria, scores)).toBe(8)
  })

  it('rounds to 2 decimal places', () => {
    const criteria: WeightedCriterion[] = [
      { id: 'c1', name: 'Criterion 1', weight: 3 },
      { id: 'c2', name: 'Criterion 2', weight: 7 },
    ]
    const scores: WeightedItemScores = {
      c1: 5,
      c2: 8,
    }

    // (5 * 3 + 8 * 7) / (3 + 7) = (15 + 56) / 10 = 7.1
    expect(calculateWeightedScore(criteria, scores)).toBe(7.1)
  })

  it('handles single criterion', () => {
    const criteria: WeightedCriterion[] = [
      { id: 'c1', name: 'Solo', weight: 5 },
    ]
    const scores: WeightedItemScores = {
      c1: 7,
    }

    expect(calculateWeightedScore(criteria, scores)).toBe(7)
  })
})

describe('generateCriterionId', () => {
  it('generates unique IDs', () => {
    const id1 = generateCriterionId()
    const id2 = generateCriterionId()

    expect(id1).not.toBe(id2)
  })

  it('starts with "c_" prefix', () => {
    const id = generateCriterionId()
    expect(id.startsWith('c_')).toBe(true)
  })
})

describe('createDefaultCriterion', () => {
  it('creates criterion with default values', () => {
    const criterion = createDefaultCriterion()

    expect(criterion.name).toBe('')
    expect(criterion.weight).toBe(5)
    expect(criterion.id).toBeTruthy()
  })

  it('creates criterion with custom name and weight', () => {
    const criterion = createDefaultCriterion('Customer Impact', 8)

    expect(criterion.name).toBe('Customer Impact')
    expect(criterion.weight).toBe(8)
    expect(criterion.id).toBeTruthy()
  })
})
