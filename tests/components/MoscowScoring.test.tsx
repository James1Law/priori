import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MoscowScoring from '../../src/components/MoscowScoring'

describe('MoscowScoring', () => {
  const defaultProps = {
    category: 'must' as const,
    onChange: vi.fn(),
  }

  it('renders a category dropdown', () => {
    render(<MoscowScoring {...defaultProps} />)

    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
  })

  it('displays all four MoSCoW options', () => {
    render(<MoscowScoring {...defaultProps} />)

    expect(screen.getByRole('option', { name: /must have/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /should have/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /could have/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /won't have/i })).toBeInTheDocument()
  })

  it('displays current category value', () => {
    render(<MoscowScoring {...defaultProps} category="should" />)

    const select = screen.getByLabelText(/category/i) as HTMLSelectElement
    expect(select.value).toBe('should')
  })

  it('calls onChange when category is changed', () => {
    const onChange = vi.fn()
    render(<MoscowScoring {...defaultProps} onChange={onChange} />)

    const select = screen.getByLabelText(/category/i)
    fireEvent.change(select, { target: { value: 'could' } })

    expect(onChange).toHaveBeenCalledWith({ category: 'could' })
  })

  it('displays updating indicator when isUpdating is true', () => {
    render(<MoscowScoring {...defaultProps} isUpdating={true} />)

    expect(screen.getByText(/updating/i)).toBeInTheDocument()
  })

  it('does not display updating indicator when isUpdating is false', () => {
    render(<MoscowScoring {...defaultProps} isUpdating={false} />)

    expect(screen.queryByText(/updating/i)).not.toBeInTheDocument()
  })
})
