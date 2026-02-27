import type { Message } from '../types/database'

interface ChatMessageProps {
  message: Message
  isOwnMessage: boolean
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  return (
    <div
      data-testid="chat-message"
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 ${
          isOwnMessage
            ? 'bg-indigo-100 text-gray-900'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {/* Header with name and time */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-600">
            {message.participant_name}
          </span>
          <time className="text-xs text-gray-400">
            {formatTime(message.created_at)}
          </time>
        </div>
        {/* Content */}
        <p className="text-sm break-words">{message.content}</p>
      </div>
    </div>
  )
}
