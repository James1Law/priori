import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RoadmapMobilePlaceholder from '../../src/components/RoadmapMobilePlaceholder'

describe('RoadmapMobilePlaceholder', () => {
  it('renders the roadmap view heading', () => {
    render(<RoadmapMobilePlaceholder />)

    expect(screen.getByRole('heading', { name: /roadmap view/i })).toBeInTheDocument()
  })

  it('explains that roadmap is desktop-only', () => {
    render(<RoadmapMobilePlaceholder />)

    expect(screen.getByText(/optimised for desktop screens/i)).toBeInTheDocument()
    expect(screen.getByText(/open this session on a computer/i)).toBeInTheDocument()
  })

  it('provides a tip about other views working on mobile', () => {
    render(<RoadmapMobilePlaceholder />)

    expect(screen.getByText(/scoring and backlog views work great on mobile/i)).toBeInTheDocument()
  })
})
