import { useState, useEffect, useRef } from 'react'
import type { Item, ItemWithScore, ItemStatus, Framework, ItemLevel } from '../types/database'
import { canResizeDateChild, canResizeDateParent } from '../lib/roadmap-dates'
import { ITEM_LEVEL_LABELS, ITEM_LEVEL_CHILD_LABELS, MAX_ITEM_LEVEL } from '../types/database'
import { getQuadrant } from '../lib/valueEffort'
import { getAncestors, getDirectChildren, getStatusRollup, getRolledUpEstimate } from '../lib/hierarchy'

interface ItemDrawerProps {
  item: ItemWithScore | null
  isOpen: boolean
  framework: Framework
  allItems?: ItemWithScore[]
  onClose: () => void
  onSave: (item: Item) => void
  onDelete: (itemId: string) => void
  onSetItemDates?: (itemId: string, startDate: string, endDate: string) => Promise<void>
  onClearItemDates?: (itemId: string) => Promise<void>
  onNavigateToItem?: (item: ItemWithScore) => void
  onAddChild?: (parentId: string, parentLevel: number, title: string) => void
  isNew?: boolean
  onCreate?: (item: { title: string; description: string; status: ItemStatus; item_level: number; start_date: string | null; end_date: string | null }) => void
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

// Level badge colours (matching BacklogList)
const LEVEL_BADGE_STYLES: Record<number, string> = {
  0: 'bg-pink-50 text-pink-700 border-pink-200',
  1: 'bg-blue-50 text-blue-700 border-blue-200',
  2: 'bg-purple-50 text-purple-700 border-purple-200',
  3: 'bg-amber-50 text-amber-700 border-amber-200',
  4: 'bg-slate-50 text-slate-600 border-slate-200',
}

export default function ItemDrawer({
  item,
  isOpen,
  framework,
  allItems = [],
  onClose,
  onSave,
  onDelete,
  onSetItemDates,
  onClearItemDates,
  onNavigateToItem,
  onAddChild,
  isNew = false,
  onCreate,
}: ItemDrawerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ItemStatus>('todo')
  const [selectedLevel, setSelectedLevel] = useState<number>(0)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [dateError, setDateError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [childTitle, setChildTitle] = useState('')
  const [isAddingChild, setIsAddingChild] = useState(false)
  const childInputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setTitle(item.title)
      setDescription(item.description || '')
      setStatus(item.status || 'todo')
      setSelectedLevel(item.item_level ?? 0)
      setStartDate(item.start_date || '')
      setEndDate(item.end_date || '')
      setDateError(null)
      setHasChanges(false)
      setIsAddingChild(false)
      setChildTitle('')
    }
  }, [item])

  // Focus child input when shown
  useEffect(() => {
    if (isAddingChild && childInputRef.current) {
      childInputRef.current.focus()
    }
  }, [isAddingChild])

  // Track changes
  useEffect(() => {
    if (!item) return
    const datesChanged = startDate !== (item.start_date || '') || endDate !== (item.end_date || '')
    const changed =
      title !== item.title ||
      description !== (item.description || '') ||
      status !== (item.status || 'todo') ||
      datesChanged
    setHasChanges(changed)
  }, [title, description, status, startDate, endDate, item])

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

  // Hierarchy data
  const itemLevel = (item.item_level ?? 0) as ItemLevel
  const ancestors = allItems.length > 0 ? getAncestors(item.id, allItems) : []
  const children = allItems.length > 0 ? getDirectChildren(item.id, allItems) : []
  const hasChildren = children.length > 0
  const canAddChild = itemLevel < MAX_ITEM_LEVEL && !!onAddChild
  const statusRollup = hasChildren ? getStatusRollup(item.id, allItems) : null
  const rolledUpEstimate = hasChildren ? getRolledUpEstimate(item.id, allItems) : null
  const isHierarchyItem = itemLevel > 0 || hasChildren

  const handleAddChild = () => {
    if (!childTitle.trim() || !onAddChild) return
    onAddChild(item.id, itemLevel, childTitle.trim())
    setChildTitle('')
    setIsAddingChild(false)
  }

  const handleSave = () => {
    if (!title.trim()) return

    if (isNew && onCreate) {
      // Create new item via callback — no DB record exists yet
      onCreate({
        title: title.trim(),
        description: description.trim(),
        status,
        item_level: selectedLevel,
        start_date: startDate || null,
        end_date: endDate || null,
      })
      onClose()
      return
    }

    // Save basic item changes
    onSave({
      ...item,
      title: title.trim(),
      description: description.trim() || null,
      status,
    })

    // Handle date changes
    const datesChanged = startDate !== (item.start_date || '') || endDate !== (item.end_date || '')
    if (datesChanged) {
      if (startDate && endDate && onSetItemDates) {
        onSetItemDates(item.id, startDate, endDate)
      } else if (!startDate && !endDate && onClearItemDates) {
        onClearItemDates(item.id)
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
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {isHierarchyItem && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0 ${LEVEL_BADGE_STYLES[itemLevel] ?? LEVEL_BADGE_STYLES[0]}`}>
                  {ITEM_LEVEL_LABELS[itemLevel] ?? 'Item'}
                </span>
              )}
              <h2 id="drawer-title" className="text-lg font-display font-semibold text-gray-900 truncate">
                {isNew ? 'Add Item' : 'Edit Item'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Close drawer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Breadcrumbs */}
          {ancestors.length > 0 && onNavigateToItem && (
            <nav className="mt-2 flex items-center gap-1 text-xs text-gray-500 overflow-x-auto" aria-label="Item hierarchy">
              {ancestors.reverse().map((ancestor, i) => (
                <span key={ancestor.id} className="flex items-center gap-1 flex-shrink-0">
                  {i > 0 && (
                    <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <button
                    onClick={() => onNavigateToItem(ancestor)}
                    className="hover:text-indigo-600 hover:underline truncate max-w-[120px]"
                    title={ancestor.title}
                  >
                    {ancestor.title}
                  </button>
                </span>
              ))}
              <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium text-gray-700 truncate">{item.title}</span>
            </nav>
          )}
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

          {/* Item Level (only for new items) */}
          {isNew && (
            <div>
              <label htmlFor="drawer-level" className="block text-sm font-medium text-gray-700 mb-1">
                Item Type
              </label>
              <select
                id="drawer-level"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900 text-sm"
              >
                <option value={0}>Goal</option>
                <option value={1}>Initiative</option>
                <option value={2}>Epic</option>
                <option value={3}>Story</option>
                <option value={4}>Subtask</option>
              </select>
            </div>
          )}

          {/* Schedule (Date-based) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 mb-0.5">Start date</div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const newStart = e.target.value
                    setStartDate(newStart)
                    setDateError(null)
                    if (newStart && endDate && newStart > endDate) {
                      setEndDate(newStart)
                    }
                    // Validate hierarchy constraints
                    if (newStart && endDate && allItems.length > 0) {
                      if (!canResizeDateChild(item.id, newStart, endDate > newStart ? endDate : newStart, allItems)) {
                        setDateError('Dates must be within parent bounds')
                      } else if (!canResizeDateParent(item.id, newStart, endDate > newStart ? endDate : newStart, allItems)) {
                        setDateError('Dates must contain all children')
                      }
                    }
                  }}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>
              <span className="text-gray-400 mt-4">→</span>
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 mb-0.5">End date</div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    const newEnd = e.target.value
                    setEndDate(newEnd)
                    setDateError(null)
                    if (startDate && newEnd && newEnd < startDate) {
                      setStartDate(newEnd)
                    }
                    // Validate hierarchy constraints
                    if (startDate && newEnd && allItems.length > 0) {
                      if (!canResizeDateChild(item.id, startDate < newEnd ? startDate : newEnd, newEnd, allItems)) {
                        setDateError('Dates must be within parent bounds')
                      } else if (!canResizeDateParent(item.id, startDate < newEnd ? startDate : newEnd, newEnd, allItems)) {
                        setDateError('Dates must contain all children')
                      }
                    }
                  }}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); setDateError(null) }}
                  className="mt-4 p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Clear dates"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {dateError && (
              <p className="text-xs text-red-500 mt-1">{dateError}</p>
            )}
            {/* Hierarchy bounds hint */}
            {item.parent_item_id && allItems.length > 0 && (() => {
              const parent = allItems.find(i => i.id === item.parent_item_id)
              if (parent?.start_date && parent?.end_date) {
                return (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Parent "{parent.title}" runs {parent.start_date} → {parent.end_date}
                  </p>
                )
              }
              return null
            })()}
          </div>

          {/* Hierarchy Rollup for parent items */}
          {hasChildren && statusRollup && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Progress</h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Status rollup card */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 font-medium">Children Status</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                      <div className="bg-green-500 h-full" style={{ width: `${statusRollup.total > 0 ? (statusRollup.done / statusRollup.total) * 100 : 0}%` }} />
                      <div className="bg-amber-400 h-full" style={{ width: `${statusRollup.total > 0 ? (statusRollup.in_progress / statusRollup.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {statusRollup.done}/{statusRollup.total} done
                    {statusRollup.in_progress > 0 && ` · ${statusRollup.in_progress} in progress`}
                  </div>
                </div>

                {/* Rolled-up estimate card */}
                {rolledUpEstimate !== null && (
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <div className="text-xs text-emerald-600 font-medium">Total Estimate</div>
                    <div className="text-xl font-semibold text-emerald-900 mt-0.5">{rolledUpEstimate}d</div>
                    <div className="text-xs text-emerald-600/70 mt-1">From {children.length} children</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Children List */}
          {(hasChildren || canAddChild) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">
                  {hasChildren
                    ? `Children (${children.length})`
                    : `Add ${ITEM_LEVEL_CHILD_LABELS[itemLevel]}`}
                </h3>
                {canAddChild && !isAddingChild && (
                  <button
                    onClick={() => setIsAddingChild(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add {ITEM_LEVEL_CHILD_LABELS[itemLevel]}
                  </button>
                )}
              </div>

              {/* Children items */}
              {children.length > 0 && (
                <div className="space-y-1">
                  {children
                    .sort((a, b) => (a.backlog_position ?? a.position) - (b.backlog_position ?? b.position))
                    .map((child) => {
                      const childStatus = child.status || 'todo'
                      const childStatusLabel = childStatus === 'in_progress' ? 'In Progress' : childStatus === 'done' ? 'Done' : 'To Do'
                      const childStatusClass = childStatus === 'done' ? 'bg-green-50 text-green-700' : childStatus === 'in_progress' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'
                      const childLevel = (child.item_level ?? 0) as number
                      return (
                        <button
                          key={child.id}
                          onClick={() => onNavigateToItem?.(child)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-left transition-colors group"
                        >
                          <span className={`px-1 py-0.5 rounded text-[9px] font-semibold border flex-shrink-0 ${LEVEL_BADGE_STYLES[childLevel] ?? LEVEL_BADGE_STYLES[4]}`}>
                            {ITEM_LEVEL_LABELS[(childLevel as ItemLevel)] ?? 'Item'}
                          </span>
                          <span className="flex-1 text-sm text-gray-900 truncate group-hover:text-indigo-600">
                            {child.title}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${childStatusClass}`}>
                            {childStatusLabel}
                          </span>
                        </button>
                      )
                    })}
                </div>
              )}

              {/* Inline add child */}
              {isAddingChild && (
                <div className="flex items-center gap-2">
                  <input
                    ref={childInputRef}
                    type="text"
                    value={childTitle}
                    onChange={(e) => setChildTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddChild()
                      if (e.key === 'Escape') {
                        setIsAddingChild(false)
                        setChildTitle('')
                      }
                    }}
                    placeholder={`New ${ITEM_LEVEL_CHILD_LABELS[itemLevel]}...`}
                    className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleAddChild}
                    disabled={!childTitle.trim()}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setIsAddingChild(false); setChildTitle('') }}
                    className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
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
          {!isNew ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
            >
              Delete
            </button>
          ) : <div />}
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
              {isNew ? 'Create' : hasChanges ? 'Save Changes' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
