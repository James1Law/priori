import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CapacitySummaryCards from '../../src/components/CapacitySummaryCards'

describe('CapacitySummaryCards', () => {
  const defaultProps = {
    netCapacity: 273,
    baseEffort: 150,
    totalEffort: 195,
    utilisation: 71.43,
    estimatedCount: 8,
    totalCount: 10,
    remaining: 78,
    status: 'healthy' as const,
    statusColour: '#10b981',
    statusLabel: 'Healthy',
    unit: 'days' as const,
    teamSize: 7,
    workingDays: 65,
    focusFactor: 0.6,
    contingency: 0.3,
    hoursPerDay: 8,
  }

  it('renders Total Effort card with value and unit', () => {
    render(<CapacitySummaryCards {...defaultProps} />)

    expect(screen.getByText('Total Effort')).toBeInTheDocument()
    expect(screen.getByText('195 days')).toBeInTheDocument()
  })

  it('renders Total Effort subtitle with breakdown', () => {
    render(<CapacitySummaryCards {...defaultProps} />)

    expect(screen.getByText('150 base + 45 contingency (30%)')).toBeInTheDocument()
  })

  it('renders Net Capacity card with value and unit', () => {
    render(<CapacitySummaryCards {...defaultProps} />)

    expect(screen.getByText('Net Capacity')).toBeInTheDocument()
    expect(screen.getByText('273 days')).toBeInTheDocument()
  })

  it('renders Net Capacity subtitle with formula breakdown', () => {
    render(<CapacitySummaryCards {...defaultProps} />)

    expect(screen.getByText(/7 devs × 65 days × 0.6 focus/)).toBeInTheDocument()
  })

  it('renders Utilisation card with percentage', () => {
    render(<CapacitySummaryCards {...defaultProps} />)

    expect(screen.getByText('Utilisation')).toBeInTheDocument()
    expect(screen.getByText('71%')).toBeInTheDocument()
  })

  it('renders status label', () => {
    render(<CapacitySummaryCards {...defaultProps} />)

    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })

  it('renders remaining days', () => {
    render(<CapacitySummaryCards {...defaultProps} />)

    expect(screen.getByText('78 days remaining')).toBeInTheDocument()
  })

  it('renders Coverage card', () => {
    render(<CapacitySummaryCards {...defaultProps} />)

    expect(screen.getByText('Coverage')).toBeInTheDocument()
    expect(screen.getByText('items estimated')).toBeInTheDocument()
  })

  it('shows coverage count', () => {
    render(<CapacitySummaryCards {...defaultProps} />)

    // The "8" value and "/ 10" should be present
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('/ 10')).toBeInTheDocument()
  })

  it('renders gauge ring SVG', () => {
    const { container } = render(<CapacitySummaryCards {...defaultProps} />)

    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBeGreaterThanOrEqual(2) // track + fill
  })

  it('shows at-risk status', () => {
    render(
      <CapacitySummaryCards
        {...defaultProps}
        utilisation={85}
        status="at-risk"
        statusLabel="At Risk"
        statusColour="#f59e0b"
      />
    )

    expect(screen.getByText('At Risk')).toBeInTheDocument()
  })

  it('shows over-capacity status', () => {
    render(
      <CapacitySummaryCards
        {...defaultProps}
        utilisation={120}
        status="over-capacity"
        statusLabel="Over Capacity"
        statusColour="#ef4444"
      />
    )

    expect(screen.getByText('Over Capacity')).toBeInTheDocument()
  })

  it('uses correct unit in labels', () => {
    render(<CapacitySummaryCards {...defaultProps} unit="hours" totalEffort={195} netCapacity={273} />)

    expect(screen.getByText('195 hours')).toBeInTheDocument()
    expect(screen.getByText('273 hours')).toBeInTheDocument()
  })

  it('shows hours formula subtitle when unit is hours', () => {
    render(<CapacitySummaryCards {...defaultProps} unit="hours" hoursPerDay={8} />)

    expect(screen.getByText(/7 devs × 65 days × 0.6 focus × 8h/)).toBeInTheDocument()
  })

  it('does not show hours in formula when unit is days', () => {
    render(<CapacitySummaryCards {...defaultProps} unit="days" />)

    const subtitle = screen.getByText(/7 devs × 65 days × 0.6 focus/)
    expect(subtitle.textContent).not.toContain('× 8h')
  })

  it('renders coverage progress bar', () => {
    const { container } = render(<CapacitySummaryCards {...defaultProps} />)

    // Coverage bar fill should have width based on 8/10 = 80%
    const barFill = container.querySelector('[style*="width"]')
    expect(barFill).toBeInTheDocument()
  })
})
