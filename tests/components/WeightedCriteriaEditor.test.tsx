import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WeightedCriteriaEditor from '../../src/components/WeightedCriteriaEditor'
import { type WeightedCriterion } from '../../src/lib/weighted'

describe('WeightedCriteriaEditor', () => {
  const defaultProps = {
    criteria: [] as WeightedCriterion[],
    onChange: vi.fn(),
  }

  it('renders empty state message when no criteria', () => {
    render(<WeightedCriteriaEditor {...defaultProps} />)

    expect(
      screen.getByText(/add criteria to start scoring/i)
    ).toBeInTheDocument()
  })

  it('renders input to add new criterion', () => {
    render(<WeightedCriteriaEditor {...defaultProps} />)

    expect(
      screen.getByPlaceholderText(/add new criterion/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('adds a new criterion when clicking Add button', () => {
    const onChange = vi.fn()
    render(<WeightedCriteriaEditor {...defaultProps} onChange={onChange} />)

    const input = screen.getByPlaceholderText(/add new criterion/i)
    fireEvent.change(input, { target: { value: 'Customer Impact' } })
    fireEvent.click(screen.getByRole('button', { name: /add/i }))

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Customer Impact',
          weight: 5,
        }),
      ])
    )
  })

  it('adds a new criterion when pressing Enter', () => {
    const onChange = vi.fn()
    render(<WeightedCriteriaEditor {...defaultProps} onChange={onChange} />)

    const input = screen.getByPlaceholderText(/add new criterion/i)
    fireEvent.change(input, { target: { value: 'Revenue Potential' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Revenue Potential',
          weight: 5,
        }),
      ])
    )
  })

  it('does not add empty criterion', () => {
    const onChange = vi.fn()
    render(<WeightedCriteriaEditor {...defaultProps} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /add/i }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('displays existing criteria', () => {
    const criteria: WeightedCriterion[] = [
      { id: 'c1', name: 'Customer Impact', weight: 8 },
      { id: 'c2', name: 'Revenue', weight: 6 },
    ]
    render(<WeightedCriteriaEditor {...defaultProps} criteria={criteria} />)

    expect(screen.getByDisplayValue('Customer Impact')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Revenue')).toBeInTheDocument()
    expect(screen.getByDisplayValue('8')).toBeInTheDocument()
    expect(screen.getByDisplayValue('6')).toBeInTheDocument()
  })

  it('removes a criterion when clicking remove button', () => {
    const onChange = vi.fn()
    const criteria: WeightedCriterion[] = [
      { id: 'c1', name: 'Customer Impact', weight: 8 },
    ]
    render(
      <WeightedCriteriaEditor
        {...defaultProps}
        criteria={criteria}
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /remove/i }))

    expect(onChange).toHaveBeenCalledWith([])
  })

  it('updates criterion name', () => {
    const onChange = vi.fn()
    const criteria: WeightedCriterion[] = [
      { id: 'c1', name: 'Customer Impact', weight: 8 },
    ]
    render(
      <WeightedCriteriaEditor
        {...defaultProps}
        criteria={criteria}
        onChange={onChange}
      />
    )

    const nameInput = screen.getByDisplayValue('Customer Impact')
    fireEvent.change(nameInput, { target: { value: 'User Impact' } })

    expect(onChange).toHaveBeenCalledWith([
      { id: 'c1', name: 'User Impact', weight: 8 },
    ])
  })

  it('updates criterion weight', () => {
    const onChange = vi.fn()
    const criteria: WeightedCriterion[] = [
      { id: 'c1', name: 'Customer Impact', weight: 8 },
    ]
    render(
      <WeightedCriteriaEditor
        {...defaultProps}
        criteria={criteria}
        onChange={onChange}
      />
    )

    const weightInput = screen.getByDisplayValue('8')
    fireEvent.change(weightInput, { target: { value: '10' } })

    expect(onChange).toHaveBeenCalledWith([
      { id: 'c1', name: 'Customer Impact', weight: 10 },
    ])
  })

  it('clamps weight between 1 and 10', () => {
    const onChange = vi.fn()
    const criteria: WeightedCriterion[] = [
      { id: 'c1', name: 'Customer Impact', weight: 5 },
    ]
    render(
      <WeightedCriteriaEditor
        {...defaultProps}
        criteria={criteria}
        onChange={onChange}
      />
    )

    const weightInput = screen.getByDisplayValue('5')

    // Try to set weight above 10
    fireEvent.change(weightInput, { target: { value: '15' } })
    expect(onChange).toHaveBeenLastCalledWith([
      { id: 'c1', name: 'Customer Impact', weight: 10 },
    ])

    // Try to set weight below 1
    fireEvent.change(weightInput, { target: { value: '0' } })
    expect(onChange).toHaveBeenLastCalledWith([
      { id: 'c1', name: 'Customer Impact', weight: 1 },
    ])
  })
})
