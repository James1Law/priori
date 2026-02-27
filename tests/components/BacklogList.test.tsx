import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BacklogList from '../../src/components/BacklogList'
import type { ItemWithScore } from '../../src/types/database'

describe('BacklogList', () => {
  const mockItems: ItemWithScore[] = [
    {
      id: '1',
      session_id: 'session-1',
      title: 'First Item',
      description: 'First description',
      position: 1,
      backlog_position: null,
      created_by: 'Alice',
      created_at: '2024-01-01',
      roadmap_start_period: null,
      roadmap_end_period: null,
      roadmap_start_quadrant: null,
      roadmap_end_quadrant: null,
      roadmap_row: 0,
      score: {
        id: 'score-1',
        item_id: '1',
        framework: 'rice',
        criteria: { reach: 100, impact: 2, confidence: 0.8, effort: 1 },
        calculated_score: 160,
      },
    },
    {
      id: '2',
      session_id: 'session-1',
      title: 'Second Item',
      description: 'Second description',
      position: 2,
      backlog_position: null,
      created_by: 'Bob',
      created_at: '2024-01-02',
      roadmap_start_period: null,
      roadmap_end_period: null,
      roadmap_start_quadrant: null,
      roadmap_end_quadrant: null,
      roadmap_row: 0,
      score: {
        id: 'score-2',
        item_id: '2',
        framework: 'rice',
        criteria: { reach: 50, impact: 1, confidence: 0.5, effort: 1 },
        calculated_score: 25,
      },
    },
    {
      id: '3',
      session_id: 'session-1',
      title: 'Third Item',
      description: null,
      position: 3,
      backlog_position: null,
      created_by: null,
      created_at: '2024-01-03',
      roadmap_start_period: null,
      roadmap_end_period: null,
      roadmap_start_quadrant: null,
      roadmap_end_quadrant: null,
      roadmap_row: 0,
      score: {
        id: 'score-3',
        item_id: '3',
        framework: 'rice',
        criteria: { reach: 200, impact: 3, confidence: 1, effort: 2 },
        calculated_score: 300,
      },
    },
  ]

  const defaultProps = {
    items: mockItems,
    framework: 'rice' as const,
    isManualOrder: false,
    cutoffs: [] as { id: string; session_id: string; position: number; label: string; color: 'red' | 'amber' | 'blue' | 'green'; created_at: string }[],
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onReorder: vi.fn(),
    onResetOrder: vi.fn(),
    onAddCutoff: vi.fn(),
    onUpdateCutoff: vi.fn(),
    onDeleteCutoff: vi.fn(),
  }

  it('renders empty state when no items', () => {
    render(<BacklogList {...defaultProps} items={[]} />)
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument()
  })

  it('renders all items', () => {
    render(<BacklogList {...defaultProps} />)
    expect(screen.getByText('First Item')).toBeInTheDocument()
    expect(screen.getByText('Second Item')).toBeInTheDocument()
    expect(screen.getByText('Third Item')).toBeInTheDocument()
  })

  it('sorts items by score descending', () => {
    render(<BacklogList {...defaultProps} />)

    const items = screen.getAllByRole('article')
    // Third Item (300) should be first, First Item (160) second, Second Item (25) third
    expect(items[0]).toHaveTextContent('Third Item')
    expect(items[1]).toHaveTextContent('First Item')
    expect(items[2]).toHaveTextContent('Second Item')
  })

  it('displays rank numbers based on sorted order', () => {
    render(<BacklogList {...defaultProps} />)

    // Ranks should be 1, 2, 3 based on sorted order
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('displays item descriptions when present', () => {
    render(<BacklogList {...defaultProps} />)
    expect(screen.getByText('First description')).toBeInTheDocument()
    expect(screen.getByText('Second description')).toBeInTheDocument()
  })

  it('displays score badge with RICE format', () => {
    render(<BacklogList {...defaultProps} framework="rice" />)
    // Badges appear twice (mobile + desktop), so use getAllByText
    expect(screen.getAllByText('RICE: 300').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('RICE: 160').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('RICE: 25').length).toBeGreaterThanOrEqual(1)
  })

  it('displays score badge with ICE format', () => {
    const iceItems: ItemWithScore[] = [
      {
        ...mockItems[0],
        score: {
          id: 'score-1',
          item_id: '1',
          framework: 'ice',
          criteria: { impact: 7, confidence: 8, ease: 6 },
          calculated_score: 7,
        },
      },
    ]
    render(<BacklogList {...defaultProps} items={iceItems} framework="ice" />)
    expect(screen.getAllByText('ICE: 7.0').length).toBeGreaterThanOrEqual(1)
  })

  it('displays score badge with Value/Effort format', () => {
    const veItems: ItemWithScore[] = [
      {
        ...mockItems[0],
        score: {
          id: 'score-1',
          item_id: '1',
          framework: 'value_effort',
          criteria: { value: 8, effort: 3 },
          calculated_score: 2.67,
        },
      },
    ]
    render(<BacklogList {...defaultProps} items={veItems} framework="value_effort" />)
    // Value vs Effort now shows quadrant name instead of numeric score
    // value=8, effort=3 -> high value (>5.5), low effort (<=5.5) -> Quick Wins
    expect(screen.getAllByText('Quick Wins').length).toBeGreaterThanOrEqual(1)
  })

  it('displays MoSCoW category as score', () => {
    const moscowItems: ItemWithScore[] = [
      {
        ...mockItems[0],
        score: {
          id: 'score-1',
          item_id: '1',
          framework: 'moscow',
          criteria: { category: 'must' },
          calculated_score: 4,
        },
      },
    ]
    render(<BacklogList {...defaultProps} items={moscowItems} framework="moscow" />)
    // MoSCoW now shows formatted labels: "must" -> "Must Have"
    expect(screen.getAllByText('Must Have').length).toBeGreaterThanOrEqual(1)
  })

  it('displays weighted score format', () => {
    const weightedItems: ItemWithScore[] = [
      {
        ...mockItems[0],
        score: {
          id: 'score-1',
          item_id: '1',
          framework: 'weighted',
          criteria: { scores: { c1: 8, c2: 7 } },
          calculated_score: 7.5,
        },
      },
    ]
    render(<BacklogList {...defaultProps} items={weightedItems} framework="weighted" />)
    expect(screen.getAllByText('Score: 7.50').length).toBeGreaterThanOrEqual(1)
  })

  it('hides score column when no items have scores (progressive disclosure)', () => {
    const noScoreItems: ItemWithScore[] = [
      {
        id: '1',
        session_id: 'session-1',
        title: 'No Score Item',
        description: null,
        position: 1,
        created_by: null,
        created_at: '2024-01-01',
      },
    ]
    render(<BacklogList {...defaultProps} items={noScoreItems} />)
    // Score column should be hidden entirely when no items have scores
    expect(screen.queryByText('RICE:')).not.toBeInTheDocument()
  })

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn()
    render(<BacklogList {...defaultProps} onEdit={onEdit} />)

    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    fireEvent.click(editButtons[0])

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Third Item' }))
  })

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn()
    render(<BacklogList {...defaultProps} onDelete={onDelete} />)

    // Get the desktop delete buttons (there are both mobile and desktop versions)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    expect(onDelete).toHaveBeenCalledWith('3') // Third item is first due to sorting
  })

  it('handles items with zero scores', () => {
    const zeroScoreItems: ItemWithScore[] = [
      {
        ...mockItems[0],
        score: {
          id: 'score-1',
          item_id: '1',
          framework: 'rice',
          criteria: {},
          calculated_score: 0,
        },
      },
    ]
    render(<BacklogList {...defaultProps} items={zeroScoreItems} />)
    expect(screen.getAllByText('RICE: 0').length).toBeGreaterThanOrEqual(1)
  })

  it('shows sort dropdown with Score selected when not in manual order', () => {
    render(<BacklogList {...defaultProps} isManualOrder={false} />)
    const sortSelect = screen.getByLabelText('Sort by:') as HTMLSelectElement
    expect(sortSelect.value).toBe('score')
  })

  it('shows sort dropdown with Manual selected when in manual order', () => {
    render(<BacklogList {...defaultProps} isManualOrder={true} />)
    const sortSelect = screen.getByLabelText('Sort by:') as HTMLSelectElement
    expect(sortSelect.value).toBe('manual')
  })

  // Reset order button was removed - users can change sort dropdown to reset order

  it('renders drag handles for each item', () => {
    render(<BacklogList {...defaultProps} />)
    const dragHandles = screen.getAllByLabelText('Drag to reorder')
    expect(dragHandles).toHaveLength(3)
  })

  // Cutoff line tests
  const createMockCutoff = (id: string, position: number, label: string = 'Cutoff', color: 'red' | 'amber' | 'blue' | 'green' = 'red') => ({
    id,
    session_id: 'session-1',
    position,
    label,
    color,
    created_at: '2024-01-01',
  })

  it('shows add cutoff buttons between items when no cutoffs', () => {
    render(<BacklogList {...defaultProps} cutoffs={[]} />)
    const addButtons = screen.getAllByLabelText('Add cutoff line here')
    // Should show between items (2 buttons for 3 items)
    expect(addButtons).toHaveLength(2)
  })

  it('does not show add cutoff buttons at positions where cutoffs exist', () => {
    const cutoffs = [createMockCutoff('c1', 1, 'Sprint 1')]
    render(<BacklogList {...defaultProps} cutoffs={cutoffs} />)
    // Should only have 1 button (at position 2, since position 1 has a cutoff)
    const addButtons = screen.getAllByLabelText('Add cutoff line here')
    expect(addButtons).toHaveLength(1)
  })

  it('renders cutoff line at correct position', () => {
    const cutoffs = [createMockCutoff('c1', 1, 'Sprint 1')]
    render(<BacklogList {...defaultProps} cutoffs={cutoffs} />)
    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
  })

  it('calls onAddCutoff when add cutoff button clicked', () => {
    const onAddCutoff = vi.fn()
    render(<BacklogList {...defaultProps} cutoffs={[]} onAddCutoff={onAddCutoff} />)

    const addButtons = screen.getAllByLabelText('Add cutoff line here')
    fireEvent.click(addButtons[0])
    expect(onAddCutoff).toHaveBeenCalledWith(1)
  })

  it('calls onDeleteCutoff when remove cutoff button clicked', () => {
    const onDeleteCutoff = vi.fn()
    const cutoffs = [createMockCutoff('c1', 1, 'Sprint 1')]
    render(<BacklogList {...defaultProps} cutoffs={cutoffs} onDeleteCutoff={onDeleteCutoff} />)

    const removeButton = screen.getByLabelText('Remove cutoff line')
    fireEvent.click(removeButton)
    expect(onDeleteCutoff).toHaveBeenCalledWith('c1')
  })

  // Interactive cutoff tests
  it('renders move up/down buttons on cutoff line', () => {
    const cutoffs = [createMockCutoff('c1', 2, 'Sprint 1')]
    render(<BacklogList {...defaultProps} cutoffs={cutoffs} />)
    expect(screen.getByLabelText('Move cutoff up')).toBeInTheDocument()
    expect(screen.getByLabelText('Move cutoff down')).toBeInTheDocument()
  })

  it('disables move up button when cutoff at top', () => {
    const cutoffs = [createMockCutoff('c1', 1, 'Sprint 1')]
    render(<BacklogList {...defaultProps} cutoffs={cutoffs} />)
    const moveUpButton = screen.getByLabelText('Move cutoff up')
    expect(moveUpButton).toBeDisabled()
  })

  it('disables move down button when cutoff at last position', () => {
    const cutoffs = [createMockCutoff('c1', 3, 'Cutoff')]
    render(<BacklogList {...defaultProps} cutoffs={cutoffs} />)
    const moveDownButton = screen.getByLabelText('Move cutoff down')
    expect(moveDownButton).toBeDisabled()
  })

  it('calls onUpdateCutoff when move up clicked', () => {
    const onUpdateCutoff = vi.fn()
    const cutoffs = [createMockCutoff('c1', 2, 'Sprint 1')]
    render(<BacklogList {...defaultProps} cutoffs={cutoffs} onUpdateCutoff={onUpdateCutoff} />)

    fireEvent.click(screen.getByLabelText('Move cutoff up'))
    expect(onUpdateCutoff).toHaveBeenCalledWith('c1', { position: 1 })
  })

  it('calls onUpdateCutoff when move down clicked', () => {
    const onUpdateCutoff = vi.fn()
    const cutoffs = [createMockCutoff('c1', 2, 'Sprint 1')]
    render(<BacklogList {...defaultProps} cutoffs={cutoffs} onUpdateCutoff={onUpdateCutoff} />)

    fireEvent.click(screen.getByLabelText('Move cutoff down'))
    expect(onUpdateCutoff).toHaveBeenCalledWith('c1', { position: 3 })
  })

  it('shows edit label button', () => {
    const cutoffs = [createMockCutoff('c1', 1, 'Sprint 1')]
    render(<BacklogList {...defaultProps} cutoffs={cutoffs} />)
    expect(screen.getByLabelText('Edit cutoff label')).toBeInTheDocument()
  })

  it('shows input when edit label clicked', () => {
    const cutoffs = [createMockCutoff('c1', 1, 'Sprint 1')]
    render(<BacklogList {...defaultProps} cutoffs={cutoffs} />)

    fireEvent.click(screen.getByLabelText('Edit cutoff label'))
    expect(screen.getByLabelText('Cutoff label')).toBeInTheDocument()
  })

  it('calls onUpdateCutoff when label edited', () => {
    const onUpdateCutoff = vi.fn()
    const cutoffs = [createMockCutoff('c1', 1, 'Sprint 1')]
    render(<BacklogList {...defaultProps} cutoffs={cutoffs} onUpdateCutoff={onUpdateCutoff} />)

    fireEvent.click(screen.getByLabelText('Edit cutoff label'))
    const input = screen.getByLabelText('Cutoff label')
    fireEvent.change(input, { target: { value: 'MVP' } })
    fireEvent.blur(input)

    expect(onUpdateCutoff).toHaveBeenCalledWith('c1', { label: 'MVP' })
  })

  // Multiple cutoffs tests
  it('renders multiple cutoff lines', () => {
    const cutoffs = [
      createMockCutoff('c1', 1, 'Sprint 1', 'red'),
      createMockCutoff('c2', 2, 'Sprint 2', 'blue'),
    ]
    render(<BacklogList {...defaultProps} cutoffs={cutoffs} />)
    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
    expect(screen.getByText('Sprint 2')).toBeInTheDocument()
  })

  it('shows color picker button on cutoff line', () => {
    const cutoffs = [createMockCutoff('c1', 1, 'Sprint 1', 'red')]
    render(<BacklogList {...defaultProps} cutoffs={cutoffs} />)
    expect(screen.getByLabelText('Change cutoff color')).toBeInTheDocument()
  })

  it('calls onUpdateCutoff when color changed', () => {
    const onUpdateCutoff = vi.fn()
    const cutoffs = [createMockCutoff('c1', 1, 'Sprint 1', 'red')]
    render(<BacklogList {...defaultProps} cutoffs={cutoffs} onUpdateCutoff={onUpdateCutoff} />)

    // Open color picker
    fireEvent.click(screen.getByLabelText('Change cutoff color'))
    // Click blue color
    fireEvent.click(screen.getByLabelText('Set color to blue'))

    expect(onUpdateCutoff).toHaveBeenCalledWith('c1', { color: 'blue' })
  })

  // Story points tests
  it('displays story points badge when item has story_points', () => {
    const itemsWithSP: ItemWithScore[] = [
      {
        ...mockItems[0],
        story_points: 5,
      },
    ]
    render(<BacklogList {...defaultProps} items={itemsWithSP} />)
    // Badge appears twice (mobile + desktop), so use getAllByText
    const badges = screen.getAllByText('5 SP')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it('does not display story points badge when item has no story_points', () => {
    const itemsWithoutSP: ItemWithScore[] = [
      {
        ...mockItems[0],
        story_points: null,
      },
    ]
    render(<BacklogList {...defaultProps} items={itemsWithoutSP} />)
    expect(screen.queryByText(/\d+ SP/)).not.toBeInTheDocument()
  })

  it('displays story points for multiple items', () => {
    const itemsWithSP: ItemWithScore[] = [
      { ...mockItems[0], story_points: 3 },
      { ...mockItems[1], story_points: 8 },
      { ...mockItems[2], story_points: null },
    ]
    render(<BacklogList {...defaultProps} items={itemsWithSP} />)
    // Badges appear twice each (mobile + desktop)
    const badges3SP = screen.getAllByText('3 SP')
    const badges8SP = screen.getAllByText('8 SP')
    expect(badges3SP.length).toBeGreaterThanOrEqual(1)
    expect(badges8SP.length).toBeGreaterThanOrEqual(1)
  })

  // Selection tests
  it('renders checkbox for each item', () => {
    render(<BacklogList {...defaultProps} />)
    const checkboxes = screen.getAllByRole('button', { name: /select item|deselect item/i })
    expect(checkboxes).toHaveLength(3)
  })

  it('renders select all checkbox', () => {
    render(<BacklogList {...defaultProps} />)
    expect(screen.getByRole('button', { name: /select all|deselect all/i })).toBeInTheDocument()
  })

  it('selects item when checkbox clicked', () => {
    render(<BacklogList {...defaultProps} />)
    const checkboxes = screen.getAllByRole('button', { name: /select item/i })

    fireEvent.click(checkboxes[0])

    // After clicking, button should change to "Deselect item"
    expect(screen.getByRole('button', { name: /deselect item/i })).toBeInTheDocument()
  })

  it('shows action bar when item selected', () => {
    render(<BacklogList {...defaultProps} onDeleteMultiple={vi.fn()} onStatusChangeMultiple={vi.fn()} />)
    const checkboxes = screen.getAllByRole('button', { name: /select item/i })

    fireEvent.click(checkboxes[0])

    expect(screen.getByText('1 item selected')).toBeInTheDocument()
    expect(screen.getByText('Clear')).toBeInTheDocument()
  })

  it('shows plural "items" when multiple selected', () => {
    render(<BacklogList {...defaultProps} onDeleteMultiple={vi.fn()} onStatusChangeMultiple={vi.fn()} />)
    const checkboxes = screen.getAllByRole('button', { name: /select item/i })

    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[1])

    expect(screen.getByText('2 items selected')).toBeInTheDocument()
  })

  it('clears selection when Clear clicked', () => {
    render(<BacklogList {...defaultProps} onDeleteMultiple={vi.fn()} onStatusChangeMultiple={vi.fn()} />)
    const checkboxes = screen.getAllByRole('button', { name: /select item/i })

    fireEvent.click(checkboxes[0])
    expect(screen.getByText('1 item selected')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Clear'))
    expect(screen.queryByText('1 item selected')).not.toBeInTheDocument()
  })

  it('selects all items when select all clicked', () => {
    render(<BacklogList {...defaultProps} onDeleteMultiple={vi.fn()} onStatusChangeMultiple={vi.fn()} />)
    const selectAllButton = screen.getByRole('button', { name: /select all/i })

    fireEvent.click(selectAllButton)

    expect(screen.getByText('3 items selected')).toBeInTheDocument()
  })

  it('deselects all items when select all clicked with all selected', () => {
    render(<BacklogList {...defaultProps} onDeleteMultiple={vi.fn()} onStatusChangeMultiple={vi.fn()} />)

    // First select all
    const selectAllButton = screen.getByRole('button', { name: /select all/i })
    fireEvent.click(selectAllButton)
    expect(screen.getByText('3 items selected')).toBeInTheDocument()

    // Then deselect all
    const deselectAllButton = screen.getByRole('button', { name: /deselect all/i })
    fireEvent.click(deselectAllButton)
    expect(screen.queryByText('3 items selected')).not.toBeInTheDocument()
  })

  it('calls onDeleteMultiple when delete action clicked', () => {
    const onDeleteMultiple = vi.fn()
    render(<BacklogList {...defaultProps} onDeleteMultiple={onDeleteMultiple} onStatusChangeMultiple={vi.fn()} />)
    const checkboxes = screen.getAllByRole('button', { name: /select item/i })

    fireEvent.click(checkboxes[0])

    // Find the Delete button in the action bar (not the individual delete buttons)
    const deleteButton = screen.getByRole('toolbar').querySelector('button')
    const actionBarDeleteButton = screen.getByRole('toolbar').querySelectorAll('button')
    const deleteInToolbar = Array.from(actionBarDeleteButton).find(btn => btn.textContent?.includes('Delete'))
    fireEvent.click(deleteInToolbar!)

    expect(onDeleteMultiple).toHaveBeenCalled()
  })

  it('shows Set Status dropdown in action bar', () => {
    render(<BacklogList {...defaultProps} onDeleteMultiple={vi.fn()} onStatusChangeMultiple={vi.fn()} />)
    const checkboxes = screen.getAllByRole('button', { name: /select item/i })

    fireEvent.click(checkboxes[0])

    expect(screen.getByRole('button', { name: /set status/i })).toBeInTheDocument()
  })

  it('calls onStatusChangeMultiple when status option clicked', () => {
    const onStatusChangeMultiple = vi.fn()
    render(<BacklogList {...defaultProps} onDeleteMultiple={vi.fn()} onStatusChangeMultiple={onStatusChangeMultiple} />)
    const checkboxes = screen.getAllByRole('button', { name: /select item/i })

    fireEvent.click(checkboxes[0])

    // Open status dropdown
    fireEvent.click(screen.getByRole('button', { name: /set status/i }))

    // Click "In Progress" option
    fireEvent.click(screen.getByRole('option', { name: /in progress/i }))

    expect(onStatusChangeMultiple).toHaveBeenCalledWith(['3'], 'in_progress') // Item '3' is first due to sorting
  })

  it('shows Assign Period dropdown when periods provided', () => {
    const periods = [
      { id: 'p1', session_id: 'session-1', name: 'Now', position: 0, width: 4, created_at: '2024-01-01' },
      { id: 'p2', session_id: 'session-1', name: 'Next', position: 1, width: 4, created_at: '2024-01-01' },
    ]
    render(
      <BacklogList
        {...defaultProps}
        periods={periods}
        onDeleteMultiple={vi.fn()}
        onStatusChangeMultiple={vi.fn()}
        onAssignPeriod={vi.fn()}
      />
    )
    const checkboxes = screen.getAllByRole('button', { name: /select item/i })

    fireEvent.click(checkboxes[0])

    expect(screen.getByRole('button', { name: /assign period/i })).toBeInTheDocument()
  })

  it('calls onAssignPeriod when period option clicked', () => {
    const onAssignPeriod = vi.fn()
    const periods = [
      { id: 'p1', session_id: 'session-1', name: 'Now', position: 0, width: 4, created_at: '2024-01-01' },
      { id: 'p2', session_id: 'session-1', name: 'Next', position: 1, width: 4, created_at: '2024-01-01' },
    ]
    render(
      <BacklogList
        {...defaultProps}
        periods={periods}
        onDeleteMultiple={vi.fn()}
        onStatusChangeMultiple={vi.fn()}
        onAssignPeriod={onAssignPeriod}
      />
    )
    const checkboxes = screen.getAllByRole('button', { name: /select item/i })

    fireEvent.click(checkboxes[0])

    // Open period dropdown
    fireEvent.click(screen.getByRole('button', { name: /assign period/i }))

    // Click "Next" option
    fireEvent.click(screen.getByRole('option', { name: 'Next' }))

    expect(onAssignPeriod).toHaveBeenCalledWith(['3'], 1) // Item '3' is first, period position 1
  })
})
