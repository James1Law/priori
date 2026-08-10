// Shared Planning Poker deck constants and helpers

// Fibonacci sequence for story point estimation
export const FIBONACCI_VALUES = [0, 1, 2, 3, 5, 8, 13, 21] as const

// Special (non-numeric) vote values
export const SPECIAL_UNCERTAIN = -1 // "?"
export const SPECIAL_COFFEE = -2 // coffee break

// Map vote values to display text
export function getVoteDisplay(vote: number | null): string {
  if (vote === null) return ''
  if (vote === SPECIAL_UNCERTAIN) return '?'
  if (vote === SPECIAL_COFFEE) return '☕'
  return vote.toString()
}
