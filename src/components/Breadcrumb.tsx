import { Link } from 'react-router-dom'

interface BreadcrumbProps {
  sessionSlug: string
  sessionName?: string | null
  currentPage: string
  itemCount?: number
}

export default function Breadcrumb({
  sessionSlug,
  sessionName,
  currentPage,
  itemCount,
}: BreadcrumbProps) {
  const displayName = sessionName || 'Backlog'

  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
      <Link
        to={`/s/${sessionSlug}`}
        className="text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        {displayName}
      </Link>
      <span className="text-gray-300">/</span>
      <span className="text-gray-900 font-medium">
        {currentPage}
        {itemCount !== undefined && itemCount > 0 && (
          <span className="text-gray-500 font-normal ml-1">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        )}
      </span>
    </nav>
  )
}
