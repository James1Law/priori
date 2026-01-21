import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import UnscheduledItemsPicker from '../../src/components/UnscheduledItemsPicker'
import { ItemWithScore } from '../../src/types/database'

const mockItems: ItemWithScore[] = [
  {
    id: 'i1',
    session_id: 's1',
    title: 'Scheduled Item',
    description: 'Already on roadmap',
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
    title: 'Unscheduled Item 1',
    description: 'Not on roadmap yet',
    position: 1,
    backlog_position: 1,
    roadmap_start_quadrant: null,
    roadmap_end_quadrant: null,
    roadmap_row: 0,
    created_at: '2024-01-01',
    story_points: null,
    created_by: null,
    roadmap_start_period: null,
    roadmap_end_period: null,
    score: { id: 's1', item_id: 'i2', framework: 'rice', criteria: {}, calculated_score: 8.5 },
  },
  {
    id: 'i3',
    session_id: 's1',
    title: 'Unscheduled Item 2',
    description: null,
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

describe('UnscheduledItemsPicker', () => {
  it('does not render when closed', () => {
    render(
      <UnscheduledItemsPicker
        isOpen={false}
        onClose={() => {}}
        periodName="Now"
        items={mockItems}
        onSelectItem={() => {}}
      />
    )

    expect(screen.queryByText('Add to Now')).not.toBeInTheDocument()
  })

  it('renders when open with period name in title', () => {
    render(
      <UnscheduledItemsPicker
        isOpen={true}
        onClose={() => {}}
        periodName="Next"
        items={mockItems}
        onSelectItem={() => {}}
      />
    )

    expect(screen.getByText('Add to Next')).toBeInTheDocument()
    expect(screen.getByText('Select an item to schedule')).toBeInTheDocument()
  })

  it('only shows unscheduled items', () => {
    render(
      <UnscheduledItemsPicker
        isOpen={true}
        onClose={() => {}}
        periodName="Now"
        items={mockItems}
        onSelectItem={() => {}}
      />
    )

    // Scheduled item should not appear
    expect(screen.queryByText('Scheduled Item')).not.toBeInTheDocument()

    // Unscheduled items should appear
    expect(screen.getByText('Unscheduled Item 1')).toBeInTheDocument()
    expect(screen.getByText('Unscheduled Item 2')).toBeInTheDocument()
  })

  it('shows score badge for items with scores', () => {
    render(
      <UnscheduledItemsPicker
        isOpen={true}
        onClose={() => {}}
        periodName="Now"
        items={mockItems}
        onSelectItem={() => {}}
      />
    )

    expect(screen.getByText('8.5')).toBeInTheDocument()
  })

  it('shows description when available', () => {
    render(
      <UnscheduledItemsPicker
        isOpen={true}
        onClose={() => {}}
        periodName="Now"
        items={mockItems}
        onSelectItem={() => {}}
      />
    )

    expect(screen.getByText('Not on roadmap yet')).toBeInTheDocument()
  })

  it('calls onSelectItem and onClose when item is clicked', () => {
    const onSelectItem = vi.fn()
    const onClose = vi.fn()

    render(
      <UnscheduledItemsPicker
        isOpen={true}
        onClose={onClose}
        periodName="Now"
        items={mockItems}
        onSelectItem={onSelectItem}
      />
    )

    fireEvent.click(screen.getByText('Unscheduled Item 1'))

    expect(onSelectItem).toHaveBeenCalledWith(mockItems[1])
    expect(onClose).toHaveBeenCalled()
  })

  it('shows empty state when all items are scheduled', () => {
    const allScheduledItems: ItemWithScore[] = [mockItems[0]] // Only the scheduled item

    render(
      <UnscheduledItemsPicker
        isOpen={true}
        onClose={() => {}}
        periodName="Now"
        items={allScheduledItems}
        onSelectItem={() => {}}
      />
    )

    expect(screen.getByText('All items scheduled')).toBeInTheDocument()
    expect(screen.getByText('Every item is already on the roadmap')).toBeInTheDocument()
  })
})
