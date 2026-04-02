import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EstimationResults, { calculateConsensus } from '../../src/components/EstimationResults'
import type { EstimationVote } from '../../src/types/database'

describe('EstimationResults', () => {
  const createVote = (
    participantName: string,
    vote: number | null
  ): EstimationVote => ({
    id: `vote-${participantName}`,
    item_id: 'item-1',
    session_id: 'session-1',
    participant_name: participantName,
    vote,
    created_at: '2024-01-01T00:00:00Z',
  })

  const defaultProps = {
    votes: [] as EstimationVote[],
    onReveal: vi.fn(),
    onAccept: vi.fn(),
    onRevote: vi.fn(),
    onSkip: vi.fn(),
    revealed: false,
    hasNextItem: true,
    isHost: true,
  }

  describe('Reveal Button', () => {
    it('shows Reveal Votes button when not revealed', () => {
      render(<EstimationResults {...defaultProps} />)

      expect(screen.getByRole('button', { name: /reveal votes/i })).toBeInTheDocument()
    })

    it('disables Reveal button when no votes', () => {
      render(<EstimationResults {...defaultProps} votes={[]} />)

      const button = screen.getByRole('button', { name: /reveal votes/i })
      expect(button).toBeDisabled()
    })

    it('disables Reveal button when all votes are null', () => {
      const votes = [
        createVote('Alice', null),
        createVote('Bob', null),
      ]
      render(<EstimationResults {...defaultProps} votes={votes} />)

      const button = screen.getByRole('button', { name: /reveal votes/i })
      expect(button).toBeDisabled()
    })

    it('enables Reveal button when at least 1 vote', () => {
      const votes = [createVote('Alice', 5)]
      render(<EstimationResults {...defaultProps} votes={votes} />)

      const button = screen.getByRole('button', { name: /reveal votes/i })
      expect(button).not.toBeDisabled()
    })

    it('calls onReveal when button clicked', () => {
      const onReveal = vi.fn()
      const votes = [createVote('Alice', 5)]
      render(<EstimationResults {...defaultProps} votes={votes} onReveal={onReveal} />)

      fireEvent.click(screen.getByRole('button', { name: /reveal votes/i }))

      expect(onReveal).toHaveBeenCalled()
    })
  })

  describe('Consensus Display (when revealed)', () => {
    it('shows consensus message when >50% same vote', () => {
      const votes = [
        createVote('Alice', 5),
        createVote('Bob', 5),
        createVote('Charlie', 8),
      ]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} />)

      expect(screen.getByText('Consensus! 5 story points')).toBeInTheDocument()
    })

    it('shows close message when votes within 1 step', () => {
      const votes = [
        createVote('Alice', 5),
        createVote('Bob', 8),
      ]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} />)

      expect(screen.getByText(/Close - discuss briefly/)).toBeInTheDocument()
    })

    it('shows no consensus message when votes spread', () => {
      const votes = [
        createVote('Alice', 2),
        createVote('Bob', 13),
      ]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} />)

      expect(screen.getByText('No consensus - discuss')).toBeInTheDocument()
    })

    it('shows outliers when votes differ from majority', () => {
      const votes = [
        createVote('Alice', 5),
        createVote('Bob', 5),
        createVote('Charlie', 21), // Outlier - far from 5
      ]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} />)

      expect(screen.getByText(/Different view: Charlie/)).toBeInTheDocument()
    })

    it('does not show Reveal button when revealed', () => {
      render(<EstimationResults {...defaultProps} revealed={true} />)

      expect(screen.queryByRole('button', { name: /reveal votes/i })).not.toBeInTheDocument()
    })
  })

  describe('Action Buttons (when revealed)', () => {
    it('shows Accept button with consensus value', () => {
      const votes = [
        createVote('Alice', 5),
        createVote('Bob', 5),
      ]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} />)

      expect(screen.getByRole('button', { name: /accept 5 sp/i })).toBeInTheDocument()
    })

    it('shows Re-vote button', () => {
      const votes = [createVote('Alice', 5)]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} />)

      expect(screen.getByRole('button', { name: /re-vote/i })).toBeInTheDocument()
    })

    it('shows Skip button when hasNextItem is true', () => {
      const votes = [createVote('Alice', 5)]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} hasNextItem={true} />)

      expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument()
    })

    it('does not show Skip button when hasNextItem is false', () => {
      const votes = [createVote('Alice', 5)]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} hasNextItem={false} />)

      expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument()
    })

    it('calls onAccept with consensus value when Accept clicked', () => {
      const onAccept = vi.fn()
      const votes = [
        createVote('Alice', 5),
        createVote('Bob', 5),
      ]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} onAccept={onAccept} />)

      fireEvent.click(screen.getByRole('button', { name: /accept 5 sp/i }))

      expect(onAccept).toHaveBeenCalledWith(5)
    })

    it('calls onRevote when Re-vote clicked', () => {
      const onRevote = vi.fn()
      const votes = [createVote('Alice', 5)]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} onRevote={onRevote} />)

      fireEvent.click(screen.getByRole('button', { name: /re-vote/i }))

      expect(onRevote).toHaveBeenCalled()
    })

    it('calls onSkip when Skip clicked', () => {
      const onSkip = vi.fn()
      const votes = [createVote('Alice', 5)]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} onSkip={onSkip} />)

      fireEvent.click(screen.getByRole('button', { name: /skip/i }))

      expect(onSkip).toHaveBeenCalled()
    })

    it('shows "Accept X SP" without "& Next" when hasNextItem is false', () => {
      const votes = [createVote('Alice', 5)]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} hasNextItem={false} />)

      const button = screen.getByRole('button', { name: /accept 5 sp/i })
      expect(button.textContent).toBe('Accept 5 SP')
    })

    it('shows "Accept X SP & Next" when hasNextItem is true', () => {
      const votes = [createVote('Alice', 5)]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} hasNextItem={true} />)

      const button = screen.getByRole('button', { name: /accept 5 sp/i })
      expect(button.textContent).toBe('Accept 5 SP & Next')
    })

    it('does not show Accept button when no consensus value', () => {
      // No valid votes means no consensus value
      render(<EstimationResults {...defaultProps} votes={[]} revealed={true} />)

      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument()
    })
  })

  describe('Host Control', () => {
    it('hides Reveal button for non-host and shows waiting message', () => {
      const votes = [createVote('Alice', 5)]
      render(<EstimationResults {...defaultProps} votes={votes} isHost={false} />)

      expect(screen.queryByRole('button', { name: /reveal votes/i })).not.toBeInTheDocument()
      expect(screen.getByText('Waiting for host to reveal votes...')).toBeInTheDocument()
    })

    it('hides action buttons for non-host when revealed', () => {
      const votes = [
        createVote('Alice', 5),
        createVote('Bob', 5),
      ]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} isHost={false} />)

      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /re-vote/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument()
      expect(screen.getByText('Waiting for host to decide...')).toBeInTheDocument()
    })

    it('shows action buttons for host when revealed', () => {
      const votes = [
        createVote('Alice', 5),
        createVote('Bob', 5),
      ]
      render(<EstimationResults {...defaultProps} votes={votes} revealed={true} isHost={true} />)

      expect(screen.getByRole('button', { name: /accept 5 sp/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /re-vote/i })).toBeInTheDocument()
    })

    it('does not show waiting message for non-host when no votes yet', () => {
      render(<EstimationResults {...defaultProps} votes={[]} isHost={false} />)

      expect(screen.queryByText('Waiting for host to reveal votes...')).not.toBeInTheDocument()
    })
  })
})

