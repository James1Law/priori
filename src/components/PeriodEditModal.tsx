import { useState, useEffect, useRef } from 'react'
import { RoadmapPeriod } from '../types/database'

interface PeriodEditModalProps {
  period: RoadmapPeriod
  itemCount: number
  onSave: (name: string) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}

export default function PeriodEditModal({
  period,
  itemCount,
  onSave,
  onDelete,
  onClose,
}: PeriodEditModalProps) {
  const [name, setName] = useState(period.name)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false)
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, showDeleteConfirm])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) return

    setSaving(true)
    try {
      await onSave(trimmed)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteClick = () => {
    if (itemCount > 0) {
      setShowDeleteConfirm(true)
    } else {
      handleDelete()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-[calc(100%-32px)] max-w-sm mx-4 overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {showDeleteConfirm ? (
          <>
            {/* Delete Confirmation */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Period?</h3>
              <p className="text-sm text-slate-600">
                This will unschedule {itemCount} item{itemCount === 1 ? '' : 's'} from the roadmap.
                They can be re-added later.
              </p>
            </div>
            <div className="flex flex-col gap-2 p-4 pt-0">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Period'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Edit Form */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Edit Period</h3>
              <p className="text-xs text-slate-500 mb-4">Rename or delete this period</p>

              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Period Name
              </label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                }}
                placeholder="Period name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-col gap-2 p-4 pt-0">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={onClose}
                disabled={saving}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            {/* Divider and Delete */}
            <div className="border-t border-slate-200 p-4">
              <p className="text-xs text-slate-500 text-center mb-3">
                {itemCount === 0
                  ? 'No items scheduled in this period'
                  : `${itemCount} item${itemCount === 1 ? '' : 's'} scheduled`}
              </p>
              <button
                onClick={handleDeleteClick}
                disabled={saving}
                className="w-full py-2.5 px-4 border border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Delete Period
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
