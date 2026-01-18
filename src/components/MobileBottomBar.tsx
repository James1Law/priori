import type { Framework, ViewMode } from '../types/database'

interface MobileBottomBarProps {
  framework: Framework
  view: ViewMode
  onFrameworkChange: (framework: Framework) => void
  onViewChange: (view: ViewMode) => void
  onAddItem: (item: { title: string; description: string }) => void
}

interface ViewOption {
  value: ViewMode
  label: string
}

const VIEWS: ViewOption[] = [
  { value: 'scoring', label: 'Scoring' },
  { value: 'estimates', label: 'Estimates' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'roadmap', label: 'Roadmap' },
]

export default function MobileBottomBar({
  view,
  onViewChange,
}: MobileBottomBarProps) {
  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      {/* View Toggle */}
      <div className="flex px-4 pt-3 pb-2 gap-1">
        {VIEWS.map((v) => (
          <button
            key={v.value}
            onClick={() => onViewChange(v.value)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
              view === v.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}
