import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ActionBar from '../../src/components/ActionBar'

describe('ActionBar', () => {
  const defaultProps = {
    selectedCount: 3,
    onClearSelection: vi.fn(),
    onSetStatus: vi.fn(),
    onAssignPeriod: vi.fn(),
    onDelete: vi.fn(),
    periods: [],
    hasDeleteHandler: true,
    hasStatusHandler: true,
    hasPeriodHandler: false,
  }

  it('renders disabled state when no items selected', () => {
    render(<ActionBar {...defaultProps} selectedCount={0} />)
    expect(screen.getByText('Select items to perform actions')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeDisabled()
  })

  it('shows selected count', () => {
    render(<ActionBar {...defaultProps} />)
    expect(screen.getByText('3 items selected')).toBeInTheDocument()
  })

  it('shows singular text for 1 item', () => {
    render(<ActionBar {...defaultProps} selectedCount={1} />)
    expect(screen.getByText('1 item selected')).toBeInTheDocument()
  })

  it('calls onClearSelection when clicking clear', () => {
    const onClearSelection = vi.fn()
    render(<ActionBar {...defaultProps} onClearSelection={onClearSelection} />)

    fireEvent.click(screen.getByText('Clear'))
    expect(onClearSelection).toHaveBeenCalled()
  })


  it('shows Delete button when hasDeleteHandler is true', () => {
    render(<ActionBar {...defaultProps} />)
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('calls onDelete when clicking Delete', () => {
    const onDelete = vi.fn()
    render(<ActionBar {...defaultProps} onDelete={onDelete} />)

    fireEvent.click(screen.getByText('Delete'))
    expect(onDelete).toHaveBeenCalled()
  })

  it('shows Set Status dropdown when hasStatusHandler is true', () => {
    render(<ActionBar {...defaultProps} />)
    expect(screen.getByText('Set Status')).toBeInTheDocument()
  })

  it('opens status dropdown and calls onSetStatus', () => {
    const onSetStatus = vi.fn()
    render(<ActionBar {...defaultProps} onSetStatus={onSetStatus} />)

    fireEvent.click(screen.getByText('Set Status'))
    fireEvent.click(screen.getByText('In Progress'))
    expect(onSetStatus).toHaveBeenCalledWith('in_progress')
  })

  it('shows Assign Period dropdown when hasPeriodHandler and has periods', () => {
    render(
      <ActionBar
        {...defaultProps}
        hasPeriodHandler={true}
        periods={[
          { id: '1', session_id: 's1', name: 'Now', width: 4, position: 0, created_at: '' },
          { id: '2', session_id: 's1', name: 'Next', width: 4, position: 1, created_at: '' },
        ]}
      />
    )
    expect(screen.getByText('Assign Period')).toBeInTheDocument()
  })

  it('opens period dropdown and calls onAssignPeriod', () => {
    const onAssignPeriod = vi.fn()
    render(
      <ActionBar
        {...defaultProps}
        hasPeriodHandler={true}
        onAssignPeriod={onAssignPeriod}
        periods={[
          { id: '1', session_id: 's1', name: 'Now', width: 4, position: 0, created_at: '' },
        ]}
      />
    )

    fireEvent.click(screen.getByText('Assign Period'))
    fireEvent.click(screen.getByText('Now'))
    expect(onAssignPeriod).toHaveBeenCalledWith(0)
  })
})
