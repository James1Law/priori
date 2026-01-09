import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ItemForm from '../../src/components/ItemForm'

describe('ItemForm', () => {
  it('renders title input field', () => {
    render(<ItemForm onAdd={vi.fn()} />)
    expect(screen.getByPlaceholderText(/title/i)).toBeInTheDocument()
  })

  it('renders optional description field', () => {
    render(<ItemForm onAdd={vi.fn()} />)
    expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument()
  })

  it('calls onAdd with title only when submitted', async () => {
    const onAdd = vi.fn()
    render(<ItemForm onAdd={onAdd} />)

    const titleInput = screen.getByPlaceholderText(/title/i)
    fireEvent.change(titleInput, { target: { value: 'Test Item' } })

    const submitButton = screen.getByText(/add item/i)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        title: 'Test Item',
        description: '',
      })
    })
  })

  it('calls onAdd with title and description when both provided', async () => {
    const onAdd = vi.fn()
    render(<ItemForm onAdd={onAdd} />)

    const titleInput = screen.getByPlaceholderText(/title/i)
    const descInput = screen.getByPlaceholderText(/description/i)

    fireEvent.change(titleInput, { target: { value: 'Test Item' } })
    fireEvent.change(descInput, { target: { value: 'Test Description' } })

    const submitButton = screen.getByText(/add item/i)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        title: 'Test Item',
        description: 'Test Description',
      })
    })
  })

  it('does not call onAdd when title is empty', async () => {
    const onAdd = vi.fn()
    render(<ItemForm onAdd={onAdd} />)

    const submitButton = screen.getByText(/add item/i)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onAdd).not.toHaveBeenCalled()
    })
  })

  it('clears form after successful submission', async () => {
    const onAdd = vi.fn()
    render(<ItemForm onAdd={onAdd} />)

    const titleInput = screen.getByPlaceholderText(/title/i) as HTMLInputElement
    const descInput = screen.getByPlaceholderText(/description/i) as HTMLInputElement

    fireEvent.change(titleInput, { target: { value: 'Test Item' } })
    fireEvent.change(descInput, { target: { value: 'Test Description' } })

    const submitButton = screen.getByText(/add item/i)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(titleInput.value).toBe('')
      expect(descInput.value).toBe('')
    })
  })
})
