import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ItemList from '../../src/components/ItemList'
import type { Item } from '../../src/types/database'

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
    expect(deleteButtons).toHaveLength(2)
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
