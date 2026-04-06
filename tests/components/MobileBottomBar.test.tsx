import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MobileBottomBar from '../../src/components/MobileBottomBar'

function renderWithRouter(path = '/s/test-slug') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MobileBottomBar slug="test-slug" />
    </MemoryRouter>
  )
}

describe('MobileBottomBar', () => {
  it('renders all five navigation buttons', () => {
    renderWithRouter()

    expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /roadmap/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /score/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /poker/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /capacity/i })).toBeInTheDocument()
  })

  it('highlights list button on backlog route', () => {
    renderWithRouter('/s/test-slug')

    const listBtn = screen.getByRole('button', { name: /list/i })
    expect(listBtn).toHaveClass('bg-indigo-600')
  })

  it('highlights roadmap button on roadmap route', () => {
    renderWithRouter('/s/test-slug/roadmap')

    const roadmapBtn = screen.getByRole('button', { name: /roadmap/i })
    expect(roadmapBtn).toHaveClass('bg-indigo-600')
  })

  it('highlights score button on prioritise route', () => {
    renderWithRouter('/s/test-slug/prioritise')

    const scoreBtn = screen.getByRole('button', { name: /score/i })
    expect(scoreBtn).toHaveClass('bg-indigo-600')
  })

  it('highlights poker button on estimate route', () => {
    renderWithRouter('/s/test-slug/estimate')

    const pokerBtn = screen.getByRole('button', { name: /poker/i })
    expect(pokerBtn).toHaveClass('bg-indigo-600')
  })

  it('highlights capacity button on capacity route', () => {
    renderWithRouter('/s/test-slug/capacity')

    const capacityBtn = screen.getByRole('button', { name: /capacity/i })
    expect(capacityBtn).toHaveClass('bg-indigo-600')
  })

  it('is fixed to bottom of screen', () => {
    renderWithRouter()

    const container = screen.getByRole('button', { name: /list/i }).closest('div[class*="fixed"]')
    expect(container).toBeInTheDocument()
  })

  it('renders icons alongside labels', () => {
    renderWithRouter()

    const buttons = screen.getAllByRole('button')
    buttons.forEach(btn => {
      expect(btn.querySelector('svg')).toBeInTheDocument()
    })
  })
})
