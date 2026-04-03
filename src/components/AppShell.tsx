import { useState, useEffect, type ReactNode } from 'react'
import Sidebar from './Sidebar'

const SIDEBAR_COLLAPSED_KEY = 'priori_sidebar_collapsed'

interface AppShellProps {
  slug: string
  sessionName: string | null
  participantCount: number
  unreadCount: number
  onChatOpen: () => void
  onAddItem?: () => void
  onSessionNameChange?: (name: string) => void
  children: ReactNode
}

function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id="appshell-logo-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#appshell-logo-gradient)" />
      <path d="M24 12L36 34H12L24 12Z" fill="white" />
    </svg>
  )
}

export default function AppShell({
  slug,
  sessionName,
  participantCount,
  unreadCount,
  onChatOpen,
  onAddItem,
  onSessionNameChange,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
    } catch {
      // localStorage unavailable
    }
  }, [collapsed])

  return (
    <div className="min-h-screen bg-gray-50 font-body flex" data-testid="app-shell">
      {/* Sidebar — full height, left edge */}
      <Sidebar
        slug={slug}
        sessionName={sessionName}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(prev => !prev)}
        onSessionNameChange={onSessionNameChange}
      />

      {/* Right side: header + content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content header — only spans the content area (right of sidebar) */}
        <header className="hidden lg:flex h-16 bg-white border-b border-gray-200 flex-shrink-0 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <a href="/" className="flex-shrink-0" title="Go to home">
              <Logo className="w-10 h-10" />
            </a>
            <span className="font-display font-bold text-2xl text-indigo-600">Priori</span>
          </div>
          <div className="flex items-center gap-3">
            {onAddItem && (
              <button
                onClick={onAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                data-testid="header-add-item-btn"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
            )}
            {participantCount > 0 && (
              <button
                onClick={onChatOpen}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
                title="Open team chat"
                data-testid="header-chat-btn"
              >
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>{participantCount} online</span>
                <span className="relative">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
              </button>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
