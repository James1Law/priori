import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BacklogToolbar, { applyFilters, type FilterState } from '../../src/components/BacklogToolbar'
import type { ItemStatus } from '../../src/types/database'

const defaultFilters: FilterState = {
  search: '',
  status: 'all',
  hasEstimate: null,
  onRoadmap: null,
}

describe('BacklogToolbar', () => {
  const defaultProps = {
    filters: defaultFilters,
    onFiltersChange: vi.fn(),
    view: 'list' as const,
    itemCount: 10,
    filteredCount: 10,
  }

  it('renders search input', () => {
    render(<BacklogToolbar {...defaultProps} />)
    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()
  })

  it('updates search filter on input', () => {
    const onFiltersChange = vi.fn()
    render(<BacklogToolbar {...defaultProps} onFiltersChange={onFiltersChange} />)

    fireEvent.change(screen.getByPlaceholderText('Search items...'), {
      target: { value: 'test' },
    })

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      search: 'test',
    })
  })

  it('shows clear button when search has value', () => {
    render(
      <BacklogToolbar
        {...defaultProps}
        filters={{ ...defaultFilters, search: 'test' }}
      />
    )
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })

  it('clears search when clear button clicked', () => {
    const onFiltersChange = vi.fn()
    render(
      <BacklogToolbar
        {...defaultProps}
        filters={{ ...defaultFilters, search: 'test' }}
        onFiltersChange={onFiltersChange}
      />
    )

    fireEvent.click(screen.getByLabelText('Clear search'))
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      search: '',
    })
  })

  it('renders status filter dropdown', () => {
    render(<BacklogToolbar {...defaultProps} />)
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('opens status dropdown and selects option', () => {
    const onFiltersChange = vi.fn()
    render(<BacklogToolbar {...defaultProps} onFiltersChange={onFiltersChange} />)

    fireEvent.click(screen.getByText('Status'))
    fireEvent.click(screen.getByText('In Progress'))

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      status: 'in_progress',
    })
  })

  it('shows selected status label', () => {
    render(
      <BacklogToolbar
        {...defaultProps}
        filters={{ ...defaultFilters, status: 'done' }}
      />
    )
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('renders Estimated toggle chip', () => {
    render(<BacklogToolbar {...defaultProps} />)
    expect(screen.getByText('Estimated')).toBeInTheDocument()
  })

  it('toggles hasEstimate filter', () => {
    const onFiltersChange = vi.fn()
    render(<BacklogToolbar {...defaultProps} onFiltersChange={onFiltersChange} />)

    fireEvent.click(screen.getByText('Estimated'))
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      hasEstimate: true,
    })
  })

  it('toggles hasEstimate filter off', () => {
    const onFiltersChange = vi.fn()
    render(
      <BacklogToolbar
        {...defaultProps}
        filters={{ ...defaultFilters, hasEstimate: true }}
        onFiltersChange={onFiltersChange}
      />
    )

    fireEvent.click(screen.getByText('Estimated'))
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      hasEstimate: null,
    })
  })

  it('renders On Roadmap toggle chip', () => {
    render(<BacklogToolbar {...defaultProps} />)
    expect(screen.getByText('On Roadmap')).toBeInTheDocument()
  })

  it('toggles onRoadmap filter', () => {
    const onFiltersChange = vi.fn()
    render(<BacklogToolbar {...defaultProps} onFiltersChange={onFiltersChange} />)

    fireEvent.click(screen.getByText('On Roadmap'))
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      onRoadmap: true,
    })
  })

  it('renders Add Cutoff button in list view', () => {
    const onAddCutoff = vi.fn()
    render(<BacklogToolbar {...defaultProps} onAddCutoff={onAddCutoff} />)

    expect(screen.getByText('Add Cutoff')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Add Cutoff'))
    expect(onAddCutoff).toHaveBeenCalled()
  })

  it('hides Add Cutoff button in roadmap view', () => {
    render(<BacklogToolbar {...defaultProps} view="roadmap" onAddCutoff={vi.fn()} />)
    expect(screen.queryByText('Add Cutoff')).not.toBeInTheDocument()
  })

  it('shows filter summary when filters active', () => {
    render(
      <BacklogToolbar
        {...defaultProps}
        filters={{ ...defaultFilters, search: 'test' }}
        itemCount={10}
        filteredCount={3}
      />
    )
    expect(screen.getByText('Showing 3 of 10 items')).toBeInTheDocument()
  })

  it('shows clear filters link when filters active', () => {
    render(
      <BacklogToolbar
        {...defaultProps}
        filters={{ ...defaultFilters, status: 'done' }}
      />
    )
    expect(screen.getByText('Clear filters')).toBeInTheDocument()
  })

  it('clears all filters when clear filters clicked', () => {
    const onFiltersChange = vi.fn()
    render(
      <BacklogToolbar
        {...defaultProps}
        filters={{ ...defaultFilters, status: 'done', search: 'test' }}
        onFiltersChange={onFiltersChange}
      />
    )

    fireEvent.click(screen.getByText('Clear filters'))
    expect(onFiltersChange).toHaveBeenCalledWith(defaultFilters)
  })
})

describe('applyFilters', () => {
  const mockItems = [
    {
      id: '1',
      title: 'Task One',
      description: 'First task description',
      status: 'todo' as ItemStatus,
      story_points: null,
      start_date: null,
    },
    {
      id: '2',
      title: 'Task Two',
      description: 'Second task description',
      status: 'in_progress' as ItemStatus,
      story_points: 5,
      start_date: '2026-04-01',
    },
    {
      id: '3',
      title: 'Task Three',
      description: null,
      status: 'done' as ItemStatus,
      story_points: 3,
      start_date: '2026-05-01',
    },
  ]

  it('returns all items with no filters', () => {
    const result = applyFilters(mockItems, defaultFilters)
    expect(result).toHaveLength(3)
  })

  it('filters by search in title', () => {
    const filters = { ...defaultFilters, search: 'One' }
    const result = applyFilters(mockItems, filters)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Task One')
  })

  it('filters by search in description', () => {
    const filters = { ...defaultFilters, search: 'Second' }
    const result = applyFilters(mockItems, filters)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Task Two')
  })

  it('search is case insensitive', () => {
    const filters = { ...defaultFilters, search: 'TASK' }
    const result = applyFilters(mockItems, filters)
    expect(result).toHaveLength(3)
  })

  it('filters by status', () => {
    const filters = { ...defaultFilters, status: 'done' as ItemStatus }
    const result = applyFilters(mockItems, filters)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Task Three')
  })

  it('filters by hasEstimate', () => {
    const filters = { ...defaultFilters, hasEstimate: true }
    const result = applyFilters(mockItems, filters)
    expect(result).toHaveLength(2)
    expect(result.every(item => item.story_points !== null)).toBe(true)
  })

  it('filters by onRoadmap', () => {
    const filters = { ...defaultFilters, onRoadmap: true }
    const result = applyFilters(mockItems, filters)
    expect(result).toHaveLength(2)
    expect(result.every(item => item.start_date !== null)).toBe(true)
  })

  it('combines multiple filters', () => {
    const filters: FilterState = {
      search: 'Task',
      status: 'all',
      hasEstimate: true,
      onRoadmap: true,
    }
    const result = applyFilters(mockItems, filters)
    expect(result).toHaveLength(2)
  })
})
