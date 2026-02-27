import { useState, useRef, useEffect } from 'react'
import type { ViewMode, ItemStatus, RoadmapPeriod } from '../types/database'

export interface FilterState {
  search: string
  status: ItemStatus | 'all'
  hasEstimate: boolean | null
  onRoadmap: boolean | null
  period: string | null // period id or null for "all"
}

interface BacklogToolbarProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  view: ViewMode
  onAddCutoff?: () => void
  periods: RoadmapPeriod[]
  itemCount: number
  filteredCount: number
}

export default function BacklogToolbar({
  filters,
  onFiltersChange,
  view,
  onAddCutoff,
  periods,
  itemCount,
  filteredCount,
}: BacklogToolbarProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isPeriodOpen, setIsPeriodOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const periodRef = useRef<HTMLDivElement>(null)

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

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const statusOptions: { value: ItemStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
  ]

  const hasActiveFilters =
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.hasEstimate !== null ||
    filters.onRoadmap !== null ||
    filters.period !== null

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      hasEstimate: null,
      onRoadmap: null,
      period: null,
    })
  }

  return (
    <div className="space-y-3">
      {/* Main toolbar row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <input
            type="text"
            placeholder="Search items..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status filter dropdown */}
        <div className="relative" ref={statusRef}>
          <button
            onClick={() => {
              setIsStatusOpen(!isStatusOpen)
              setIsPeriodOpen(false)
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              filters.status !== 'all'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            aria-expanded={isStatusOpen}
          >
            {filters.status === 'all' ? 'Status' : statusOptions.find(o => o.value === filters.status)?.label}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isStatusOpen && (
            <div className="absolute left-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="py-1">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      updateFilter('status', option.value)
                      setIsStatusOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      filters.status === option.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Has Estimate toggle chip */}
        <button
          onClick={() => updateFilter('hasEstimate', filters.hasEstimate === true ? null : true)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
            filters.hasEstimate === true
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Estimated
        </button>

        {/* On Roadmap toggle chip */}
        <button
          onClick={() => updateFilter('onRoadmap', filters.onRoadmap === true ? null : true)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
            filters.onRoadmap === true
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          On Roadmap
        </button>

        {/* Period filter dropdown */}
        {periods.length > 0 && (
          <div className="relative" ref={periodRef}>
            <button
              onClick={() => {
                setIsPeriodOpen(!isPeriodOpen)
                setIsStatusOpen(false)
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                filters.period !== null
                  ? 'bg-purple-50 border-purple-200 text-purple-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              aria-expanded={isPeriodOpen}
            >
              {filters.period !== null
                ? periods.find(p => p.id === filters.period)?.name || 'Period'
                : 'Period'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isPeriodOpen && (
              <div className="absolute left-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      updateFilter('period', null)
                      setIsPeriodOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      filters.period === null ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                    }`}
                  >
                    All Periods
                  </button>
                  {[...periods].sort((a, b) => a.position - b.position).map((period) => (
                    <button
                      key={period.id}
                      onClick={() => {
                        updateFilter('period', period.id)
                        setIsPeriodOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        filters.period === period.id ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                      }`}
                    >
                      {period.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1 hidden sm:block" />

        {/* Add Cutoff button */}
        {onAddCutoff && view === 'list' && (
          <button
            onClick={onAddCutoff}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Cutoff
          </button>
        )}
      </div>

      {/* Active filters row */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">
            Showing {filteredCount} of {itemCount} items
          </span>
          <button
            onClick={clearFilters}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}

// Helper function to apply filters to items
export function applyFilters<T extends {
  title: string
  description: string | null
  status?: string
  story_points?: number | null
  roadmap_start_quadrant?: number | null
}>(
  items: T[],
  filters: FilterState,
  periods: RoadmapPeriod[]
): T[] {
  return items.filter((item) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const titleMatch = item.title.toLowerCase().includes(searchLower)
      const descMatch = item.description?.toLowerCase().includes(searchLower) || false
      if (!titleMatch && !descMatch) return false
    }

    // Status filter
    if (filters.status !== 'all') {
      if ((item.status || 'todo') !== filters.status) return false
    }

    // Has estimate filter
    if (filters.hasEstimate === true) {
      if (item.story_points === null || item.story_points === undefined) return false
    }

    // On roadmap filter
    if (filters.onRoadmap === true) {
      if (item.roadmap_start_quadrant === null || item.roadmap_start_quadrant === undefined) return false
    }

    // Period filter
    if (filters.period !== null) {
      const period = periods.find(p => p.id === filters.period)
      if (!period) return false

      const startQ = item.roadmap_start_quadrant
      if (startQ === null || startQ === undefined) return false

      // Each period has 4 quadrants
      const periodStartQ = period.position * 4
      const periodEndQ = periodStartQ + 3
      if (startQ < periodStartQ || startQ > periodEndQ) return false
    }

    return true
  })
}
