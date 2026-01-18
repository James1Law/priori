interface FABProps {
  onClick: () => void
  ariaLabel?: string
}

export default function FAB({ onClick, ariaLabel = 'Add item' }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden fixed bottom-20 right-4 z-30 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
      aria-label={ariaLabel}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </button>
  )
}
