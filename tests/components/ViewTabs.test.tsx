import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ViewTabs from '../../src/components/ViewTabs'
import type { ViewMode } from '../../src/types/database'

describe('ViewTabs', () => {
  it('renders List and Roadmap tabs', () => {
    render(<ViewTabs value="list" onChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: /list/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /roadmap/i })).toBeInTheDocument()
  })

  it('highlights the active tab', () => {
    render(<ViewTabs value="list" onChange={vi.fn()} />)

    const listTab = screen.getByRole('tab', { name: /list/i })
    const roadmapTab = screen.getByRole('tab', { name: /roadmap/i })

    expect(listTab).toHaveClass('bg-white')
    expect(roadmapTab).not.toHaveClass('bg-white')
  })

  it('highlights roadmap tab when selected', () => {
    render(<ViewTabs value="roadmap" onChange={vi.fn()} />)

    const listTab = screen.getByRole('tab', { name: /list/i })
    const roadmapTab = screen.getByRole('tab', { name: /roadmap/i })

    expect(listTab).not.toHaveClass('bg-white')
    expect(roadmapTab).toHaveClass('bg-white')
  })

  it('calls onChange when clicking a different tab', () => {
    const onChange = vi.fn()
    render(<ViewTabs value="list" onChange={onChange} />)

    const roadmapTab = screen.getByRole('tab', { name: /roadmap/i })
    fireEvent.click(roadmapTab)

    expect(onChange).toHaveBeenCalledWith('roadmap')
  })

  it('calls onChange when clicking current tab', () => {
    const onChange = vi.fn()
    render(<ViewTabs value="list" onChange={onChange} />)

    const listTab = screen.getByRole('tab', { name: /list/i })
    fireEvent.click(listTab)

    expect(onChange).toHaveBeenCalledWith('list')
  })

  it('works with all view modes', () => {
    const views: ViewMode[] = ['list', 'roadmap']

    views.forEach(view => {
      const onChange = vi.fn()
      const { unmount } = render(<ViewTabs value={view} onChange={onChange} />)

      const activeTab = screen.getByRole('tab', { name: new RegExp(view, 'i') })
      expect(activeTab).toHaveAttribute('aria-selected', 'true')

      unmount()
    })
  })

  it('sets aria-selected on active tab only', () => {
    render(<ViewTabs value="roadmap" onChange={vi.fn()} />)

    const listTab = screen.getByRole('tab', { name: /list/i })
    const roadmapTab = screen.getByRole('tab', { name: /roadmap/i })

    expect(listTab).toHaveAttribute('aria-selected', 'false')
    expect(roadmapTab).toHaveAttribute('aria-selected', 'true')
  })

  it('calls onChange when clicking list tab', () => {
    const onChange = vi.fn()
    render(<ViewTabs value="roadmap" onChange={onChange} />)

    const listTab = screen.getByRole('tab', { name: /list/i })
    fireEvent.click(listTab)

    expect(onChange).toHaveBeenCalledWith('list')
  })

  it('calls onChange when clicking roadmap tab', () => {
    const onChange = vi.fn()
    render(<ViewTabs value="list" onChange={onChange} />)

    const roadmapTab = screen.getByRole('tab', { name: /roadmap/i })
    fireEvent.click(roadmapTab)

    expect(onChange).toHaveBeenCalledWith('roadmap')
  })
})
