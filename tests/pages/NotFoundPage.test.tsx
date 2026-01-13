import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import NotFoundPage from '../../src/pages/NotFoundPage'

function renderWithRouter(component: React.ReactNode) {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('NotFoundPage', () => {
  it('renders 404 heading', () => {
    renderWithRouter(<NotFoundPage />)

    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders page not found message', () => {
    renderWithRouter(<NotFoundPage />)

    expect(screen.getByText('Page not found')).toBeInTheDocument()
  })

  it('renders descriptive text', () => {
    renderWithRouter(<NotFoundPage />)

    expect(
      screen.getByText(/The page you're looking for doesn't exist/)
    ).toBeInTheDocument()
  })

  it('renders Go Home link', () => {
    renderWithRouter(<NotFoundPage />)

    const homeLink = screen.getByRole('link', { name: 'Go Home' })
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')
  })
})
