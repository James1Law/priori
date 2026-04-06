import { useLocation, useNavigate } from 'react-router-dom'

interface MobileBottomBarProps {
  slug: string
}

interface NavItem {
  id: string
  label: string
  path: string
  icon: React.ReactNode
}

function getNavItems(slug: string): NavItem[] {
  return [
    {
      id: 'backlog',
      label: 'List',
      path: `/s/${slug}`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      id: 'roadmap',
      label: 'Roadmap',
      path: `/s/${slug}/roadmap`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
    },
    {
      id: 'prioritise',
      label: 'Score',
      path: `/s/${slug}/prioritise`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      ),
    },
    {
      id: 'estimate',
      label: 'Poker',
      path: `/s/${slug}/estimate`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'capacity',
      label: 'Capacity',
      path: `/s/${slug}/capacity`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ]
}

function getActiveId(pathname: string): string {
  if (pathname.endsWith('/roadmap')) return 'roadmap'
  if (pathname.endsWith('/capacity')) return 'capacity'
  if (pathname.endsWith('/prioritise')) return 'prioritise'
  if (pathname.endsWith('/estimate')) return 'estimate'
  return 'backlog'
}

export default function MobileBottomBar({ slug }: MobileBottomBarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const activeId = getActiveId(location.pathname)
  const navItems = getNavItems(slug)

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 sm:hidden"
      style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex px-2 pt-2 pb-1 gap-1">
        {navItems.map((item) => {
          const isActive = activeId === item.id
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex-1 py-1.5 px-1 text-[11px] font-medium rounded-lg transition-colors flex flex-col items-center gap-0.5 ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
