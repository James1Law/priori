import { useState, useEffect, useRef } from 'react'
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
import type { Item, ItemWithScore, Framework } from '../types/database'

interface BacklogListProps {
  items: ItemWithScore[]
  framework: Framework
  isManualOrder: boolean
  cutoffPosition: number | null
  cutoffLabel: string | null
  onEdit: (item: Item) => void
  onDelete: (itemId: string) => void
  onReorder: (items: ItemWithScore[]) => void
  onResetOrder: () => void
  onCutoffChange: (position: number | null) => void
  onCutoffLabelChange: (label: string) => void
}

// Format score for display based on framework
function formatScore(item: ItemWithScore, framework: Framework): string {
  const score = item.score?.calculated_score
  if (score === undefined || score === null) return '—'

  switch (framework) {
    case 'rice':
      return `RICE: ${Math.round(score)}`
    case 'ice':
      return `ICE: ${score.toFixed(1)}`
    case 'value_effort':
      return `V/E: ${score.toFixed(1)}`
    case 'moscow':
      // For MoSCoW, show the category instead of a number
      const category = item.score?.criteria?.category as string
      return category || '—'
    case 'weighted':
      return `Score: ${score.toFixed(2)}`
    default:
      return String(score)
  }
}

// Sortable item component
interface SortableItemProps {
  item: ItemWithScore
  index: number
  framework: Framework
  isOutOfScope: boolean
  onEdit: (item: Item) => void
  onDelete: (itemId: string) => void
}

function SortableItem({ item, index, framework, isOutOfScope, onEdit, onDelete }: SortableItemProps) {
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

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border rounded-lg transition-shadow ${
        isDragging
          ? 'border-indigo-300 shadow-lg ring-2 ring-indigo-200 z-10'
          : 'border-gray-200 hover:shadow-sm'
      } ${isOutOfScope ? 'opacity-50' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </button>

      {/* Rank number */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-sm font-semibold text-gray-600">
        {index + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900 truncate">
            {item.title}
          </h3>
          {item.created_by && (
            <span className="hidden sm:inline text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded flex-shrink-0">
              by {item.created_by}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-gray-500 truncate mt-0.5">
            {item.description}
          </p>
        )}
      </div>

      {/* Score badge */}
      <div className="flex-shrink-0 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-sm font-medium">
        {formatScore(item, framework)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(item)}
          className="hidden sm:inline-block text-sm text-indigo-600 hover:text-indigo-800 font-medium py-1 px-2"
        >
          Edit
        </button>
        {/* Mobile delete - icon */}
        <button
          onClick={() => onDelete(item.id)}
          className="sm:hidden p-2 text-gray-400 hover:text-red-600 transition-colors"
          aria-label="Delete item"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        {/* Desktop delete - text */}
        <button
          onClick={() => onDelete(item.id)}
          className="hidden sm:inline-block text-sm text-red-600 hover:text-red-800 font-medium py-1 px-2"
        >
          Delete
        </button>
      </div>
    </article>
  )
}

// Cutoff line component
interface CutoffLineProps {
  label: string
  position: number
  maxPosition: number
  onRemove: () => void
  onMove: (newPosition: number) => void
  onLabelChange: (label: string) => void
}

function CutoffLine({ label, position, maxPosition, onRemove, onMove, onLabelChange }: CutoffLineProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleStartEdit = () => {
    setEditValue(label)
    setIsEditing(true)
  }

  const handleSave = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== label) {
      onLabelChange(trimmed)
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

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  return (
    <div className="relative flex items-center py-2 group">
      <div className="flex-1 border-t-2 border-dashed border-amber-400" />
      <div className="flex items-center gap-1 mx-3 px-2 py-1 bg-amber-50 border border-amber-200 rounded-full text-sm font-medium text-amber-700">
        {/* Move up button */}
        <button
          onClick={() => onMove(position - 1)}
          disabled={position <= 1}
          className="p-1 hover:bg-amber-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
            className="w-24 px-1 py-0.5 text-sm bg-white border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
            aria-label="Cutoff label"
          />
        ) : (
          <button
            onClick={handleStartEdit}
            className="px-2 hover:bg-amber-200 rounded transition-colors"
            title="Click to edit label"
            aria-label="Edit cutoff label"
          >
            {label}
          </button>
        )}

        {/* Move down button */}
        <button
          onClick={() => onMove(position + 1)}
          disabled={position >= maxPosition}
          className="p-1 hover:bg-amber-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Move cutoff down"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Remove button - always visible on mobile, hover on desktop */}
        <button
          onClick={onRemove}
          className="p-1 hover:bg-amber-200 rounded transition-colors sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="Remove cutoff line"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 border-t-2 border-dashed border-amber-400" />
    </div>
  )
}

