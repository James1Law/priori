import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ParticipantVotes from '../../src/components/ParticipantVotes'
import type { EstimationVote } from '../../src/types/database'

describe('ParticipantVotes', () => {
  const mockParticipants = [
    { name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
    { name: 'Bob', joinedAt: '2024-01-01T00:01:00Z' },
    { name: 'Charlie', joinedAt: '2024-01-01T00:02:00Z' },
  ]

  const createVote = (
    participantName: string,
    vote: number | null,
    itemId = 'item-1'
  ): EstimationVote => ({
    id: `vote-${participantName}`,
    item_id: itemId,
    session_id: 'session-1',
    participant_name: participantName,
    vote,
    created_at: '2024-01-01T00:00:00Z',
  })

  const defaultProps = {
    participants: mockParticipants,
    votes: [] as EstimationVote[],
    revealed: false,
    currentParticipantName: 'Alice',
  }

  describe('Vote Counter', () => {
    it('displays "0 of 3 voted" when no one has voted', () => {
      render(<ParticipantVotes {...defaultProps} />)

      expect(screen.getByText('0 of 3 voted')).toBeInTheDocument()
    })

    it('displays "1 of 3 voted" when one person has voted', () => {
      const votes = [createVote('Alice', 5)]
      render(<ParticipantVotes {...defaultProps} votes={votes} />)

      expect(screen.getByText('1 of 3 voted')).toBeInTheDocument()
    })

    it('displays "3 of 3 voted" when everyone has voted', () => {
      const votes = [
        createVote('Alice', 5),
        createVote('Bob', 8),
        createVote('Charlie', 5),
      ]
      render(<ParticipantVotes {...defaultProps} votes={votes} />)

      expect(screen.getByText('3 of 3 voted')).toBeInTheDocument()
    })

    it('does not count null votes in the voted count', () => {
      const votes = [
        createVote('Alice', 5),
        createVote('Bob', null), // Not actually voted yet
      ]
      render(<ParticipantVotes {...defaultProps} votes={votes} />)

      expect(screen.getByText('1 of 3 voted')).toBeInTheDocument()
    })
  })

  describe('Participant Cards', () => {
    it('renders a card for each participant', () => {
      render(<ParticipantVotes {...defaultProps} />)

      expect(screen.getByTitle('Alice')).toBeInTheDocument()
      expect(screen.getByTitle('Bob')).toBeInTheDocument()
      expect(screen.getByTitle('Charlie')).toBeInTheDocument()
    })

    it('marks the current user with "(you)"', () => {
      render(<ParticipantVotes {...defaultProps} />)

      expect(screen.getByText('Alice (you)')).toBeInTheDocument()
    })

    it('shows waiting state (clock icon) for participants who have not voted', () => {
      render(<ParticipantVotes {...defaultProps} />)

      // Check for waiting state via screen reader text
      expect(screen.getByText('Waiting for Alice to vote')).toBeInTheDocument()
      expect(screen.getByText('Waiting for Bob to vote')).toBeInTheDocument()
      expect(screen.getByText('Waiting for Charlie to vote')).toBeInTheDocument()
    })
  })

  describe('Waiting State', () => {
    it('shows waiting indicator for unvoted participant', () => {
      const votes = [createVote('Alice', 5)]
      render(<ParticipantVotes {...defaultProps} votes={votes} />)

      // Bob and Charlie should still show waiting state (via screen reader text)
      expect(screen.getByText('Waiting for Bob to vote')).toBeInTheDocument()
      expect(screen.getByText('Waiting for Charlie to vote')).toBeInTheDocument()
      // Alice should show voted state
      expect(screen.getByText('Alice has voted')).toBeInTheDocument()
    })
  })

  describe('Voted State (Hidden)', () => {
    it('shows ready indicator when voted but not revealed', () => {
      const votes = [createVote('Alice', 5)]
      render(<ParticipantVotes {...defaultProps} votes={votes} revealed={false} />)

      // Should show "has voted" in screen reader text
      expect(screen.getByText('Alice has voted')).toBeInTheDocument()
    })

    it('does not show vote value when not revealed', () => {
      const votes = [createVote('Alice', 5)]
      render(<ParticipantVotes {...defaultProps} votes={votes} revealed={false} />)

      // The "5" value should not be visible in the main content
      // (it may appear in sr-only text)
      const visibleText = screen.queryByRole('button')
      expect(visibleText).not.toBeInTheDocument()
    })
  })

  describe('Revealed State', () => {
    it('shows vote values when revealed', () => {
      const votes = [
        createVote('Alice', 5),
        createVote('Bob', 8),
        createVote('Charlie', 3),
      ]
      render(<ParticipantVotes {...defaultProps} votes={votes} revealed={true} />)

      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('shows "?" for uncertain vote (-1) when revealed', () => {
      const votes = [createVote('Alice', -1)]
      render(<ParticipantVotes {...defaultProps} votes={votes} revealed={true} />)

      expect(screen.getByText('?')).toBeInTheDocument()
    })

    it('shows coffee emoji for coffee break vote (-2) when revealed', () => {
      const votes = [createVote('Alice', -2)]
      render(<ParticipantVotes {...defaultProps} votes={votes} revealed={true} />)

      expect(screen.getByText('☕')).toBeInTheDocument()
    })

    it('shows "0" for zero estimate when revealed', () => {
      const votes = [createVote('Alice', 0)]
      render(<ParticipantVotes {...defaultProps} votes={votes} revealed={true} />)

      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })

  describe('Visual Styling', () => {
    it('applies ring highlight to current user card', () => {
      render(<ParticipantVotes {...defaultProps} />)

      // Find the card container for Alice
      const aliceText = screen.getByText('Alice (you)')
      const aliceCard = aliceText.closest('div[class*="rounded-lg"]')
      expect(aliceCard).toHaveClass('ring-2', 'ring-indigo-500')
    })

    it('applies green styling to voted but not revealed cards', () => {
      const votes = [createVote('Alice', 5)]
      render(<ParticipantVotes {...defaultProps} votes={votes} revealed={false} />)

      const aliceText = screen.getByText('Alice (you)')
      const aliceCard = aliceText.closest('div[class*="rounded-lg"]')
      expect(aliceCard).toHaveClass('bg-green-50', 'border-green-200')
    })

    it('applies indigo styling to revealed cards', () => {
      const votes = [createVote('Alice', 5)]
      render(<ParticipantVotes {...defaultProps} votes={votes} revealed={true} />)

      const aliceText = screen.getByText('Alice (you)')
      const aliceCard = aliceText.closest('div[class*="rounded-lg"]')
      expect(aliceCard).toHaveClass('bg-indigo-50', 'border-indigo-200')
    })
  })

  describe('Empty State', () => {
    it('shows empty message when no participants', () => {
      render(<ParticipantVotes {...defaultProps} participants={[]} />)

      expect(screen.getByText('No participants in session yet')).toBeInTheDocument()
    })

    it('still shows vote counter with 0 participants', () => {
      render(<ParticipantVotes {...defaultProps} participants={[]} />)

      expect(screen.getByText('0 of 0 voted')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('includes screen reader text for waiting state', () => {
      render(<ParticipantVotes {...defaultProps} />)

      expect(screen.getByText('Waiting for Bob to vote')).toBeInTheDocument()
    })

    it('includes screen reader text for voted state', () => {
      const votes = [createVote('Bob', 5)]
      render(<ParticipantVotes {...defaultProps} votes={votes} revealed={false} />)

      expect(screen.getByText('Bob has voted')).toBeInTheDocument()
    })

    it('includes screen reader text for revealed vote', () => {
      const votes = [createVote('Bob', 5)]
      render(<ParticipantVotes {...defaultProps} votes={votes} revealed={true} />)

      expect(screen.getByText('Bob voted 5')).toBeInTheDocument()
    })

    it('has accessible header', () => {
      render(<ParticipantVotes {...defaultProps} />)

      expect(screen.getByText('Team Votes')).toBeInTheDocument()
    })
  })

  describe('Participant Name Truncation', () => {
    it('shows full name in title attribute for long names', () => {
      const longNameParticipants = [
        { name: 'Very Long Participant Name Here', joinedAt: '2024-01-01T00:00:00Z' },
      ]
      render(
        <ParticipantVotes
          {...defaultProps}
          participants={longNameParticipants}
          currentParticipantName="Other"
        />
      )

      const nameElement = screen.getByTitle('Very Long Participant Name Here')
      expect(nameElement).toBeInTheDocument()
    })
  })

  describe('Edge Cases - Real-time Sync', () => {
    it('handles participant who left but has a vote (vote persists)', () => {
      // Dave voted but then left the session (not in participants list)
      const votes = [
        createVote('Alice', 5),
        createVote('Dave', 8), // Dave is not in participants
      ]
      // Only Alice is in participants now
      const currentParticipants = [{ name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' }]

      render(
        <ParticipantVotes
          {...defaultProps}
          participants={currentParticipants}
          votes={votes}
          revealed={true}
        />
      )

      // Alice's vote should be shown
      expect(screen.getByText('5')).toBeInTheDocument()
      // Dave's vote is in the database but he's not shown as a participant
      // This is correct behaviour - we only show current participants
      expect(screen.queryByTitle('Dave')).not.toBeInTheDocument()
      // Only 1 participant card is shown (Alice)
      const cards = screen.getAllByTitle('Alice')
      expect(cards.length).toBe(1)
    })

    it('shows correct vote count when late joiner has not voted', () => {
      // Alice and Bob voted, then Charlie joins (late joiner)
      const votes = [
        createVote('Alice', 5),
        createVote('Bob', 8),
        // Charlie has no vote yet
      ]

      render(<ParticipantVotes {...defaultProps} votes={votes} />)

      // 2 of 3 voted (Alice and Bob)
      expect(screen.getByText('2 of 3 voted')).toBeInTheDocument()
      // Charlie should show waiting state (via screen reader text)
      expect(screen.getByText('Waiting for Charlie to vote')).toBeInTheDocument()
    })

    it('handles vote updates from same participant (changing vote before reveal)', () => {
      // Alice changed her vote from 5 to 8 (same participant, updated vote)
      const votes = [createVote('Alice', 8)]

      render(<ParticipantVotes {...defaultProps} votes={votes} revealed={true} />)

      // Should show the latest vote value
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.queryByText('5')).not.toBeInTheDocument()
    })
  })
})
