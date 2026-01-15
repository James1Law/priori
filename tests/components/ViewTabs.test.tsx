import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ViewTabs from '../../src/components/ViewTabs'
import type { ViewMode } from '../../src/types/database'

describe('ViewTabs', () => {
  it('renders both Scoring and Backlog tabs', () => {
    render(<ViewTabs value="scoring" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: /scoring/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /backlog/i })).toBeInTheDocument()
  })

  it('highlights the active tab', () => {
    render(<ViewTabs value="scoring" onChange={vi.fn()} />)

    const scoringTab = screen.getByRole('button', { name: /scoring/i })
    const backlogTab = screen.getByRole('button', { name: /backlog/i })

    expect(scoringTab).toHaveClass('border-indigo-500')
    expect(backlogTab).not.toHaveClass('border-indigo-500')
  })

  it('highlights backlog tab when selected', () => {
    render(<ViewTabs value="backlog" onChange={vi.fn()} />)

    const scoringTab = screen.getByRole('button', { name: /scoring/i })
    const backlogTab = screen.getByRole('button', { name: /backlog/i })

    expect(scoringTab).not.toHaveClass('border-indigo-500')
    expect(backlogTab).toHaveClass('border-indigo-500')
  })

  it('calls onChange when clicking a different tab', () => {
    const onChange = vi.fn()
    render(<ViewTabs value="scoring" onChange={onChange} />)

    const backlogTab = screen.getByRole('button', { name: /backlog/i })
    fireEvent.click(backlogTab)

    expect(onChange).toHaveBeenCalledWith('backlog')
  })

  it('calls onChange when clicking current tab', () => {
    const onChange = vi.fn()
    render(<ViewTabs value="scoring" onChange={onChange} />)

    const scoringTab = screen.getByRole('button', { name: /scoring/i })
    fireEvent.click(scoringTab)

    expect(onChange).toHaveBeenCalledWith('scoring')
  })

  it('works with both view modes', () => {
    const views: ViewMode[] = ['scoring', 'backlog']

    views.forEach(view => {
      const onChange = vi.fn()
      const { unmount } = render(<ViewTabs value={view} onChange={onChange} />)

      const activeTab = screen.getByRole('button', { name: new RegExp(view, 'i') })
      expect(activeTab).toHaveAttribute('aria-current', 'page')

      unmount()
    })
  })

  it('sets aria-current on active tab only', () => {
    render(<ViewTabs value="backlog" onChange={vi.fn()} />)

    const scoringTab = screen.getByRole('button', { name: /scoring/i })
    const backlogTab = screen.getByRole('button', { name: /backlog/i })

    expect(scoringTab).not.toHaveAttribute('aria-current')
    expect(backlogTab).toHaveAttribute('aria-current', 'page')
  })
})
