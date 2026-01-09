export interface RiceScore {
  reach: number
  impact: number
  confidence: number
  effort: number
}

/**
 * Calculate RICE score
 * Formula: (Reach × Impact × Confidence) / Effort
 *
 * @param reach - Number of users affected per quarter
 * @param impact - Multiplier: 0.25 (minimal), 0.5 (low), 1 (medium), 2 (high), 3 (massive)
 * @param confidence - Percentage: 0.5 (50%), 0.8 (80%), 1 (100%)
 * @param effort - Person-months required
 * @returns Calculated RICE score, rounded to 2 decimal places
 */
export function calculateRiceScore({ reach, impact, confidence, effort }: RiceScore): number {
  // Handle edge case: zero effort or zero reach
  if (effort === 0 || reach === 0) {
    return 0
  }

  const score = (reach * impact * confidence) / effort

  // Round to 2 decimal places
  return Math.round(score * 100) / 100
}
