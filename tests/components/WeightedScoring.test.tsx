import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WeightedScoring from '../../src/components/WeightedScoring'
import { type WeightedCriterion, type WeightedItemScores } from '../../src/lib/weighted'

describe('WeightedScoring', () => {
  const defaultCriteria: WeightedCriterion[] = [
    { id: 'c1', name: 'Customer Impact', weight: 10 },
    { id: 'c2', name: 'Revenue', weight: 5 },
  ]

  const defaultScores: WeightedItemScores = {
    c1: 8,
    c2: 6,
  }

  const defaultProps = {
    criteria: defaultCriteria,
    scores: defaultScores,
    onChange: vi.fn(),
  }

  it('renders empty state when no criteria', () => {
    render(<WeightedScoring {...defaultProps} criteria={[]} />)

    expect(screen.getByText(/no criteria defined/i)).toBeInTheDocument()
  })

  it('displays criterion sliders', () => {
    render(<WeightedScoring {...defaultProps} />)

    expect(screen.getByText(/customer impact/i)).toBeInTheDocument()
    expect(screen.getByText(/revenue/i)).toBeInTheDocument()
  })

  it('displays weights for each criterion', () => {
    render(<WeightedScoring {...defaultProps} />)

    expect(screen.getByText(/\(w:10\)/)).toBeInTheDocument()
    expect(screen.getByText(/\(w:5\)/)).toBeInTheDocument()
  })

  it('displays current scores', () => {
    render(<WeightedScoring {...defaultProps} />)

    // Score values shown next to sliders
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('displays calculated weighted score', () => {
    render(<WeightedScoring {...defaultProps} />)

    // (8 * 10 + 6 * 5) / (10 + 5) = 7.33
    expect(screen.getByText(/weighted score: 7\.33/i)).toBeInTheDocument()
  })

  it('calls onChange when slider value changes', () => {
    const onChange = vi.fn()
    render(<WeightedScoring {...defaultProps} onChange={onChange} />)

    const slider = screen.getByLabelText(/customer impact/i)
    fireEvent.change(slider, { target: { value: '9' } })

    expect(onChange).toHaveBeenCalledWith({
      scores: { c1: 9, c2: 6 },
    })
  })

  it('uses default score of 5 for unscored criteria', () => {
    render(
      <WeightedScoring
        {...defaultProps}
        scores={{}} // No scores provided
      />
    )

    // Both should default to 5
    const sliders = screen.getAllByRole('slider')
    expect(sliders[0]).toHaveValue('5')
    expect(sliders[1]).toHaveValue('5')
  })

  it('displays updating indicator when isUpdating is true', () => {
    render(<WeightedScoring {...defaultProps} isUpdating={true} />)

    expect(screen.getByText(/reordering/i)).toBeInTheDocument()
  })

  it('does not display updating indicator when isUpdating is false', () => {
    render(<WeightedScoring {...defaultProps} isUpdating={false} />)

    expect(screen.queryByText(/reordering/i)).not.toBeInTheDocument()
  })

  it('handles single criterion correctly', () => {
    const singleCriteria: WeightedCriterion[] = [
      { id: 'c1', name: 'Solo Criterion', weight: 7 },
    ]
    render(
      <WeightedScoring
        {...defaultProps}
        criteria={singleCriteria}
        scores={{ c1: 8 }}
      />
    )

    expect(screen.getByText(/solo criterion/i)).toBeInTheDocument()
    expect(screen.getByText(/weighted score: 8\.00/i)).toBeInTheDocument()
  })
})
