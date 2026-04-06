import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileBottomBar from './MobileBottomBar'

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
  const location = useLocation()

  // User's explicit preference (persisted to localStorage)
  const [userCollapsed, setUserCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
    } catch {
      return false
    }
  })

  // Auto-collapse at medium widths (sm to lg: 640px–1024px)
  const [isMediumWidth, setIsMediumWidth] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px) and (max-width: 1023px)')
    setIsMediumWidth(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMediumWidth(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // Sidebar is collapsed if user chose it OR if viewport is medium width
  const collapsed = userCollapsed || isMediumWidth

  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(userCollapsed))
    } catch {
      // localStorage unavailable
    }
  }, [userCollapsed])

  const handleCopyUrl = useCallback(() => {
    const url = `https://priori.work${location.pathname}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-gray-50 font-body flex" data-testid="app-shell">
      {/* Sidebar — full height, left edge */}
      <Sidebar
        slug={slug}
        sessionName={sessionName}
        collapsed={collapsed}
        onToggleCollapse={() => setUserCollapsed(prev => !prev)}
        onSessionNameChange={onSessionNameChange}
      />

      {/* Right side: header + content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content header — only spans the content area (right of sidebar) */}
        <header className="hidden sm:flex h-16 bg-white border-b border-gray-200 flex-shrink-0 items-center justify-between px-5">
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
            <button
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              title="Copy session URL"
              data-testid="header-copy-url-btn"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
              {copied ? 'Copied!' : 'Share'}
            </button>
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

      {/* Mobile bottom navigation — phone only */}
      <MobileBottomBar slug={slug} />
    </div>
  )
}
