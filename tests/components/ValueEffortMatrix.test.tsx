import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ValueEffortMatrix from '../../src/components/ValueEffortMatrix'
import type { ItemWithScore } from '../../src/types/database'

const createMockItem = (
  id: string,
  title: string,
  value: number,
  effort: number
): ItemWithScore => ({
  id,
  session_id: 'test-session',
  title,
  description: null,
  position: 0,
  created_at: new Date().toISOString(),
  score: {
    id: `score-${id}`,
    item_id: id,
    framework: 'value_effort',
    criteria: { value, effort },
    calculated_score: 0,
  },
})

describe('ValueEffortMatrix', () => {
  it('renders the 2x2 matrix with quadrant labels', () => {
    render(<ValueEffortMatrix items={[]} onItemClick={vi.fn()} />)

    expect(screen.getByText(/quick wins/i)).toBeInTheDocument()
    expect(screen.getByText(/big bets/i)).toBeInTheDocument()
    expect(screen.getByText(/fill-ins/i)).toBeInTheDocument()
    expect(screen.getByText(/avoid/i)).toBeInTheDocument()
  })

  it('renders axis labels', () => {
    render(<ValueEffortMatrix items={[]} onItemClick={vi.fn()} />)

    // Check for axis labels (excluding the title which contains "Value")
    const valueLabels = screen.getAllByText(/value/i)
    const effortLabels = screen.getAllByText(/effort/i)
    expect(valueLabels.length).toBeGreaterThanOrEqual(1)
    expect(effortLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('displays items as dots in the matrix', () => {
    const items = [
      createMockItem('1', 'Item 1', 8, 3),
      createMockItem('2', 'Item 2', 3, 8),
    ]

    render(<ValueEffortMatrix items={items} onItemClick={vi.fn()} />)

    expect(screen.getByTitle('Item 1')).toBeInTheDocument()
    expect(screen.getByTitle('Item 2')).toBeInTheDocument()
  })

  it('calls onItemClick when an item dot is clicked', () => {
    const onItemClick = vi.fn()
    const items = [createMockItem('1', 'Item 1', 8, 3)]

    render(<ValueEffortMatrix items={items} onItemClick={onItemClick} />)

    const itemDot = screen.getByTitle('Item 1')
    fireEvent.click(itemDot)

    expect(onItemClick).toHaveBeenCalledWith('1')
  })

  it('highlights the selected item', () => {
    const items = [
      createMockItem('1', 'Item 1', 8, 3),
      createMockItem('2', 'Item 2', 3, 8),
    ]

    render(
      <ValueEffortMatrix items={items} onItemClick={vi.fn()} selectedItemId="1" />
    )

    const item1Dot = screen.getByTitle('Item 1')
    const item2Dot = screen.getByTitle('Item 2')

    // Selected item should have a ring/highlight class
    expect(item1Dot.className).toContain('ring')
    expect(item2Dot.className).not.toContain('ring')
  })

  it('handles items without scores gracefully', () => {
    const itemWithoutScore: ItemWithScore = {
      id: '1',
      session_id: 'test-session',
      title: 'No Score Item',
      description: null,
      position: 0,
      created_at: new Date().toISOString(),
    }

    // Should not throw
    render(<ValueEffortMatrix items={[itemWithoutScore]} onItemClick={vi.fn()} />)

    // Item without score should not appear
    expect(screen.queryByTitle('No Score Item')).not.toBeInTheDocument()
  })
})
