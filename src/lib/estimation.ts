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

// Format a second count as m:ss for the voting countdown
export function formatCountdown(seconds: number): string {
  const clamped = Math.max(0, seconds)
  const minutes = Math.floor(clamped / 60)
  const secs = clamped % 60
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

// Whole seconds until an ISO deadline; 0 once passed, null when no
// (or an unparseable) deadline is set
export function getRemainingSeconds(
  endsAt: string | null,
  nowMs: number
): number | null {
  if (!endsAt) return null
  const ends = Date.parse(endsAt)
  if (Number.isNaN(ends)) return null
  return Math.max(0, Math.round((ends - nowMs) / 1000))
}

export interface VoteStats {
  average: number | null
  median: number | null
  distribution: { value: number; count: number }[]
}

// Average, median and per-value distribution over numeric votes.
// Special votes (?, coffee) and unsubmitted votes are excluded.
export function getVoteStats(votes: { vote: number | null }[]): VoteStats {
  const values = votes
    .map((v) => v.vote)
    .filter((v): v is number => v !== null && v >= 0)
    .sort((a, b) => a - b)

  if (values.length === 0) {
    return { average: null, median: null, distribution: [] }
  }

  const average = values.reduce((sum, v) => sum + v, 0) / values.length
  const mid = Math.floor(values.length / 2)
  const median =
    values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid]

  const counts = new Map<number, number>()
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1))
  const distribution = Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value - b.value)

  return { average, median, distribution }
}
