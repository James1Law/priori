import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileBottomBar from '../../src/components/MobileBottomBar'

describe('MobileBottomBar', () => {
  const defaultProps = {
    framework: 'rice' as const,
    view: 'scoring' as const,
    onFrameworkChange: vi.fn(),
    onViewChange: vi.fn(),
    onAddItem: vi.fn(),
  }

  // Note: After the UX enhancement, MobileBottomBar only contains view tabs.
  // Framework selector and add form were moved to MobileMenu and FAB/BottomSheet.

  // View toggle tests
  it('renders view toggle buttons', () => {
    render(<MobileBottomBar {...defaultProps} />)

    expect(screen.getByRole('button', { name: /scoring/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /estimates/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /backlog/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /roadmap/i })).toBeInTheDocument()
  })

  it('highlights scoring button when view is scoring', () => {
    render(<MobileBottomBar {...defaultProps} view="scoring" />)

    const scoringBtn = screen.getByRole('button', { name: /scoring/i })
    expect(scoringBtn).toHaveClass('bg-indigo-600')
  })

  it('highlights backlog button when view is backlog', () => {
    render(<MobileBottomBar {...defaultProps} view="backlog" />)

    const backlogBtn = screen.getByRole('button', { name: /backlog/i })
    expect(backlogBtn).toHaveClass('bg-indigo-600')
  })

  it('highlights estimates button when view is estimates', () => {
    render(<MobileBottomBar {...defaultProps} view="estimates" />)

    const estimatesBtn = screen.getByRole('button', { name: /estimates/i })
    expect(estimatesBtn).toHaveClass('bg-indigo-600')
  })

  it('highlights roadmap button when view is roadmap', () => {
    render(<MobileBottomBar {...defaultProps} view="roadmap" />)

    const roadmapBtn = screen.getByRole('button', { name: /roadmap/i })
    expect(roadmapBtn).toHaveClass('bg-indigo-600')
  })

  it('calls onViewChange when clicking backlog button', () => {
    const onViewChange = vi.fn()
    render(<MobileBottomBar {...defaultProps} onViewChange={onViewChange} />)

    const backlogBtn = screen.getByRole('button', { name: /backlog/i })
    fireEvent.click(backlogBtn)

    expect(onViewChange).toHaveBeenCalledWith('backlog')
  })

  it('calls onViewChange when clicking estimates button', () => {
    const onViewChange = vi.fn()
    render(<MobileBottomBar {...defaultProps} onViewChange={onViewChange} />)

    const estimatesBtn = screen.getByRole('button', { name: /estimates/i })
    fireEvent.click(estimatesBtn)

    expect(onViewChange).toHaveBeenCalledWith('estimates')
  })

  it('calls onViewChange when clicking roadmap button', () => {
    const onViewChange = vi.fn()
    render(<MobileBottomBar {...defaultProps} onViewChange={onViewChange} />)

    const roadmapBtn = screen.getByRole('button', { name: /roadmap/i })
    fireEvent.click(roadmapBtn)

    expect(onViewChange).toHaveBeenCalledWith('roadmap')
  })

  it('calls onViewChange when clicking scoring button', () => {
    const onViewChange = vi.fn()
    render(<MobileBottomBar {...defaultProps} view="backlog" onViewChange={onViewChange} />)

    const scoringBtn = screen.getByRole('button', { name: /scoring/i })
    fireEvent.click(scoringBtn)

    expect(onViewChange).toHaveBeenCalledWith('scoring')
  })

  it('is hidden on large screens (lg breakpoint)', () => {
    render(<MobileBottomBar {...defaultProps} />)

    const container = screen.getByRole('button', { name: /scoring/i }).closest('div[class*="lg:hidden"]')
    expect(container).toBeInTheDocument()
  })
})
