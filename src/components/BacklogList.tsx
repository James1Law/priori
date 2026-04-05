import { useState, useEffect, useRef, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ItemWithScore, Framework, ItemStatus, Cutoff, CutoffColor, ItemLevel } from '../types/database'
import { ITEM_LEVEL_LABELS, ITEM_LEVEL_CHILD_LABELS, MAX_ITEM_LEVEL } from '../types/database'
import { getQuadrant } from '../lib/valueEffort'
import { buildTree, flattenTree, getStatusRollup, getRolledUpEstimate, getRolledUpScore, getMobileIndent, hasChildren as hasChildrenFn } from '../lib/hierarchy'
import ActionBar from './ActionBar'

type SortOption = 'manual' | 'score' | 'story_points' | 'status' | 'period' | 'title'

interface BacklogListProps {
  items: ItemWithScore[]
  framework: Framework
  isManualOrder: boolean
  cutoffs?: Cutoff[]
  onEdit: (item: ItemWithScore) => void
  onDelete: (itemId: string) => void
  onDeleteMultiple?: (itemIds: string[]) => void
  onReorder: (items: ItemWithScore[]) => void
  onAddCutoff?: (position: number) => void
  onUpdateCutoff?: (id: string, updates: Partial<Pick<Cutoff, 'position' | 'label' | 'color'>>) => void
  onDeleteCutoff?: (id: string) => void
  onStatusChange?: (itemId: string, status: ItemStatus) => void
  onStatusChangeMultiple?: (itemIds: string[], status: ItemStatus) => void
  onAddChild?: (parentId: string, parentLevel: number, title: string) => void
}

// Format score for display based on framework
function formatScore(item: ItemWithScore, framework: Framework, allItems?: ItemWithScore[]): string {
  // Check if this is a parent item — if so, show rolled-up score
  const isParent = allItems ? hasChildrenFn(item.id, allItems) : false

  if (isParent && allItems) {
    const rollup = getRolledUpScore(item.id, allItems)
    if (framework === 'moscow') {
      if (!rollup.moscowCategory) return '—'
      const categoryLabels: Record<string, string> = {
        must: 'Must Have', should: 'Should Have', could: 'Could Have', wont: "Won't Have",
      }
      return `${categoryLabels[rollup.moscowCategory] || rollup.moscowCategory} avg`
    }
    if (rollup.score === null || rollup.score === 0) return '—'
    switch (framework) {
      case 'rice': return `RICE: ${Math.round(rollup.score)} avg`
      case 'ice': return `ICE: ${rollup.score.toFixed(1)} avg`
      case 'weighted': return `Score: ${rollup.score.toFixed(2)} avg`
      default: return `${rollup.score} avg`
    }
  }

  const score = item.score?.calculated_score
  const criteria = item.score?.criteria

  switch (framework) {
    case 'rice':
      if (score === undefined || score === null) return '—'
      return `RICE: ${Math.round(score)}`
    case 'ice':
      if (score === undefined || score === null) return '—'
      return `ICE: ${score.toFixed(1)}`
    case 'value_effort':
      // Show quadrant name instead of numeric score
      if (!criteria || criteria.value === undefined || criteria.effort === undefined) return '—'
      return getQuadrant({ value: criteria.value as number, effort: criteria.effort as number })
    case 'moscow':
      // For MoSCoW, show the category with proper formatting
      const category = criteria?.category as string
      if (!category) return '—'
      const categoryLabels: Record<string, string> = {
        must: 'Must Have',
        should: 'Should Have',
        could: 'Could Have',
        wont: "Won't Have",
      }
      return categoryLabels[category] || category
    case 'weighted':
      if (score === undefined || score === null) return '—'
      return `Score: ${score.toFixed(2)}`
    default:
      if (score === undefined || score === null) return '—'
      return String(score)
  }
}

