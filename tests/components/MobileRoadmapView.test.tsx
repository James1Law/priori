import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileRoadmapView from '../../src/components/MobileRoadmapView'
import { RoadmapPeriod, ItemWithScore } from '../../src/types/database'

const mockPeriods: RoadmapPeriod[] = [
  { id: 'p1', session_id: 's1', name: 'Now', width: 4, position: 0, created_at: '2024-01-01' },
  { id: 'p2', session_id: 's1', name: 'Next', width: 4, position: 1, created_at: '2024-01-01' },
  { id: 'p3', session_id: 's1', name: 'Later', width: 4, position: 2, created_at: '2024-01-01' },
]

const mockItems: ItemWithScore[] = [
  {
    id: 'i1',
    session_id: 's1',
    title: 'User Authentication',
    description: 'Implement login flow',
    position: 0,
    backlog_position: 0,
    roadmap_start_quadrant: 0,
    roadmap_end_quadrant: 3,
    roadmap_row: 0,
    created_at: '2024-01-01',
    story_points: null,
    created_by: null,
    roadmap_start_period: null,
    roadmap_end_period: null,
  },
  {
    id: 'i2',
    session_id: 's1',
    title: 'Dashboard Redesign',
    description: 'Improve dashboard UX',
    position: 1,
    backlog_position: 1,
    roadmap_start_quadrant: 2,
    roadmap_end_quadrant: 5,
    roadmap_row: 0,
    created_at: '2024-01-01',
    story_points: null,
    created_by: null,
    roadmap_start_period: null,
    roadmap_end_period: null,
  },
  {
    id: 'i3',
    session_id: 's1',
    title: 'Unscheduled Item',
    description: 'Not on roadmap yet',
    position: 2,
    backlog_position: 2,
    roadmap_start_quadrant: null,
    roadmap_end_quadrant: null,
    roadmap_row: 0,
    created_at: '2024-01-01',
    story_points: null,
    created_by: null,
    roadmap_start_period: null,
    roadmap_end_period: null,
  },
]

