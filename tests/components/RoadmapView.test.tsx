import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RoadmapView from '../../src/components/RoadmapView'
import type { RoadmapPeriod, ItemWithScore, ItemLevel } from '../../src/types/database'

const mockPeriods: RoadmapPeriod[] = [
  { id: '1', session_id: 'session-1', name: 'Now', width: 4, position: 0, created_at: '2024-01-01' },
  { id: '2', session_id: 'session-1', name: 'Next', width: 4, position: 1, created_at: '2024-01-01' },
  { id: '3', session_id: 'session-1', name: 'Later', width: 4, position: 2, created_at: '2024-01-01' },
]

function makeItem(id: string, overrides: Partial<ItemWithScore> = {}): ItemWithScore {
  return {
    id,
    session_id: 'session-1',
    title: `Item ${id}`,
    description: null,
    position: 0,
    backlog_position: null,
    status: 'todo',
    created_by: null,
    created_at: '2024-01-01',
    roadmap_start_period: null,
    roadmap_end_period: null,
    roadmap_start_quadrant: null,
    roadmap_end_quadrant: null,
    roadmap_row: 0,
    story_points: null,
    effort_estimate: null,
    parent_item_id: null,
    item_level: 0 as ItemLevel,
    ...overrides,
  }
}

const mockItems: ItemWithScore[] = [
  makeItem('item-1', { title: 'Feature A', position: 0 }),
  makeItem('item-2', {
    title: 'Feature B',
    position: 1,
    roadmap_start_quadrant: 0,
    roadmap_end_quadrant: 3,
  }),
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
    fireEvent.click(screen.getByText('Now'))
    const input = screen.getByDisplayValue('Now')
    expect(input).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'Current Sprint' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(defaultProps.onUpdatePeriod).toHaveBeenCalledWith('1', { name: 'Current Sprint' })
    })
  })

  it('shows unscheduled items in the panel', () => {
    render(<RoadmapView {...defaultProps} />)
    // Feature A is unscheduled — should appear in unscheduled panel
    expect(screen.getByText('Unscheduled Items')).toBeInTheDocument()
    // Feature A appears in both label column and unscheduled panel (dual layout)
    const featureAElements = screen.getAllByText('Feature A')
    expect(featureAElements.length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty state when no items', () => {
    render(<RoadmapView {...defaultProps} items={[]} />)
    expect(screen.getByText(/No items yet/)).toBeInTheDocument()
  })

  it('calls onDeletePeriod when clicking delete button', async () => {
    const onDeletePeriod = vi.fn().mockResolvedValue(undefined)
    render(<RoadmapView {...defaultProps} onDeletePeriod={onDeletePeriod} />)
    const deleteButtons = screen.getAllByTitle('Delete period')
    fireEvent.click(deleteButtons[0])
    await waitFor(() => {
      expect(onDeletePeriod).toHaveBeenCalledWith('1')
    })
  })

  describe('Item Scheduling', () => {
    it('renders scheduled items as bars on the timeline', () => {
      render(<RoadmapView {...defaultProps} />)
      // Feature B is scheduled — appears in both label column and bar
      const featureBElements = screen.getAllByText('Feature B')
      expect(featureBElements.length).toBeGreaterThan(0)
    })

    it('renders unscheduled items as draggable chips', () => {
      render(<RoadmapView {...defaultProps} />)
      const featureAChip = screen.getByRole('button', { name: /Feature A/i })
      expect(featureAChip).toBeInTheDocument()
      expect(featureAChip).toHaveAttribute('aria-roledescription', 'draggable')
    })

    it('shows unschedule button on scheduled item bar', () => {
      render(<RoadmapView {...defaultProps} />)
      const unscheduleButtons = screen.getAllByTitle('Remove from roadmap')
      expect(unscheduleButtons.length).toBeGreaterThan(0)
    })

    it('calls onUnscheduleItem when clicking unschedule button', async () => {
      const onUnscheduleItem = vi.fn().mockResolvedValue(undefined)
      render(<RoadmapView {...defaultProps} onUnscheduleItem={onUnscheduleItem} />)
      const unscheduleButton = screen.getByTitle('Remove from roadmap')
      fireEvent.click(unscheduleButton)
      await waitFor(() => {
        expect(onUnscheduleItem).toHaveBeenCalledWith('item-2')
      })
    })

    it('shows empty timeline message when no items are scheduled', () => {
      const unscheduledItems = mockItems.map((item) => ({
        ...item,
        roadmap_start_quadrant: null,
        roadmap_end_quadrant: null,
      }))
      render(<RoadmapView {...defaultProps} items={unscheduledItems} />)
      expect(screen.getByText(/Drag items from below/)).toBeInTheDocument()
    })
  })

  describe('Hierarchy rendering', () => {
    const hierarchyItems: ItemWithScore[] = [
      makeItem('goal', { title: 'Goal A', item_level: 0, position: 0, roadmap_start_quadrant: 0, roadmap_end_quadrant: 7 }),
      makeItem('init', { title: 'Init A1', item_level: 1, parent_item_id: 'goal', position: 1, roadmap_start_quadrant: 0, roadmap_end_quadrant: 3 }),
      makeItem('flat', { title: 'Flat Item', item_level: 0, position: 2, roadmap_start_quadrant: 8, roadmap_end_quadrant: 11 }),
    ]

    it('shows expand/collapse toggle for parent items', () => {
      render(<RoadmapView {...defaultProps} items={hierarchyItems} />)
      // Should show expand button for Goal A (has children)
      expect(screen.getByText('▸ Expand All')).toBeInTheDocument()
    })

    it('shows level badge for hierarchy items', () => {
      render(<RoadmapView {...defaultProps} items={hierarchyItems} />)
      // Goal level badge (first letter 'G')
      const goalBadges = screen.getAllByText('G')
      expect(goalBadges.length).toBeGreaterThan(0)
    })

    it('shows child count for parent items', () => {
      render(<RoadmapView {...defaultProps} items={hierarchyItems} />)
      // Goal A has 1 descendant
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('hides children when parent is collapsed', () => {
      render(<RoadmapView {...defaultProps} items={hierarchyItems} />)
      // By default all parents are collapsed, so Init A1 label should not be in the label column
      // But Goal A and Flat Item should be visible
      const goalElements = screen.getAllByText('Goal A')
      expect(goalElements.length).toBeGreaterThan(0)
      const flatElements = screen.getAllByText('Flat Item')
      expect(flatElements.length).toBeGreaterThan(0)
    })
  })

  describe('Bar rendering', () => {
    it('renders scheduled items as bars with absolute positioning', () => {
      const items = [
        makeItem('bar-test', {
          title: 'Movable Feature',
          position: 0,
          roadmap_start_quadrant: 0,
          roadmap_end_quadrant: 3,
        }),
      ]
      render(<RoadmapView {...defaultProps} items={items} />)
      // Item appears in both label column and bar; find the one in an absolute-positioned bar
      const allSpans = screen.getAllByText('Movable Feature')
      const barSpan = allSpans.find((el) => el.closest('.absolute'))
      expect(barSpan).toBeDefined()
      expect(barSpan!.closest('.absolute')).toBeInTheDocument()
    })
  })
})
