import type { ViewMode } from '../types/database'

interface ViewTabsProps {
  value: ViewMode
  onChange: (view: ViewMode) => void
}

const tabs: { value: ViewMode; label: string }[] = [
  { value: 'scoring', label: 'Scoring' },
  { value: 'backlog', label: 'Backlog' },
]

export default function ViewTabs({ value, onChange }: ViewTabsProps) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <nav className="-mb-px flex" aria-label="View tabs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`
              flex-1 py-3 px-4 text-center text-sm font-medium border-b-2 transition-colors
              ${
                value === tab.value
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
            aria-current={value === tab.value ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