// Get status badge styling
function getStatusBadge(status: ItemStatus | undefined): { label: string; className: string } {
  switch (status) {
    case 'in_progress':
      return { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200' }
    case 'done':
      return { label: 'Done', className: 'bg-green-50 text-green-700 border-green-200' }
    case 'todo':
    default:
      return { label: 'To Do', className: 'bg-gray-50 text-gray-600 border-gray-200' }
  }
}

// Get formatted date range for an item
function getItemDateRange(item: ItemWithScore): string | null {
  if (!item.start_date || !item.end_date) return null
  const fmtDate = (d: string) => {
    const date = new Date(d + 'T00:00:00')
    const day = date.getDate()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${day} ${months[date.getMonth()]}`
  }
  return `${fmtDate(item.start_date)} – ${fmtDate(item.end_date)}`
}

// Status sort order
const STATUS_ORDER: Record<ItemStatus, number> = {
  'in_progress': 0,
  'todo': 1,
  'done': 2,
}

// Get next status in cycle
function getNextStatus(current: ItemStatus | undefined): ItemStatus {
  switch (current) {
    case 'todo':
      return 'in_progress'
    case 'in_progress':
      return 'done'
    case 'done':
      return 'todo'
    default:
      return 'in_progress'
  }
}

// Level badge colours
const LEVEL_BADGE_STYLES: Record<number, string> = {
  0: 'bg-pink-50 text-pink-700 border-pink-200',
  1: 'bg-blue-50 text-blue-700 border-blue-200',
  2: 'bg-purple-50 text-purple-700 border-purple-200',
  3: 'bg-amber-50 text-amber-700 border-amber-200',
  4: 'bg-slate-50 text-slate-600 border-slate-200',
}

// Left border accent colours per level
const LEVEL_BORDER_COLORS: Record<number, string> = {
  0: 'border-l-pink-400',
  1: 'border-l-blue-400',
  2: 'border-l-purple-400',
  3: 'border-l-amber-400',
  4: 'border-l-slate-400',
}

// Sortable item component
interface SortableItemProps {
  item: ItemWithScore
  index: number
  framework: Framework
  periodName: string | null
  showScoreColumn: boolean
  showEstimateColumn: boolean
  showPeriodColumn: boolean
  isSelected: boolean
  onSelect: (itemId: string, shiftKey: boolean) => void
  onEdit: (item: ItemWithScore) => void
  onDelete: (itemId: string) => void
  onStatusChange?: (itemId: string, status: ItemStatus) => void
  // Hierarchy props
  hasChildren: boolean
  isExpanded: boolean
  onToggleExpand: (itemId: string) => void
  childCount: number
  statusRollup?: { todo: number; in_progress: number; done: number; total: number }
  allItems: ItemWithScore[]
  canAddChild: boolean
  onStartAddChild: (parentId: string) => void
}

function SortableItem({
  item,
  index,
  framework,
  periodName,
  showScoreColumn,
  showEstimateColumn,
  showPeriodColumn,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onStatusChange,
  hasChildren,
  isExpanded,
  onToggleExpand,
  childCount,
  statusRollup,
  allItems,
  canAddChild,
  onStartAddChild,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const statusBadge = getStatusBadge(item.status)
  const itemLevel = item.item_level ?? 0
  const levelLabel = ITEM_LEVEL_LABELS[itemLevel as ItemLevel] ?? 'Item'
  const levelBadgeStyle = LEVEL_BADGE_STYLES[itemLevel] ?? LEVEL_BADGE_STYLES[0]
  const levelBorderColor = LEVEL_BORDER_COLORS[itemLevel] ?? LEVEL_BORDER_COLORS[0]
  const isHierarchyItem = true // All items show their level badge

  // Rolled-up estimate for parent items
  const rolledUpEstimate = hasChildren ? getRolledUpEstimate(item.id, allItems) : null

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(item.id, e.shiftKey)
  }

  const handleRowClick = (e: React.MouseEvent) => {
    // If clicking on a button or interactive element, don't open edit
    if ((e.target as HTMLElement).closest('button, input, select')) {
      return
    }
    // Clicking row opens edit drawer
    onEdit(item)
  }

  // Status rollup progress bar for parent items
  const renderStatusRollup = () => {
    if (!statusRollup || statusRollup.total === 0) return null
    const donePercent = (statusRollup.done / statusRollup.total) * 100
    const inProgressPercent = (statusRollup.in_progress / statusRollup.total) * 100
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
          <div className="bg-green-500 h-full" style={{ width: `${donePercent}%` }} />
          <div className="bg-amber-400 h-full" style={{ width: `${inProgressPercent}%` }} />
        </div>
        <span className="text-xs text-gray-500">{statusRollup.done}/{statusRollup.total}</span>
      </div>
    )
  }

  // Mobile uses clamped indent, desktop keeps full indent
  const mobileIndent = itemLevel > 0 ? getMobileIndent(itemLevel) : 0
  const desktopIndent = itemLevel > 0 ? itemLevel * 1.5 : 0

  return (
    <article
      ref={setNodeRef}
      style={style}
      onClick={handleRowClick}
      data-testid="backlog-item-row"
      className={`bg-white border rounded-lg transition-shadow cursor-pointer ${
        isHierarchyItem ? `border-l-[3px] ${levelBorderColor}` : ''
      } ${
        isDragging
          ? 'border-indigo-300 shadow-lg ring-2 ring-indigo-200 z-10'
          : isSelected
          ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
          : 'border-gray-200 hover:shadow-sm hover:border-gray-300'
      }`}
    >
      {/* ===== MOBILE LAYOUT (below sm) ===== */}
      <div
        className="flex items-start gap-1.5 px-3 py-2 sm:hidden"
        style={{ marginLeft: mobileIndent > 0 ? `${mobileIndent}rem` : undefined }}
      >
        {/* Left controls: drag handle + chevron + checkbox */}
        <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
          <button
            {...attributes}
            {...listeners}
            className="w-4 h-4 flex items-center justify-center text-gray-300 cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to reorder"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
            </svg>
          </button>
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand(item.id)
              }}
              className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
              aria-label={isExpanded ? 'Collapse children' : 'Expand children'}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-4" />
          )}
          <button
            onClick={handleCheckboxClick}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'border-gray-300 hover:border-indigo-400'
            }`}
            aria-label={isSelected ? 'Deselect item' : 'Select item'}
            aria-pressed={isSelected}
          >
            {isSelected && (
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Level badge + child count row */}
          {isHierarchyItem && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`px-1 py-0.5 rounded text-[9px] font-semibold border flex-shrink-0 ${levelBadgeStyle}`}>
                {levelLabel}
              </span>
              {hasChildren && !isExpanded && (
                <span className="px-1 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[9px] font-medium">
                  {childCount}
                </span>
              )}
            </div>
          )}
          {/* Title — wraps up to 2 lines */}
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
            {item.title}
          </h3>
          {/* Author */}
          {item.created_by && (
            <span className="text-[10px] text-gray-400">by {item.created_by}</span>
          )}
          {/* Status rollup for parent items */}
          {hasChildren && statusRollup && statusRollup.total > 0 && (
            <div className="mt-0.5">{renderStatusRollup()}</div>
          )}
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {!hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusChange?.(item.id, getNextStatus(item.status))
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors hover:opacity-80 ${statusBadge.className}`}
                title="Click to change status"
              >
                {statusBadge.label}
              </button>
            ) : (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            )}
            {showScoreColumn && (
              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-medium">
                {formatScore(item, framework, allItems)}
              </span>
            )}
            {showEstimateColumn && item.story_points !== null && item.story_points !== undefined && (
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium">
                {item.story_points} SP
              </span>
            )}
            {rolledUpEstimate !== null && (
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium">
                {rolledUpEstimate}d est.
              </span>
            )}
            {showPeriodColumn && periodName && (
              <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-medium">
                {periodName}
              </span>
            )}
          </div>
        </div>

        {/* Mobile actions — compact */}
        <div className="flex items-center flex-shrink-0 -mr-1">
          {canAddChild && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStartAddChild(item.id)
              }}
              className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
              aria-label={`Add ${ITEM_LEVEL_CHILD_LABELS[itemLevel as ItemLevel]}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
            aria-label="Delete item"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ===== DESKTOP LAYOUT (sm and above) ===== */}
      <div
        className="hidden sm:flex items-center gap-3 px-3 py-2"
        style={{ marginLeft: desktopIndent > 0 ? `${desktopIndent}rem` : undefined }}
      >
        {/* Expand/collapse chevron */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(item.id)
            }}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-transform"
            aria-label={isExpanded ? 'Collapse children' : 'Expand children'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="flex-shrink-0 w-5" />
        )}

        {/* Checkbox */}
        <button
          onClick={handleCheckboxClick}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'border-gray-300 hover:border-indigo-400'
          }`}
          aria-label={isSelected ? 'Deselect item' : 'Select item'}
          aria-pressed={isSelected}
        >
          {isSelected && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </button>

        {/* Rank number - only for top-level items */}
        {itemLevel === 0 ? (
          <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs font-semibold text-gray-500">
            {index + 1}
          </div>
        ) : (
          <div className="flex-shrink-0 w-6" />
        )}

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isHierarchyItem && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0 ${levelBadgeStyle}`}>
                {levelLabel}
              </span>
            )}
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {item.title}
            </h3>
            {hasChildren && !isExpanded && (
              <span className="flex-shrink-0 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-medium">
                {childCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {item.created_by && (
              <span className="text-xs text-gray-400 flex-shrink-0">
                by {item.created_by}
              </span>
            )}
            {item.description && (
              <p className="text-sm text-gray-500 truncate">
                {item.description}
              </p>
            )}
          </div>
          {hasChildren && statusRollup && statusRollup.total > 0 && (
            <div className="mt-0.5">{renderStatusRollup()}</div>
          )}
        </div>

        {/* Status column */}
        <div className="flex-shrink-0 w-24 flex justify-center">
          {!hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStatusChange?.(item.id, getNextStatus(item.status))
              }}
              className={`px-2 py-0.5 rounded-md text-xs font-medium border transition-colors hover:opacity-80 ${statusBadge.className}`}
              title="Click to change status"
            >
              {statusBadge.label}
            </button>
          ) : (
            <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          )}
        </div>

        {/* Score column */}
        {showScoreColumn && (
          <div className="flex-shrink-0 w-20 flex justify-center">
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium">
              {formatScore(item, framework, allItems)}
            </span>
          </div>
        )}

        {/* Estimate column */}
        {showEstimateColumn && (
          <div className="flex-shrink-0 w-16 flex justify-center">
            {rolledUpEstimate !== null ? (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium" title="Rolled-up estimate from children">
                {rolledUpEstimate}d
              </span>
            ) : item.story_points !== null && item.story_points !== undefined ? (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium">
                {item.story_points} SP
              </span>
            ) : (
              <span className="text-gray-300">—</span>
            )}
          </div>
        )}

        {/* Period column */}
        {showPeriodColumn && (
          <div className="flex-shrink-0 w-20 flex justify-center">
            {periodName ? (
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-medium truncate">
                {periodName}
              </span>
            ) : (
              <span className="text-gray-300">—</span>
            )}
          </div>
        )}

        {/* Actions column */}
        <div className="flex-shrink-0 w-28 flex justify-end items-center gap-1">
          {canAddChild && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStartAddChild(item.id)
              }}
              className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
              aria-label={`Add ${ITEM_LEVEL_CHILD_LABELS[itemLevel as ItemLevel]}`}
              title={`Add ${ITEM_LEVEL_CHILD_LABELS[itemLevel as ItemLevel]}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onEdit(item)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium py-1 px-2"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="text-sm text-red-600 hover:text-red-800 font-medium py-1 px-2"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}

// Color styles for cutoffs
const CUTOFF_COLORS: Record<CutoffColor, { border: string; bg: string; text: string; hoverBg: string; inputBorder: string }> = {
  red: { border: 'border-red-400', bg: 'bg-red-50', text: 'text-red-700', hoverBg: 'hover:bg-red-200', inputBorder: 'border-red-300 focus:ring-red-400' },
  amber: { border: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', hoverBg: 'hover:bg-amber-200', inputBorder: 'border-amber-300 focus:ring-amber-400' },
  blue: { border: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-700', hoverBg: 'hover:bg-blue-200', inputBorder: 'border-blue-300 focus:ring-blue-400' },
  green: { border: 'border-green-400', bg: 'bg-green-50', text: 'text-green-700', hoverBg: 'hover:bg-green-200', inputBorder: 'border-green-300 focus:ring-green-400' },
}

const COLOR_OPTIONS: CutoffColor[] = ['red', 'amber', 'blue', 'green']

// Cutoff line component
interface CutoffLineProps {
  cutoff: Cutoff
  maxPosition: number
  onUpdate: (updates: Partial<Pick<Cutoff, 'position' | 'label' | 'color'>>) => void
  onRemove: () => void
}

function CutoffLine({ cutoff, maxPosition, onUpdate, onRemove }: CutoffLineProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(cutoff.label)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)

  const colors = CUTOFF_COLORS[cutoff.color] || CUTOFF_COLORS.red

  const handleStartEdit = () => {
    setEditValue(cutoff.label)
    setIsEditing(true)
  }

  const handleSave = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== cutoff.label) {
      onUpdate({ label: trimmed })
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  const handleColorChange = (color: CutoffColor) => {
    onUpdate({ color })
    setShowColorPicker(false)
  }

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }
    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColorPicker])

  return (
    <div className="relative flex items-center py-2 group">
      <div className={`flex-1 border-t-2 border-dashed ${colors.border}`} />
      <div className={`flex items-center gap-1 mx-3 px-2 py-1 ${colors.bg} border ${colors.border.replace('border-', 'border-').replace('-400', '-200')} rounded-full text-sm font-medium ${colors.text}`}>
        {/* Color picker button */}
        <div className="relative" ref={colorPickerRef}>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`p-1 ${colors.hoverBg} rounded transition-colors`}
            aria-label="Change cutoff color"
            title="Change color"
          >
            <div className={`w-3 h-3 rounded-full ${colors.border.replace('border-', 'bg-').replace('-400', '-500')}`} />
          </button>
          {showColorPicker && (
            <div className="absolute left-0 top-full mt-1 p-1.5 bg-white rounded-lg shadow-lg border border-gray-200 z-10 flex gap-1">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`w-5 h-5 rounded-full ${CUTOFF_COLORS[color].border.replace('border-', 'bg-').replace('-400', '-500')} ${
                    color === cutoff.color ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                  } hover:scale-110 transition-transform`}
                  aria-label={`Set color to ${color}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Move up button */}
        <button
          onClick={() => onUpdate({ position: cutoff.position - 1 })}
          disabled={cutoff.position <= 1}
          className={`p-1 ${colors.hoverBg} rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
          aria-label="Move cutoff up"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Label (editable) */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={`w-24 px-1 py-0.5 text-sm bg-white border ${colors.inputBorder} rounded focus:outline-none focus:ring-1`}
            aria-label="Cutoff label"
          />
        ) : (
          <button
            onClick={handleStartEdit}
            className={`px-2 ${colors.hoverBg} rounded transition-colors`}
            title="Click to edit label"
            aria-label="Edit cutoff label"
          >
            {cutoff.label}
          </button>
        )}

        {/* Move down button */}
        <button
          onClick={() => onUpdate({ position: cutoff.position + 1 })}
          disabled={cutoff.position >= maxPosition}
          className={`p-1 ${colors.hoverBg} rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
          aria-label="Move cutoff down"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Remove button - always visible on mobile, hover on desktop */}
        <button
          onClick={onRemove}
          className={`p-1 ${colors.hoverBg} rounded transition-colors sm:opacity-0 sm:group-hover:opacity-100`}
          aria-label="Remove cutoff line"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className={`flex-1 border-t-2 border-dashed ${colors.border}`} />
    </div>
  )
}

