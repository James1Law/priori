import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RoadmapMobileView from '../../src/components/RoadmapMobileView'
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
    roadmap_zoom: '6m' as const,
    roadmap_start_date: null,
    roadmap_end_date: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides,
  }
}

describe('RoadmapMobileView', () => {
  const onItemClick = vi.fn()
  const onSetZoom = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  const defaultProps = {
    items: [makeItem('1', { title: 'Alpha', start_date: '2026-04-10', end_date: '2026-05-10' })],
    session: makeSession(),
    onItemClick,
    onSetZoom,
  }

  describe('zoom pills', () => {
    it('renders all 4 zoom presets', () => {
      render(<RoadmapMobileView {...defaultProps} />)
      expect(screen.getByRole('button', { name: '3M' })).toBeDefined()
      expect(screen.getByRole('button', { name: '6M' })).toBeDefined()
      expect(screen.getByRole('button', { name: '1Y' })).toBeDefined()
      expect(screen.getByRole('button', { name: 'Fit' })).toBeDefined()
    })

    it('highlights the active zoom pill matching session', () => {
      render(<RoadmapMobileView {...defaultProps} session={makeSession({ roadmap_zoom: '3m' })} />)
      const pill = screen.getByRole('button', { name: '3M' })
      expect(pill.className).toContain('bg-indigo-600')
    })

    it('calls onSetZoom when a pill is tapped', () => {
      render(<RoadmapMobileView {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: '1Y' }))
      expect(onSetZoom).toHaveBeenCalledWith('1y')
    })
  })

  describe('scroll hint', () => {
    it('shows hint banner on first visit', () => {
      render(<RoadmapMobileView {...defaultProps} />)
      expect(screen.getByText(/scroll to pan/i)).toBeDefined()
    })

    it('hides hint after dismissal', () => {
      render(<RoadmapMobileView {...defaultProps} />)
      const dismissBtn = screen.getByLabelText('Dismiss hint')
      fireEvent.click(dismissBtn)
      expect(screen.queryByText(/scroll to pan/i)).toBeNull()
    })

    it('stays hidden after localStorage flag is set', () => {
      localStorage.setItem('priori-roadmap-hint-dismissed', 'true')
      render(<RoadmapMobileView {...defaultProps} />)
      expect(screen.queryByText(/scroll to pan/i)).toBeNull()
    })
  })

  describe('scrollable container', () => {
    it('renders a horizontally scrollable container', () => {
      render(<RoadmapMobileView {...defaultProps} />)
      const container = screen.getByTestId('gantt-scroll-container')
      expect(container).toBeDefined()
      expect(container.className).toContain('overflow-x-auto')
    })
  })

  describe('item rows', () => {
    it('renders a row for each item', () => {
      const items = [
        makeItem('1', { title: 'Goal One', item_level: 0 as ItemLevel, start_date: '2026-04-01', end_date: '2026-06-01' }),
        makeItem('2', { title: 'Init Two', item_level: 1 as ItemLevel, start_date: '2026-04-10', end_date: '2026-05-10' }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      expect(screen.getAllByTestId('gantt-row').length).toBe(2)
    })

    it('shows item titles in labels', () => {
      const items = [
        makeItem('1', { title: 'My Goal', item_level: 0 as ItemLevel, start_date: '2026-04-01', end_date: '2026-06-01' }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      // Title appears in both label and bar
      expect(screen.getAllByText('My Goal').length).toBeGreaterThanOrEqual(1)
    })

    it('shows hierarchy indentation for child items', () => {
      const items = [
        makeItem('p', { title: 'Parent', item_level: 0 as ItemLevel, start_date: '2026-04-01', end_date: '2026-06-01' }),
        makeItem('c', { title: 'Child', item_level: 1 as ItemLevel, parent_item_id: 'p', start_date: '2026-04-10', end_date: '2026-05-10' }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      const rows = screen.getAllByTestId('gantt-row')
      // Parent row should exist and child row indented (auto-expanded because child is scheduled)
      expect(rows.length).toBe(2)
    })

    it('hides children when parent is collapsed', () => {
      const items = [
        makeItem('p', { title: 'Parent', item_level: 0 as ItemLevel }),
        makeItem('c', { title: 'Child', item_level: 1 as ItemLevel, parent_item_id: 'p' }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      // Parent is collapsed by default (no scheduled children to auto-expand)
      expect(screen.getAllByTestId('gantt-row').length).toBe(1)
    })

    it('expands children when toggle is clicked', () => {
      const items = [
        makeItem('p', { title: 'Parent', item_level: 0 as ItemLevel }),
        makeItem('c', { title: 'Child', item_level: 1 as ItemLevel, parent_item_id: 'p' }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      expect(screen.getAllByTestId('gantt-row').length).toBe(1)

      fireEvent.click(screen.getByLabelText('Toggle expand'))
      expect(screen.getAllByTestId('gantt-row').length).toBe(2)
    })

    it('calls onItemClick when a label is tapped', () => {
      const items = [
        makeItem('abc', { title: 'Tappable', item_level: 0 as ItemLevel, start_date: '2026-04-01', end_date: '2026-06-01' }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      // Click the first instance (in the label)
      fireEvent.click(screen.getAllByText('Tappable')[0])
      expect(onItemClick).toHaveBeenCalledWith('abc')
    })

    it('does not render subtasks (level 4)', () => {
      const items = [
        makeItem('p', { title: 'Story', item_level: 3 as ItemLevel, start_date: '2026-04-01', end_date: '2026-06-01' }),
        makeItem('s', { title: 'Subtask', item_level: 4 as ItemLevel, parent_item_id: 'p', start_date: '2026-04-05', end_date: '2026-04-10' }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      expect(screen.getAllByTestId('gantt-row').length).toBe(1)
      expect(screen.queryByText('Subtask')).toBeNull()
    })
  })

  describe('timeline header', () => {
    it('renders month labels', () => {
      // 6M zoom from March to August-ish — should include Apr, May, Jun etc.
      render(<RoadmapMobileView {...defaultProps} />)
      const header = screen.getByTestId('timeline-months')
      expect(header).toBeDefined()
      // Should have at least a few month cells
      const cells = header.querySelectorAll('[data-testid="month-cell"]')
      expect(cells.length).toBeGreaterThan(0)
    })

    it('renders week labels for non-1Y zoom', () => {
      render(<RoadmapMobileView {...defaultProps} session={makeSession({ roadmap_zoom: '6m' })} />)
      const weekRow = screen.getByTestId('timeline-weeks')
      expect(weekRow).toBeDefined()
      const cells = weekRow.querySelectorAll('[data-testid="week-cell"]')
      expect(cells.length).toBeGreaterThan(0)
    })

    it('hides week labels on 1Y zoom', () => {
      render(<RoadmapMobileView {...defaultProps} session={makeSession({ roadmap_zoom: '1y' })} />)
      expect(screen.queryByTestId('timeline-weeks')).toBeNull()
    })

    it('re-renders when zoom changes', () => {
      const { rerender } = render(<RoadmapMobileView {...defaultProps} session={makeSession({ roadmap_zoom: '3m' })} />)
      const months3m = screen.getByTestId('timeline-months').querySelectorAll('[data-testid="month-cell"]')
      const count3m = months3m.length

      rerender(<RoadmapMobileView {...defaultProps} session={makeSession({ roadmap_zoom: '1y' })} />)
      const months1y = screen.getByTestId('timeline-months').querySelectorAll('[data-testid="month-cell"]')
      // 1Y should have more months than 3M
      expect(months1y.length).toBeGreaterThan(count3m)
    })
  })

  describe('gantt bars', () => {
    it('renders a bar for a scheduled item', () => {
      const items = [
        makeItem('1', { title: 'Scheduled', item_level: 0 as ItemLevel, start_date: '2026-04-10', end_date: '2026-05-10' }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      const bars = screen.getAllByTestId('gantt-bar')
      expect(bars.length).toBe(1)
    })

    it('applies correct colour class for each level', () => {
      const items = [
        makeItem('g', { title: 'Goal', item_level: 0 as ItemLevel, start_date: '2026-04-01', end_date: '2026-06-01' }),
        makeItem('i', { title: 'Init', item_level: 1 as ItemLevel, start_date: '2026-04-05', end_date: '2026-05-15' }),
        makeItem('e', { title: 'Epic', item_level: 2 as ItemLevel, start_date: '2026-04-10', end_date: '2026-05-01' }),
        makeItem('s', { title: 'Story', item_level: 3 as ItemLevel, start_date: '2026-04-15', end_date: '2026-04-25' }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      const bars = screen.getAllByTestId('gantt-bar')
      expect(bars[0].className).toContain('from-pink-')
      expect(bars[1].className).toContain('from-blue-')
      expect(bars[2].className).toContain('from-purple-')
      expect(bars[3].className).toContain('from-green-')
    })

    it('does not render a bar for unscheduled items', () => {
      const items = [
        makeItem('1', { title: 'No Dates', item_level: 0 as ItemLevel }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      expect(screen.queryByTestId('gantt-bar')).toBeNull()
    })

    it('shows "No dates set" for unscheduled items', () => {
      const items = [
        makeItem('1', { title: 'Undated', item_level: 0 as ItemLevel }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      expect(screen.getByText('No dates set')).toBeDefined()
    })

    it('calls onItemClick when a bar is tapped', () => {
      const items = [
        makeItem('xyz', { title: 'Clickable', item_level: 0 as ItemLevel, start_date: '2026-04-10', end_date: '2026-05-10' }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      fireEvent.click(screen.getByTestId('gantt-bar'))
      expect(onItemClick).toHaveBeenCalledWith('xyz')
    })

    it('calls onItemClick when an unscheduled row bar area is tapped', () => {
      const items = [
        makeItem('und', { title: 'Undated', item_level: 0 as ItemLevel }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      fireEvent.click(screen.getByText('No dates set'))
      expect(onItemClick).toHaveBeenCalledWith('und')
    })

    it('does not render resize handles', () => {
      const items = [
        makeItem('1', { title: 'Bar', item_level: 0 as ItemLevel, start_date: '2026-04-10', end_date: '2026-05-10' }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      expect(screen.queryByTestId('resize-handle')).toBeNull()
    })

    it('enforces minimum tappable width on short-duration bars', () => {
      const items = [
        makeItem('1', { title: 'Tiny', item_level: 0 as ItemLevel, start_date: '2026-04-10', end_date: '2026-04-11' }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      const bar = screen.getByTestId('gantt-bar')
      expect(bar.style.minWidth).toBe('44px')
    })
  })

  describe('today marker', () => {
    it('renders today marker when today is in view range', () => {
      // Default 6m zoom includes today
      render(<RoadmapMobileView {...defaultProps} />)
      expect(screen.getByTestId('today-marker')).toBeDefined()
      expect(screen.getByText('Today')).toBeDefined()
    })

    it('hides today marker when today is outside view range', () => {
      // Custom session with dates far in the past
      const items = [
        makeItem('1', { title: 'Old', item_level: 0 as ItemLevel, start_date: '2020-01-01', end_date: '2020-03-01' }),
      ]
      const session = makeSession({ roadmap_zoom: 'fit' })
      render(<RoadmapMobileView {...defaultProps} items={items} session={session} />)
      // fit zoom on old items — today (2026) is way outside
      expect(screen.queryByTestId('today-marker')).toBeNull()
    })
  })

  describe('empty states', () => {
    it('shows empty state when there are no items', () => {
      render(<RoadmapMobileView {...defaultProps} items={[]} />)
      expect(screen.getByText(/no items/i)).toBeDefined()
      expect(screen.queryByTestId('gantt-row')).toBeNull()
    })

    it('shows message when all items are unscheduled', () => {
      const items = [
        makeItem('1', { title: 'Undated', item_level: 0 as ItemLevel }),
        makeItem('2', { title: 'Also Undated', item_level: 0 as ItemLevel }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      // Should still show rows (they're tappable to set dates)
      expect(screen.getAllByTestId('gantt-row').length).toBe(2)
      // Both should show "No dates set"
      expect(screen.getAllByText('No dates set').length).toBe(2)
    })
  })

  describe('unscheduled row styling', () => {
    it('applies amber background to unscheduled rows', () => {
      const items = [
        makeItem('1', { title: 'Undated', item_level: 0 as ItemLevel }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      const row = screen.getByTestId('gantt-row')
      expect(row.className).toContain('bg-amber-50')
    })

    it('does not apply amber background to scheduled rows', () => {
      const items = [
        makeItem('1', { title: 'Dated', item_level: 0 as ItemLevel, start_date: '2026-04-10', end_date: '2026-05-10' }),
      ]
      render(<RoadmapMobileView {...defaultProps} items={items} />)
      const row = screen.getByTestId('gantt-row')
      expect(row.className).not.toContain('bg-amber-50')
    })
  })
})
