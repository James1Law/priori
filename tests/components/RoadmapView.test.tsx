import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RoadmapView from '../../src/components/RoadmapView'
import type { RoadmapPeriod, ItemWithScore } from '../../src/types/database'

const mockPeriods: RoadmapPeriod[] = [
  { id: '1', session_id: 'session-1', name: 'Now', width: 4, position: 0, created_at: '2024-01-01' },
  { id: '2', session_id: 'session-1', name: 'Next', width: 4, position: 1, created_at: '2024-01-01' },
  { id: '3', session_id: 'session-1', name: 'Later', width: 4, position: 2, created_at: '2024-01-01' },
]

const mockItems: ItemWithScore[] = [
  {
    id: 'item-1',
    session_id: 'session-1',
    title: 'Feature A',
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
    score: { id: 'score-1', item_id: 'item-1', framework: 'rice', criteria: {}, calculated_score: 100 },
  },
  {
    id: 'item-2',
    session_id: 'session-1',
    title: 'Feature B',
    description: null,
    position: 1,
    backlog_position: null,
    created_by: null,
    created_at: '2024-01-01',
    roadmap_start_period: '1', // Legacy - kept for compatibility
    roadmap_end_period: '1',
    roadmap_start_quadrant: 0, // Scheduled to "Now" (quadrants 0-3)
    roadmap_end_quadrant: 3,
    roadmap_row: 0,
  },
]

