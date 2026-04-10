import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EstimationCards, { FIBONACCI_VALUES, SPECIAL_UNCERTAIN, SPECIAL_COFFEE } from '../../src/components/EstimationCards'

describe('EstimationCards', () => {
  const defaultProps = {
    selectedValue: null,
    onSelect: vi.fn(),
  }

  it('renders all Fibonacci cards', () => {
    render(<EstimationCards {...defaultProps} />)

    // Check that we have the right number of buttons (8 Fibonacci + 2 special)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(10)

    // Check specific cards exist by their text content
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('13')).toBeInTheDocument()
    expect(screen.getByText('21')).toBeInTheDocument()
  })

  it('renders the uncertain (?) card', () => {
    render(<EstimationCards {...defaultProps} />)

    expect(screen.getByRole('button', { name: /uncertain/i })).toBeInTheDocument()
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('renders the coffee break card', () => {
    render(<EstimationCards {...defaultProps} />)

    expect(screen.getByRole('button', { name: /coffee break/i })).toBeInTheDocument()
    expect(screen.getByText('☕')).toBeInTheDocument()
  })

  it('calls onSelect when a Fibonacci card is clicked', () => {
    const onSelect = vi.fn()
    render(<EstimationCards {...defaultProps} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /5 story points/i }))

    expect(onSelect).toHaveBeenCalledWith(5)
  })

  it('calls onSelect when the uncertain card is clicked', () => {
    const onSelect = vi.fn()
    render(<EstimationCards {...defaultProps} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /uncertain/i }))

    expect(onSelect).toHaveBeenCalledWith(SPECIAL_UNCERTAIN)
  })

  it('calls onSelect when the coffee break card is clicked', () => {
    const onSelect = vi.fn()
    render(<EstimationCards {...defaultProps} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /coffee break/i }))

    expect(onSelect).toHaveBeenCalledWith(SPECIAL_COFFEE)
  })

  it('highlights the selected Fibonacci card', () => {
    render(<EstimationCards {...defaultProps} selectedValue={8} />)

    const selectedCard = screen.getByRole('button', { name: /8 story points/i })
    expect(selectedCard).toHaveClass('bg-indigo-600')
    expect(selectedCard).toHaveAttribute('aria-pressed', 'true')
  })

  it('highlights the selected uncertain card', () => {
    render(<EstimationCards {...defaultProps} selectedValue={SPECIAL_UNCERTAIN} />)

    const selectedCard = screen.getByRole('button', { name: /uncertain/i })
    expect(selectedCard).toHaveClass('bg-indigo-600')
    expect(selectedCard).toHaveAttribute('aria-pressed', 'true')
  })

  it('highlights the selected coffee break card', () => {
    render(<EstimationCards {...defaultProps} selectedValue={SPECIAL_COFFEE} />)

    const selectedCard = screen.getByRole('button', { name: /coffee break/i })
    expect(selectedCard).toHaveClass('bg-indigo-600')
    expect(selectedCard).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows selection feedback for Fibonacci values', () => {
    render(<EstimationCards {...defaultProps} selectedValue={5} />)

    expect(screen.getByText('You selected 5 story points')).toBeInTheDocument()
  })

  it('shows selection feedback for 1 story point (singular)', () => {
    render(<EstimationCards {...defaultProps} selectedValue={1} />)

    expect(screen.getByText('You selected 1 story point')).toBeInTheDocument()
  })

  it('shows selection feedback for uncertain', () => {
    render(<EstimationCards {...defaultProps} selectedValue={SPECIAL_UNCERTAIN} />)

    expect(screen.getByText("You're uncertain about this estimate")).toBeInTheDocument()
  })

  it('shows selection feedback for coffee break', () => {
    render(<EstimationCards {...defaultProps} selectedValue={SPECIAL_COFFEE} />)

    expect(screen.getByText('You need a break!')).toBeInTheDocument()
  })

  it('does not show selection feedback when nothing is selected', () => {
    render(<EstimationCards {...defaultProps} selectedValue={null} />)

    expect(screen.queryByText(/You selected/)).not.toBeInTheDocument()
    expect(screen.queryByText(/You're uncertain/)).not.toBeInTheDocument()
    expect(screen.queryByText(/You need a break/)).not.toBeInTheDocument()
  })

  it('disables all cards when disabled prop is true', () => {
    render(<EstimationCards {...defaultProps} disabled={true} />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it('renders 10 cards total (8 Fibonacci + 2 special)', () => {
    render(<EstimationCards {...defaultProps} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(10)
  })

  it('shows "Select your estimate" instruction', () => {
    render(<EstimationCards {...defaultProps} />)

    expect(screen.getByText('Select your estimate')).toBeInTheDocument()
  })

  it('uses 5-column grid layout', () => {
    const { container } = render(<EstimationCards {...defaultProps} />)

    // Check that the grid container uses 5 columns
    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass('grid-cols-5')
  })
})
