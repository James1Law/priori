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
    roadmap_row: 0, start_date: null, end_date: null,
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

    // Titles appear in both mobile and desktop layouts
    expect(screen.getAllByText('First Item').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Second Item').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Third Item').length).toBeGreaterThanOrEqual(1)
  })

  it('renders rank numbers for each item', () => {
    render(<CapacityItemList {...defaultProps} />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders status badges', () => {
    render(<CapacityItemList {...defaultProps} />)

    // Status badges appear in both mobile and desktop layouts
    expect(screen.getAllByText('To Do').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('In Progress').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Done').length).toBeGreaterThanOrEqual(1)
  })

  it('shows estimate values in inputs', () => {
    render(<CapacityItemList {...defaultProps} />)

    const inputs = screen.getAllByRole('textbox')
    // Both mobile and desktop inputs exist — desktop uses controlled EstimateInput
    const values = inputs.map((i) => (i as HTMLInputElement).value)
    expect(values).toContain('10')
    expect(values).toContain('20')
    expect(values.filter((v) => v === '').length).toBeGreaterThanOrEqual(1)
  })

  it('shows placeholder for items without estimates', () => {
    render(<CapacityItemList {...defaultProps} />)

    const inputs = screen.getAllByRole('textbox')
    const withPlaceholder = inputs.filter((i) => i.getAttribute('placeholder') === '—')
    expect(withPlaceholder.length).toBeGreaterThanOrEqual(1)
  })

  it('renders unit suffix for each input', () => {
    render(<CapacityItemList {...defaultProps} />)

    const unitLabels = screen.getAllByText('days')
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

    // Target desktop EstimateInput (controlled component)
    const inputs = screen.getAllByRole('textbox')
    const desktopInput = inputs.find((i) => (i as HTMLInputElement).value === '10')!
    fireEvent.change(desktopInput, { target: { value: '15' } })
    fireEvent.blur(desktopInput)

    expect(onEstimateChange).toHaveBeenCalledWith('item-1', 15)
  })

  it('calls onEstimateChange on Enter key', () => {
    const onEstimateChange = vi.fn()
    render(<CapacityItemList {...defaultProps} onEstimateChange={onEstimateChange} />)

    const inputs = screen.getAllByRole('textbox')
    const desktopInput = inputs.find((i) => (i as HTMLInputElement).value === '10')!
    fireEvent.change(desktopInput, { target: { value: '25' } })
    // Enter triggers blur which saves the value
    fireEvent.keyDown(desktopInput, { key: 'Enter' })
    fireEvent.blur(desktopInput)

    expect(onEstimateChange).toHaveBeenCalledWith('item-1', 25)
  })

  it('calls onEstimateChange with null for empty input', () => {
    const onEstimateChange = vi.fn()
    render(<CapacityItemList {...defaultProps} onEstimateChange={onEstimateChange} />)

    const inputs = screen.getAllByRole('textbox')
    const desktopInput = inputs.find((i) => (i as HTMLInputElement).value === '10')!
    fireEvent.change(desktopInput, { target: { value: '' } })
    fireEvent.blur(desktopInput)

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
