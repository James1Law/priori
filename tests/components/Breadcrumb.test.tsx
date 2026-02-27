import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import Breadcrumb from '../../src/components/Breadcrumb'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('Breadcrumb', () => {
  it('renders with session name', () => {
    renderWithRouter(
      <Breadcrumb
        sessionSlug="abc123"
        sessionName="My Session"
        currentPage="Scoring"
      />
    )

    expect(screen.getByText('My Session')).toBeInTheDocument()
    expect(screen.getByText('Scoring')).toBeInTheDocument()
  })

  it('shows backlog when no session name', () => {
    renderWithRouter(
      <Breadcrumb
        sessionSlug="abc123"
        sessionName={null}
        currentPage="Scoring"
      />
    )

    expect(screen.getByText('Backlog')).toBeInTheDocument()
  })

  it('shows item count when provided', () => {
    renderWithRouter(
      <Breadcrumb
        sessionSlug="abc123"
        sessionName="My Session"
        currentPage="Scoring"
        itemCount={5}
      />
    )

    expect(screen.getByText('5 items')).toBeInTheDocument()
  })

  it('shows singular item text for 1 item', () => {
    renderWithRouter(
      <Breadcrumb
        sessionSlug="abc123"
        sessionName="My Session"
        currentPage="Scoring"
        itemCount={1}
      />
    )

    expect(screen.getByText('1 item')).toBeInTheDocument()
  })

  it('links back to session page', () => {
    renderWithRouter(
      <Breadcrumb
        sessionSlug="abc123"
        sessionName="My Session"
        currentPage="Scoring"
      />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/s/abc123')
  })
})