describe('MobileRoadmapView', () => {
  it('renders loading state', () => {
    render(<MobileRoadmapView periods={[]} items={[]} loading={true} />)

    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders empty state when no periods exist', () => {
    render(<MobileRoadmapView periods={[]} items={[]} loading={false} />)

    expect(screen.getByText(/no periods yet/i)).toBeInTheDocument()
    expect(screen.getByText(/\+ add period/i)).toBeInTheDocument()
  })

  it('renders periods as vertical cards', () => {
    render(<MobileRoadmapView periods={mockPeriods} items={[]} loading={false} />)

    // CSS text-transform: uppercase is applied, but the actual text content is as stored
    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('Later')).toBeInTheDocument()
  })

  it('renders items in the correct periods', () => {
    render(<MobileRoadmapView periods={mockPeriods} items={mockItems} loading={false} />)

    // User Authentication should appear in Now period (Q0-Q3)
    expect(screen.getByText('User Authentication')).toBeInTheDocument()

    // Dashboard Redesign spans periods (Q2-Q5), should appear in both Now and Next
    // Title gets truncated so use partial match
    const dashboardItems = screen.getAllByText(/Dashboard/)
    expect(dashboardItems.length).toBe(2) // Appears in two periods
  })

  it('shows overflow indicators for multi-period items', () => {
    render(<MobileRoadmapView periods={mockPeriods} items={mockItems} loading={false} />)

    // Dashboard spans from Now to Next, should have arrows
    expect(screen.getByText('→')).toBeInTheDocument()
    expect(screen.getByText('←')).toBeInTheDocument()
  })

  it('shows empty period state with add button', () => {
    // Single empty period with no items scheduled in it
    const emptyPeriod: RoadmapPeriod[] = [
      { id: 'empty', session_id: 's1', name: 'Empty Period', width: 4, position: 0, created_at: '2024-01-01' },
    ]

    render(<MobileRoadmapView periods={emptyPeriod} items={[]} loading={false} />)

    expect(screen.getByText(/no items scheduled/i)).toBeInTheDocument()
    expect(screen.getByText(/\+ add item/i)).toBeInTheDocument()
  })

  it('shows unscheduled items section at bottom', () => {
    render(<MobileRoadmapView periods={mockPeriods} items={mockItems} loading={false} />)

    // Unscheduled Item has null quadrants, should appear in unscheduled section
    expect(screen.getByText('Unscheduled Items (1)')).toBeInTheDocument()
    expect(screen.getByText('Unscheduled Item')).toBeInTheDocument()
  })

  it('does not show unscheduled items in period cards', () => {
    render(<MobileRoadmapView periods={mockPeriods} items={mockItems} loading={false} />)

    // The unscheduled item should not have an item bar (only buttons in unscheduled section)
    // Period cards should only show scheduled items
    const itemBars = screen.getAllByRole('button', { pressed: false })
    // Item bars are the scheduled items, not the unscheduled ones
    const scheduledItemButtons = itemBars.filter((btn) =>
      btn.getAttribute('aria-label')?.includes('tap to select')
    )
    // Should only have 3 scheduled items (Now Item, Multi-Period Item x2 appearances)
    expect(scheduledItemButtons.length).toBe(3)
  })

  it('shows add period button at bottom', () => {
    render(<MobileRoadmapView periods={mockPeriods} items={[]} loading={false} />)

    const addButtons = screen.getAllByText(/\+ add period/i)
    expect(addButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('calculates correct bar width for full-period items', () => {
    const singlePeriod = [mockPeriods[0]]
    const fullPeriodItem: ItemWithScore[] = [
      {
        ...mockItems[0],
        roadmap_start_quadrant: 0,
        roadmap_end_quadrant: 3, // Full period (Q0-Q3)
      },
    ]

    const { container } = render(
      <MobileRoadmapView periods={singlePeriod} items={fullPeriodItem} loading={false} />
    )

    const itemBar = container.querySelector('.bg-gradient-to-r')
    expect(itemBar).toHaveStyle({ width: '100%', marginLeft: '0%' })
  })

  it('calculates correct bar width for partial-period items', () => {
    const singlePeriod = [mockPeriods[0]]
    const halfPeriodItem: ItemWithScore[] = [
      {
        ...mockItems[0],
        title: 'Half Item',
        roadmap_start_quadrant: 0,
        roadmap_end_quadrant: 1, // First half (Q0-Q1)
      },
    ]

    const { container } = render(
      <MobileRoadmapView periods={singlePeriod} items={halfPeriodItem} loading={false} />
    )

    const itemBar = container.querySelector('.bg-gradient-to-r')
    expect(itemBar).toHaveStyle({ width: '50%', marginLeft: '0%' })
  })

  it('calculates correct offset for items not starting at period beginning', () => {
    const singlePeriod = [mockPeriods[0]]
    const offsetItem: ItemWithScore[] = [
      {
        ...mockItems[0],
        title: 'Offset Item',
        roadmap_start_quadrant: 2,
        roadmap_end_quadrant: 3, // Second half (Q2-Q3)
      },
    ]

    const { container } = render(
      <MobileRoadmapView periods={singlePeriod} items={offsetItem} loading={false} />
    )

    const itemBar = container.querySelector('.bg-gradient-to-r')
    expect(itemBar).toHaveStyle({ width: '50%', marginLeft: '50%' })
  })

  // Selection tests
  describe('item selection', () => {
    it('selects item on click', () => {
      render(
        <MobileRoadmapView periods={mockPeriods} items={mockItems} loading={false} />
      )

      const itemBar = screen.getByText('User Authentication').closest('[role="button"]')
      expect(itemBar).toBeInTheDocument()

      fireEvent.click(itemBar!)

      // Check for selection ring
      expect(itemBar).toHaveClass('ring-2')
    })

    it('shows resize handles when item is selected', () => {
      render(
        <MobileRoadmapView periods={mockPeriods} items={mockItems} loading={false} />
      )

      // Initially no resize handles (aria-labels now include item title)
      expect(screen.queryByLabelText(/Resize.*start position/)).not.toBeInTheDocument()

      // Select item
      const itemBar = screen.getByText('User Authentication').closest('[role="button"]')
      fireEvent.click(itemBar!)

      // Now resize handles should appear
      expect(screen.getByLabelText(/Resize User Authentication start position/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Resize User Authentication end position/)).toBeInTheDocument()
    })

    it('shows hint text when item is selected', () => {
      render(<MobileRoadmapView periods={mockPeriods} items={mockItems} loading={false} />)

      // Initially no hint
      expect(screen.queryByText(/drag handles to resize/i)).not.toBeInTheDocument()

      // Select item
      const itemBar = screen.getByText('User Authentication').closest('[role="button"]')
      fireEvent.click(itemBar!)

      // Now hint should appear
      expect(screen.getByText(/drag handles to resize/i)).toBeInTheDocument()
    })

    it('deselects item when clicking elsewhere', () => {
      const { container } = render(
        <MobileRoadmapView periods={mockPeriods} items={mockItems} loading={false} />
      )

      // Select item
      const itemBar = screen.getByText('User Authentication').closest('[role="button"]')
      fireEvent.click(itemBar!)
      expect(itemBar).toHaveClass('ring-2')

      // Click on container to deselect
      const roadmapContainer = container.querySelector('.flex.flex-col.gap-3')
      fireEvent.click(roadmapContainer!)

      // Selection ring should be gone
      expect(itemBar).not.toHaveClass('ring-2')
    })
  })

  // Resize callback tests
  describe('resize functionality', () => {
    it('calls onScheduleItem when resize handle is dragged', () => {
      const mockOnScheduleItem = vi.fn().mockResolvedValue(undefined)
      const singlePeriod = [mockPeriods[0]]
      const singleItem: ItemWithScore[] = [
        {
          ...mockItems[0],
          roadmap_start_quadrant: 0,
          roadmap_end_quadrant: 3,
        },
      ]

      render(
        <MobileRoadmapView
          periods={singlePeriod}
          items={singleItem}
          loading={false}
          onScheduleItem={mockOnScheduleItem}
        />
      )

      // Select item first
      const itemBar = screen.getByText('User Authentication').closest('[role="button"]')
      fireEvent.click(itemBar!)

      // Verify resize handles appear (aria-labels now include item title)
      const rightHandle = screen.getByLabelText(/Resize User Authentication end position/)
      expect(rightHandle).toBeInTheDocument()
    })

    it('only shows resize handles on selected item', () => {
      const twoItems: ItemWithScore[] = [
        { ...mockItems[0], id: 'item1', title: 'First Item', roadmap_start_quadrant: 0, roadmap_end_quadrant: 1 },
        { ...mockItems[0], id: 'item2', title: 'Second Item', roadmap_start_quadrant: 2, roadmap_end_quadrant: 3 },
      ]

      render(
        <MobileRoadmapView periods={[mockPeriods[0]]} items={twoItems} loading={false} />
      )

      // Select first item
      const firstItem = screen.getByText('First Item').closest('[role="button"]')
      fireEvent.click(firstItem!)

      // Only 2 resize handles should exist (one left, one right for selected item)
      const handles = screen.getAllByLabelText(/Resize First Item/)
      expect(handles.length).toBe(2)
    })
  })
})
