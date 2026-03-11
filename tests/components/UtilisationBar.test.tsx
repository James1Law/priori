import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UtilisationBar from '../../src/components/UtilisationBar'

describe('UtilisationBar', () => {
  const defaultProps = {
    totalEffort: 195,
    netCapacity: 273,
    utilisation: 71.43,
    statusColour: '#10b981',
    unit: 'days' as const,
  }

  it('renders the label with effort / capacity and percentage', () => {
    render(<UtilisationBar {...defaultProps} />)

    expect(screen.getByText('195 / 273 days (71%)')).toBeInTheDocument()
  })

  it('renders the capacity utilisation heading', () => {
    render(<UtilisationBar {...defaultProps} />)

    expect(screen.getByText('Capacity utilisation')).toBeInTheDocument()
  })

  it('renders legend items', () => {
    render(<UtilisationBar {...defaultProps} />)

    expect(screen.getByText('Effort (incl. contingency)')).toBeInTheDocument()
    expect(screen.getByText('Remaining capacity')).toBeInTheDocument()
  })

  it('sets bar width proportional to utilisation', () => {
    const { container } = render(<UtilisationBar {...defaultProps} />)

    const fillBar = container.querySelector('[data-testid="util-bar-fill"]')
    expect(fillBar).toHaveStyle({ width: '71%' })
  })

  it('caps bar width at 100% when over capacity', () => {
    const { container } = render(
      <UtilisationBar
        {...defaultProps}
        utilisation={130}
        totalEffort={355}
      />
    )

    const fillBar = container.querySelector('[data-testid="util-bar-fill"]')
    expect(fillBar).toHaveStyle({ width: '100%' })
  })

  it('applies the status colour to the bar', () => {
    const { container } = render(
      <UtilisationBar {...defaultProps} statusColour="#ef4444" />
    )

    const fillBar = container.querySelector('[data-testid="util-bar-fill"]')
    expect(fillBar).toHaveStyle({ backgroundColor: '#ef4444' })
  })

  it('shows correct label for hours unit', () => {
    render(<UtilisationBar {...defaultProps} unit="hours" />)

    expect(screen.getByText('195 / 273 hours (71%)')).toBeInTheDocument()
  })

  it('handles zero capacity gracefully', () => {
    render(
      <UtilisationBar
        totalEffort={0}
        netCapacity={0}
        utilisation={0}
        statusColour="#10b981"
        unit="days"
      />
    )

    expect(screen.getByText('0 / 0 days (0%)')).toBeInTheDocument()
  })
})
