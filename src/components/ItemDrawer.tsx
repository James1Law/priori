import { useState, useEffect, useRef } from 'react'
import type { Item, ItemWithScore, ItemStatus, Framework, RoadmapPeriod } from '../types/database'
import { getQuadrant } from '../lib/valueEffort'

interface ItemDrawerProps {
  item: ItemWithScore | null
  isOpen: boolean
  framework: Framework
  periods: RoadmapPeriod[]
  onClose: () => void
  onSave: (item: Item) => void
  onDelete: (itemId: string) => void
  onAssignPeriod?: (itemId: string, startQuadrant: number, endQuadrant: number) => void
  onUnassignPeriod?: (itemId: string) => void
}

const STATUS_OPTIONS: { value: ItemStatus; label: string; bgClass: string; textClass: string }[] = [
  { value: 'todo', label: 'To Do', bgClass: 'bg-gray-50', textClass: 'text-gray-600' },
  { value: 'in_progress', label: 'In Progress', bgClass: 'bg-amber-50', textClass: 'text-amber-700' },
  { value: 'done', label: 'Done', bgClass: 'bg-green-50', textClass: 'text-green-700' },
]

// Format score based on framework
function formatScoreDisplay(item: ItemWithScore, framework: Framework): { label: string; value: string; breakdown?: string } | null {
  const score = item.score
  if (!score) return null

  // For numeric-score frameworks, require a valid calculated_score
  // For categorical frameworks (moscow, value_effort), check criteria instead
  const hasNumericScore = score.calculated_score !== null && score.calculated_score !== undefined
  const hasCriteria = score.criteria !== null && score.criteria !== undefined

  switch (framework) {
    case 'rice': {
      if (!hasNumericScore) return null
      const criteria = score.criteria as { reach?: number; impact?: number; confidence?: number; effort?: number }
      return {
        label: 'RICE Score',
        value: Math.round(score.calculated_score).toString(),
        breakdown: `Reach: ${criteria.reach || 0} · Impact: ${criteria.impact || 0} · Confidence: ${Math.round((criteria.confidence || 0) * 100)}% · Effort: ${criteria.effort || 0}`,
      }
    }
    case 'ice': {
      if (!hasNumericScore) return null
      const criteria = score.criteria as { impact?: number; confidence?: number; ease?: number }
      return {
        label: 'ICE Score',
        value: score.calculated_score.toFixed(1),
        breakdown: `Impact: ${criteria.impact || 0} · Confidence: ${criteria.confidence || 0} · Ease: ${criteria.ease || 0}`,
      }
    }
    case 'value_effort': {
      if (!hasCriteria) return null
      const criteria = score.criteria as { value?: number; effort?: number }
      const value = criteria.value ?? 5
      const effort = criteria.effort ?? 5
      const quadrant = getQuadrant({ value, effort })
      return {
        label: 'Value/Effort',
        value: quadrant,
        breakdown: `Value: ${value} · Effort: ${effort}`,
      }
    }
    case 'moscow': {
      if (!hasCriteria) return null
      const criteria = score.criteria as { category?: string }
      const category = criteria.category
      if (!category) return null
      // Format category labels consistently
      const categoryLabels: Record<string, string> = {
        must: 'Must Have',
        should: 'Should Have',
        could: 'Could Have',
        wont: "Won't Have",
      }
      return {
        label: 'MoSCoW',
        value: categoryLabels[category] || category,
      }
    }
    case 'weighted': {
      if (!hasNumericScore) return null
      return {
        label: 'Weighted Score',
        value: score.calculated_score.toFixed(2),
      }
    }
    default:
      return null
  }
}

// Get period name from quadrant
function getPeriodFromQuadrant(startQuadrant: number | null, periods: RoadmapPeriod[]): RoadmapPeriod | null {
  if (startQuadrant === null || periods.length === 0) return null
  const QUADRANTS_PER_PERIOD = 4
  const periodIndex = Math.floor(startQuadrant / QUADRANTS_PER_PERIOD)
  return periods.find(p => p.position === periodIndex) || null
}

