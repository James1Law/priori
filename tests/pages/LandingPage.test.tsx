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

  it('renders the Create New Session buttons', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    )
    const buttons = screen.getAllByText('Create New Session')
    expect(buttons.length).toBe(2)
  })

  it('shows loading state when creating session', async () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    )

    const buttons = screen.getAllByText('Create New Session')
    fireEvent.click(buttons[0])

    await waitFor(() => {
      // Both buttons show loading state
      const loadingButtons = screen.getAllByText('Creating Session...')
      expect(loadingButtons.length).toBe(2)
    })
  })

  it('displays the updated subtitle', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    )

    expect(
      screen.getByText(/Score, estimate, plan and ship together in real-time/)
    ).toBeInTheDocument()
  })

  it('displays all feature cards', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    )

    expect(screen.getByText('Scoring Frameworks')).toBeInTheDocument()
    expect(screen.getByText('Planning Poker')).toBeInTheDocument()
    expect(screen.getByText('Backlog Management')).toBeInTheDocument()
    expect(screen.getByText('Visual Roadmap')).toBeInTheDocument()
    expect(screen.getByText('Team Chat')).toBeInTheDocument()
    expect(screen.getByText('Real-Time Collaboration')).toBeInTheDocument()
  })

  it('displays the features section heading', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    )

    expect(
      screen.getByText('Everything you need to prioritise together')
    ).toBeInTheDocument()
  })

  it('displays the supported frameworks bar', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    )

    expect(screen.getByText('Supported Frameworks')).toBeInTheDocument()
    expect(screen.getByText('RICE')).toBeInTheDocument()
    expect(screen.getByText('ICE')).toBeInTheDocument()
    expect(screen.getByText('Value vs Effort')).toBeInTheDocument()
    expect(screen.getByText('MoSCoW')).toBeInTheDocument()
    expect(screen.getByText('Weighted Scoring')).toBeInTheDocument()
  })

  it('displays the How It Works section', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    )

    expect(screen.getByText('How It Works')).toBeInTheDocument()
    expect(screen.getByText('Create a Session')).toBeInTheDocument()
    expect(screen.getByText('Share the Link')).toBeInTheDocument()
    expect(screen.getByText('Add Your Items')).toBeInTheDocument()
    expect(screen.getByText('Score, Estimate & Plan')).toBeInTheDocument()
  })

  it('displays the Final CTA section', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    )

    expect(screen.getByText('Ready to Prioritise Smarter?')).toBeInTheDocument()
    expect(screen.getAllByText('Create New Session').length).toBe(2)
    expect(
      screen.getByText('No account needed • Works on any device')
    ).toBeInTheDocument()
  })

  it('has two CTA buttons that both create sessions', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    )

    const buttons = screen.getAllByText('Create New Session')
    expect(buttons.length).toBe(2)
  })
})
