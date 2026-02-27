import type { ViewMode } from '../types/database'

interface ViewTabsProps {
  value: ViewMode
  onChange: (view: ViewMode) => void
  onAddItemClick?: () => void
}

interface Tab {
  value: ViewMode
  label: string
  icon: React.ReactNode
}

const tabs: Tab[] = [
  {
    value: 'list',
    label: 'List',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    value: 'roadmap',
    label: 'Roadmap',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
]

export default function ViewTabs({
  value,
  onChange,
  onAddItemClick,
}: ViewTabsProps) {

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between">
        {/* View toggle */}
        <div className="flex items-center">
          <div className="flex rounded-lg bg-gray-100 p-1 m-2" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => onChange(tab.value)}
                role="tab"
                aria-selected={value === tab.value}
                className={`
                  flex items-center gap-1.5 py-1.5 px-3 text-sm font-medium rounded-md transition-colors
                  ${
                    value === tab.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right side: Add button */}
        <div className="flex items-center gap-3 pr-4">
          {/* Add Item button */}
          {onAddItemClick && (
            <button
              onClick={onAddItemClick}
              data-testid="add-item-button"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-3 rounded-md transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