describe('calculateConsensus', () => {
  const createVote = (
    participantName: string,
    vote: number | null
  ): EstimationVote => ({
    id: `vote-${participantName}`,
    item_id: 'item-1',
    session_id: 'session-1',
    participant_name: participantName,
    vote,
    created_at: '2024-01-01T00:00:00Z',
  })

  it('returns no-consensus for empty votes', () => {
    const result = calculateConsensus([])
    expect(result.type).toBe('no-consensus')
    expect(result.message).toBe('No valid votes to analyse')
  })

  it('returns no-consensus when only null votes', () => {
    const votes = [createVote('Alice', null), createVote('Bob', null)]
    const result = calculateConsensus(votes)
    expect(result.type).toBe('no-consensus')
  })

  it('ignores special votes (? and coffee)', () => {
    const votes = [
      createVote('Alice', 5),
      createVote('Bob', -1), // ?
      createVote('Charlie', -2), // coffee
    ]
    const result = calculateConsensus(votes)
    // Only Alice's vote counts, so it's consensus with that one vote
    expect(result.type).toBe('consensus')
    expect(result.value).toBe(5)
  })

  it('returns consensus when >50% same vote', () => {
    const votes = [
      createVote('Alice', 5),
      createVote('Bob', 5),
      createVote('Charlie', 8),
    ]
    const result = calculateConsensus(votes)
    expect(result.type).toBe('consensus')
    expect(result.value).toBe(5)
  })

  it('returns close when all votes within 1 step', () => {
    const votes = [
      createVote('Alice', 5),
      createVote('Bob', 8),
    ]
    const result = calculateConsensus(votes)
    expect(result.type).toBe('close')
    expect(result.message).toContain('5 vs 8')
  })

  it('returns no-consensus when votes spread', () => {
    const votes = [
      createVote('Alice', 2),
      createVote('Bob', 13),
    ]
    const result = calculateConsensus(votes)
    expect(result.type).toBe('no-consensus')
  })

  it('identifies outliers correctly', () => {
    const votes = [
      createVote('Alice', 5),
      createVote('Bob', 5),
      createVote('Charlie', 21), // Far from 5
    ]
    const result = calculateConsensus(votes)
    expect(result.outliers).toContain('Charlie')
    expect(result.outliers).not.toContain('Alice')
    expect(result.outliers).not.toContain('Bob')
  })

  it('does not mark adjacent votes as outliers', () => {
    const votes = [
      createVote('Alice', 5),
      createVote('Bob', 5),
      createVote('Charlie', 8), // Adjacent to 5
    ]
    const result = calculateConsensus(votes)
    expect(result.outliers).not.toContain('Charlie')
  })

  it('handles unanimous vote', () => {
    const votes = [
      createVote('Alice', 5),
      createVote('Bob', 5),
      createVote('Charlie', 5),
    ]
    const result = calculateConsensus(votes)
    expect(result.type).toBe('consensus')
    expect(result.value).toBe(5)
    expect(result.outliers).toHaveLength(0)
  })

  it('handles single vote as consensus', () => {
    const votes = [createVote('Alice', 8)]
    const result = calculateConsensus(votes)
    expect(result.type).toBe('consensus')
    expect(result.value).toBe(8)
  })

  it('handles 0 as valid vote', () => {
    const votes = [
      createVote('Alice', 0),
      createVote('Bob', 0),
    ]
    const result = calculateConsensus(votes)
    expect(result.type).toBe('consensus')
    expect(result.value).toBe(0)
  })
})
