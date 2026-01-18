import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import IceScoring from '../../src/components/IceScoring'

describe('IceScoring', () => {
  const defaultProps = {
    impact: 5,
    confidence: 5,
    ease: 5,
    onChange: vi.fn(),
  }

  it('renders all ICE input fields', () => {
    render(<IceScoring {...defaultProps} />)

    expect(screen.getByLabelText(/impact/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confidence/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ease/i)).toBeInTheDocument()
  })

  it('displays sliders with current values', () => {
    render(<IceScoring {...defaultProps} impact={7} confidence={8} ease={6} />)

    const impactSlider = screen.getByLabelText(/impact/i) as HTMLInputElement
    const confidenceSlider = screen.getByLabelText(/confidence/i) as HTMLInputElement
    const easeSlider = screen.getByLabelText(/ease/i) as HTMLInputElement

    expect(impactSlider.value).toBe('7')
    expect(confidenceSlider.value).toBe('8')
    expect(easeSlider.value).toBe('6')
  })

  it('sliders have correct min (1) and max (10) values', () => {
    render(<IceScoring {...defaultProps} />)

    const impactSlider = screen.getByLabelText(/impact/i) as HTMLInputElement
    const confidenceSlider = screen.getByLabelText(/confidence/i) as HTMLInputElement
    const easeSlider = screen.getByLabelText(/ease/i) as HTMLInputElement

    expect(impactSlider.min).toBe('1')
    expect(impactSlider.max).toBe('10')
    expect(confidenceSlider.min).toBe('1')
    expect(confidenceSlider.max).toBe('10')
    expect(easeSlider.min).toBe('1')
    expect(easeSlider.max).toBe('10')
  })

  it('calls onChange when impact is updated', () => {
    const onChange = vi.fn()
    render(<IceScoring {...defaultProps} onChange={onChange} />)

    const impactSlider = screen.getByLabelText(/impact/i)
    fireEvent.change(impactSlider, { target: { value: '8' } })

    expect(onChange).toHaveBeenCalledWith({
      impact: 8,
      confidence: 5,
      ease: 5,
    })
  })

  it('calls onChange when confidence is updated', () => {
    const onChange = vi.fn()
    render(<IceScoring {...defaultProps} onChange={onChange} />)

    const confidenceSlider = screen.getByLabelText(/confidence/i)
    fireEvent.change(confidenceSlider, { target: { value: '7' } })

    expect(onChange).toHaveBeenCalledWith({
      impact: 5,
      confidence: 7,
      ease: 5,
    })
  })

  it('calls onChange when ease is updated', () => {
    const onChange = vi.fn()
    render(<IceScoring {...defaultProps} onChange={onChange} />)

    const easeSlider = screen.getByLabelText(/ease/i)
    fireEvent.change(easeSlider, { target: { value: '9' } })

    expect(onChange).toHaveBeenCalledWith({
      impact: 5,
      confidence: 5,
      ease: 9,
    })
  })

  it('displays calculated score', () => {
    render(<IceScoring {...defaultProps} impact={4} confidence={6} ease={8} />)

    // (4 + 6 + 8) / 3 = 6
    expect(screen.getByText(/score:/i)).toBeInTheDocument()
    // Score is shown in the score section with larger font
    const scoreElements = screen.getAllByText('6')
    // The score display should be one of them with the bold class
    expect(scoreElements.some(el => el.classList.contains('text-lg'))).toBe(true)
  })

  it('displays updating indicator when isUpdating is true', () => {
    render(<IceScoring {...defaultProps} isUpdating={true} />)

    expect(screen.getByText(/reordering/i)).toBeInTheDocument()
  })

  it('does not display updating indicator when isUpdating is false', () => {
    render(<IceScoring {...defaultProps} isUpdating={false} />)

    expect(screen.queryByText(/reordering/i)).not.toBeInTheDocument()
  })
})
