import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CapacityItemList from '../../src/components/CapacityItemList'
import type { Item } from '../../src/types/database'

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: `item-${Math.random().toString(36).slice(2)}`,
    session_id: 'session-1',
    title: 'Test Item',
    description: null,
    position: 0,
    backlog_position: null,
    status: 'todo',
    created_by: null,
    created_at: '2026-01-01',
    roadmap_start_period: null,
    roadmap_end_period: null,
    roadmap_start_quadrant: null,
    roadmap_end_quadrant: null,
    roadmap_row: 0,
    story_points: null,
    effort_estimate: null,
    ...overrides,
  }
}

describe('CapacityItemList', () => {
  const defaultProps = {
    items: [
      makeItem({ id: 'item-1', title: 'First Item', effort_estimate: 10, status: 'todo' as const }),
      makeItem({ id: 'item-2', title: 'Second Item', effort_estimate: 20, status: 'in_progress' as const }),
      makeItem({ id: 'item-3', title: 'Third Item', effort_estimate: null, status: 'done' as const }),
    ],
    unit: 'days' as const,
    estimatedCount: 2,
    totalCount: 3,
    baseEffort: 30,
    onEstimateChange: vi.fn(),
  }

  it('renders all items with correct titles', () => {
    render(<CapacityItemList {...defaultProps} />)

    expect(screen.getByText('First Item')).toBeInTheDocument()
    expect(screen.getByText('Second Item')).toBeInTheDocument()
    expect(screen.getByText('Third Item')).toBeInTheDocument()
  })

  it('renders rank numbers for each item', () => {
    render(<CapacityItemList {...defaultProps} />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders status badges', () => {
    render(<CapacityItemList {...defaultProps} />)

    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('shows estimate values in inputs', () => {
    render(<CapacityItemList {...defaultProps} />)

    const inputs = screen.getAllByRole('textbox')
    // Item 1 and 2 have estimates, item 3 is empty
    expect(inputs[0]).toHaveValue('10')
    expect(inputs[1]).toHaveValue('20')
    expect(inputs[2]).toHaveValue('')
  })

  it('shows placeholder for items without estimates', () => {
    render(<CapacityItemList {...defaultProps} />)

    const inputs = screen.getAllByRole('textbox')
    expect(inputs[2]).toHaveAttribute('placeholder', '—')
  })

  it('renders unit suffix for each input', () => {
    render(<CapacityItemList {...defaultProps} />)

    const unitLabels = screen.getAllByText('days')
    // One per item row (3 items) — unit labels in the estimate column
    expect(unitLabels.length).toBeGreaterThanOrEqual(3)
  })

  it('renders summary row with total', () => {
    render(<CapacityItemList {...defaultProps} />)

    expect(screen.getByText('Total (2 of 3 items)')).toBeInTheDocument()
    expect(screen.getByText('30 days')).toBeInTheDocument()
  })

  it('calls onEstimateChange on blur with new value', () => {
    const onEstimateChange = vi.fn()
    render(<CapacityItemList {...defaultProps} onEstimateChange={onEstimateChange} />)

    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: '15' } })
    fireEvent.blur(inputs[0])

    expect(onEstimateChange).toHaveBeenCalledWith('item-1', 15)
  })

  it('calls onEstimateChange on Enter key', () => {
    const onEstimateChange = vi.fn()
    render(<CapacityItemList {...defaultProps} onEstimateChange={onEstimateChange} />)

    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: '25' } })
    fireEvent.keyDown(inputs[0], { key: 'Enter' })

    expect(onEstimateChange).toHaveBeenCalledWith('item-1', 25)
  })

  it('calls onEstimateChange with null for empty input', () => {
    const onEstimateChange = vi.fn()
    render(<CapacityItemList {...defaultProps} onEstimateChange={onEstimateChange} />)

    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: '' } })
    fireEvent.blur(inputs[0])

    expect(onEstimateChange).toHaveBeenCalledWith('item-1', null)
  })

  it('renders column headers', () => {
    render(<CapacityItemList {...defaultProps} />)

    expect(screen.getByText('#')).toBeInTheDocument()
    expect(screen.getByText('Item')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Estimate')).toBeInTheDocument()
  })

  it('renders with zero items', () => {
    render(
      <CapacityItemList
        items={[]}
        unit="days"
        estimatedCount={0}
        totalCount={0}
        baseEffort={0}
        onEstimateChange={vi.fn()}
      />
    )

    expect(screen.getByText('Total (0 of 0 items)')).toBeInTheDocument()
    expect(screen.getByText('0 days')).toBeInTheDocument()
  })
})
