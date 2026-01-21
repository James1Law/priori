import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PeriodSelector from '../../src/components/PeriodSelector'
import { RoadmapPeriod } from '../../src/types/database'

const mockPeriods: RoadmapPeriod[] = [
  { id: 'p1', session_id: 's1', name: 'Now', width: 4, position: 0, created_at: '2024-01-01' },
  { id: 'p2', session_id: 's1', name: 'Next', width: 4, position: 1, created_at: '2024-01-01' },
  { id: 'p3', session_id: 's1', name: 'Later', width: 4, position: 2, created_at: '2024-01-01' },
]

describe('PeriodSelector', () => {
  it('does not render when closed', () => {
    render(
      <PeriodSelector
        isOpen={false}
        onClose={() => {}}
        periods={mockPeriods}
        onSelectPeriod={() => {}}
      />
    )

    expect(screen.queryByText('Add Item to Period')).not.toBeInTheDocument()
  })

  it('renders when open with title', () => {
    render(
      <PeriodSelector
        isOpen={true}
        onClose={() => {}}
        periods={mockPeriods}
        onSelectPeriod={() => {}}
      />
    )

    expect(screen.getByText('Add Item to Period')).toBeInTheDocument()
    expect(screen.getByText('Select a period to add an item to')).toBeInTheDocument()
  })

  it('shows all periods', () => {
    render(
      <PeriodSelector
        isOpen={true}
        onClose={() => {}}
        periods={mockPeriods}
        onSelectPeriod={() => {}}
      />
    )

    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('Later')).toBeInTheDocument()
  })

  it('calls onSelectPeriod and onClose when period is clicked', () => {
    const onSelectPeriod = vi.fn()
    const onClose = vi.fn()

    render(
      <PeriodSelector
        isOpen={true}
        onClose={onClose}
        periods={mockPeriods}
        onSelectPeriod={onSelectPeriod}
      />
    )

    fireEvent.click(screen.getByText('Next'))

    expect(onSelectPeriod).toHaveBeenCalledWith(1) // Index of "Next"
    expect(onClose).toHaveBeenCalled()
  })

  it('shows empty state when no periods', () => {
    render(
      <PeriodSelector
        isOpen={true}
        onClose={() => {}}
        periods={[]}
        onSelectPeriod={() => {}}
      />
    )

    expect(screen.getByText('No periods yet')).toBeInTheDocument()
    expect(screen.getByText('Create a period first to schedule items')).toBeInTheDocument()
  })
})
