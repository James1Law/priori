import { useState, FormEvent } from 'react'
import type { Framework, ViewMode } from '../types/database'

interface MobileBottomBarProps {
  framework: Framework
  view: ViewMode
  onFrameworkChange: (framework: Framework) => void
  onViewChange: (view: ViewMode) => void
  onAddItem: (item: { title: string; description: string }) => void
}

const FRAMEWORKS: { value: Framework; label: string }[] = [
  { value: 'rice', label: 'RICE' },
  { value: 'ice', label: 'ICE' },
  { value: 'value_effort', label: 'Value/Effort' },
  { value: 'moscow', label: 'MoSCoW' },
  { value: 'weighted', label: 'Weighted' },
]

const VIEWS: { value: ViewMode; label: string }[] = [
  { value: 'scoring', label: 'Scoring' },
  { value: 'backlog', label: 'Backlog' },
]

export default function MobileBottomBar({
  framework,
  view,
  onFrameworkChange,
  onViewChange,
  onAddItem,
}: MobileBottomBarProps) {
  const [title, setTitle] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      return
    }

    onAddItem({
      title: title.trim(),
      description: '',
    })

    setTitle('')
  }

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50"
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

      {/* Framework selector and add form - only show in Scoring view */}
      {view === 'scoring' && (
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-4 pb-1"
        >
          <select
            value={framework}
            onChange={(e) => onFrameworkChange(e.target.value as Framework)}
            className="shrink-0 px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            aria-label="Prioritisation framework"
          >
            {FRAMEWORKS.map((fw) => (
              <option key={fw.value} value={fw.value}>
                {fw.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add new item..."
            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />

          <button
            type="submit"
            disabled={!title.trim()}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Add
          </button>
        </form>
      )}

      {/* Add form only - show in Backlog view */}
      {view === 'backlog' && (
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-4 pb-1"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add new item..."
            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />

          <button
            type="submit"
            disabled={!title.trim()}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Add
          </button>
        </form>
      )}
    </div>
  )
}
