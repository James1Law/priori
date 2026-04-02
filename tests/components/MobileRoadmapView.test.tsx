import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileRoadmapView from '../../src/components/MobileRoadmapView'
import type { RoadmapPeriod, ItemWithScore, ItemLevel } from '../../src/types/database'

const mockPeriods: RoadmapPeriod[] = [
  { id: '1', session_id: 'session-1', name: 'Q1 2026', width: 4, position: 0, created_at: '2024-01-01' },
  { id: '2', session_id: 'session-1', name: 'Q2 2026', width: 4, position: 1, created_at: '2024-01-01' },
  { id: '3', session_id: 'session-1', name: 'Q3 2026', width: 4, position: 2, created_at: '2024-01-01' },
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
  makeItem('goal', { title: 'Increase Activation', item_level: 0, position: 0, roadmap_start_quadrant: 0, roadmap_end_quadrant: 7 }),
  makeItem('init', { title: 'User Onboarding', item_level: 1, parent_item_id: 'goal', position: 1, roadmap_start_quadrant: 0, roadmap_end_quadrant: 3 }),
  makeItem('flat', { title: 'Safari Fix', item_level: 0, position: 2, roadmap_start_quadrant: 0, roadmap_end_quadrant: 3 }),
  makeItem('unscheduled', { title: 'Dark Mode', item_level: 0, position: 3 }),
]

describe('MobileRoadmapView', () => {
  const defaultProps = {
    periods: mockPeriods,
    items: mockItems,
    loading: false,
    onItemClick: vi.fn(),
  }

  it('renders period cards', () => {
    render(<MobileRoadmapView {...defaultProps} />)
    expect(screen.getByText('Q1 2026')).toBeInTheDocument()
    expect(screen.getByText('Q2 2026')).toBeInTheDocument()
    expect(screen.getByText('Q3 2026')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<MobileRoadmapView {...defaultProps} loading={true} />)
    const loadingElements = document.querySelectorAll('.animate-pulse')
    expect(loadingElements.length).toBeGreaterThan(0)
  })

  it('shows scheduled items in their period cards', () => {
    render(<MobileRoadmapView {...defaultProps} />)
    // Items scheduled in Q1 should appear
    const activationElements = screen.getAllByText('Increase Activation')
    expect(activationElements.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Safari Fix').length).toBeGreaterThanOrEqual(1)
  })

  it('shows overflow indicators for multi-period items', () => {
    render(<MobileRoadmapView {...defaultProps} />)
    // Increase Activation spans Q1–Q2, should show continuation indicator
    const continuationElements = screen.queryAllByText(/Q2 2026 →|← Q1 2026/)
    expect(continuationElements.length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty period state', () => {
    render(<MobileRoadmapView {...defaultProps} />)
    // Q3 has no scheduled items
    expect(screen.getByText('No items scheduled')).toBeInTheDocument()
  })

  it('shows unscheduled items section', () => {
    render(<MobileRoadmapView {...defaultProps} />)
    expect(screen.getByText('Unscheduled')).toBeInTheDocument()
    expect(screen.getByText('Dark Mode')).toBeInTheDocument()
  })

  it('shows empty state when no periods', () => {
    render(<MobileRoadmapView {...defaultProps} periods={[]} />)
    expect(screen.getByText('No periods yet')).toBeInTheDocument()
  })

  describe('Hierarchy interactions', () => {
    it('shows expand button for parent items', () => {
      render(<MobileRoadmapView {...defaultProps} />)
      const expandButtons = screen.getAllByText('▸')
      expect(expandButtons.length).toBeGreaterThan(0)
    })

    it('expands parent to show children on tap', () => {
      render(<MobileRoadmapView {...defaultProps} />)
      const expandButton = screen.getAllByText('▸')[0]
      fireEvent.click(expandButton)
      // After expanding, User Onboarding should be visible
      const onboardingElements = screen.getAllByText('User Onboarding')
      expect(onboardingElements.length).toBeGreaterThanOrEqual(1)
    })

    it('shows level badge for hierarchy items', () => {
      render(<MobileRoadmapView {...defaultProps} />)
      // Goal level badge (first letter)
      const goalBadges = screen.getAllByText('G')
      expect(goalBadges.length).toBeGreaterThan(0)
    })
  })

  describe('Item selection', () => {
    it('shows View Details button when item is tapped', () => {
      render(<MobileRoadmapView {...defaultProps} />)
      const safariElements = screen.getAllByText('Safari Fix')
      // Click on the label row (parent div with click handler)
      const labelRow = safariElements[0].parentElement!
      fireEvent.click(labelRow)
      expect(screen.getByText('View Details')).toBeInTheDocument()
    })

    it('calls onItemClick when View Details is tapped', () => {
      const onItemClick = vi.fn()
      render(<MobileRoadmapView {...defaultProps} onItemClick={onItemClick} />)
      const safariElements = screen.getAllByText('Safari Fix')
      const labelRow = safariElements[0].parentElement!
      fireEvent.click(labelRow)
      fireEvent.click(screen.getByText('View Details'))
      expect(onItemClick).toHaveBeenCalledWith('flat')
    })
  })
})
