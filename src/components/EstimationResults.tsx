import { useEffect, useState } from 'react'
import type { EstimationVote } from '../types/database'
import { FIBONACCI_VALUES, getVoteStats } from '../lib/estimation'
import ConfettiBurst from './ConfettiBurst'

interface EstimationResultsProps {
  votes: EstimationVote[]
  onReveal: () => void
  onAccept: (storyPoints: number) => void
  onRevote: () => void
  onSkip: () => void
  revealed: boolean
  hasNextItem: boolean
  isHost: boolean
  participantCount?: number
}

// Get the index of a vote value in the Fibonacci sequence
function getFibonacciIndex(vote: number): number {
  return (FIBONACCI_VALUES as readonly number[]).indexOf(vote)
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
  participantCount = 0,
}: EstimationResultsProps) {
  // Count how many have voted (excluding null votes)
  const votedCount = votes.filter((v) => v.vote !== null).length
  const hasVotes = votedCount > 0

  // Calculate consensus if revealed
  const consensus = revealed ? calculateConsensus(votes) : null

  // Custom value picker — lets the host accept any value after discussion,
  // which is the only way to record an estimate when votes are spread
  const [showValuePicker, setShowValuePicker] = useState(false)
  useEffect(() => {
    if (!revealed) setShowValuePicker(false)
  }, [revealed])

  // Everyone in the room has cast a vote — the host can reveal immediately
  const allVotesIn = participantCount > 0 && votedCount >= participantCount

  if (!revealed) {
    // Show Reveal button for host, waiting message for participants
    return (
      <div className="mt-3 flex flex-col items-center gap-2">
        {allVotesIn && (
          <p className="text-sm font-medium text-green-600" role="status">
            All votes are in!
          </p>
        )}
        {isHost ? (
          <button
            onClick={onReveal}
            disabled={!hasVotes}
            className={`
              w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-base sm:text-lg transition-[colors,box-shadow]
              ${
                hasVotes
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
              ${allVotesIn ? 'animate-pulse motion-reduce:animate-none' : ''}
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

  const stats = getVoteStats(votes)
  const maxDistributionCount = stats.distribution.reduce(
    (max, d) => Math.max(max, d.count),
    0
  )

  // Get suggested value for Accept button
  const suggestedValue = consensus?.value

  // Show consensus indicator and action buttons
  return (
    <div className="mt-3 space-y-3">
      {/* Celebrate a clean consensus */}
      {consensus?.type === 'consensus' && <ConfettiBurst />}

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

        {/* Vote stats — fuel for the discussion */}
        {stats.average !== null && stats.median !== null && (
          <div className="mt-3 pt-3 border-t border-black/5">
            <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
              <span>
                Average <span className="font-semibold text-gray-900">{Number.isInteger(stats.average) ? stats.average : stats.average.toFixed(1)}</span>
              </span>
              <span>
                Median <span className="font-semibold text-gray-900">{Number.isInteger(stats.median) ? stats.median : stats.median.toFixed(1)}</span>
              </span>
            </div>
            {stats.distribution.length > 1 && (
              <div
                data-testid="vote-distribution"
                className="flex items-end justify-center gap-3 mt-3"
              >
                {stats.distribution.map((d) => (
                  <div key={d.value} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">×{d.count}</span>
                    <div
                      className="w-6 rounded-t bg-indigo-400/70"
                      style={{ height: `${8 + (d.count / maxDistributionCount) * 32}px` }}
                    />
                    <span className="text-xs font-semibold text-gray-700">{d.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons — host only */}
      {isHost ? (
        <>
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

            {/* Accept a different (or any) value after discussion */}
            <button
              onClick={() => setShowValuePicker((prev) => !prev)}
              className={`px-4 py-2 font-medium rounded-lg transition-colors shadow-sm border ${
                showValuePicker
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              aria-expanded={showValuePicker}
            >
              Choose value
            </button>

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

          {/* Custom value picker */}
          {showValuePicker && (
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {FIBONACCI_VALUES.map((value) => (
                <button
                  key={value}
                  onClick={() => onAccept(value)}
                  aria-label={`Accept ${value} story points`}
                  className="w-10 h-10 rounded-lg border-2 border-gray-300 bg-white text-gray-900 font-semibold hover:border-green-500 hover:bg-green-50 hover:text-green-700 transition-colors"
                >
                  {value}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-sm text-gray-500">Waiting for host to decide...</p>
      )}
    </div>
  )
}
