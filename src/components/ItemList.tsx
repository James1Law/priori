import type { Item } from '../types/database'

interface ItemListProps {
  items: Item[]
}

export default function ItemList({ items }: ItemListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          No items yet. Add your first item to get started!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900 text-lg mb-1">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-gray-600 text-sm">{item.description}</p>
          )}
        </article>
      ))}
    </div>
  )
}
