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
    <div className="mt-3">
      {/* Vote counter */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">Team Votes</h4>
        <span className="text-sm text-gray-500">
          {votedCount} of {totalCount} voted
        </span>
      </div>

      {/* Participant pills */}
      <div className="flex flex-wrap gap-1.5">
        {participants.map((participant) => {
          const vote = votesByParticipant.get(participant.name)
          const hasVoted = vote?.vote !== null && vote?.vote !== undefined
          const isCurrentUser = participant.name === currentParticipantName
          const isHostParticipant = participant.name === hostName

          return (
            <span
              key={participant.name}
              title={participant.name}
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                transition-colors
                ${isCurrentUser ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}
                ${
                  hasVoted
                    ? revealed
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }
              `}
            >
              {/* Status icon */}
              {hasVoted ? (
                revealed ? (
                  <span className="w-5 h-5 rounded bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {getVoteDisplay(vote?.vote ?? null)}
                  </span>
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )
              ) : (
                <span className="w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              )}

              {/* Participant name */}
              <span className="truncate max-w-[120px]">
                {participant.name}
                {isCurrentUser && ' (you)'}
              </span>

              {/* Host indicator */}
              {isHostParticipant && (
                <span className="text-indigo-400 flex-shrink-0" aria-hidden="true">★</span>
              )}
              {isHostParticipant && (
                <span className="sr-only">Host</span>
              )}

              {/* Status indicator for accessibility */}
              <span className="sr-only">
                {hasVoted
                  ? revealed
                    ? `${participant.name} voted ${getVoteDisplay(vote?.vote ?? null)}`
                    : `${participant.name} has voted`
                  : `Waiting for ${participant.name} to vote`}
              </span>
            </span>
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
