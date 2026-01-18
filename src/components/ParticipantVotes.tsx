import type { EstimationVote } from '../types/database'

interface Participant {
  name: string
  joinedAt: string
}

interface ParticipantVotesProps {
  participants: Participant[]
  votes: EstimationVote[]
  revealed: boolean
  currentParticipantName: string | null
}

// Map vote values to display text
function getVoteDisplay(vote: number | null): string {
  if (vote === null) return ''
  if (vote === -1) return '?'
  if (vote === -2) return '☕'
  return vote.toString()
}

export default function ParticipantVotes({
  participants,
  votes,
  revealed,
  currentParticipantName,
}: ParticipantVotesProps) {
  // Create a map of participant name to their vote
  const votesByParticipant = new Map<string, EstimationVote>()
  votes.forEach((vote) => {
    votesByParticipant.set(vote.participant_name, vote)
  })

  // Count voted participants
  const votedCount = votes.filter((v) => v.vote !== null).length
  const totalCount = participants.length

  return (
    <div className="mt-6">
      {/* Vote counter */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-700">Team Votes</h4>
        <span className="text-sm text-gray-500">
          {votedCount} of {totalCount} voted
        </span>
      </div>

      {/* Participant cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {participants.map((participant) => {
          const vote = votesByParticipant.get(participant.name)
          const hasVoted = vote?.vote !== null && vote?.vote !== undefined
          const isCurrentUser = participant.name === currentParticipantName

          return (
            <div
              key={participant.name}
              className={`
                relative rounded-lg p-3 text-center transition-all
                ${isCurrentUser ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}
                ${
                  hasVoted
                    ? revealed
                      ? 'bg-indigo-100 border border-indigo-200'
                      : 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border-2 border-dashed border-gray-300'
                }
              `}
            >
              {/* Vote display area */}
              <div className="h-10 flex items-center justify-center mb-2">
                {hasVoted ? (
                  revealed ? (
                    // Revealed state - show the vote value
                    <span className="text-2xl font-bold text-indigo-700">
                      {getVoteDisplay(vote?.vote ?? null)}
                    </span>
                  ) : (
                    // Voted but not revealed - show face-down card
                    <div className="w-8 h-10 bg-indigo-600 rounded shadow-sm flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )
                ) : (
                  // Waiting state - show placeholder
                  <div className="w-8 h-10 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                    <span className="text-gray-400 text-xs">...</span>
                  </div>
                )}
              </div>

              {/* Participant name */}
              <p
                className={`text-xs truncate ${
                  hasVoted ? 'text-gray-700 font-medium' : 'text-gray-500'
                }`}
                title={participant.name}
              >
                {participant.name}
                {isCurrentUser && ' (you)'}
              </p>

              {/* Status indicator for accessibility */}
              <span className="sr-only">
                {hasVoted
                  ? revealed
                    ? `${participant.name} voted ${getVoteDisplay(vote?.vote ?? null)}`
                    : `${participant.name} has voted`
                  : `Waiting for ${participant.name} to vote`}
              </span>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {participants.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No participants in session yet</p>
        </div>
      )}
    </div>
  )
}
