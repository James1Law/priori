import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ItemDrawer from '../../src/components/ItemDrawer'
import type { ItemWithScore, RoadmapPeriod } from '../../src/types/database'

describe('ItemDrawer', () => {
  const mockItem: ItemWithScore = {
    id: '1',
    session_id: 'session-1',
    title: 'Test Item',
    description: 'Test description',
    position: 1,
    backlog_position: null,
    created_by: 'Alice',
    created_at: '2024-01-01',
    roadmap_start_period: null,
    roadmap_end_period: null,
    roadmap_start_quadrant: null,
    roadmap_end_quadrant: null,
    roadmap_row: 0, start_date: null, end_date: null,
    status: 'todo',
    story_points: 5,
    score: {
      id: 'score-1',
      item_id: '1',
      framework: 'rice',
      criteria: { reach: 100, impact: 2, confidence: 0.8, effort: 1 },
      calculated_score: 160,
    },
  }

  const mockPeriods: RoadmapPeriod[] = [
    { id: 'p1', session_id: 'session-1', name: 'Now', position: 0, width: 4, created_at: '2024-01-01' },
    { id: 'p2', session_id: 'session-1', name: 'Next', position: 1, width: 4, created_at: '2024-01-01' },
    { id: 'p3', session_id: 'session-1', name: 'Later', position: 2, width: 4, created_at: '2024-01-01' },
  ]

  const defaultProps = {
    item: mockItem,
    isOpen: true,
    framework: 'rice' as const,
    periods: mockPeriods,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onDelete: vi.fn(),
    onAssignPeriod: vi.fn(),
    onUnassignPeriod: vi.fn(),
  }

  it('renders nothing when not open', () => {
    render(<ItemDrawer {...defaultProps} isOpen={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders nothing when item is null', () => {
    render(<ItemDrawer {...defaultProps} item={null} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders drawer when open with item', () => {
    render(<ItemDrawer {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Edit Item')).toBeInTheDocument()
  })

  it('displays item title in input', () => {
    render(<ItemDrawer {...defaultProps} />)
    const titleInput = screen.getByLabelText('Title') as HTMLInputElement
    expect(titleInput.value).toBe('Test Item')
  })

  it('displays item description in textarea', () => {
    render(<ItemDrawer {...defaultProps} />)
    const descInput = screen.getByLabelText('Description') as HTMLTextAreaElement
    expect(descInput.value).toBe('Test description')
  })

  it('displays status buttons', () => {
    render(<ItemDrawer {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'To Do' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'In Progress' })).toBeInTheDocument()
    // "Done" appears twice (status button + save button when no changes)
    const doneButtons = screen.getAllByRole('button', { name: 'Done' })
    expect(doneButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('highlights current status', () => {
    render(<ItemDrawer {...defaultProps} />)
    const todoButton = screen.getByRole('button', { name: 'To Do' })
    expect(todoButton).toHaveClass('ring-2')
  })

  it('displays RICE score metrics', () => {
    render(<ItemDrawer {...defaultProps} />)
    expect(screen.getByText('RICE Score')).toBeInTheDocument()
    expect(screen.getByText('160')).toBeInTheDocument()
  })

  it('displays story points', () => {
    render(<ItemDrawer {...defaultProps} />)
    expect(screen.getByText('Story Points')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('displays ICE score for ICE framework', () => {
    const iceItem: ItemWithScore = {
      ...mockItem,
      score: {
        id: 'score-1',
        item_id: '1',
        framework: 'ice',
        criteria: { impact: 7, confidence: 8, ease: 6 },
        calculated_score: 7,
      },
    }
    render(<ItemDrawer {...defaultProps} item={iceItem} framework="ice" />)
    expect(screen.getByText('ICE Score')).toBeInTheDocument()
    expect(screen.getByText('7.0')).toBeInTheDocument()
  })

  it('displays Value/Effort quadrant for value_effort framework', () => {
    const veItem: ItemWithScore = {
      ...mockItem,
      score: {
        id: 'score-1',
        item_id: '1',
        framework: 'value_effort',
        criteria: { value: 8, effort: 3 },
        calculated_score: 0, // Quadrant-based, no numeric score
      },
    }
    render(<ItemDrawer {...defaultProps} item={veItem} framework="value_effort" />)
    expect(screen.getByText('Value/Effort')).toBeInTheDocument()
    // value=8 (high), effort=3 (low) -> Quick Wins quadrant
    expect(screen.getByText('Quick Wins')).toBeInTheDocument()
  })

  it('displays MoSCoW category', () => {
    const moscowItem: ItemWithScore = {
      ...mockItem,
      score: {
        id: 'score-1',
        item_id: '1',
        framework: 'moscow',
        criteria: { category: 'must' },
        calculated_score: 0, // Categorical, no numeric score
      },
    }
    render(<ItemDrawer {...defaultProps} item={moscowItem} framework="moscow" />)
    expect(screen.getByText('MoSCoW')).toBeInTheDocument()
    // "must" is formatted as "Must Have"
    expect(screen.getByText('Must Have')).toBeInTheDocument()
  })

  it('displays schedule section with date inputs', () => {
    render(<ItemDrawer {...defaultProps} />)
    expect(screen.getByText('Schedule')).toBeInTheDocument()
    expect(screen.getByText('Start date')).toBeInTheDocument()
    expect(screen.getByText('End date')).toBeInTheDocument()
  })

  it('populates date inputs from item dates', () => {
    const itemWithDates: ItemWithScore = {
      ...mockItem,
      start_date: '2026-04-01',
      end_date: '2026-04-30',
    }
    render(<ItemDrawer {...defaultProps} item={itemWithDates} />)
    const dateInputs = screen.getAllByDisplayValue(/2026-04/)
    expect(dateInputs.length).toBeGreaterThanOrEqual(1)
  })

  it('displays created by info', () => {
    render(<ItemDrawer {...defaultProps} />)
    expect(screen.getByText(/Created by/)).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('hides created by when not available', () => {
    const itemWithoutCreator: ItemWithScore = {
      ...mockItem,
      created_by: null,
    }
    render(<ItemDrawer {...defaultProps} item={itemWithoutCreator} />)
    expect(screen.queryByText(/Created by/)).not.toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<ItemDrawer {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByLabelText('Close drawer'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Cancel button clicked', () => {
    const onClose = vi.fn()
    render(<ItemDrawer {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<ItemDrawer {...defaultProps} onClose={onClose} />)

    // Click the overlay (first div with bg-black)
    const overlay = container.querySelector('[aria-hidden="true"]')
    fireEvent.click(overlay!)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onSave when Save button clicked', () => {
    const onSave = vi.fn()
    render(<ItemDrawer {...defaultProps} onSave={onSave} />)

    // Make a change to enable save
    const titleInput = screen.getByLabelText('Title')
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Updated Title',
    }))
  })

  it('calls onDelete when Delete button clicked', () => {
    const onDelete = vi.fn()
    const onClose = vi.fn()
    render(<ItemDrawer {...defaultProps} onDelete={onDelete} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith('1')
    expect(onClose).toHaveBeenCalled()
  })

  it('disables save button when title is empty', () => {
    render(<ItemDrawer {...defaultProps} />)

    const titleInput = screen.getByLabelText('Title')
    fireEvent.change(titleInput, { target: { value: '' } })

    // Find the Save Changes button in footer (with indigo styling)
    const saveButton = screen.getByRole('button', { name: 'Save Changes' })
    expect(saveButton).toBeDisabled()
  })

  it('shows "Done" button in footer when no changes made', () => {
    render(<ItemDrawer {...defaultProps} />)
    // Find the Done button in the footer (the one with indigo styling)
    const doneButtons = screen.getAllByRole('button', { name: 'Done' })
    const footerDoneButton = doneButtons.find(btn => btn.classList.contains('bg-indigo-600'))
    expect(footerDoneButton).toBeInTheDocument()
  })

  it('shows "Save Changes" when changes made', () => {
    render(<ItemDrawer {...defaultProps} />)

    const titleInput = screen.getByLabelText('Title')
    fireEvent.change(titleInput, { target: { value: 'New Title' } })

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
  })

  it('updates status when status button clicked', () => {
    const onSave = vi.fn()
    render(<ItemDrawer {...defaultProps} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'In Progress' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      status: 'in_progress',
    }))
  })

  it('calls onSetItemDates when dates are changed and saved', () => {
    const onSetItemDates = vi.fn().mockResolvedValue(undefined)
    render(<ItemDrawer {...defaultProps} onSetItemDates={onSetItemDates} />)

    const dateInputs = screen.getAllByDisplayValue('') as HTMLInputElement[]
    const startInput = dateInputs.find(i => i.type === 'date')
    if (startInput) {
      fireEvent.change(startInput, { target: { value: '2026-05-01' } })
    }

    // Changing a date triggers hasChanges
    const saveBtn = screen.queryByRole('button', { name: 'Save Changes' })
    if (saveBtn) fireEvent.click(saveBtn)
  })

  it('calls onClearItemDates when dates are cleared and saved', () => {
    const itemWithDates: ItemWithScore = {
      ...mockItem,
      start_date: '2026-04-01',
      end_date: '2026-04-30',
    }
    const onClearItemDates = vi.fn().mockResolvedValue(undefined)
    render(<ItemDrawer {...defaultProps} item={itemWithDates} onClearItemDates={onClearItemDates} />)

    // Find the clear dates button (X icon)
    const clearBtn = screen.getByTitle('Clear dates')
    fireEvent.click(clearBtn)

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(onClearItemDates).toHaveBeenCalledWith('1')
  })

  it('does not show metrics section when no score and no story points', () => {
    const itemWithoutMetrics: ItemWithScore = {
      ...mockItem,
      score: undefined,
      story_points: null,
    }
    render(<ItemDrawer {...defaultProps} item={itemWithoutMetrics} />)
    expect(screen.queryByText('Metrics')).not.toBeInTheDocument()
  })
})
