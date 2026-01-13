import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ValueEffortScoring from '../../src/components/ValueEffortScoring'

describe('ValueEffortScoring', () => {
  const defaultProps = {
    value: 5,
    effort: 5,
    onChange: vi.fn(),
  }

  it('renders value and effort input fields', () => {
    render(<ValueEffortScoring {...defaultProps} />)

    expect(screen.getByLabelText(/value/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/effort/i)).toBeInTheDocument()
  })

  it('displays sliders with current values', () => {
    render(<ValueEffortScoring {...defaultProps} value={7} effort={3} />)

    const valueSlider = screen.getByLabelText(/value/i) as HTMLInputElement
    const effortSlider = screen.getByLabelText(/effort/i) as HTMLInputElement

    expect(valueSlider.value).toBe('7')
    expect(effortSlider.value).toBe('3')
  })

  it('sliders have correct min (1) and max (10) values', () => {
    render(<ValueEffortScoring {...defaultProps} />)

    const valueSlider = screen.getByLabelText(/value/i) as HTMLInputElement
    const effortSlider = screen.getByLabelText(/effort/i) as HTMLInputElement

    expect(valueSlider.min).toBe('1')
    expect(valueSlider.max).toBe('10')
    expect(effortSlider.min).toBe('1')
    expect(effortSlider.max).toBe('10')
  })

  it('calls onChange when value is updated', () => {
    const onChange = vi.fn()
    render(<ValueEffortScoring {...defaultProps} onChange={onChange} />)

    const valueSlider = screen.getByLabelText(/value/i)
    fireEvent.change(valueSlider, { target: { value: '8' } })

    expect(onChange).toHaveBeenCalledWith({
      value: 8,
      effort: 5,
    })
  })

  it('calls onChange when effort is updated', () => {
    const onChange = vi.fn()
    render(<ValueEffortScoring {...defaultProps} onChange={onChange} />)

    const effortSlider = screen.getByLabelText(/effort/i)
    fireEvent.change(effortSlider, { target: { value: '3' } })

    expect(onChange).toHaveBeenCalledWith({
      value: 5,
      effort: 3,
    })
  })

  it('displays the quadrant label', () => {
    // value=8, effort=3 should be "Quick Wins"
    render(<ValueEffortScoring {...defaultProps} value={8} effort={3} />)

    expect(screen.getByText(/quick wins/i)).toBeInTheDocument()
  })

  it('displays updating indicator when isUpdating is true', () => {
    render(<ValueEffortScoring {...defaultProps} isUpdating={true} />)

    expect(screen.getByText(/updating/i)).toBeInTheDocument()
  })

  it('shows correct quadrant for Big Bets', () => {
    render(<ValueEffortScoring {...defaultProps} value={8} effort={8} />)

    expect(screen.getByText(/big bets/i)).toBeInTheDocument()
  })

  it('shows correct quadrant for Fill-ins', () => {
    render(<ValueEffortScoring {...defaultProps} value={3} effort={3} />)

    expect(screen.getByText(/fill-ins/i)).toBeInTheDocument()
  })

  it('shows correct quadrant for Avoid', () => {
    render(<ValueEffortScoring {...defaultProps} value={3} effort={8} />)

    expect(screen.getByText(/avoid/i)).toBeInTheDocument()
  })
})
