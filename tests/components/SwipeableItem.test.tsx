import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SwipeableItem from '../../src/components/SwipeableItem'

describe('SwipeableItem', () => {
  // Mock touch support
  const originalOntouchstart = Object.getOwnPropertyDescriptor(window, 'ontouchstart')

  beforeEach(() => {
    // Enable touch support in tests
    Object.defineProperty(window, 'ontouchstart', {
      value: () => {},
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // Restore original
    if (originalOntouchstart) {
      Object.defineProperty(window, 'ontouchstart', originalOntouchstart)
    } else {
      // @ts-expect-error - Deleting property for cleanup
      delete window.ontouchstart
    }
  })

  it('renders children', () => {
    render(
      <SwipeableItem onDelete={vi.fn()}>
        <div>Test Content</div>
      </SwipeableItem>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders delete button', () => {
    render(
      <SwipeableItem onDelete={vi.fn()}>
        <div>Test Content</div>
      </SwipeableItem>
    )

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(
      <SwipeableItem onDelete={onDelete}>
        <div>Test Content</div>
      </SwipeableItem>
    )

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('renders without swipe wrapper when enabled=false', () => {
    render(
      <SwipeableItem onDelete={vi.fn()} enabled={false}>
        <div>Test Content</div>
      </SwipeableItem>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
    // Delete button should not be rendered in disabled mode
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('renders with proper structure when enabled', () => {
    const { container } = render(
      <SwipeableItem onDelete={vi.fn()}>
        <div>Test Content</div>
      </SwipeableItem>
    )

    // Should have the overflow-hidden wrapper
    const wrapper = container.querySelector('.overflow-hidden')
    expect(wrapper).toBeInTheDocument()
  })

  it('delete button has proper accessibility label', () => {
    render(
      <SwipeableItem onDelete={vi.fn()}>
        <div>Test Content</div>
      </SwipeableItem>
    )

    const deleteButton = screen.getByRole('button', { name: /delete item/i })
    expect(deleteButton).toBeInTheDocument()
  })
})
