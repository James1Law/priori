import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MobileBottomBar from '../../src/components/MobileBottomBar'

describe('MobileBottomBar', () => {
  const defaultProps = {
    framework: 'rice' as const,
    onFrameworkChange: vi.fn(),
    onAddItem: vi.fn(),
  }

  it('renders framework selector', () => {
    render(<MobileBottomBar {...defaultProps} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renders title input', () => {
    render(<MobileBottomBar {...defaultProps} />)
    expect(screen.getByPlaceholderText(/add new item/i)).toBeInTheDocument()
  })

  it('renders add button', () => {
    render(<MobileBottomBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('shows current framework selected', () => {
    render(<MobileBottomBar {...defaultProps} framework="ice" />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('ice')
  })

  it('calls onFrameworkChange when framework selected', () => {
    const onFrameworkChange = vi.fn()
    render(
      <MobileBottomBar {...defaultProps} onFrameworkChange={onFrameworkChange} />
    )

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'moscow' } })

    expect(onFrameworkChange).toHaveBeenCalledWith('moscow')
  })

  it('calls onAddItem when form submitted with valid title', async () => {
    const onAddItem = vi.fn()
    render(<MobileBottomBar {...defaultProps} onAddItem={onAddItem} />)

    const input = screen.getByPlaceholderText(/add new item/i)
    fireEvent.change(input, { target: { value: 'Test Item' } })

    const button = screen.getByRole('button', { name: /add/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(onAddItem).toHaveBeenCalledWith({
        title: 'Test Item',
        description: '',
      })
    })
  })

  it('does not call onAddItem when title is empty', async () => {
    const onAddItem = vi.fn()
    render(<MobileBottomBar {...defaultProps} onAddItem={onAddItem} />)

    const button = screen.getByRole('button', { name: /add/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(onAddItem).not.toHaveBeenCalled()
    })
  })

  it('clears input after successful submission', async () => {
    const onAddItem = vi.fn()
    render(<MobileBottomBar {...defaultProps} onAddItem={onAddItem} />)

    const input = screen.getByPlaceholderText(/add new item/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Test Item' } })

    const button = screen.getByRole('button', { name: /add/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  it('disables add button when title is empty', () => {
    render(<MobileBottomBar {...defaultProps} />)

    const button = screen.getByRole('button', { name: /add/i })
    expect(button).toBeDisabled()
  })

  it('enables add button when title has value', () => {
    render(<MobileBottomBar {...defaultProps} />)

    const input = screen.getByPlaceholderText(/add new item/i)
    fireEvent.change(input, { target: { value: 'Test' } })

    const button = screen.getByRole('button', { name: /add/i })
    expect(button).not.toBeDisabled()
  })

  it('renders all framework options', () => {
    render(<MobileBottomBar {...defaultProps} />)

    expect(screen.getByRole('option', { name: 'RICE' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'ICE' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Value/Effort' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'MoSCoW' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Weighted' })).toBeInTheDocument()
  })
})
