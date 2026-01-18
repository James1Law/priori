import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EstimatesView from '../../src/components/EstimatesView'
import type { ItemWithScore } from '../../src/types/database'

// Store for mock votes state
let mockVotes: Array<{ participant_name: string; vote: number | null }> = []
const mockSubmitVote = vi.fn((vote: number) => {
  // Simulate vote being added
  mockVotes = [{ participant_name: 'John', vote }]
})

// Mock the useEstimationVotes hook
vi.mock('../../src/hooks/useEstimationVotes', () => ({
  useEstimationVotes: () => ({
    votes: mockVotes,
    loading: false,
    error: null,
    submitVote: mockSubmitVote,
    clearVotes: vi.fn(),
  }),
}))

describe('EstimatesView', () => {
  // Reset mock state before each test
  beforeEach(() => {
    mockVotes = []
    mockSubmitVote.mockClear()
  })

  const createMockItem = (overrides: Partial<ItemWithScore> = {}): ItemWithScore => ({
    id: '1',
    session_id: 'session-1',
    title: 'Test Item',
    description: null,
    position: 0,
    backlog_position: null,
    created_by: null,
    created_at: '2024-01-01',
    roadmap_start_period: null,
    roadmap_end_period: null,
    roadmap_start_quadrant: null,
    roadmap_end_quadrant: null,
    roadmap_row: 0,
    story_points: null,
    ...overrides,
  })

  const mockItems: ItemWithScore[] = [
    createMockItem({ id: '1', title: 'Item 1', position: 0 }),
    createMockItem({ id: '2', title: 'Item 2', description: 'Description', position: 1, story_points: 5 }),
  ]

  const mockParticipants = [
    { name: 'John', joinedAt: '2024-01-01T00:00:00Z' },
    { name: 'Jane', joinedAt: '2024-01-01T00:01:00Z' },
  ]

  const defaultProps = {
    items: mockItems,
    sessionId: 'session-123',
    participantName: 'John',
    participants: mockParticipants,
    currentEstimationItemId: null,
    estimationRevealed: false,
    onCurrentItemChange: vi.fn(),
    onReveal: vi.fn(),
    onAccept: vi.fn(),
    onRevote: vi.fn(),
  }

  it('renders the Planning Poker heading', () => {
    render(<EstimatesView {...defaultProps} />)

    expect(screen.getByText('Planning Poker')).toBeInTheDocument()
  })

  it('renders the Estimation Queue heading', () => {
    render(<EstimatesView {...defaultProps} />)

    expect(screen.getByText('Estimation Queue')).toBeInTheDocument()
  })

  it('displays items in the queue', () => {
    render(<EstimatesView {...defaultProps} />)

    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('displays participant name', () => {
    render(<EstimatesView {...defaultProps} />)

    expect(screen.getByText(/Participant: John/)).toBeInTheDocument()
  })

  it('displays Anonymous when participant name is null', () => {
    render(<EstimatesView {...defaultProps} participantName={null} />)

    expect(screen.getByText(/Participant: Anonymous/)).toBeInTheDocument()
  })

  it('displays truncated session ID', () => {
    render(<EstimatesView {...defaultProps} sessionId="abc12345-6789" />)

    expect(screen.getByText(/Session: abc12345/)).toBeInTheDocument()
  })

  it('displays description text about Fibonacci story points', () => {
    render(<EstimatesView {...defaultProps} />)

    expect(
      screen.getByText(/Estimate items collaboratively with your team using Fibonacci story points/)
    ).toBeInTheDocument()
  })

  it('shows empty state message when no items', () => {
    render(<EstimatesView {...defaultProps} items={[]} />)

    expect(screen.getByText('No items to estimate.')).toBeInTheDocument()
    expect(screen.getByText('Add items in the Scoring view to begin estimation.')).toBeInTheDocument()
  })

  it('shows Start Estimation button when items exist', () => {
    render(<EstimatesView {...defaultProps} />)

    expect(screen.getByRole('button', { name: /start estimation/i })).toBeInTheDocument()
  })

  it('calls onCurrentItemChange when Start Estimation is clicked', () => {
    const onCurrentItemChange = vi.fn()
    render(<EstimatesView {...defaultProps} onCurrentItemChange={onCurrentItemChange} />)

    fireEvent.click(screen.getByRole('button', { name: /start estimation/i }))

    // Should call with the first unestimated item (Item 1, since Item 2 has story_points=5)
    expect(onCurrentItemChange).toHaveBeenCalledWith('1')
  })

  it('shows current item details when currentEstimationItemId is set', () => {
    const items = [
      createMockItem({ id: '1', title: 'Feature A', description: 'Build the feature' }),
    ]

    render(
      <EstimatesView
        {...defaultProps}
        items={items}
        currentEstimationItemId="1"
      />
    )

    expect(screen.getByText('Now estimating')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Feature A' })).toBeInTheDocument()
    // Description appears in both queue and main panel
    expect(screen.getAllByText('Build the feature').length).toBeGreaterThanOrEqual(1)
  })

  it('shows estimation cards when item is selected', () => {
    render(<EstimatesView {...defaultProps} currentEstimationItemId="1" />)

    // Card selection UI should be visible
    expect(screen.getByText('Select your estimate')).toBeInTheDocument()
    // Should show Fibonacci cards
    expect(screen.getByRole('button', { name: /5 story points/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /8 story points/i })).toBeInTheDocument()
  })

  it('allows selecting an estimation card', () => {
    render(<EstimatesView {...defaultProps} currentEstimationItemId="1" />)

    fireEvent.click(screen.getByRole('button', { name: /5 story points/i }))

    // Should call submitVote with the selected value
    expect(mockSubmitVote).toHaveBeenCalledWith(5)
  })

  it('calls onCurrentItemChange when selecting a different item', () => {
    const onCurrentItemChange = vi.fn()
    const items = [
      createMockItem({ id: '1', title: 'Item 1', position: 0 }),
      createMockItem({ id: '2', title: 'Item 2', position: 1 }),
    ]

    render(
      <EstimatesView
        {...defaultProps}
        items={items}
        currentEstimationItemId="1"
        onCurrentItemChange={onCurrentItemChange}
      />
    )

    // Click on a different item in the queue
    fireEvent.click(screen.getByText('Item 2'))

    expect(onCurrentItemChange).toHaveBeenCalledWith('2')
  })

  it('shows participant votes section when item is selected', () => {
    render(<EstimatesView {...defaultProps} currentEstimationItemId="1" />)

    // Should show the Team Votes header and vote counter
    expect(screen.getByText('Team Votes')).toBeInTheDocument()
    expect(screen.getByText('0 of 2 voted')).toBeInTheDocument()
  })

  it('shows participant cards in votes section', () => {
    render(<EstimatesView {...defaultProps} currentEstimationItemId="1" />)

    // Should show cards for both participants
    expect(screen.getByTitle('John')).toBeInTheDocument()
    expect(screen.getByTitle('Jane')).toBeInTheDocument()
  })

  it('shows Reveal Votes button when item is selected', () => {
    render(<EstimatesView {...defaultProps} currentEstimationItemId="1" />)

    expect(screen.getByRole('button', { name: /reveal votes/i })).toBeInTheDocument()
  })

  it('calls onReveal when Reveal Votes button is clicked', () => {
    const onReveal = vi.fn()
    // Need to have some votes for the button to be enabled
    mockVotes = [{ participant_name: 'John', vote: 5 }]
    render(<EstimatesView {...defaultProps} currentEstimationItemId="1" onReveal={onReveal} />)

    fireEvent.click(screen.getByRole('button', { name: /reveal votes/i }))

    expect(onReveal).toHaveBeenCalled()
  })

  it('does not show Reveal button when votes are revealed', () => {
    render(<EstimatesView {...defaultProps} currentEstimationItemId="1" estimationRevealed={true} />)

    expect(screen.queryByRole('button', { name: /reveal votes/i })).not.toBeInTheDocument()
  })

  it('shows action buttons after reveal with consensus', () => {
    mockVotes = [
      { participant_name: 'John', vote: 5 },
      { participant_name: 'Jane', vote: 5 },
    ]
    render(<EstimatesView {...defaultProps} currentEstimationItemId="1" estimationRevealed={true} />)

    // Should show Accept button with consensus value
    expect(screen.getByRole('button', { name: /accept 5 sp/i })).toBeInTheDocument()
    // Should show Re-vote button
    expect(screen.getByRole('button', { name: /re-vote/i })).toBeInTheDocument()
  })

  it('shows Skip button when there are more items to estimate', () => {
    mockVotes = [{ participant_name: 'John', vote: 5 }]
    // Item 1 is current, Item 2 already has story_points=5, but we add a third item without points
    const items = [
      createMockItem({ id: '1', title: 'Item 1', position: 0 }),
      createMockItem({ id: '2', title: 'Item 2', position: 1, story_points: 5 }),
      createMockItem({ id: '3', title: 'Item 3', position: 2 }), // No story points
    ]
    render(
      <EstimatesView
        {...defaultProps}
        items={items}
        currentEstimationItemId="1"
        estimationRevealed={true}
      />
    )

    expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument()
  })

  it('calls onRevote when Re-vote button is clicked', () => {
    const onRevote = vi.fn()
    mockVotes = [{ participant_name: 'John', vote: 5 }]
    render(
      <EstimatesView
        {...defaultProps}
        currentEstimationItemId="1"
        estimationRevealed={true}
        onRevote={onRevote}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /re-vote/i }))

    expect(onRevote).toHaveBeenCalled()
  })
})
