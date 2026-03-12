import { useState, FormEvent } from 'react'
import type { ItemLevel } from '../types/database'
import { ITEM_LEVEL_LABELS } from '../types/database'

interface ItemFormProps {
  onAdd: (item: { title: string; description: string; item_level?: number }) => void
}

const LEVEL_OPTIONS: { value: '' | ItemLevel; label: string }[] = [
  { value: '', label: 'Item (flat)' },
  { value: 0, label: ITEM_LEVEL_LABELS[0] },
  { value: 1, label: ITEM_LEVEL_LABELS[1] },
  { value: 2, label: ITEM_LEVEL_LABELS[2] },
  { value: 3, label: ITEM_LEVEL_LABELS[3] },
]

export default function ItemForm({ onAdd }: ItemFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState<'' | ItemLevel>('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      return
    }

    onAdd({
      title: title.trim(),
      description: description.trim(),
      ...(level !== '' ? { item_level: level } : {}),
    })

    setTitle('')
    setDescription('')
    // Keep level selection for batch-adding items of the same type
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Item title (required)"
          className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base sm:text-sm"
        />
      </div>
      <div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={3}
          className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-base sm:text-sm"
        />
      </div>
      <div>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value === '' ? '' : Number(e.target.value) as ItemLevel)}
          className="w-full px-4 py-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-base sm:text-sm text-gray-700"
          aria-label="Item level"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={!title.trim()}
        data-testid="submit-item-button"
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed text-white font-semibold py-3 sm:py-2 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-600/30"
      >
        Add Item
      </button>
    </form>
  )
}
