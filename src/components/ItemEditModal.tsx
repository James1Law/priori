import { useState, FormEvent } from 'react'
import type { Item, ItemStatus } from '../types/database'

interface ItemEditModalProps {
  item: Item
  onSave: (item: Item) => void
  onCancel: () => void
}

const STATUS_OPTIONS: { value: ItemStatus; label: string; className: string }[] = [
  { value: 'todo', label: 'To Do', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  { value: 'in_progress', label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'done', label: 'Done', className: 'bg-green-50 text-green-700 border-green-200' },
]

export default function ItemEditModal({
  item,
  onSave,
  onCancel,
}: ItemEditModalProps) {
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description || '')
  const [status, setStatus] = useState<ItemStatus>(item.status || 'todo')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      return
    }

    onSave({
      ...item,
      title: title.trim(),
      description: description.trim() || null,
      status,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 font-body">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
        <h2 className="text-2xl font-display font-semibold text-gray-900 mb-4">
          Edit Item
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    status === opt.value
                      ? `${opt.className} ring-2 ring-offset-1 ring-indigo-500`
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-lg shadow-indigo-600/30"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
