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
  hostName: string | null
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
  hostName,
}: ParticipantVotesProps) {
  // Create a map of participant name to their vote
  const votesByParticipant = new Map<string, EstimationVote>()
  votes.forEach((vote) => {
    votesByParticipant.set(vote.participant_name, vote)
  })

  // Get set of active participant names for filtering
  const activeParticipantNames = new Set(participants.map(p => p.name))

  // Count voted participants - only count votes from active participants
  const votedCount = votes.filter(
    (v) => v.vote !== null && activeParticipantNames.has(v.participant_name)
  ).length
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
          const isHostParticipant = participant.name === hostName

          return (
            <div
              key={participant.name}
              className={`
                relative rounded-lg p-3 text-center transition-colors
                ${isCurrentUser ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
                ${
                  hasVoted
                    ? revealed
                      ? 'bg-indigo-50 border border-indigo-200'
                      : 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-200'
                }
              `}
            >
              {/* Vote display area */}
              <div className="h-12 flex items-center justify-center mb-2">
                {hasVoted ? (
                  revealed ? (
                    // Revealed state - show the vote value prominently
                    <div className="w-10 h-12 bg-indigo-600 rounded-lg shadow-md flex items-center justify-center">
                      <span className="text-xl font-bold text-white">
                        {getVoteDisplay(vote?.vote ?? null)}
                      </span>
                    </div>
                  ) : (
                    // Voted but not revealed - show "Ready" with checkmark
                    <div className="w-10 h-12 bg-green-500 rounded-lg shadow-md flex flex-col items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )
                ) : (
                  // Waiting state - show hourglass/waiting indicator
                  <div className="w-10 h-12 bg-gray-100 border-2 border-gray-200 rounded-lg flex flex-col items-center justify-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
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
              {isHostParticipant && (
                <span className="inline-flex items-center text-[10px] font-medium text-indigo-600">
                  Host
                </span>
              )}

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
