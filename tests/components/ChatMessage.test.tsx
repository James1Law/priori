import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChatMessage from '../../src/components/ChatMessage'
import type { Message } from '../../src/types/database'

describe('ChatMessage', () => {
  const createMessage = (overrides: Partial<Message> = {}): Message => ({
    id: '1',
    session_id: 'session-1',
    participant_name: 'Alice',
    content: 'Hello world',
    message_type: 'user',
    created_at: '2024-01-01T10:30:00Z',
    ...overrides,
  })

  it('renders participant name and timestamp', () => {
    const message = createMessage()
    render(<ChatMessage message={message} isOwnMessage={false} />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    // Timestamp format may vary, just check it exists
    expect(screen.getByText(/:/)).toBeInTheDocument() // Contains time separator
  })

  it('renders message content', () => {
    const message = createMessage({ content: 'This is a test message' })
    render(<ChatMessage message={message} isOwnMessage={false} />)

    expect(screen.getByText('This is a test message')).toBeInTheDocument()
  })

  it('applies own message styling when isOwnMessage is true', () => {
    const message = createMessage()
    render(<ChatMessage message={message} isOwnMessage={true} />)

    const messageContainer = screen.getByTestId('chat-message')
    expect(messageContainer).toHaveClass('justify-end')
  })

  it('applies other message styling when isOwnMessage is false', () => {
    const message = createMessage()
    render(<ChatMessage message={message} isOwnMessage={false} />)

    const messageContainer = screen.getByTestId('chat-message')
    expect(messageContainer).toHaveClass('justify-start')
  })

  it('renders system messages with distinct styling', () => {
    const message = createMessage({
      message_type: 'system',
      content: 'Alice joined the session',
    })
    render(<ChatMessage message={message} isOwnMessage={false} />)

    const messageContainer = screen.getByTestId('chat-message')
    expect(messageContainer).toHaveClass('justify-center')
    expect(screen.getByText('Alice joined the session')).toBeInTheDocument()
  })

  it('does not show participant name for system messages', () => {
    const message = createMessage({
      message_type: 'system',
      participant_name: 'System',
      content: 'Bob left the session',
    })
    render(<ChatMessage message={message} isOwnMessage={false} />)

    // System messages should not show the participant name in the header
    expect(screen.queryByText('System')).not.toBeInTheDocument()
  })

  it('does not show timestamp for system messages', () => {
    const message = createMessage({
      message_type: 'system',
      content: 'Someone joined',
      created_at: '2024-01-01T14:30:00Z',
    })
    const { container } = render(<ChatMessage message={message} isOwnMessage={false} />)

    // System messages have simpler layout without timestamp
    const timeElements = container.querySelectorAll('time')
    expect(timeElements.length).toBe(0)
  })
})
