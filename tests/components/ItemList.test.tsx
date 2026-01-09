import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    render(<ItemList items={[]} />)
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument()
  })

  it('renders list of items', () => {
    render(<ItemList items={mockItems} />)
    expect(screen.getByText('First Item')).toBeInTheDocument()
    expect(screen.getByText('Second Item')).toBeInTheDocument()
  })

  it('renders item descriptions when present', () => {
    render(<ItemList items={mockItems} />)
    expect(screen.getByText('First description')).toBeInTheDocument()
  })

  it('does not show description for items without one', () => {
    render(<ItemList items={mockItems} />)
    const secondItem = screen.getByText('Second Item').closest('div')
    expect(secondItem?.textContent).not.toContain('null')
  })

  it('displays correct number of items', () => {
    render(<ItemList items={mockItems} />)
    const items = screen.getAllByRole('article')
    expect(items).toHaveLength(2)
  })
})
