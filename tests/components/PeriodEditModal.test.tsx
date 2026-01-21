import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PeriodEditModal from '../../src/components/PeriodEditModal'
import { RoadmapPeriod } from '../../src/types/database'

const mockPeriod: RoadmapPeriod = {
  id: 'period-1',
  session_id: 'session-1',
  name: 'Now',
  width: 4,
  position: 0,
  created_at: '2024-01-01',
}

describe('PeriodEditModal', () => {
  const mockOnSave = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with period name pre-filled', () => {
    render(
      <PeriodEditModal
        period={mockPeriod}
        itemCount={0}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('Now')
  })

  it('shows edit form with correct title', () => {
    render(
      <PeriodEditModal
        period={mockPeriod}
        itemCount={0}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Edit Period')).toBeInTheDocument()
    expect(screen.getByText('Rename or delete this period')).toBeInTheDocument()
  })

  it('shows item count message for empty period', () => {
    render(
      <PeriodEditModal
        period={mockPeriod}
        itemCount={0}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('No items scheduled in this period')).toBeInTheDocument()
  })

  it('shows item count message for period with items', () => {
    render(
      <PeriodEditModal
        period={mockPeriod}
        itemCount={3}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('3 items scheduled')).toBeInTheDocument()
  })

  it('shows singular item count message', () => {
    render(
      <PeriodEditModal
        period={mockPeriod}
        itemCount={1}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('1 item scheduled')).toBeInTheDocument()
  })

  it('calls onClose when Cancel button is clicked', () => {
    render(
      <PeriodEditModal
        period={mockPeriod}
        itemCount={0}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking outside modal', () => {
    render(
      <PeriodEditModal
        period={mockPeriod}
        itemCount={0}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    // Click the backdrop
    fireEvent.click(screen.getByText('Edit Period').closest('.fixed')!)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onSave with trimmed name when Save button is clicked', async () => {
    mockOnSave.mockResolvedValue(undefined)

    render(
      <PeriodEditModal
        period={mockPeriod}
        itemCount={0}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '  Next  ' } })
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('Next')
    })
  })

  it('disables Save button when name is empty', () => {
    render(
      <PeriodEditModal
        period={mockPeriod}
        itemCount={0}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '' } })

    expect(screen.getByText('Save')).toBeDisabled()
  })

  it('calls onDelete directly for empty period', async () => {
    mockOnDelete.mockResolvedValue(undefined)

    render(
      <PeriodEditModal
        period={mockPeriod}
        itemCount={0}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    fireEvent.click(screen.getByText('Delete Period'))

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledTimes(1)
    })
  })

  it('shows confirmation dialog when deleting period with items', () => {
    render(
      <PeriodEditModal
        period={mockPeriod}
        itemCount={2}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    fireEvent.click(screen.getByText('Delete Period'))

    expect(screen.getByText('Delete Period?')).toBeInTheDocument()
    expect(
      screen.getByText(/This will unschedule 2 items from the roadmap/)
    ).toBeInTheDocument()
  })

  it('calls onDelete when confirming delete for period with items', async () => {
    mockOnDelete.mockResolvedValue(undefined)

    render(
      <PeriodEditModal
        period={mockPeriod}
        itemCount={2}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    // Click delete to show confirmation
    fireEvent.click(screen.getByText('Delete Period'))

    // Click delete in confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('Delete Period?')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('Delete Period')[0])

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledTimes(1)
    })
  })

  it('returns to edit form when canceling delete confirmation', () => {
    render(
      <PeriodEditModal
        period={mockPeriod}
        itemCount={2}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    // Click delete to show confirmation
    fireEvent.click(screen.getByText('Delete Period'))
    expect(screen.getByText('Delete Period?')).toBeInTheDocument()

    // Click cancel
    fireEvent.click(screen.getByText('Cancel'))

    // Back to edit form
    expect(screen.getByText('Edit Period')).toBeInTheDocument()
    expect(screen.queryByText('Delete Period?')).not.toBeInTheDocument()
  })

  it('calls onSave when pressing Enter in input', async () => {
    mockOnSave.mockResolvedValue(undefined)

    render(
      <PeriodEditModal
        period={mockPeriod}
        itemCount={0}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Later' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('Later')
    })
  })
})
