import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CurrentEstimationItem from '../../src/components/CurrentEstimationItem'
import type { ItemWithScore } from '../../src/types/database'

describe('CurrentEstimationItem', () => {
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

  it('renders the "Now estimating" label', () => {
    const item = createMockItem({ title: 'Feature A' })
    render(<CurrentEstimationItem item={item} />)

    expect(screen.getByText('Now estimating')).toBeInTheDocument()
  })

  it('renders the item title as a heading', () => {
    const item = createMockItem({ title: 'Feature A' })
    render(<CurrentEstimationItem item={item} />)

    expect(screen.getByRole('heading', { name: 'Feature A' })).toBeInTheDocument()
  })

  it('renders the item description when present', () => {
    const item = createMockItem({
      title: 'Feature A',
      description: 'This is the feature description',
    })
    render(<CurrentEstimationItem item={item} />)

    expect(screen.getByText('This is the feature description')).toBeInTheDocument()
  })

  it('does not render description when not present', () => {
    const item = createMockItem({ title: 'Feature A', description: null })
    render(<CurrentEstimationItem item={item} />)

    // The description paragraph should not exist
    const heading = screen.getByRole('heading', { name: 'Feature A' })
    const nextSibling = heading.nextElementSibling
    expect(nextSibling).toBeNull()
  })

  it('shows previously estimated badge when story_points exists', () => {
    const item = createMockItem({ title: 'Feature A', story_points: 5 })
    render(<CurrentEstimationItem item={item} />)

    expect(screen.getByText('5 SP (previously estimated)')).toBeInTheDocument()
  })

  it('does not show previously estimated badge when story_points is null', () => {
    const item = createMockItem({ title: 'Feature A', story_points: null })
    render(<CurrentEstimationItem item={item} />)

    expect(screen.queryByText(/previously estimated/)).not.toBeInTheDocument()
  })

  it('does not show previously estimated badge when story_points is undefined', () => {
    const item = createMockItem({ title: 'Feature A' })
    // story_points defaults to null in createMockItem
    render(<CurrentEstimationItem item={item} />)

    expect(screen.queryByText(/previously estimated/)).not.toBeInTheDocument()
  })

  it('shows 0 SP badge when story_points is 0', () => {
    const item = createMockItem({ title: 'Feature A', story_points: 0 })
    render(<CurrentEstimationItem item={item} />)

    expect(screen.getByText('0 SP (previously estimated)')).toBeInTheDocument()
  })

  it('preserves whitespace in description', () => {
    const item = createMockItem({
      title: 'Feature A',
      description: 'Line 1\nLine 2\nLine 3',
    })
    render(<CurrentEstimationItem item={item} />)

    const description = screen.getByText(/Line 1/)
    expect(description).toHaveClass('whitespace-pre-wrap')
  })
})
