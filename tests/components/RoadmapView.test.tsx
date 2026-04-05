import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RoadmapView from '../../src/components/RoadmapView'
import type { ItemWithScore, ItemLevel, Session } from '../../src/types/database'

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
    start_date: null,
    end_date: null,
    story_points: null,
    effort_estimate: null,
    parent_item_id: null,
    item_level: 0 as ItemLevel,
    ...overrides,
  }
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    slug: 'test-session',
    name: 'Test Session',
    framework: 'rice',
    view: 'roadmap',
    cutoff_position: null,
    cutoff_label: null,
    current_estimation_item_id: null,
    estimation_revealed: false,
    estimation_item_ids: [],
    estimation_host: null,
    estimation_session_id: null,
    capacity_team_size: 5,
    capacity_working_days: 65,
    capacity_focus_factor: 0.6,
    capacity_contingency: 0.3,
    capacity_unit: 'days',
    capacity_hours_per_day: 8,
    roadmap_zoom: 'fit' as const,
    roadmap_start_date: null,
    roadmap_end_date: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides,
  }
}

const scheduledItems: ItemWithScore[] = [
  makeItem('item-1', { title: 'Feature A', position: 0, start_date: '2026-04-01', end_date: '2026-04-30' }),
  makeItem('item-2', { title: 'Feature B', position: 1, start_date: '2026-05-01', end_date: '2026-05-31' }),
]

const unscheduledItems: ItemWithScore[] = [
  makeItem('item-3', { title: 'Unscheduled C', position: 2 }),
  makeItem('item-4', { title: 'Unscheduled D', position: 3 }),
]

const defaultProps = {
  items: [...scheduledItems, ...unscheduledItems],
  loading: false,
  session: makeSession(),
  onSetItemDates: vi.fn().mockResolvedValue(undefined),
  onMoveItem: vi.fn().mockResolvedValue(undefined),
  onClearItemDates: vi.fn().mockResolvedValue(undefined),
  onSetZoom: vi.fn().mockResolvedValue(undefined),
  onItemClick: vi.fn(),
}

describe('RoadmapView', () => {
  it('renders scheduled items in the left panel', () => {
    render(<RoadmapView {...defaultProps} />)
    // Items appear in both left panel and bar labels
    expect(screen.getAllByText('Feature A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Feature B').length).toBeGreaterThan(0)
  })

  it('renders unscheduled items in the unscheduled panel', () => {
    render(<RoadmapView {...defaultProps} />)
    expect(screen.getAllByText('Unscheduled C').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Unscheduled D').length).toBeGreaterThan(0)
  })

  it('shows loading state', () => {
    render(<RoadmapView {...defaultProps} loading={true} />)
    expect(screen.getByText('Loading roadmap...')).toBeDefined()
  })

  it('shows empty state when no items', () => {
    render(<RoadmapView {...defaultProps} items={[]} />)
    expect(screen.getByText('Add items and set dates to see them on the roadmap')).toBeDefined()
  })

  it('shows item count in toolbar', () => {
    render(<RoadmapView {...defaultProps} />)
    expect(screen.getByText('2 of 4 items scheduled')).toBeDefined()
  })

  it('renders zoom preset buttons', () => {
    render(<RoadmapView {...defaultProps} />)
    expect(screen.getByText('3M')).toBeDefined()
    expect(screen.getByText('6M')).toBeDefined()
    expect(screen.getByText('1Y')).toBeDefined()
    expect(screen.getByText('Fit')).toBeDefined()
  })

  it('calls onSetZoom when clicking a zoom preset', () => {
    render(<RoadmapView {...defaultProps} />)
    fireEvent.click(screen.getByText('3M'))
    expect(defaultProps.onSetZoom).toHaveBeenCalledWith('3m')
  })

  it('renders expand/collapse toggle', () => {
    render(<RoadmapView {...defaultProps} />)
    // Should show expand/collapse button
    const toggleBtn = screen.getByText('▸ Expand All')
    expect(toggleBtn).toBeDefined()
  })

  it('calls onItemClick when clicking an item name in the left panel', () => {
    const onItemClick = vi.fn()
    render(<RoadmapView {...defaultProps} onItemClick={onItemClick} />)

    // Click the first occurrence (left panel)
    fireEvent.click(screen.getAllByText('Feature A')[0])
    expect(onItemClick).toHaveBeenCalledWith('item-1')
  })

  it('calls onClearItemDates when clicking unschedule button on a bar', () => {
    const onClearItemDates = vi.fn().mockResolvedValue(undefined)
    render(<RoadmapView {...defaultProps} onClearItemDates={onClearItemDates} />)

    // Find and click the "Remove dates" button (title attribute)
    const removeButtons = screen.getAllByTitle('Remove dates')
    expect(removeButtons.length).toBeGreaterThan(0)
    fireEvent.click(removeButtons[0])
    expect(onClearItemDates).toHaveBeenCalled()
  })

  describe('Hierarchy', () => {
    const hierarchyItems: ItemWithScore[] = [
      makeItem('goal-1', {
        title: 'Goal 1',
        item_level: 0,
        position: 0,
        start_date: '2026-04-01',
        end_date: '2026-06-30',
      }),
      makeItem('init-1', {
        title: 'Initiative 1',
        item_level: 1,
        parent_item_id: 'goal-1',
        position: 1,
        start_date: '2026-04-01',
        end_date: '2026-05-15',
      }),
      makeItem('init-2', {
        title: 'Initiative 2',
        item_level: 1,
        parent_item_id: 'goal-1',
        position: 2,
      }),
    ]

    it('renders hierarchy with level badges', () => {
      render(<RoadmapView {...defaultProps} items={hierarchyItems} />)
      expect(screen.getAllByText('Goal 1').length).toBeGreaterThan(0)
      // Level badges (G for Goal)
      const badges = screen.getAllByText('G')
      expect(badges.length).toBeGreaterThan(0)
    })

    it('shows expand/collapse for parents', () => {
      render(<RoadmapView {...defaultProps} items={hierarchyItems} />)
      // Goal 1 should have expand/collapse
      const expandBtns = screen.getAllByText('▾')
      expect(expandBtns.length).toBeGreaterThan(0)
    })
  })

  describe('Month/Week Headers', () => {
    it('renders month labels in the timeline header', () => {
      render(<RoadmapView {...defaultProps} />)
      // With items in Apr-May, headers should contain those months
      const apr = screen.getAllByText(/Apr/)
      expect(apr.length).toBeGreaterThan(0)
    })
  })
})
