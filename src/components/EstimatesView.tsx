import { useEffect, useState } from 'react'
import type { ItemWithScore } from '../types/database'
import EstimationQueue from './EstimationQueue'
import EstimationCards from './EstimationCards'
import CurrentEstimationItem from './CurrentEstimationItem'
import ParticipantVotes from './ParticipantVotes'
import EstimationResults from './EstimationResults'
import { useEstimationVotes } from '../hooks/useEstimationVotes'

interface Participant {
  name: string
  joinedAt: string
}

interface EstimatesViewProps {
  items: ItemWithScore[]
  sessionId: string
  participantName: string | null
  participants: Participant[]
  currentEstimationItemId: string | null
  estimationRevealed: boolean
  onCurrentItemChange: (itemId: string | null) => void
  onReveal: () => void
  onAccept: (itemId: string, storyPoints: number) => void
  onRevote: () => void
}

export default function EstimatesView({
  items,
  sessionId,
  participantName,
  participants,
  currentEstimationItemId,
  estimationRevealed,
  onCurrentItemChange,
  onReveal,
  onAccept,
  onRevote,
}: EstimatesViewProps) {
  // Hook for managing votes with real-time sync
  const { votes, submitVote } = useEstimationVotes(
    sessionId,
    currentEstimationItemId,
    participantName
  )

  // Get current user's vote for the selected card display
  const currentUserVote = votes.find(
    (v) => v.participant_name === participantName
  )
  const selectedVote = currentUserVote?.vote ?? null

  // Reset vote display when current item changes (votes will be fetched fresh by hook)
  useEffect(() => {
    // No local state to reset - votes are managed by the hook
  }, [currentEstimationItemId])

  const handleStartEstimation = () => {
    // Find first unestimated item
    const sortedItems = [...items].sort((a, b) => {
      const posA = a.backlog_position ?? a.position
      const posB = b.backlog_position ?? b.position
      return posA - posB
    })

    const firstUnestimated = sortedItems.find(
      (item) => item.story_points === null || item.story_points === undefined
    )

    if (firstUnestimated) {
      onCurrentItemChange(firstUnestimated.id)
    }
  }

  const [selectedQueueItemId, setSelectedQueueItemId] = useState<string | null>(null)

  const handleSelectItem = (itemId: string) => {
    setSelectedQueueItemId(itemId === selectedQueueItemId ? null : itemId)
  }

  const handleSelectCard = (value: number) => {
    // Save vote to database (real-time sync will update other participants)
    submitVote(value)
  }

  const currentItem = currentEstimationItemId
    ? items.find((item) => item.id === currentEstimationItemId)
    : null

  // Find next unestimated item (excluding current)
  const getNextUnestimatedItem = () => {
    const sortedItems = [...items].sort((a, b) => {
      const posA = a.backlog_position ?? a.position
      const posB = b.backlog_position ?? b.position
      return posA - posB
    })

    return sortedItems.find(
      (item) =>
        item.id !== currentEstimationItemId &&
        (item.story_points === null || item.story_points === undefined)
    )
  }

  const nextUnestimatedItem = getNextUnestimatedItem()
  const hasNextItem = nextUnestimatedItem !== undefined

  const handleAccept = (storyPoints: number) => {
    if (!currentEstimationItemId) return
    onAccept(currentEstimationItemId, storyPoints)
    // Move to next item (or clear selection if no more items)
    if (nextUnestimatedItem) {
      onCurrentItemChange(nextUnestimatedItem.id)
    } else {
      onCurrentItemChange(null)
    }
  }

  const handleSkip = () => {
    // Move to next item without saving
    if (nextUnestimatedItem) {
      onCurrentItemChange(nextUnestimatedItem.id)
    } else {
      onCurrentItemChange(null)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[400px]">
      {/* Queue sidebar */}
      <div className="lg:w-80 lg:border-r lg:border-gray-200 p-4 bg-gray-50 lg:bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Estimation Queue
        </h3>
        <EstimationQueue
          items={items}
          currentItemId={currentEstimationItemId}
          selectedItemId={selectedQueueItemId}
          onStartEstimation={handleStartEstimation}
          onSelectItem={handleSelectItem}
          onConfirmItem={(itemId) => {
            setSelectedQueueItemId(null)
            onCurrentItemChange(itemId)
          }}
          isHost={true}
        />
      </div>

      {/* Main estimation area */}
      <div className="flex-1 p-4 lg:p-8">
        {currentItem ? (
          <div className="max-w-2xl mx-auto">
            {/* Current item display */}
            <CurrentEstimationItem item={currentItem} />

            {/* Card selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <EstimationCards
                selectedValue={selectedVote}
                onSelect={handleSelectCard}
              />
            </div>

            {/* Participant votes */}
            <ParticipantVotes
              participants={participants}
              votes={votes}
              revealed={estimationRevealed}
              currentParticipantName={participantName}
              hostName={null}
            />

            {/* Reveal button and results */}
            <EstimationResults
              votes={votes}
              onReveal={onReveal}
              onAccept={handleAccept}
              onRevote={onRevote}
              onSkip={handleSkip}
              revealed={estimationRevealed}
              hasNextItem={hasNextItem}
              isHost={true}
            />
          </div>
        ) : (
          /* Empty state when no item selected */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Poker Planner
            </h2>
            <p className="text-gray-600 mb-4 max-w-sm">
              Estimate items collaboratively with your team using Fibonacci story points.
            </p>
            {items.length > 0 ? (
              <p className="text-sm text-gray-500">
                Select an item from the queue or click "Start Estimation" to begin.
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Add items in the Scoring view to begin estimation.
              </p>
            )}
            <p className="text-xs text-gray-400 mt-4">
              Session: {sessionId.slice(0, 8)}... | Participant: {participantName || 'Anonymous'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
