import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EstimationQueue from '../../src/components/EstimationQueue'
import type { ItemWithScore } from '../../src/types/database'

describe('EstimationQueue', () => {
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
    roadmap_row: 0, start_date: null, end_date: null,
    story_points: null,
    ...overrides,
  })

  const defaultProps = {
    items: [],
    currentItemId: null,
    onStartEstimation: vi.fn(),
    onSelectItem: vi.fn(),
    isHost: true,
  }

  it('renders empty state when no items', () => {
    render(<EstimationQueue {...defaultProps} />)

    expect(screen.getByText('No items to estimate.')).toBeInTheDocument()
    expect(screen.getByText('Add items in the Scoring view first.')).toBeInTheDocument()
  })

  it('renders items in the queue', () => {
    const items = [
      createMockItem({ id: '1', title: 'Item 1', position: 0 }),
      createMockItem({ id: '2', title: 'Item 2', position: 1 }),
    ]

    render(<EstimationQueue {...defaultProps} items={items} />)

    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('shows progress counter', () => {
    const items = [
      createMockItem({ id: '1', title: 'Item 1', story_points: 5 }),
      createMockItem({ id: '2', title: 'Item 2', story_points: null }),
      createMockItem({ id: '3', title: 'Item 3', story_points: null }),
    ]

    render(<EstimationQueue {...defaultProps} items={items} />)

    // Progress text is split across elements: "1" "of" "3" "estimated"
    // Check for the "estimated" text which contains the numbers
    const progressDiv = screen.getByText(/estimated/i).closest('div')
    expect(progressDiv?.textContent).toMatch(/1.*of.*3.*estimated/i)
  })

  it('shows Start Estimation button when no current item and items pending', () => {
    const items = [createMockItem({ id: '1', title: 'Item 1' })]

    render(<EstimationQueue {...defaultProps} items={items} />)

    expect(screen.getByRole('button', { name: /start estimation/i })).toBeInTheDocument()
  })

  it('hides Start Estimation button when there is a current item', () => {
    const items = [createMockItem({ id: '1', title: 'Item 1' })]

    render(<EstimationQueue {...defaultProps} items={items} currentItemId="1" />)

    expect(screen.queryByRole('button', { name: /start estimation/i })).not.toBeInTheDocument()
  })

  it('hides Start Estimation button when all items are estimated', () => {
    const items = [
      createMockItem({ id: '1', title: 'Item 1', story_points: 5 }),
      createMockItem({ id: '2', title: 'Item 2', story_points: 8 }),
    ]

    render(<EstimationQueue {...defaultProps} items={items} />)

    expect(screen.queryByRole('button', { name: /start estimation/i })).not.toBeInTheDocument()
  })

  it('calls onStartEstimation when Start Estimation button is clicked', () => {
    const onStartEstimation = vi.fn()
    const items = [createMockItem({ id: '1', title: 'Item 1' })]

    render(
      <EstimationQueue
        {...defaultProps}
        items={items}
        onStartEstimation={onStartEstimation}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /start estimation/i }))

    expect(onStartEstimation).toHaveBeenCalled()
  })

  it('calls onSelectItem when an item is clicked', () => {
    const onSelectItem = vi.fn()
    const items = [createMockItem({ id: '1', title: 'Item 1' })]

    render(
      <EstimationQueue
        {...defaultProps}
        items={items}
        onSelectItem={onSelectItem}
      />
    )

    fireEvent.click(screen.getByText('Item 1'))

    expect(onSelectItem).toHaveBeenCalledWith('1')
  })

  it('highlights current item', () => {
    const items = [
      createMockItem({ id: '1', title: 'Item 1', position: 0 }),
      createMockItem({ id: '2', title: 'Item 2', position: 1 }),
    ]

    render(<EstimationQueue {...defaultProps} items={items} currentItemId="1" />)

    const item1Button = screen.getByText('Item 1').closest('button')
    expect(item1Button).toHaveClass('border-indigo-500')
    expect(item1Button).toHaveClass('bg-indigo-50')
  })

  it('shows story points badge for completed items', () => {
    const items = [
      createMockItem({ id: '1', title: 'Item 1', story_points: 5 }),
      createMockItem({ id: '2', title: 'Item 2', story_points: null }),
    ]

    render(<EstimationQueue {...defaultProps} items={items} />)

    expect(screen.getByText('5 SP')).toBeInTheDocument()
  })

  it('shows completion message when all items estimated', () => {
    const items = [
      createMockItem({ id: '1', title: 'Item 1', story_points: 5 }),
      createMockItem({ id: '2', title: 'Item 2', story_points: 8 }),
    ]

    render(<EstimationQueue {...defaultProps} items={items} />)

    expect(screen.getByText('All items estimated!')).toBeInTheDocument()
  })

  it('sorts items by backlog_position if set, otherwise by position', () => {
    const items = [
      createMockItem({ id: '1', title: 'Item A', position: 3, backlog_position: null }), // uses position 3
      createMockItem({ id: '2', title: 'Item B', position: 0, backlog_position: 2 }), // uses backlog_position 2
      createMockItem({ id: '3', title: 'Item C', position: 1, backlog_position: 0 }), // uses backlog_position 0
    ]

    render(<EstimationQueue {...defaultProps} items={items} />)

    // Get only the list item buttons (not the Start Estimation button)
    const listItems = screen.getAllByRole('listitem')
    // Sorted: Item C (0) → Item B (2) → Item A (3)
    expect(listItems[0]).toHaveTextContent('Item C')
    expect(listItems[1]).toHaveTextContent('Item B')
    expect(listItems[2]).toHaveTextContent('Item A')
  })

  it('shows item description when available', () => {
    const items = [
      createMockItem({ id: '1', title: 'Item 1', description: 'This is a description' }),
    ]

    render(<EstimationQueue {...defaultProps} items={items} />)

    expect(screen.getByText('This is a description')).toBeInTheDocument()
  })

  describe('Host Control', () => {
    it('hides Start Estimation button for non-host participants', () => {
      const items = [createMockItem({ id: '1', title: 'Item 1' })]

      render(<EstimationQueue {...defaultProps} items={items} isHost={false} />)

      expect(screen.queryByRole('button', { name: /start estimation/i })).not.toBeInTheDocument()
    })

    it('shows "Waiting for host..." for non-host when estimation not started', () => {
      const items = [createMockItem({ id: '1', title: 'Item 1' })]

      render(<EstimationQueue {...defaultProps} items={items} isHost={false} />)

      expect(screen.getByText('Waiting for host...')).toBeInTheDocument()
    })

    it('does not call onSelectItem when non-host clicks an item', () => {
      const onSelectItem = vi.fn()
      const items = [createMockItem({ id: '1', title: 'Item 1' })]

      render(
        <EstimationQueue
          {...defaultProps}
          items={items}
          onSelectItem={onSelectItem}
          isHost={false}
        />
      )

      fireEvent.click(screen.getByText('Item 1'))

      expect(onSelectItem).not.toHaveBeenCalled()
    })

    it('shows Start Estimation button for host', () => {
      const items = [createMockItem({ id: '1', title: 'Item 1' })]

      render(<EstimationQueue {...defaultProps} items={items} isHost={true} />)

      expect(screen.getByRole('button', { name: /start estimation/i })).toBeInTheDocument()
    })
  })
})
