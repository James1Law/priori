export interface ValueEffortScore {
  value: number
  effort: number
}

export enum Quadrant {
  QuickWins = 'Quick Wins',
  BigBets = 'Big Bets',
  FillIns = 'Fill-ins',
  Avoid = 'Avoid',
}

/**
 * Determine which quadrant an item falls into based on value and effort
 *
 * Quadrants (using 5.5 as midpoint for 1-10 scale):
 * - Quick Wins: High value (>5.5), Low effort (<=5.5)
 * - Big Bets: High value (>5.5), High effort (>5.5)
 * - Fill-ins: Low value (<=5.5), Low effort (<=5.5)
 * - Avoid: Low value (<=5.5), High effort (>5.5)
 */
export function getQuadrant({ value, effort }: ValueEffortScore): Quadrant {
  const midpoint = 5.5
  const isHighValue = value > midpoint
  const isHighEffort = effort > midpoint

  if (isHighValue && !isHighEffort) {
    return Quadrant.QuickWins
  } else if (isHighValue && isHighEffort) {
    return Quadrant.BigBets
  } else if (!isHighValue && !isHighEffort) {
    return Quadrant.FillIns
  } else {
    return Quadrant.Avoid
  }
}
