import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FrameworkSelector from '../../src/components/FrameworkSelector'
import type { Framework } from '../../src/types/database'

describe('FrameworkSelector', () => {
  it('renders framework selector with label', () => {
    render(<FrameworkSelector value="rice" onChange={vi.fn()} />)
    expect(screen.getByText(/prioritization framework/i)).toBeInTheDocument()
  })

  it('displays all framework options', () => {
    render(<FrameworkSelector value="rice" onChange={vi.fn()} />)

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(5)

    // Check that all frameworks are present by checking the option values
    expect(screen.getByRole('option', { name: /^RICE — /i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^ICE — Impact/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Value vs Effort/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /MoSCoW/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Weighted Scoring/i })).toBeInTheDocument()
  })

  it('shows the current framework as selected', () => {
    render(<FrameworkSelector value="ice" onChange={vi.fn()} />)

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('ice')
  })

  it('calls onChange when a new framework is selected', () => {
    const onChange = vi.fn()
    render(<FrameworkSelector value="rice" onChange={onChange} />)

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'moscow' } })

    expect(onChange).toHaveBeenCalledWith('moscow')
  })

  it('works with all framework types', () => {
    const frameworks: Framework[] = ['rice', 'ice', 'value_effort', 'moscow', 'weighted']

    frameworks.forEach(framework => {
      const onChange = vi.fn()
      const { unmount } = render(<FrameworkSelector value={framework} onChange={onChange} />)

      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe(framework)

      unmount()
    })
  })
})
