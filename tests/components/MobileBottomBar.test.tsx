import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileBottomBar from '../../src/components/MobileBottomBar'

describe('MobileBottomBar', () => {
  const defaultProps = {
    view: 'list' as const,
    onViewChange: vi.fn(),
  }

  // View toggle tests
  it('renders view toggle buttons', () => {
    render(<MobileBottomBar {...defaultProps} />)

    expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /roadmap/i })).toBeInTheDocument()
  })

  it('highlights list button when view is list', () => {
    render(<MobileBottomBar {...defaultProps} view="list" />)

    const listBtn = screen.getByRole('button', { name: /list/i })
    expect(listBtn).toHaveClass('bg-indigo-600')
  })

  it('highlights roadmap button when view is roadmap', () => {
    render(<MobileBottomBar {...defaultProps} view="roadmap" />)

    const roadmapBtn = screen.getByRole('button', { name: /roadmap/i })
    expect(roadmapBtn).toHaveClass('bg-indigo-600')
  })

  it('calls onViewChange when clicking roadmap button', () => {
    const onViewChange = vi.fn()
    render(<MobileBottomBar {...defaultProps} onViewChange={onViewChange} />)

    const roadmapBtn = screen.getByRole('button', { name: /roadmap/i })
    fireEvent.click(roadmapBtn)

    expect(onViewChange).toHaveBeenCalledWith('roadmap')
  })

  it('calls onViewChange when clicking list button', () => {
    const onViewChange = vi.fn()
    render(<MobileBottomBar {...defaultProps} view="roadmap" onViewChange={onViewChange} />)

    const listBtn = screen.getByRole('button', { name: /list/i })
    fireEvent.click(listBtn)

    expect(onViewChange).toHaveBeenCalledWith('list')
  })

  it('is fixed to bottom of screen', () => {
    render(<MobileBottomBar {...defaultProps} />)

    const container = screen.getByRole('button', { name: /list/i }).closest('div[class*="fixed"]')
    expect(container).toBeInTheDocument()
  })

  it('renders icons alongside labels', () => {
    render(<MobileBottomBar {...defaultProps} />)

    const listBtn = screen.getByRole('button', { name: /list/i })
    const roadmapBtn = screen.getByRole('button', { name: /roadmap/i })

    // Check that SVG icons are present
    expect(listBtn.querySelector('svg')).toBeInTheDocument()
    expect(roadmapBtn.querySelector('svg')).toBeInTheDocument()
  })
})
