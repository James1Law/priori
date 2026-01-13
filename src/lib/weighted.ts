export interface WeightedCriterion {
  id: string
  name: string
  weight: number // 1-10
}

export interface WeightedItemScores {
  [criterionId: string]: number // 1-10
}

/**
 * Calculate the weighted average score for an item.
 * Formula: Σ(score × weight) / Σ(weights)
 */
export function calculateWeightedScore(
  criteria: WeightedCriterion[],
  itemScores: WeightedItemScores
): number {
  if (criteria.length === 0) return 0

  let totalWeightedScore = 0
  let totalWeight = 0

  for (const criterion of criteria) {
    const score = itemScores[criterion.id]
    if (score !== undefined && criterion.weight > 0) {
      totalWeightedScore += score * criterion.weight
      totalWeight += criterion.weight
    }
  }

  if (totalWeight === 0) return 0

  const result = totalWeightedScore / totalWeight
  return Math.round(result * 100) / 100
}

/**
 * Generate a unique ID for a new criterion
 */
export function generateCriterionId(): string {
  return `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
}

/**
 * Create a default criterion
 */
export function createDefaultCriterion(name: string = '', weight: number = 5): WeightedCriterion {
  return {
    id: generateCriterionId(),
    name,
    weight,
  }
}
