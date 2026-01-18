import type { ViewMode, Framework } from '../types/database'

interface ViewTabsProps {
  value: ViewMode
  onChange: (view: ViewMode) => void
  framework?: Framework
  onFrameworkChange?: (framework: Framework) => void
  onAddItemClick?: () => void
}

interface Tab {
  value: ViewMode
  label: string
  desktopOnly?: boolean
}

const tabs: Tab[] = [
  { value: 'scoring', label: 'Scoring' },
  { value: 'estimates', label: 'Estimates' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'roadmap', label: 'Roadmap', desktopOnly: true },
]

const FRAMEWORKS = [
  { value: 'rice' as const, label: 'RICE', description: 'Reach × Impact × Confidence / Effort' },
  { value: 'ice' as const, label: 'ICE', description: 'Impact + Confidence + Ease' },
  { value: 'value_effort' as const, label: 'Value vs Effort', description: '2×2 matrix' },
  { value: 'moscow' as const, label: 'MoSCoW', description: 'Must/Should/Could/Won\'t' },
  { value: 'weighted' as const, label: 'Weighted Scoring', description: 'Custom criteria' },
]

export default function ViewTabs({
  value,
  onChange,
  framework,
  onFrameworkChange,
  onAddItemClick,
}: ViewTabsProps) {
  const showFrameworkSelector = value === 'scoring' && framework && onFrameworkChange

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between">
        {/* View tabs */}
        <nav className="-mb-px flex" aria-label="View tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              className={`
                py-3 px-6 text-center text-sm font-medium border-b-2 transition-colors
                ${tab.desktopOnly ? 'hidden lg:block' : ''}
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

        {/* Right side: Framework selector + Add button */}
        <div className="flex items-center gap-3 pr-4">
          {/* Framework selector - only in scoring view */}
          {showFrameworkSelector && (
            <select
              value={framework}
              onChange={(e) => onFrameworkChange(e.target.value as Framework)}
              data-testid="framework-selector"
              className="text-sm border border-gray-300 rounded-md py-1.5 px-3 bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {FRAMEWORKS.map((fw) => (
                <option key={fw.value} value={fw.value}>
                  {fw.label}
                </option>
              ))}
            </select>
          )}

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
