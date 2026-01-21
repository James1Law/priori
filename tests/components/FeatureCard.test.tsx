import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FeatureCard from '../../src/components/FeatureCard'

describe('FeatureCard', () => {
  const defaultProps = {
    icon: '📊',
    iconBgColor: '#dbeafe',
    title: 'Test Feature',
    description: 'This is a test description for the feature card.',
  }

  it('renders the title', () => {
    render(<FeatureCard {...defaultProps} />)
    expect(screen.getByText('Test Feature')).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<FeatureCard {...defaultProps} />)
    expect(
      screen.getByText('This is a test description for the feature card.')
    ).toBeInTheDocument()
  })

  it('renders the icon', () => {
    render(<FeatureCard {...defaultProps} />)
    expect(screen.getByText('📊')).toBeInTheDocument()
  })

  it('renders the card with hover effect styles', () => {
    render(<FeatureCard {...defaultProps} />)
    const card = screen.getByText('Test Feature').closest('div')
    expect(card).toHaveClass('bg-white', 'rounded-2xl', 'shadow-md')
  })
})