// Add cutoff button between items
interface AddCutoffButtonProps {
  onClick: () => void
}

function AddCutoffButton({ onClick }: AddCutoffButtonProps) {
  return (
    <div className="relative h-0 flex items-center justify-center z-20">
      {/* Centered + button (same on mobile and desktop) */}
      <button
        onClick={onClick}
        className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center z-20"
        aria-label="Add cutoff line here"
      >
        <div className="flex items-center justify-center w-6 h-6 bg-amber-50 border border-amber-200 rounded-full text-amber-600 hover:bg-amber-100 transition-colors shadow-sm">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </button>
    </div>
  )
}

export default function BacklogList({
  items,
  framework,
  isManualOrder,
  cutoffs = [],
  onEdit,
  onDelete,
  onDeleteMultiple,
  onReorder,
  onAddCutoff,
  onUpdateCutoff,
  onDeleteCutoff,
  onStatusChange,
  onStatusChangeMultiple,
  onAddChild,
}: BacklogListProps) {
  const [sortOption, setSortOption] = useState<SortOption>(isManualOrder ? 'manual' : 'score')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [addingChildToId, setAddingChildToId] = useState<string | null>(null)
  const [childTitle, setChildTitle] = useState('')
  const addChildInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Progressive disclosure: determine which columns to show
  const hasAnyScores = items.some(item => item.score?.calculated_score !== undefined && item.score?.calculated_score !== null)
  const hasAnyEstimates = items.some(item => item.story_points !== null && item.story_points !== undefined)
  const hasAnyPeriods = items.some(item => item.start_date !== null)

  // Clear selection when items change (e.g., items deleted)
  useEffect(() => {
    setSelectedIds((prev) => {
      const itemIds = new Set(items.map((item) => item.id))
      const filtered = new Set([...prev].filter((id) => itemIds.has(id)))
      if (filtered.size !== prev.size) {
        return filtered
      }
      return prev
    })
  }, [items])

  // Escape key clears selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set())
        setLastSelectedId(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds.size])

  // Initialize sort option based on isManualOrder (only on mount or when isManualOrder changes from false to true)
  const prevIsManualOrder = useRef(isManualOrder)
  useEffect(() => {
    // Only auto-switch to manual if isManualOrder just became true (external reorder happened)
    if (isManualOrder && !prevIsManualOrder.current) {
      setSortOption('manual')
    }
    prevIsManualOrder.current = isManualOrder
  }, [isManualOrder])

  // Toggle expand/collapse for a parent item
  const handleToggleExpand = useCallback((itemId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  // Start adding a child item
  const handleStartAddChild = useCallback((parentId: string) => {
    setAddingChildToId(parentId)
    setChildTitle('')
    // Ensure parent is expanded so the inline input is visible
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.add(parentId)
      return next
    })
  }, [])

  // Submit new child item
  const handleSubmitChild = useCallback(() => {
    if (!addingChildToId || !childTitle.trim() || !onAddChild) return
    const parent = items.find(i => i.id === addingChildToId)
    if (!parent) return
    const parentLevel = parent.item_level ?? 0
    onAddChild(addingChildToId, parentLevel, childTitle.trim())
    setAddingChildToId(null)
    setChildTitle('')
  }, [addingChildToId, childTitle, onAddChild, items])

  // Cancel adding child
  const handleCancelAddChild = useCallback(() => {
    setAddingChildToId(null)
    setChildTitle('')
  }, [])

  // Focus input when adding child
  useEffect(() => {
    if (addingChildToId && addChildInputRef.current) {
      addChildInputRef.current.focus()
    }
  }, [addingChildToId])

  // Sort items based on current sort option (needs to be before useCallback hooks)
  const sortedItems = [...items].sort((a, b) => {
    switch (sortOption) {
      case 'manual':
        // Sort by backlog_position (items without position go to end)
        const posA = a.backlog_position ?? Number.MAX_SAFE_INTEGER
        const posB = b.backlog_position ?? Number.MAX_SAFE_INTEGER
        return posA - posB
      case 'score':
        const scoreA = a.score?.calculated_score ?? 0
        const scoreB = b.score?.calculated_score ?? 0
        return scoreB - scoreA // Descending
      case 'story_points':
        const estA = a.story_points ?? Number.MAX_SAFE_INTEGER
        const estB = b.story_points ?? Number.MAX_SAFE_INTEGER
        return estA - estB // Ascending (smaller estimates first)
      case 'status':
        const statusA = STATUS_ORDER[a.status || 'todo']
        const statusB = STATUS_ORDER[b.status || 'todo']
        return statusA - statusB
      case 'period':
        const dateA = a.start_date ?? '\uffff'
        const dateB = b.start_date ?? '\uffff'
        return dateA < dateB ? -1 : dateA > dateB ? 1 : 0
      case 'title':
        return a.title.localeCompare(b.title)
      default:
        return 0
    }
  })

  // Build tree from sorted items and flatten respecting expand state
  // preserveOrder=true since sortedItems is already in display order
  const tree = buildTree(sortedItems, true)
  const displayItems = flattenTree(tree, expandedIds)

  // Pre-compute hierarchy metadata for each item
  const childrenCountMap = new Map<string, number>()
  const hasChildrenSet = new Set<string>()
  for (const item of items) {
    if (item.parent_item_id) {
      hasChildrenSet.add(item.parent_item_id)
      childrenCountMap.set(item.parent_item_id, (childrenCountMap.get(item.parent_item_id) ?? 0) + 1)
    }
  }

  // Track top-level rank numbers separately
  const topLevelCount = items.filter(i => (i.item_level ?? 0) === 0).length
  let topLevelRank = 0

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortedItems.findIndex((item) => item.id === active.id)
      const newIndex = sortedItems.findIndex((item) => item.id === over.id)

      const newItems = arrayMove(sortedItems, oldIndex, newIndex)
      onReorder(newItems)

      // Automatically switch to manual sort when user drags to reorder
      if (sortOption !== 'manual') {
        setSortOption('manual')
      }
    }
  }

  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort)
    // If switching to manual, trigger reorder to set backlog_positions
    if (newSort === 'manual' && !isManualOrder) {
      onReorder(sortedItems)
    }
  }

  // Handle item selection (with shift+click range support)
  const handleSelect = useCallback((itemId: string, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)

      if (shiftKey && lastSelectedId) {
        // Range select: select all items between lastSelectedId and itemId
        const lastIndex = sortedItems.findIndex((item) => item.id === lastSelectedId)
        const currentIndex = sortedItems.findIndex((item) => item.id === itemId)

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex)
          const end = Math.max(lastIndex, currentIndex)

          for (let i = start; i <= end; i++) {
            newSet.add(sortedItems[i].id)
          }
        }
      } else {
        // Toggle single item
        if (newSet.has(itemId)) {
          newSet.delete(itemId)
        } else {
          newSet.add(itemId)
        }
      }

      return newSet
    })
    setLastSelectedId(itemId)
  }, [lastSelectedId, sortedItems])

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === sortedItems.length) {
      // All selected, deselect all
      setSelectedIds(new Set())
    } else {
      // Select all
      setSelectedIds(new Set(sortedItems.map((item) => item.id)))
    }
  }, [selectedIds.size, sortedItems])

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [])

  // Handle bulk status change
  const handleBulkStatusChange = useCallback((status: ItemStatus) => {
    const ids = Array.from(selectedIds)
    if (onStatusChangeMultiple) {
      onStatusChangeMultiple(ids, status)
    }
    handleClearSelection()
  }, [selectedIds, onStatusChangeMultiple, handleClearSelection])

  // Handle bulk delete
  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds)
    if (onDeleteMultiple) {
      onDeleteMultiple(ids)
    }
    handleClearSelection()
  }, [selectedIds, onDeleteMultiple, handleClearSelection])

  // Early return for empty items list (AFTER all hooks are defined)
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          No items yet. Add your first item to get started!
        </p>
      </div>
    )
  }

  const isAllSelected = selectedIds.size === sortedItems.length && sortedItems.length > 0

  // Build sort options based on available data
  const sortOptions: { value: SortOption; label: string; available: boolean }[] = [
    { value: 'manual', label: 'Manual', available: true },
    { value: 'score', label: 'Priority Score', available: hasAnyScores },
    { value: 'story_points', label: 'Story Points', available: hasAnyEstimates },
    { value: 'status', label: 'Status', available: true },
    { value: 'period', label: 'Period', available: hasAnyPeriods },
    { value: 'title', label: 'Title (A-Z)', available: true },
  ]

  const hasSelection = selectedIds.size > 0

  return (
    <div>
      {/* Action bar - on mobile, only show when items are selected; on desktop, always show */}
      <div className={`${hasSelection ? 'block' : 'hidden sm:block'}`}>
        <ActionBar
          selectedCount={selectedIds.size}
          onClearSelection={handleClearSelection}
          onSetStatus={handleBulkStatusChange}
          onDelete={handleBulkDelete}
          hasDeleteHandler={!!onDeleteMultiple}
          hasStatusHandler={!!onStatusChangeMultiple}
        />
      </div>

      {/* Sort controls - aligned with item rows */}
      <div className="flex items-center justify-between mb-4 px-3 sm:px-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Select all checkbox - positioned to align with item checkboxes */}
          <button
            onClick={handleSelectAll}
            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isAllSelected
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : selectedIds.size > 0
                ? 'bg-indigo-200 border-indigo-400'
                : 'border-gray-300 hover:border-indigo-400'
            }`}
            aria-label={isAllSelected ? 'Deselect all' : 'Select all'}
            title={isAllSelected ? 'Deselect all' : 'Select all'}
          >
            {isAllSelected && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {selectedIds.size > 0 && !isAllSelected && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" />
              </svg>
            )}
          </button>

          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-sm text-gray-600">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortOption}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="text-sm border border-gray-300 rounded-md py-1.5 px-3 bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {sortOptions.filter(opt => opt.available).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        autoScroll={false}
      >
        <SortableContext
          items={displayItems.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {/* touch-pan-y ensures vertical scrolling works even within DndContext */}
          <div className="space-y-2 touch-pan-y">
            {displayItems.map((item, index) => {
              const itemLevel = item.item_level ?? 0
              const isTopLevel = itemLevel === 0
              const itemHasChildren = hasChildrenSet.has(item.id)

              // Only count top-level items for rank numbering
              if (isTopLevel) {
                topLevelRank++
              }
              // Capture current rank value for closures
              const currentRank = topLevelRank

              // Cutoff lines only apply between top-level items
              const cutoffsAtPosition = isTopLevel
                ? cutoffs.filter((c) => c.position === currentRank - 1)
                : []
              const hasCutoffAtPosition = cutoffsAtPosition.length > 0

              // Status rollup for parent items
              const rollup = itemHasChildren ? getStatusRollup(item.id, items) : undefined

              return (
                <div key={item.id}>
                  {/* Show cutoff lines before this item if position matches */}
                  {cutoffsAtPosition.map((cutoff) => (
                    <CutoffLine
                      key={cutoff.id}
                      cutoff={cutoff}
                      maxPosition={topLevelCount}
                      onUpdate={(updates) => onUpdateCutoff?.(cutoff.id, updates)}
                      onRemove={() => onDeleteCutoff?.(cutoff.id)}
                    />
                  ))}

                  {/* Show add cutoff button between top-level items (only if no cutoff at this exact position) */}
                  {onAddCutoff && isTopLevel && currentRank > 1 && !hasCutoffAtPosition && (
                    <AddCutoffButton onClick={() => onAddCutoff(currentRank - 1)} />
                  )}

                  <SortableItem
                    item={item}
                    index={isTopLevel ? currentRank - 1 : index}
                    framework={framework}
                    periodName={getItemDateRange(item)}
                    showScoreColumn={hasAnyScores}
                    showEstimateColumn={hasAnyEstimates}
                    showPeriodColumn={hasAnyPeriods}
                    isSelected={selectedIds.has(item.id)}
                    onSelect={handleSelect}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                    hasChildren={itemHasChildren}
                    isExpanded={expandedIds.has(item.id)}
                    onToggleExpand={handleToggleExpand}
                    childCount={childrenCountMap.get(item.id) ?? 0}
                    statusRollup={rollup}
                    allItems={items}
                    canAddChild={!!onAddChild && itemLevel < MAX_ITEM_LEVEL}
                    onStartAddChild={handleStartAddChild}
                  />

                  {/* Inline add child input */}
                  {addingChildToId === item.id && (
                    <div
                      className="flex items-center gap-2 p-2 bg-gray-50 border border-dashed border-gray-300 rounded-lg"
                      style={{ marginLeft: `${(itemLevel + 1) * 1.5}rem` }}
                    >
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0 ${LEVEL_BADGE_STYLES[(itemLevel + 1)] ?? LEVEL_BADGE_STYLES[4]}`}>
                        {ITEM_LEVEL_LABELS[((itemLevel + 1) as ItemLevel)] ?? 'Subtask'}
                      </span>
                      <input
                        ref={addChildInputRef}
                        type="text"
                        value={childTitle}
                        onChange={(e) => setChildTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSubmitChild()
                          if (e.key === 'Escape') handleCancelAddChild()
                        }}
                        placeholder={`New ${ITEM_LEVEL_CHILD_LABELS[itemLevel as ItemLevel]}...`}
                        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSubmitChild}
                        disabled={!childTitle.trim()}
                        className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                      <button
                        onClick={handleCancelAddChild}
                        className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Show cutoff lines after all items if position equals top-level count */}
            {cutoffs
              .filter((c) => c.position === topLevelCount)
              .map((cutoff) => (
                <CutoffLine
                  key={cutoff.id}
                  cutoff={cutoff}
                  maxPosition={topLevelCount}
                  onUpdate={(updates) => onUpdateCutoff?.(cutoff.id, updates)}
                  onRemove={() => onDeleteCutoff?.(cutoff.id)}
                />
              ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
