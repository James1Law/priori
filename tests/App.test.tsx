import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../src/App'

describe('App', () => {
  it('renders the landing page with title', () => {
    render(<App />)
    expect(screen.getByText('Priori')).toBeInTheDocument()
  })

  it('renders the Create Session button', () => {
    render(<App />)
    expect(screen.getByText('Create New Session')).toBeInTheDocument()
  })
})
