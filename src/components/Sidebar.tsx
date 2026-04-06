import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export type SidebarModule = 'backlog' | 'roadmap' | 'capacity' | 'prioritise' | 'estimate'

interface SidebarProps {
  slug: string
  sessionName: string | null
  collapsed: boolean
  onToggleCollapse: () => void
  onSessionNameChange?: (name: string) => void
}

interface NavItem {
  id: SidebarModule | string
  label: string
  icon: React.ReactNode
  route?: string
  disabled?: boolean
}

const MODULE_ITEMS: NavItem[] = [
  {
    id: 'backlog',
    label: 'Backlog',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: 'roadmap',
    label: 'Roadmap',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    id: 'capacity',
    label: 'Capacity Planning',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'prioritise',
    label: 'Prioritisation',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ),
  },
  {
    id: 'estimate',
    label: 'Poker Planner',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
]

const COMING_SOON_ITEMS: NavItem[] = [
  {
    id: 'sprints',
    label: 'Sprints',
    disabled: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    disabled: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'integrations',
    label: 'Integrations',
    disabled: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: 'import-export',
    label: 'Import / Export',
    disabled: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
      </svg>
    ),
  },
  {
    id: 'dashboards',
    label: 'Dashboards',
    disabled: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
]

function getRouteForModule(slug: string, moduleId: string): string {
  switch (moduleId) {
    case 'backlog': return `/s/${slug}`
    case 'roadmap': return `/s/${slug}/roadmap`
    case 'capacity': return `/s/${slug}/capacity`
    case 'prioritise': return `/s/${slug}/prioritise`
    case 'estimate': return `/s/${slug}/estimate`
    default: return `/s/${slug}`
  }
}

function getActiveModule(pathname: string): SidebarModule {
  if (pathname.endsWith('/roadmap')) return 'roadmap'
  if (pathname.endsWith('/capacity')) return 'capacity'
  if (pathname.endsWith('/prioritise')) return 'prioritise'
  if (pathname.endsWith('/estimate')) return 'estimate'
  return 'backlog'
}

export default function Sidebar({ slug, sessionName, collapsed, onToggleCollapse, onSessionNameChange }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const activeModule = getActiveModule(location.pathname)

  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const startEditing = () => {
    setNameInput(sessionName || '')
    setEditing(true)
  }

  const saveEdit = () => {
    const trimmed = nameInput.trim()
    if (trimmed && onSessionNameChange) {
      onSessionNameChange(trimmed)
    }
    setEditing(false)
  }

  return (
    <aside
      className={`
        hidden sm:flex flex-col flex-shrink-0 bg-white border-r border-gray-200
        transition-[width] duration-200 ease-in-out
        ${collapsed ? 'w-16' : 'w-[260px]'}
      `}
      data-testid="sidebar"
    >
      {/* Sidebar Header */}
      <div className={`h-16 border-b border-gray-200 flex items-center gap-3 ${collapsed ? 'px-3 justify-center' : 'px-4'}`}>
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          data-testid="sidebar-toggle"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit()
                  if (e.key === 'Escape') setEditing(false)
                }}
                className="font-display font-bold text-base text-gray-900 w-full border-b-2 border-indigo-500 bg-transparent focus:outline-none"
                autoFocus
                data-testid="session-name-input"
              />
            ) : (
              <button
                className="group flex items-center gap-1 text-left max-w-full cursor-pointer"
                onClick={startEditing}
                data-testid="session-name-display"
              >
                <span className={`font-display font-bold text-base truncate transition-colors group-hover:text-indigo-600 ${
                  sessionName ? 'text-gray-900' : 'text-gray-400 italic'
                }`}>
                  {sessionName || 'Name your session...'}
                </span>
                <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {/* Module label */}
        {!collapsed && (
          <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Modules
          </div>
        )}

        {/* Active modules */}
        {MODULE_ITEMS.map((item) => {
          const isActive = activeModule === item.id
          return (
            <button
              key={item.id}
              onClick={() => navigate(getRouteForModule(slug, item.id))}
              className={`
                w-full flex items-center gap-2.5 rounded-lg transition-colors mb-0.5
                ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'}
                ${isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
              title={collapsed ? item.label : undefined}
              data-testid={`sidebar-nav-${item.id}`}
            >
              <span className={`flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </button>
          )
        })}

        {/* Divider */}
        <div className="h-px bg-gray-200 my-2 mx-2" />

        {/* Coming Soon label */}
        {!collapsed && (
          <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Coming Soon
          </div>
        )}

        {/* Disabled items */}
        {COMING_SOON_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`
              flex items-center gap-2.5 rounded-lg opacity-40 mb-0.5
              ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'}
            `}
            title={collapsed ? item.label : undefined}
            data-testid={`sidebar-nav-${item.id}`}
          >
            <span className="flex-shrink-0 text-gray-500">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="text-sm font-medium text-gray-500 truncate">{item.label}</span>
                <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                  Soon
                </span>
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 py-3 px-2">
        <button
          className={`
            w-full flex items-center gap-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors
            ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'}
          `}
          title={collapsed ? 'Settings' : undefined}
          data-testid="sidebar-nav-settings"
        >
          <svg className="w-5 h-5 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {!collapsed && <span className="text-sm font-medium">Settings</span>}
        </button>
      </div>
    </aside>
  )
}

export { getActiveModule, getRouteForModule, MODULE_ITEMS, COMING_SOON_ITEMS }
