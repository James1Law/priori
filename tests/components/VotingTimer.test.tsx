import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import VotingTimer from '../../src/components/VotingTimer'

describe('VotingTimer', () => {
  const defaultProps = {
    endsAt: null as string | null,
    isHost: true,
    revealed: false,
    onStart: vi.fn(),
    onCancel: vi.fn(),
    onExpire: vi.fn(),
  }

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('offers the host timer durations when no timer is running', () => {
    const onStart = vi.fn()
    render(<VotingTimer {...defaultProps} onStart={onStart} />)
    expect(screen.getByText('30s')).toBeInTheDocument()
    expect(screen.getByText('60s')).toBeInTheDocument()
    expect(screen.getByText('90s')).toBeInTheDocument()
    fireEvent.click(screen.getByText('60s'))
    expect(onStart).toHaveBeenCalledWith(60)
  })

  it('renders nothing for participants when no timer is running', () => {
    const { container } = render(
      <VotingTimer {...defaultProps} isHost={false} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing once votes are revealed', () => {
    const { container } = render(
      <VotingTimer
        {...defaultProps}
        revealed={true}
        endsAt={new Date(Date.now() + 30000).toISOString()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a live countdown while the timer runs', () => {
    vi.useFakeTimers()
    render(
      <VotingTimer
        {...defaultProps}
        endsAt={new Date(Date.now() + 45000).toISOString()}
      />
    )
    expect(screen.getByTestId('voting-countdown')).toHaveTextContent('0:45')
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByTestId('voting-countdown')).toHaveTextContent('0:40')
  })

  it('lets the host cancel a running timer', () => {
    const onCancel = vi.fn()
    render(
      <VotingTimer
        {...defaultProps}
        onCancel={onCancel}
        endsAt={new Date(Date.now() + 30000).toISOString()}
      />
    )
    fireEvent.click(screen.getByText(/Cancel/i))
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onExpire exactly once when the countdown hits zero', () => {
    vi.useFakeTimers()
    const onExpire = vi.fn()
    render(
      <VotingTimer
        {...defaultProps}
        onExpire={onExpire}
        endsAt={new Date(Date.now() + 2000).toISOString()}
      />
    )
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(onExpire).toHaveBeenCalledTimes(1)
  })
})
