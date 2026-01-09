import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RiceScoring from '../../src/components/RiceScoring'

describe('RiceScoring', () => {
  const defaultProps = {
    reach: 1000,
    impact: 1,
    confidence: 0.8,
    effort: 2,
    onChange: vi.fn(),
  }

  it('renders all RICE input fields', () => {
    render(<RiceScoring {...defaultProps} />)

    expect(screen.getByLabelText(/reach/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/impact/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confidence/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/effort/i)).toBeInTheDocument()
  })

  it('displays current values', () => {
    render(<RiceScoring {...defaultProps} />)

    const reachInput = screen.getByLabelText(/reach/i) as HTMLInputElement
    const effortInput = screen.getByLabelText(/effort/i) as HTMLInputElement

    expect(reachInput.value).toBe('1000')
    expect(effortInput.value).toBe('2')
  })

  it('displays impact dropdown with correct options', () => {
    render(<RiceScoring {...defaultProps} />)

    const impactSelect = screen.getByLabelText(/impact/i) as HTMLSelectElement

    expect(impactSelect.value).toBe('1')
    expect(screen.getByRole('option', { name: /minimal.*0\.25/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /low.*0\.5/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /medium.*1x/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /high.*2x/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /massive/i })).toBeInTheDocument()
  })

  it('displays confidence dropdown with correct options', () => {
    render(<RiceScoring {...defaultProps} />)

    const confidenceSelect = screen.getByLabelText(/confidence/i) as HTMLSelectElement

    expect(confidenceSelect.value).toBe('0.8')
    expect(screen.getByRole('option', { name: /50%/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /80%/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /100%/i })).toBeInTheDocument()
  })

  it('calls onChange when reach is updated', () => {
    const onChange = vi.fn()
    render(<RiceScoring {...defaultProps} onChange={onChange} />)

    const reachInput = screen.getByLabelText(/reach/i)
    fireEvent.change(reachInput, { target: { value: '2000' } })

    expect(onChange).toHaveBeenCalledWith({
      reach: 2000,
      impact: 1,
      confidence: 0.8,
      effort: 2,
    })
  })

  it('calls onChange when impact is updated', () => {
    const onChange = vi.fn()
    render(<RiceScoring {...defaultProps} onChange={onChange} />)

    const impactSelect = screen.getByLabelText(/impact/i)
    fireEvent.change(impactSelect, { target: { value: '2' } })

    expect(onChange).toHaveBeenCalledWith({
      reach: 1000,
      impact: 2,
      confidence: 0.8,
      effort: 2,
    })
  })

  it('displays calculated score', () => {
    render(<RiceScoring {...defaultProps} />)

    // (1000 * 1 * 0.8) / 2 = 400
    expect(screen.getByText(/score:/i)).toBeInTheDocument()
    expect(screen.getByText('400')).toBeInTheDocument()
  })

  it('handles zero effort gracefully', () => {
    render(<RiceScoring {...defaultProps} effort={0} />)

    expect(screen.getByText(/score:/i)).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
