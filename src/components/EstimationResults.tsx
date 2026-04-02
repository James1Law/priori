import type { EstimationVote } from '../types/database'

interface EstimationResultsProps {
  votes: EstimationVote[]
  onReveal: () => void
  onAccept: (storyPoints: number) => void
  onRevote: () => void
  onSkip: () => void
  revealed: boolean
  hasNextItem: boolean
  isHost: boolean
}

// Fibonacci sequence for determining "adjacent" values
const FIBONACCI_ORDER = [0, 1, 2, 3, 5, 8, 13, 21]

// Get the index of a vote value in the Fibonacci sequence
function getFibonacciIndex(vote: number): number {
  const index = FIBONACCI_ORDER.indexOf(vote)
  return index === -1 ? -1 : index
}

// Check if two votes are within one step of each other
function areVotesAdjacent(vote1: number, vote2: number): boolean {
  const index1 = getFibonacciIndex(vote1)
  const index2 = getFibonacciIndex(vote2)
  if (index1 === -1 || index2 === -1) return false
  return Math.abs(index1 - index2) <= 1
}

// Calculate consensus from votes
export function calculateConsensus(votes: EstimationVote[]): {
  type: 'consensus' | 'close' | 'no-consensus'
  message: string
  value?: number
  outliers: string[] // participant names who voted far from majority
} {
  // Filter to only votes with actual values (not null, ?, or coffee)
  const validVotes = votes.filter(
    (v) => v.vote !== null && v.vote !== undefined && v.vote >= 0
  )

  if (validVotes.length === 0) {
    return {
      type: 'no-consensus',
      message: 'No valid votes to analyse',
      outliers: [],
    }
  }

  // Count votes by value
  const voteCounts = new Map<number, number>()
  validVotes.forEach((v) => {
    const count = voteCounts.get(v.vote!) || 0
    voteCounts.set(v.vote!, count + 1)
  })

  // Find the most common vote
  let maxCount = 0
  let majorityVote: number | undefined
  voteCounts.forEach((count, vote) => {
    if (count > maxCount) {
      maxCount = count
      majorityVote = vote
    }
  })

  const totalValidVotes = validVotes.length

  // Check for consensus (>50% same vote)
  if (majorityVote !== undefined && maxCount > totalValidVotes / 2) {
    // Find outliers (votes not adjacent to majority)
    const outliers = validVotes
      .filter((v) => !areVotesAdjacent(v.vote!, majorityVote!))
      .map((v) => v.participant_name)

    return {
      type: 'consensus',
      message: `Consensus! ${majorityVote} story points`,
      value: majorityVote,
      outliers,
    }
  }

  // Check if all votes are within one step of each other
  const uniqueVotes = Array.from(voteCounts.keys())
  const allAdjacent = uniqueVotes.every((vote) =>
    uniqueVotes.every((otherVote) => areVotesAdjacent(vote, otherVote))
  )

  if (allAdjacent && uniqueVotes.length > 1) {
    // Find the median value
    const sortedVotes = [...uniqueVotes].sort((a, b) => a - b)
    const medianValue = sortedVotes[Math.floor(sortedVotes.length / 2)]

    return {
      type: 'close',
      message: `Close - discuss briefly (${sortedVotes.join(' vs ')})`,
      value: medianValue,
      outliers: [],
    }
  }

  // No consensus - votes are spread
  // Find outliers (votes more than 1 step from majority)
  const outliers = majorityVote !== undefined
    ? validVotes
        .filter((v) => !areVotesAdjacent(v.vote!, majorityVote!))
        .map((v) => v.participant_name)
    : []

  return {
    type: 'no-consensus',
    message: 'No consensus - discuss',
    outliers,
  }
}

export default function EstimationResults({
  votes,
  onReveal,
  onAccept,
  onRevote,
  onSkip,
  revealed,
  hasNextItem,
  isHost,
}: EstimationResultsProps) {
  // Count how many have voted (excluding null votes)
  const votedCount = votes.filter((v) => v.vote !== null).length
  const hasVotes = votedCount > 0

  // Calculate consensus if revealed
  const consensus = revealed ? calculateConsensus(votes) : null

  if (!revealed) {
    // Show Reveal button for host, waiting message for participants
    return (
      <div className="mt-6 flex flex-col items-center gap-2">
        {isHost ? (
          <button
            onClick={onReveal}
            disabled={!hasVotes}
            className={`
              px-6 py-3 rounded-lg font-semibold text-lg transition-all
              ${
                hasVotes
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            Reveal Votes
          </button>
        ) : (
          hasVotes && (
            <p className="text-sm text-gray-500">Waiting for host to reveal votes...</p>
          )
        )}
      </div>
    )
  }

  // Get suggested value for Accept button
  const suggestedValue = consensus?.value

  // Show consensus indicator and action buttons
  return (
    <div className="mt-6 space-y-4">
      {/* Consensus indicator */}
      <div
        className={`
          rounded-lg p-4 text-center
          ${
            consensus?.type === 'consensus'
              ? 'bg-green-50 border border-green-200'
              : consensus?.type === 'close'
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-orange-50 border border-orange-200'
          }
        `}
      >
        <p
          className={`
            text-lg font-semibold
            ${
              consensus?.type === 'consensus'
                ? 'text-green-700'
                : consensus?.type === 'close'
                ? 'text-yellow-700'
                : 'text-orange-700'
            }
          `}
        >
          {consensus?.message}
        </p>

        {/* Show outliers if any */}
        {consensus?.outliers && consensus.outliers.length > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            Different view: {consensus.outliers.join(', ')}
          </p>
        )}
      </div>

      {/* Action buttons — host only */}
      {isHost ? (
        <div className="flex flex-wrap justify-center gap-3">
          {/* Accept & Next button */}
          {suggestedValue !== undefined && (
            <button
              onClick={() => onAccept(suggestedValue)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              Accept {suggestedValue} SP{hasNextItem ? ' & Next' : ''}
            </button>
          )}

          {/* Re-vote button */}
          <button
            onClick={onRevote}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            Re-vote
          </button>

          {/* Skip button */}
          {hasNextItem && (
            <button
              onClick={onSkip}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-500">Waiting for host to decide...</p>
      )}
    </div>
  )
}