export default function ItemDrawer({
  item,
  isOpen,
  framework,
  periods,
  onClose,
  onSave,
  onDelete,
  onAssignPeriod,
  onUnassignPeriod,
}: ItemDrawerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ItemStatus>('todo')
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setTitle(item.title)
      setDescription(item.description || '')
      setStatus(item.status || 'todo')
      const currentPeriod = getPeriodFromQuadrant(item.roadmap_start_quadrant ?? null, periods)
      setSelectedPeriodId(currentPeriod?.id || null)
      setHasChanges(false)
    }
  }, [item, periods])

  // Track changes
  useEffect(() => {
    if (!item) return
    const currentPeriod = getPeriodFromQuadrant(item.roadmap_start_quadrant ?? null, periods)
    const periodChanged = selectedPeriodId !== (currentPeriod?.id || null)
    const changed =
      title !== item.title ||
      description !== (item.description || '') ||
      status !== (item.status || 'todo') ||
      periodChanged
    setHasChanges(changed)
  }, [title, description, status, selectedPeriodId, item, periods])

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const focusableElements = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      if (firstElement) {
        firstElement.focus()
      }
    }
  }, [isOpen])

  if (!isOpen || !item) return null

  const scoreDisplay = formatScoreDisplay(item, framework)
  const currentPeriod = getPeriodFromQuadrant(item.roadmap_start_quadrant ?? null, periods)

  const handleSave = () => {
    if (!title.trim()) return

    // Save basic item changes
    onSave({
      ...item,
      title: title.trim(),
      description: description.trim() || null,
      status,
    })

    // Handle period changes
    const newPeriod = periods.find(p => p.id === selectedPeriodId)
    const oldPeriodId = currentPeriod?.id || null

    if (selectedPeriodId !== oldPeriodId) {
      if (selectedPeriodId && newPeriod && onAssignPeriod) {
        const QUADRANTS_PER_PERIOD = 4
        const startQuadrant = newPeriod.position * QUADRANTS_PER_PERIOD
        onAssignPeriod(item.id, startQuadrant, startQuadrant)
      } else if (!selectedPeriodId && onUnassignPeriod) {
        onUnassignPeriod(item.id)
      }
    }
  }

  const handleDelete = () => {
    onDelete(item.id)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-200 motion-reduce:transition-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={panelRef}
        data-testid="item-drawer"
        className={`
          fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-xl z-50
          transform transition-transform duration-200 ease-out motion-reduce:transition-none
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 id="drawer-title" className="text-lg font-display font-semibold text-gray-900">
            Item Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Close drawer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="drawer-title-input" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              id="drawer-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              placeholder="Item title"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="drawer-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="drawer-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-900"
              placeholder="Add a description..."
            />
          </div>

          {/* Metrics Section */}
          {(scoreDisplay || item.story_points !== null && item.story_points !== undefined) && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Metrics</h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Score Card */}
                {scoreDisplay && (
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <div className="text-xs text-indigo-600 font-medium">{scoreDisplay.label}</div>
                    <div className="text-xl font-semibold text-indigo-900 mt-0.5">{scoreDisplay.value}</div>
                    {scoreDisplay.breakdown && (
                      <div className="text-xs text-indigo-600/70 mt-1">{scoreDisplay.breakdown}</div>
                    )}
                  </div>
                )}

                {/* Estimate Card */}
                {item.story_points !== null && item.story_points !== undefined && (
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <div className="text-xs text-emerald-600 font-medium">Story Points</div>
                    <div className="text-xl font-semibold text-emerald-900 mt-0.5">{item.story_points}</div>
                    <div className="text-xs text-emerald-600/70 mt-1">Estimated effort</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    status === opt.value
                      ? `${opt.bgClass} ${opt.textClass} ring-2 ring-offset-1 ring-indigo-500 border-transparent`
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Period Assignment */}
          {periods.length > 0 && (
            <div>
              <label htmlFor="drawer-period" className="block text-sm font-medium text-gray-700 mb-1">
                Roadmap Period
              </label>
              <select
                id="drawer-period"
                value={selectedPeriodId || ''}
                onChange={(e) => setSelectedPeriodId(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">Not scheduled</option>
                {[...periods]
                  .sort((a, b) => a.position - b.position)
                  .map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Created Info */}
          {item.created_by && (
            <div className="text-sm text-gray-500">
              Created by <span className="font-medium">{item.created_by}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
            >
              {hasChanges ? 'Save Changes' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
