import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppShell from '../../src/components/AppShell'

const renderAppShell = (props: Partial<Parameters<typeof AppShell>[0]> = {}) => {
  const defaultProps = {
    slug: 'test-session',
    sessionName: 'Sprint Planning',
    participantCount: 4,
    unreadCount: 0,
    onChatOpen: vi.fn(),
    children: <div data-testid="content">Content area</div>,
    ...props,
  }
  return render(
    <MemoryRouter initialEntries={['/s/test-session']}>
      <AppShell {...defaultProps} />
    </MemoryRouter>
  )
}

describe('AppShell', () => {
  it('renders the app shell container', () => {
    renderAppShell()

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
  })

  it('renders the Priori logo and wordmark in header', () => {
    renderAppShell()

    expect(screen.getByText('Priori')).toBeInTheDocument()
  })

  it('renders children in the content area', () => {
    renderAppShell()

    expect(screen.getByTestId('content')).toHaveTextContent('Content area')
  })

  it('shows participant count with chat button', () => {
    renderAppShell({ participantCount: 7 })

    expect(screen.getByText('7 online')).toBeInTheDocument()
  })

  it('hides participant count when 0', () => {
    renderAppShell({ participantCount: 0 })

    expect(screen.queryByText(/online/)).not.toBeInTheDocument()
  })

  it('calls onChatOpen when chat button is clicked', () => {
    const onChatOpen = vi.fn()
    renderAppShell({ onChatOpen, participantCount: 3 })

    fireEvent.click(screen.getByTestId('header-chat-btn'))

    expect(onChatOpen).toHaveBeenCalledOnce()
  })

  it('shows unread count badge when unreadCount > 0', () => {
    renderAppShell({ unreadCount: 5, participantCount: 3 })

    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows 9+ when unreadCount > 9', () => {
    renderAppShell({ unreadCount: 15, participantCount: 3 })

    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('does not show unread badge when unreadCount is 0', () => {
    renderAppShell({ unreadCount: 0, participantCount: 3 })

    expect(screen.queryByText('9+')).not.toBeInTheDocument()
  })

  it('renders the sidebar', () => {
    renderAppShell()

    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })
})
