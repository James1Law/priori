import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CapacitySettings from '../../src/components/CapacitySettings'

describe('CapacitySettings', () => {
  const defaultProps = {
    teamSize: 5,
    workingDays: 65,
    focusFactor: 0.6,
    contingency: 0.3,
    unit: 'days' as const,
    hoursPerDay: 8,
    onTeamSizeChange: vi.fn(),
    onWorkingDaysChange: vi.fn(),
    onFocusFactorChange: vi.fn(),
    onContingencyChange: vi.fn(),
    onUnitChange: vi.fn(),
    onHoursPerDayChange: vi.fn(),
  }

  it('renders all setting labels', () => {
    render(<CapacitySettings {...defaultProps} />)

    expect(screen.getByText('Team Size')).toBeInTheDocument()
    expect(screen.getByText('Working Days')).toBeInTheDocument()
    expect(screen.getByText('Focus Factor')).toBeInTheDocument()
    expect(screen.getByText('Contingency')).toBeInTheDocument()
    expect(screen.getByText('Unit')).toBeInTheDocument()
  })

  it('displays current values in inputs', () => {
    render(<CapacitySettings {...defaultProps} />)

    expect(screen.getByDisplayValue('5')).toBeInTheDocument()
    expect(screen.getByDisplayValue('65')).toBeInTheDocument()
    expect(screen.getByDisplayValue('0.6')).toBeInTheDocument()
    expect(screen.getByDisplayValue('30%')).toBeInTheDocument()
  })

  it('renders unit segmented control with days active', () => {
    render(<CapacitySettings {...defaultProps} unit="days" />)

    const daysBtn = screen.getByRole('button', { name: 'Days' })
    const hoursBtn = screen.getByRole('button', { name: 'Hours' })

    expect(daysBtn).toHaveClass('bg-indigo-600')
    expect(hoursBtn).not.toHaveClass('bg-indigo-600')
  })

  it('calls onUnitChange when clicking a unit button', () => {
    const onUnitChange = vi.fn()
    render(<CapacitySettings {...defaultProps} onUnitChange={onUnitChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hours' }))
    expect(onUnitChange).toHaveBeenCalledWith('hours')
  })

  // Stepper increment tests
  it('increments team size when clicking +', () => {
    const onTeamSizeChange = vi.fn()
    render(<CapacitySettings {...defaultProps} onTeamSizeChange={onTeamSizeChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Increase Team Size' }))
    expect(onTeamSizeChange).toHaveBeenCalledWith(6)
  })

  it('decrements team size when clicking -', () => {
    const onTeamSizeChange = vi.fn()
    render(<CapacitySettings {...defaultProps} onTeamSizeChange={onTeamSizeChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Decrease Team Size' }))
    expect(onTeamSizeChange).toHaveBeenCalledWith(4)
  })

  it('increments working days when clicking +', () => {
    const onWorkingDaysChange = vi.fn()
    render(<CapacitySettings {...defaultProps} onWorkingDaysChange={onWorkingDaysChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Increase Working Days' }))
    expect(onWorkingDaysChange).toHaveBeenCalledWith(66)
  })

  it('increments focus factor by 0.1', () => {
    const onFocusFactorChange = vi.fn()
    render(<CapacitySettings {...defaultProps} onFocusFactorChange={onFocusFactorChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Increase Focus Factor' }))
    expect(onFocusFactorChange).toHaveBeenCalledWith(0.7)
  })

  it('increments contingency by 0.05 (5%)', () => {
    const onContingencyChange = vi.fn()
    render(<CapacitySettings {...defaultProps} onContingencyChange={onContingencyChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Increase Contingency' }))
    expect(onContingencyChange).toHaveBeenCalledWith(0.35)
  })

  it('decrements contingency by 0.05 (5%)', () => {
    const onContingencyChange = vi.fn()
    render(<CapacitySettings {...defaultProps} onContingencyChange={onContingencyChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Decrease Contingency' }))
    expect(onContingencyChange).toHaveBeenCalledWith(0.25)
  })

  it('highlights hours when unit is hours', () => {
    render(<CapacitySettings {...defaultProps} unit="hours" />)

    const hoursBtn = screen.getByRole('button', { name: 'Hours' })
    expect(hoursBtn).toHaveClass('bg-indigo-600')
  })

  it('does not render Points button', () => {
    render(<CapacitySettings {...defaultProps} />)

    expect(screen.queryByRole('button', { name: 'Points' })).not.toBeInTheDocument()
  })

  it('shows Hours/Day stepper when unit is hours', () => {
    render(<CapacitySettings {...defaultProps} unit="hours" />)

    expect(screen.getByText('Hours/Day')).toBeInTheDocument()
    expect(screen.getByDisplayValue('8')).toBeInTheDocument()
  })

  it('hides Hours/Day stepper when unit is days', () => {
    render(<CapacitySettings {...defaultProps} unit="days" />)

    expect(screen.queryByText('Hours/Day')).not.toBeInTheDocument()
  })

  it('increments hours per day when clicking +', () => {
    const onHoursPerDayChange = vi.fn()
    render(<CapacitySettings {...defaultProps} unit="hours" onHoursPerDayChange={onHoursPerDayChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Increase Hours/Day' }))
    expect(onHoursPerDayChange).toHaveBeenCalledWith(9)
  })

  // Direct typing tests
  it('allows typing a team size value directly', () => {
    const onTeamSizeChange = vi.fn()
    render(<CapacitySettings {...defaultProps} onTeamSizeChange={onTeamSizeChange} />)

    const input = screen.getByRole('textbox', { name: 'Team Size' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '12' } })
    fireEvent.blur(input)

    expect(onTeamSizeChange).toHaveBeenCalledWith(12)
  })

  it('allows typing a working days value directly', () => {
    const onWorkingDaysChange = vi.fn()
    render(<CapacitySettings {...defaultProps} onWorkingDaysChange={onWorkingDaysChange} />)

    const input = screen.getByRole('textbox', { name: 'Working Days' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '20' } })
    fireEvent.blur(input)

    expect(onWorkingDaysChange).toHaveBeenCalledWith(20)
  })

  it('allows typing a contingency value as a percentage number', () => {
    const onContingencyChange = vi.fn()
    render(<CapacitySettings {...defaultProps} onContingencyChange={onContingencyChange} />)

    const input = screen.getByRole('textbox', { name: 'Contingency' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '50' } })
    fireEvent.blur(input)

    // Typing "50" should be interpreted as 50% → 0.5
    expect(onContingencyChange).toHaveBeenCalledWith(0.5)
  })

  it('commits value on Enter key', () => {
    const onTeamSizeChange = vi.fn()
    render(<CapacitySettings {...defaultProps} onTeamSizeChange={onTeamSizeChange} />)

    const input = screen.getByRole('textbox', { name: 'Team Size' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '12' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.blur(input)

    expect(onTeamSizeChange).toHaveBeenCalledWith(12)
  })

  it('ignores invalid (non-numeric) typed input on blur', () => {
    const onTeamSizeChange = vi.fn()
    render(<CapacitySettings {...defaultProps} onTeamSizeChange={onTeamSizeChange} />)

    const input = screen.getByRole('textbox', { name: 'Team Size' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.blur(input)

    // Should not call onChange with NaN
    expect(onTeamSizeChange).not.toHaveBeenCalled()
  })
})
