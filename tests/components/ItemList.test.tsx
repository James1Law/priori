import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ItemList from '../../src/components/ItemList'
import type { Item } from '../../src/types/database'

// Store original ontouchstart for cleanup
const originalOntouchstart = Object.getOwnPropertyDescriptor(window, 'ontouchstart')

const mockItems: Item[] = [
  {
    id: '1',
    session_id: 'test-session',
    title: 'First Item',
    description: 'First description',
    position: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    session_id: 'test-session',
    title: 'Second Item',
    description: null,
    position: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
]

describe('ItemList', () => {
  beforeEach(() => {
    // Remove touch support to ensure consistent test behaviour
    // (SwipeableItem adds extra delete buttons on touch devices)
    // @ts-expect-error - Deleting property for test
    delete window.ontouchstart
  })

  afterEach(() => {
    // Restore original
    if (originalOntouchstart) {
      Object.defineProperty(window, 'ontouchstart', originalOntouchstart)
    }
  })

  it('renders empty state when no items', () => {
    render(<ItemList items={[]} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument()
  })

  it('renders list of items', () => {
    render(<ItemList items={mockItems} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('First Item')).toBeInTheDocument()
    expect(screen.getByText('Second Item')).toBeInTheDocument()
  })

  it('renders item descriptions when present', () => {
    render(<ItemList items={mockItems} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('First description')).toBeInTheDocument()
  })

  it('shows edit button for each item', () => {
    render(<ItemList items={mockItems} onEdit={vi.fn()} onDelete={vi.fn()} />)
    const editButtons = screen.getAllByText('Edit')
    expect(editButtons).toHaveLength(2)
  })

  it('shows delete button for each item', () => {
    render(<ItemList items={mockItems} onEdit={vi.fn()} onDelete={vi.fn()} />)
    const deleteButtons = screen.getAllByText('Delete')
    // On touch devices, SwipeableItem adds an additional delete button per item
    // so we check for at least 2 (one per item)
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2)
  })

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn()
    render(<ItemList items={mockItems} onEdit={onEdit} onDelete={vi.fn()} />)

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    expect(onEdit).toHaveBeenCalledWith(mockItems[0])
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<ItemList items={mockItems} onEdit={vi.fn()} onDelete={onDelete} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    expect(onDelete).toHaveBeenCalledWith(mockItems[0].id)
  })

  it('displays correct number of items', () => {
    render(<ItemList items={mockItems} onEdit={vi.fn()} onDelete={vi.fn()} />)
    const items = screen.getAllByRole('article')
    expect(items).toHaveLength(2)
  })
})