describe('RoadmapView', () => {
  const defaultProps = {
    periods: mockPeriods,
    items: mockItems,
    loading: false,
    onAddPeriod: vi.fn().mockResolvedValue({ id: 'new', session_id: 'session-1', name: 'New Period', width: 4, position: 3, created_at: '2024-01-01' }),
    onUpdatePeriod: vi.fn().mockResolvedValue(undefined),
    onDeletePeriod: vi.fn().mockResolvedValue(undefined),
    onScheduleItem: vi.fn().mockResolvedValue(undefined),
    onUnscheduleItem: vi.fn().mockResolvedValue(undefined),
  }

  it('renders period headers', () => {
    render(<RoadmapView {...defaultProps} />)

    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('Later')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<RoadmapView {...defaultProps} loading={true} />)

    // Should show skeleton/loading UI
    const loadingElements = document.querySelectorAll('.animate-pulse')
    expect(loadingElements.length).toBeGreaterThan(0)
  })

  it('shows Add Period button', () => {
    render(<RoadmapView {...defaultProps} />)

    expect(screen.getByText('Add Period')).toBeInTheDocument()
  })

  it('opens add period input when clicking Add Period', () => {
    render(<RoadmapView {...defaultProps} />)

    fireEvent.click(screen.getByText('Add Period'))

    expect(screen.getByPlaceholderText('Period name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('calls onAddPeriod when adding a new period', async () => {
    const onAddPeriod = vi.fn().mockResolvedValue({ id: 'new', name: 'Q1 2026', width: 4, position: 3 })
    render(<RoadmapView {...defaultProps} onAddPeriod={onAddPeriod} />)

    fireEvent.click(screen.getByText('Add Period'))
    fireEvent.change(screen.getByPlaceholderText('Period name'), { target: { value: 'Q1 2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      expect(onAddPeriod).toHaveBeenCalledWith('Q1 2026')
    })
  })

  it('cancels adding period when clicking Cancel', () => {
    render(<RoadmapView {...defaultProps} />)

    fireEvent.click(screen.getByText('Add Period'))
    expect(screen.getByPlaceholderText('Period name')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByPlaceholderText('Period name')).not.toBeInTheDocument()
    expect(screen.getByText('Add Period')).toBeInTheDocument()
  })

  it('allows editing period name on click', async () => {
    render(<RoadmapView {...defaultProps} />)

    // Click on period name to edit
    fireEvent.click(screen.getByText('Now'))

    // Should show input with current name
    const input = screen.getByDisplayValue('Now')
    expect(input).toBeInTheDocument()

    // Edit the name
    fireEvent.change(input, { target: { value: 'Current Sprint' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(defaultProps.onUpdatePeriod).toHaveBeenCalledWith('1', { name: 'Current Sprint' })
    })
  })

  // Note: Width adjustment buttons have been removed in the quadrant-based system
  // Each period now has a fixed width of 4 quadrants

  it('shows unscheduled items section', () => {
    render(<RoadmapView {...defaultProps} />)

    // Feature A is unscheduled (roadmap_start_period is null)
    expect(screen.getByText('Unscheduled Items (1)')).toBeInTheDocument()
  })

  it('shows score for unscheduled items with scores', () => {
    render(<RoadmapView {...defaultProps} />)

    // Feature A has score 100 - look for it in the button
    expect(screen.getByRole('button', { name: /Feature A.*100\.0/i })).toBeInTheDocument()
  })

  it('shows empty state when no items', () => {
    render(<RoadmapView {...defaultProps} items={[]} />)

    expect(screen.getByText(/No items yet/)).toBeInTheDocument()
  })

  it('calls onDeletePeriod when clicking delete button', async () => {
    const onDeletePeriod = vi.fn().mockResolvedValue(undefined)
    render(<RoadmapView {...defaultProps} onDeletePeriod={onDeletePeriod} />)

    // Find delete buttons
    const deleteButtons = screen.getAllByTitle('Delete period')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(onDeletePeriod).toHaveBeenCalledWith('1')
    })
  })

  // Note: Width adjustment tests removed - quadrant system has fixed period widths

  // Scheduling tests
  describe('Item Scheduling', () => {
    it('renders scheduled items as bars on the timeline', () => {
      render(<RoadmapView {...defaultProps} />)

      // Feature B is scheduled and should appear as a bar
      const scheduledBars = screen.getAllByText('Feature B')
      expect(scheduledBars.length).toBeGreaterThan(0)
    })

    it('renders unscheduled items as draggable chips', () => {
      render(<RoadmapView {...defaultProps} />)

      // Unscheduled items should have role="button" and be draggable
      const featureAChip = screen.getByRole('button', { name: /Feature A/i })
      expect(featureAChip).toBeInTheDocument()
      expect(featureAChip).toHaveAttribute('aria-roledescription', 'draggable')
    })

    it('shows unschedule button on hover over scheduled item bar', () => {
      render(<RoadmapView {...defaultProps} />)

      // The unschedule button should be present (visible on hover)
      const unscheduleButtons = screen.getAllByTitle('Remove from roadmap')
      expect(unscheduleButtons.length).toBeGreaterThan(0)
    })

    it('calls onUnscheduleItem when clicking unschedule button', async () => {
      const onUnscheduleItem = vi.fn().mockResolvedValue(undefined)
      render(<RoadmapView {...defaultProps} onUnscheduleItem={onUnscheduleItem} />)

      // Click the unschedule button
      const unscheduleButton = screen.getByTitle('Remove from roadmap')
      fireEvent.click(unscheduleButton)

      await waitFor(() => {
        expect(onUnscheduleItem).toHaveBeenCalledWith('item-2')
      })
    })

    it('shows empty timeline message when no items are scheduled', () => {
      const itemsAllUnscheduled: ItemWithScore[] = mockItems.map((item) => ({
        ...item,
        roadmap_start_period: null,
        roadmap_end_period: null,
        roadmap_start_quadrant: null,
        roadmap_end_quadrant: null,
      }))

      render(<RoadmapView {...defaultProps} items={itemsAllUnscheduled} />)

      expect(screen.getByText(/Drag an item from below/)).toBeInTheDocument()
    })
  })

  describe('Bar Resizing', () => {
    it('shows resize handles on item bars', () => {
      render(<RoadmapView {...defaultProps} />)

      // The resize handles have title "Drag to resize"
      const resizeHandles = screen.getAllByTitle('Drag to resize')
      // Each scheduled item should have 2 handles (left and right)
      expect(resizeHandles.length).toBe(2)
    })

    it('shows cursor change when hovering over resize handles', () => {
      render(<RoadmapView {...defaultProps} />)

      const resizeHandles = screen.getAllByTitle('Drag to resize')
      // Check that handles have resize cursor class
      resizeHandles.forEach((handle) => {
        expect(handle).toHaveClass('cursor-ew-resize')
      })
    })
  })

  describe('Orphaned Items', () => {
    it('shows orphaned items when period is deleted (quadrant beyond range)', () => {
      // Item scheduled to quadrant that is now beyond the available periods
      // With 3 periods, max quadrant is 11 (0-11 for 3 periods x 4 quadrants)
      const itemsWithOrphan: ItemWithScore[] = [
        ...mockItems,
        {
          id: 'item-orphan',
          session_id: 'session-1',
          title: 'Orphaned Feature',
          description: null,
          position: 3,
          backlog_position: null,
          created_by: null,
          created_at: '2024-01-01',
          roadmap_start_period: null,
          roadmap_end_period: null,
          roadmap_start_quadrant: 20, // Beyond available quadrants (max is 11)
          roadmap_end_quadrant: 23,
          roadmap_row: 0,
        },
      ]

      render(<RoadmapView {...defaultProps} items={itemsWithOrphan} />)

      expect(screen.getByText('Orphaned Items (1)')).toBeInTheDocument()
      expect(screen.getByText('Orphaned Feature')).toBeInTheDocument()
      expect(screen.getByText(/These items were scheduled to periods that no longer exist/)).toBeInTheDocument()
    })

    it('renders orphaned items as draggable chips', () => {
      const itemsWithOrphan: ItemWithScore[] = [
        {
          id: 'item-orphan',
          session_id: 'session-1',
          title: 'Orphaned Feature',
          description: null,
          position: 0,
          backlog_position: null,
          created_by: null,
          created_at: '2024-01-01',
          roadmap_start_period: null,
          roadmap_end_period: null,
          roadmap_start_quadrant: 100, // Way beyond available quadrants
          roadmap_end_quadrant: 103,
          roadmap_row: 0,
        },
      ]

      render(<RoadmapView {...defaultProps} items={itemsWithOrphan} />)

      // Orphaned item should be draggable
      const orphanedChip = screen.getByRole('button', { name: /Orphaned Feature/i })
      expect(orphanedChip).toBeInTheDocument()
      expect(orphanedChip).toHaveAttribute('aria-roledescription', 'draggable')
    })

    it('does not show orphaned section when no orphaned items', () => {
      render(<RoadmapView {...defaultProps} />)

      expect(screen.queryByText(/Orphaned Items/)).not.toBeInTheDocument()
    })
  })

  describe('item bar moving', () => {
    it('renders scheduled items as bars on the timeline', () => {
      const scheduledItems: ItemWithScore[] = [
        {
          id: 'item-move-test',
          session_id: 'session-1',
          title: 'Movable Feature',
          description: null,
          position: 0,
          backlog_position: null,
          created_by: null,
          created_at: '2024-01-01',
          roadmap_start_period: null,
          roadmap_end_period: null,
          roadmap_start_quadrant: 0, // First period (quadrants 0-3)
          roadmap_end_quadrant: 3,
          roadmap_row: 0,
        },
      ]

      render(<RoadmapView {...defaultProps} items={scheduledItems} />)

      // Scheduled item should appear as a bar with a span containing the title
      const itemSpan = screen.getByText('Movable Feature', { selector: 'span' })
      expect(itemSpan).toBeInTheDocument()

      // The bar (ancestor div) should have absolute positioning (bar style)
      // The span is inside a flex container span, which is inside the bar div
      const bar = itemSpan.closest('.absolute')
      expect(bar).toBeInTheDocument()
    })
  })
})
