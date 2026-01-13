import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmModal from '../../src/components/ConfirmModal'

describe('ConfirmModal', () => {
  const defaultProps = {
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  it('renders title and message', () => {
    render(<ConfirmModal {...defaultProps} />)

    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument()
  })

  it('renders default button labels', () => {
    render(<ConfirmModal {...defaultProps} />)

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('renders custom button labels', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmLabel="Delete"
        cancelLabel="Keep"
      />
    )

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />)

    // Click the backdrop (the outer div with role="dialog")
    const backdrop = screen.getByRole('dialog')
    fireEvent.click(backdrop)

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('does not call onCancel when modal content is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />)

    // Click the modal content (not the backdrop)
    fireEvent.click(screen.getByText('Confirm Action'))

    expect(onCancel).not.toHaveBeenCalled()
  })

  it('calls onCancel when Escape key is pressed', () => {
    const onCancel = vi.fn()
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders danger variant with correct styling', () => {
    render(<ConfirmModal {...defaultProps} variant="danger" />)

    const confirmButton = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmButton).toHaveClass('bg-red-600')
  })

  it('renders warning variant with correct styling', () => {
    render(<ConfirmModal {...defaultProps} variant="warning" />)

    const confirmButton = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmButton).toHaveClass('bg-amber-600')
  })

  it('renders default variant with correct styling', () => {
    render(<ConfirmModal {...defaultProps} variant="default" />)

    const confirmButton = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmButton).toHaveClass('bg-indigo-600')
  })

  it('has proper accessibility attributes', () => {
    render(<ConfirmModal {...defaultProps} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-modal-title')
  })
})
