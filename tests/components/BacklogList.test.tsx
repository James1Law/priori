import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BacklogList from '../../src/components/BacklogList'
import type { ItemWithScore } from '../../src/types/database'

describe('BacklogList', () => {
  const mockItems: ItemWithScore[] = [
    {
      id: '1',
      session_id: 'session-1',
      title: 'First Item',
      description: 'First description',
      position: 1,
      backlog_position: null,
      created_by: 'Alice',
      created_at: '2024-01-01',
      roadmap_start_period: null,
      roadmap_end_period: null,
      roadmap_start_quadrant: null,
      roadmap_end_quadrant: null,
      roadmap_row: 0,
      score: {
        id: 'score-1',
        item_id: '1',
        framework: 'rice',
        criteria: { reach: 100, impact: 2, confidence: 0.8, effort: 1 },
        calculated_score: 160,
      },
    },
    {
      id: '2',
      session_id: 'session-1',
      title: 'Second Item',
      description: 'Second description',
      position: 2,
      backlog_position: null,
      created_by: 'Bob',
      created_at: '2024-01-02',
      roadmap_start_period: null,
      roadmap_end_period: null,
      roadmap_start_quadrant: null,
      roadmap_end_quadrant: null,
      roadmap_row: 0,
      score: {
        id: 'score-2',
        item_id: '2',
        framework: 'rice',
        criteria: { reach: 50, impact: 1, confidence: 0.5, effort: 1 },
        calculated_score: 25,
      },
    },
    {
      id: '3',
      session_id: 'session-1',
      title: 'Third Item',
      description: null,
      position: 3,
      backlog_position: null,
      created_by: null,
      created_at: '2024-01-03',
      roadmap_start_period: null,
      roadmap_end_period: null,
      roadmap_start_quadrant: null,
      roadmap_end_quadrant: null,
      roadmap_row: 0,
      score: {
        id: 'score-3',
        item_id: '3',
        framework: 'rice',
        criteria: { reach: 200, impact: 3, confidence: 1, effort: 2 },
        calculated_score: 300,
      },
    },
  ]

  const defaultProps = {
    items: mockItems,
    framework: 'rice' as const,
    isManualOrder: false,
    cutoffPosition: null as number | null,
    cutoffLabel: null as string | null,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onReorder: vi.fn(),
    onResetOrder: vi.fn(),
    onCutoffChange: vi.fn(),
    onCutoffLabelChange: vi.fn(),
  }

  it('renders empty state when no items', () => {
    render(<BacklogList {...defaultProps} items={[]} />)
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument()
  })

  it('renders all items', () => {
    render(<BacklogList {...defaultProps} />)
    expect(screen.getByText('First Item')).toBeInTheDocument()
    expect(screen.getByText('Second Item')).toBeInTheDocument()
    expect(screen.getByText('Third Item')).toBeInTheDocument()
  })

  it('sorts items by score descending', () => {
    render(<BacklogList {...defaultProps} />)

    const items = screen.getAllByRole('article')
    // Third Item (300) should be first, First Item (160) second, Second Item (25) third
    expect(items[0]).toHaveTextContent('Third Item')
    expect(items[1]).toHaveTextContent('First Item')
    expect(items[2]).toHaveTextContent('Second Item')
  })

  it('displays rank numbers based on sorted order', () => {
    render(<BacklogList {...defaultProps} />)

    // Ranks should be 1, 2, 3 based on sorted order
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('displays item descriptions when present', () => {
    render(<BacklogList {...defaultProps} />)
    expect(screen.getByText('First description')).toBeInTheDocument()
    expect(screen.getByText('Second description')).toBeInTheDocument()
  })

  it('displays score badge with RICE format', () => {
    render(<BacklogList {...defaultProps} framework="rice" />)
    expect(screen.getByText('RICE: 300')).toBeInTheDocument()
    expect(screen.getByText('RICE: 160')).toBeInTheDocument()
    expect(screen.getByText('RICE: 25')).toBeInTheDocument()
  })

  it('displays score badge with ICE format', () => {
    const iceItems: ItemWithScore[] = [
      {
        ...mockItems[0],
        score: {
          id: 'score-1',
          item_id: '1',
          framework: 'ice',
          criteria: { impact: 7, confidence: 8, ease: 6 },
          calculated_score: 7,
        },
      },
    ]
    render(<BacklogList {...defaultProps} items={iceItems} framework="ice" />)
    expect(screen.getByText('ICE: 7.0')).toBeInTheDocument()
  })

  it('displays score badge with Value/Effort format', () => {
    const veItems: ItemWithScore[] = [
      {
        ...mockItems[0],
        score: {
          id: 'score-1',
          item_id: '1',
          framework: 'value_effort',
          criteria: { value: 8, effort: 3 },
          calculated_score: 2.67,
        },
      },
    ]
    render(<BacklogList {...defaultProps} items={veItems} framework="value_effort" />)
    expect(screen.getByText('V/E: 2.7')).toBeInTheDocument()
  })

  it('displays MoSCoW category as score', () => {
    const moscowItems: ItemWithScore[] = [
      {
        ...mockItems[0],
        score: {
          id: 'score-1',
          item_id: '1',
          framework: 'moscow',
          criteria: { category: 'Must' },
          calculated_score: 4,
        },
      },
    ]
    render(<BacklogList {...defaultProps} items={moscowItems} framework="moscow" />)
    expect(screen.getByText('Must')).toBeInTheDocument()
  })

  it('displays weighted score format', () => {
    const weightedItems: ItemWithScore[] = [
      {
        ...mockItems[0],
        score: {
          id: 'score-1',
          item_id: '1',
          framework: 'weighted',
          criteria: { scores: { c1: 8, c2: 7 } },
          calculated_score: 7.5,
        },
      },
    ]
    render(<BacklogList {...defaultProps} items={weightedItems} framework="weighted" />)
    expect(screen.getByText('Score: 7.50')).toBeInTheDocument()
  })

  it('displays dash when item has no score', () => {
    const noScoreItems: ItemWithScore[] = [
      {
        id: '1',
        session_id: 'session-1',
        title: 'No Score Item',
        description: null,
        position: 1,
        created_by: null,
        created_at: '2024-01-01',
      },
    ]
    render(<BacklogList {...defaultProps} items={noScoreItems} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn()
    render(<BacklogList {...defaultProps} onEdit={onEdit} />)

    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    fireEvent.click(editButtons[0])

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Third Item' }))
  })

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn()
    render(<BacklogList {...defaultProps} onDelete={onDelete} />)

    // Get the desktop delete buttons (there are both mobile and desktop versions)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    expect(onDelete).toHaveBeenCalledWith('3') // Third item is first due to sorting
  })

  it('handles items with zero scores', () => {
    const zeroScoreItems: ItemWithScore[] = [
      {
        ...mockItems[0],
        score: {
          id: 'score-1',
          item_id: '1',
          framework: 'rice',
          criteria: {},
          calculated_score: 0,
        },
      },
    ]
    render(<BacklogList {...defaultProps} items={zeroScoreItems} />)
    expect(screen.getByText('RICE: 0')).toBeInTheDocument()
  })

  it('shows Score order indicator when not in manual order', () => {
    render(<BacklogList {...defaultProps} isManualOrder={false} />)
    expect(screen.getByText('Order: Score')).toBeInTheDocument()
  })

  it('shows Manual order indicator when in manual order', () => {
    render(<BacklogList {...defaultProps} isManualOrder={true} />)
    expect(screen.getByText('Order: Manual')).toBeInTheDocument()
  })

  it('shows Reset button only when in manual order', () => {
    const { rerender } = render(<BacklogList {...defaultProps} isManualOrder={false} />)
    expect(screen.queryByText('Reset to Score')).not.toBeInTheDocument()

    rerender(<BacklogList {...defaultProps} isManualOrder={true} />)
    expect(screen.getByText('Reset to Score')).toBeInTheDocument()
  })

  it('calls onResetOrder when Reset button clicked', () => {
    const onResetOrder = vi.fn()
    render(<BacklogList {...defaultProps} isManualOrder={true} onResetOrder={onResetOrder} />)

    fireEvent.click(screen.getByText('Reset to Score'))
    expect(onResetOrder).toHaveBeenCalled()
  })

  it('renders drag handles for each item', () => {
    render(<BacklogList {...defaultProps} />)
    const dragHandles = screen.getAllByLabelText('Drag to reorder')
    expect(dragHandles).toHaveLength(3)
  })

  // Cutoff line tests
  it('shows add cutoff buttons between items when no cutoff set', () => {
    render(<BacklogList {...defaultProps} cutoffPosition={null} />)
    const addButtons = screen.getAllByLabelText('Add cutoff line here')
    // Should show between items (2 buttons for 3 items)
    expect(addButtons).toHaveLength(2)
  })

  it('does not show add cutoff buttons when cutoff is set', () => {
    render(<BacklogList {...defaultProps} cutoffPosition={1} />)
    expect(screen.queryByLabelText('Add cutoff line here')).not.toBeInTheDocument()
  })

  it('renders cutoff line at correct position', () => {
    render(<BacklogList {...defaultProps} cutoffPosition={1} cutoffLabel="Sprint 1" />)
    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
  })

  it('renders default cutoff label when none provided', () => {
    render(<BacklogList {...defaultProps} cutoffPosition={1} cutoffLabel={null} />)
    expect(screen.getByText('Cutoff')).toBeInTheDocument()
  })

  it('calls onCutoffChange when add cutoff button clicked', () => {
    const onCutoffChange = vi.fn()
    render(<BacklogList {...defaultProps} cutoffPosition={null} onCutoffChange={onCutoffChange} />)

    const addButtons = screen.getAllByLabelText('Add cutoff line here')
    fireEvent.click(addButtons[0])
    expect(onCutoffChange).toHaveBeenCalledWith(1)
  })

  it('calls onCutoffChange with null when remove cutoff button clicked', () => {
    const onCutoffChange = vi.fn()
    render(<BacklogList {...defaultProps} cutoffPosition={1} onCutoffChange={onCutoffChange} />)

    const removeButton = screen.getByLabelText('Remove cutoff line')
    fireEvent.click(removeButton)
    expect(onCutoffChange).toHaveBeenCalledWith(null)
  })

  it('applies opacity to items below cutoff line', () => {
    const { container } = render(<BacklogList {...defaultProps} cutoffPosition={1} />)
    const articles = container.querySelectorAll('article')
    // Third Item should be first (highest score), below cutoff
    // Second and First items should be below cutoff (positions 1 and 2)
    // Note: items are sorted by score, so order is: Third (300), First (160), Second (25)
    // With cutoff at position 1, items at index 1 and 2 should be greyed out
    expect(articles[0]).not.toHaveClass('opacity-50') // Third Item (in scope)
    expect(articles[1]).toHaveClass('opacity-50') // First Item (out of scope)
    expect(articles[2]).toHaveClass('opacity-50') // Second Item (out of scope)
  })

  // Interactive cutoff tests
  it('renders move up/down buttons on cutoff line', () => {
    render(<BacklogList {...defaultProps} cutoffPosition={2} />)
    expect(screen.getByLabelText('Move cutoff up')).toBeInTheDocument()
    expect(screen.getByLabelText('Move cutoff down')).toBeInTheDocument()
  })

  it('disables move up button when cutoff at top', () => {
    render(<BacklogList {...defaultProps} cutoffPosition={1} />)
    const moveUpButton = screen.getByLabelText('Move cutoff up')
    expect(moveUpButton).toBeDisabled()
  })

  it('disables move down button when cutoff at last position', () => {
    // With 3 items, position 3 means cutoff is after all items
    // The cutoff line should be rendered at position 3, showing all items above it
    // The "move down" button should be disabled since there's nowhere to move down to
    render(<BacklogList {...defaultProps} cutoffPosition={3} cutoffLabel="Cutoff" />)
    const moveDownButton = screen.getByLabelText('Move cutoff down')
    expect(moveDownButton).toBeDisabled()
  })

  it('calls onCutoffChange when move up clicked', () => {
    const onCutoffChange = vi.fn()
    render(<BacklogList {...defaultProps} cutoffPosition={2} onCutoffChange={onCutoffChange} />)

    fireEvent.click(screen.getByLabelText('Move cutoff up'))
    expect(onCutoffChange).toHaveBeenCalledWith(1)
  })

  it('calls onCutoffChange when move down clicked', () => {
    const onCutoffChange = vi.fn()
    render(<BacklogList {...defaultProps} cutoffPosition={2} onCutoffChange={onCutoffChange} />)

    fireEvent.click(screen.getByLabelText('Move cutoff down'))
    expect(onCutoffChange).toHaveBeenCalledWith(3)
  })

  it('shows edit label button', () => {
    render(<BacklogList {...defaultProps} cutoffPosition={1} cutoffLabel="Sprint 1" />)
    expect(screen.getByLabelText('Edit cutoff label')).toBeInTheDocument()
  })

  it('shows input when edit label clicked', () => {
    render(<BacklogList {...defaultProps} cutoffPosition={1} cutoffLabel="Sprint 1" />)

    fireEvent.click(screen.getByLabelText('Edit cutoff label'))
    expect(screen.getByLabelText('Cutoff label')).toBeInTheDocument()
  })

  it('calls onCutoffLabelChange when label edited', () => {
    const onCutoffLabelChange = vi.fn()
    render(<BacklogList {...defaultProps} cutoffPosition={1} cutoffLabel="Sprint 1" onCutoffLabelChange={onCutoffLabelChange} />)

    fireEvent.click(screen.getByLabelText('Edit cutoff label'))
    const input = screen.getByLabelText('Cutoff label')
    fireEvent.change(input, { target: { value: 'MVP' } })
    fireEvent.blur(input)

    expect(onCutoffLabelChange).toHaveBeenCalledWith('MVP')
  })
})