// Add cutoff button between items
interface AddCutoffButtonProps {
  onClick: () => void
}

function AddCutoffButton({ onClick }: AddCutoffButtonProps) {
  return (
    <div className="relative h-0 flex items-center justify-center">
      {/* Centered + button (same on mobile and desktop) */}
      <button
        onClick={onClick}
        className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center"
        aria-label="Add cutoff line here"
      >
        <div className="flex items-center justify-center w-6 h-6 bg-amber-50 border border-amber-200 rounded-full text-amber-600 hover:bg-amber-100 transition-colors">
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
  cutoffPosition,
  cutoffLabel,
  onEdit,
  onDelete,
  onReorder,
  onResetOrder,
  onCutoffChange,
  onCutoffLabelChange,
}: BacklogListProps) {
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

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          No items yet. Add your first item to get started!
        </p>
      </div>
    )
  }

  // Sort items: manual order if any item has backlog_position, otherwise by score
  const sortedItems = [...items].sort((a, b) => {
    if (isManualOrder) {
      // Sort by backlog_position (items without position go to end)
      const posA = a.backlog_position ?? Number.MAX_SAFE_INTEGER
      const posB = b.backlog_position ?? Number.MAX_SAFE_INTEGER
      return posA - posB
    }
    // Default: sort by score descending
    const scoreA = a.score?.calculated_score ?? 0
    const scoreB = b.score?.calculated_score ?? 0
    return scoreB - scoreA
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortedItems.findIndex((item) => item.id === active.id)
      const newIndex = sortedItems.findIndex((item) => item.id === over.id)

      const newItems = arrayMove(sortedItems, oldIndex, newIndex)
      onReorder(newItems)
    }
  }

  return (
    <div>
      {/* Order controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isManualOrder
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Order: {isManualOrder ? 'Manual' : 'Score'}
          </span>
        </div>
        {isManualOrder && (
          <button
            onClick={onResetOrder}
            className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset to Score
          </button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedItems.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {sortedItems.map((item, index) => {
              const isOutOfScope = cutoffPosition !== null && index >= cutoffPosition
              const showCutoffLine = cutoffPosition !== null && index === cutoffPosition

              return (
                <div key={item.id}>
                  {/* Show cutoff line before this item if position matches */}
                  {showCutoffLine && (
                    <CutoffLine
                      label={cutoffLabel || 'Cutoff'}
                      position={cutoffPosition}
                      maxPosition={sortedItems.length}
                      onRemove={() => onCutoffChange(null)}
                      onMove={onCutoffChange}
                      onLabelChange={onCutoffLabelChange}
                    />
                  )}

                  {/* Show add cutoff button between items (only if no cutoff set) */}
                  {cutoffPosition === null && index > 0 && (
                    <AddCutoffButton onClick={() => onCutoffChange(index)} />
                  )}

                  <SortableItem
                    item={item}
                    index={index}
                    framework={framework}
                    isOutOfScope={isOutOfScope}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </div>
              )
            })}

            {/* Show cutoff line after all items if position equals length (all items out of scope) */}
            {cutoffPosition !== null && cutoffPosition === sortedItems.length && (
              <CutoffLine
                label={cutoffLabel || 'Cutoff'}
                position={cutoffPosition}
                maxPosition={sortedItems.length}
                onRemove={() => onCutoffChange(null)}
                onMove={onCutoffChange}
                onLabelChange={onCutoffLabelChange}
              />
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
