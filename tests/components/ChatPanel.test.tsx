import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChatPanel from '../../src/components/ChatPanel'
import type { Message } from '../../src/types/database'

// Mock useTypingIndicator hook
vi.mock('../../src/hooks/useTypingIndicator', () => ({
  useTypingIndicator: vi.fn(() => ({
    typingParticipants: [],
    setTyping: vi.fn(),
  })),
}))

describe('ChatPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    sessionId: 'session-1',
    currentUser: 'Bob',
    messages: [] as Message[],
    loading: false,
    onSendMessage: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when isOpen is true', () => {
    render(<ChatPanel {...defaultProps} />)

    expect(screen.getByText('Team Chat')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(<ChatPanel {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Team Chat')).not.toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<ChatPanel {...defaultProps} onClose={onClose} />)

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('displays message list area', () => {
    render(<ChatPanel {...defaultProps} />)

    // The message list area should exist (we'll check for the container)
    expect(screen.getByTestId('chat-messages')).toBeInTheDocument()
  })

  it('displays input field and send button', () => {
    render(<ChatPanel {...defaultProps} />)

    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('has correct width (320px)', () => {
    render(<ChatPanel {...defaultProps} />)

    const panel = screen.getByTestId('chat-panel')
    expect(panel).toHaveClass('w-80') // Tailwind w-80 = 320px
  })

  describe('message display', () => {
    it('renders list of messages', () => {
      const mockMessages: Message[] = [
        {
          id: '1',
          session_id: 'session-1',
          participant_name: 'Alice',
          content: 'Hello',
          message_type: 'user',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          session_id: 'session-1',
          participant_name: 'Bob',
          content: 'Hi there',
          message_type: 'user',
          created_at: '2024-01-01T10:01:00Z',
        },
      ]

      render(<ChatPanel {...defaultProps} messages={mockMessages} />)

      expect(screen.getByText('Hello')).toBeInTheDocument()
      expect(screen.getByText('Hi there')).toBeInTheDocument()
    })

    it('shows empty state when no messages', () => {
      render(<ChatPanel {...defaultProps} messages={[]} />)

      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
    })

    it('shows loading state', () => {
      render(<ChatPanel {...defaultProps} loading={true} />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  describe('sending messages', () => {
    it('sends message when Enter pressed', () => {
      const onSendMessage = vi.fn()
      render(<ChatPanel {...defaultProps} onSendMessage={onSendMessage} />)

      const input = screen.getByPlaceholderText(/type a message/i)
      fireEvent.change(input, { target: { value: 'Hello world' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onSendMessage).toHaveBeenCalledWith('Hello world')
    })

    it('does not send on Shift+Enter (allows multiline)', () => {
      const onSendMessage = vi.fn()
      render(<ChatPanel {...defaultProps} onSendMessage={onSendMessage} />)

      const input = screen.getByPlaceholderText(/type a message/i)
      fireEvent.change(input, { target: { value: 'Hello world' } })
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })

      expect(onSendMessage).not.toHaveBeenCalled()
    })

    it('sends message when Send button clicked', () => {
      const onSendMessage = vi.fn()
      render(<ChatPanel {...defaultProps} onSendMessage={onSendMessage} />)

      const input = screen.getByPlaceholderText(/type a message/i)
      fireEvent.change(input, { target: { value: 'Hello world' } })

      const sendButton = screen.getByRole('button', { name: /send/i })
      fireEvent.click(sendButton)

      expect(onSendMessage).toHaveBeenCalledWith('Hello world')
    })

    it('clears input after sending', () => {
      const onSendMessage = vi.fn()
      render(<ChatPanel {...defaultProps} onSendMessage={onSendMessage} />)

      const input = screen.getByPlaceholderText(/type a message/i) as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Hello world' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(input.value).toBe('')
    })

    it('disables send button when input is empty', () => {
      render(<ChatPanel {...defaultProps} />)

      const sendButton = screen.getByRole('button', { name: /send/i })
      expect(sendButton).toBeDisabled()
    })

    it('enables send button when input has text', () => {
      render(<ChatPanel {...defaultProps} />)

      const input = screen.getByPlaceholderText(/type a message/i)
      fireEvent.change(input, { target: { value: 'Hello' } })

      const sendButton = screen.getByRole('button', { name: /send/i })
      expect(sendButton).not.toBeDisabled()
    })
  })
})
