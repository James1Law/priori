import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import LandingPage from '../../src/pages/LandingPage'

// Mock supabase
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}))

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('LandingPage', () => {
  it('renders the main heading', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    )
    expect(screen.getByText('Priori')).toBeInTheDocument()
  })

  it('renders the Create New Session button', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    )
    expect(screen.getByText('Create New Session')).toBeInTheDocument()
  })

  it('shows loading state when creating session', async () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    )

    const button = screen.getByText('Create New Session')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Creating Session...')).toBeInTheDocument()
    })
  })

  it('displays feature list', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    )

    expect(
      screen.getByText(/Multiple prioritisation frameworks/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Real-time collaboration/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/No authentication required/)
    ).toBeInTheDocument()
  })
})
