export interface IceScore {
  impact: number
  confidence: number
  ease: number
}

/**
 * Calculate ICE score
 * Formula: (Impact + Confidence + Ease) / 3
 *
 * @param impact - Impact score (1-10)
 * @param confidence - Confidence score (1-10)
 * @param ease - Ease score (1-10)
 * @returns Calculated ICE score, rounded to 2 decimal places
 */
export function calculateIceScore({ impact, confidence, ease }: IceScore): number {
  const score = (impact + confidence + ease) / 3

  // Round to 2 decimal places
  return Math.round(score * 100) / 100
}
