import { useState, useRef, useEffect } from 'react'
import type { RoadmapPeriod, ItemStatus } from '../types/database'

interface ActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onSetStatus: (status: ItemStatus) => void
  onAssignPeriod: (periodPosition: number) => void
  onDelete: () => void
  periods: RoadmapPeriod[]
  hasDeleteHandler: boolean
  hasStatusHandler: boolean
  hasPeriodHandler: boolean
}

export default function ActionBar({
  selectedCount,
  onClearSelection,
  onSetStatus,
  onAssignPeriod,
  onDelete,
  periods,
  hasDeleteHandler,
  hasStatusHandler,
  hasPeriodHandler,
}: ActionBarProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isPeriodOpen, setIsPeriodOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const periodRef = useRef<HTMLDivElement>(null)

  const hasSelection = selectedCount > 0

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false)
      }
      if (periodRef.current && !periodRef.current.contains(event.target as Node)) {
        setIsPeriodOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdowns on escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsStatusOpen(false)
        setIsPeriodOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const statusOptions: { value: ItemStatus; label: string; className: string }[] = [
    { value: 'todo', label: 'To Do', className: 'text-gray-700' },
    { value: 'in_progress', label: 'In Progress', className: 'text-amber-700' },
    { value: 'done', label: 'Done', className: 'text-green-700' },
  ]

  return (
    <div
      className="mb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-gray-100 border border-gray-200 flex flex-wrap items-center justify-between gap-3 rounded-lg"
      role="toolbar"
      aria-label="Bulk actions"
    >
      {/* Left side: Selection count and clear */}
      <div className="flex items-center gap-3">
        {hasSelection ? (
          <>
            <span className="text-sm font-medium text-gray-900">
              {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear
            </button>
          </>
        ) : (
          <span className="text-sm text-gray-500">
            Select items to perform actions
          </span>
        )}
      </div>

      {/* Right side: Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Set Status dropdown */}
        {hasStatusHandler && (
          <div className="relative" ref={statusRef}>
            <button
              onClick={() => {
                if (hasSelection) {
                  setIsStatusOpen(!isStatusOpen)
                  setIsPeriodOpen(false)
                }
              }}
              disabled={!hasSelection}
              title={!hasSelection ? 'Select items to change status' : 'Set status for selected items'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                hasSelection
                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              aria-expanded={isStatusOpen}
              aria-haspopup="listbox"
            >
              Set Status
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isStatusOpen && hasSelection && (
              <div
                className="absolute left-0 sm:left-auto sm:right-0 mt-1 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
                role="listbox"
              >
                <div className="py-1">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onSetStatus(option.value)
                        setIsStatusOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${option.className}`}
                      role="option"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assign Period dropdown */}
        {hasPeriodHandler && periods.length > 0 && (
          <div className="relative" ref={periodRef}>
            <button
              onClick={() => {
                if (hasSelection) {
                  setIsPeriodOpen(!isPeriodOpen)
                  setIsStatusOpen(false)
                }
              }}
              disabled={!hasSelection}
              title={!hasSelection ? 'Select items to assign period' : 'Assign period to selected items'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                hasSelection
                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              aria-expanded={isPeriodOpen}
              aria-haspopup="listbox"
            >
              Assign Period
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isPeriodOpen && hasSelection && (
              <div
                className="absolute left-0 sm:left-auto sm:right-0 mt-1 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
                role="listbox"
              >
                <div className="py-1">
                  {[...periods]
                    .sort((a, b) => a.position - b.position)
                    .map((period) => (
                      <button
                        key={period.id}
                        onClick={() => {
                          onAssignPeriod(period.position)
                          setIsPeriodOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="option"
                      >
                        {period.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete button */}
        {hasDeleteHandler && (
          <button
            onClick={onDelete}
            disabled={!hasSelection}
            title={!hasSelection ? 'Select items to delete' : `Delete ${selectedCount} item${selectedCount === 1 ? '' : 's'}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              hasSelection
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
