import { useEffect, useRef } from 'react'

interface SlideInPanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function SlideInPanel({ isOpen, onClose, title, children }: SlideInPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus trap - focus first focusable element when panel opens
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const focusableElements = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      if (firstElement) {
        firstElement.focus()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40 lg:block hidden transition-opacity duration-200 motion-reduce:transition-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50
          transform transition-transform duration-200 ease-out motion-reduce:transition-none
          lg:block hidden
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 id="panel-title" className="text-lg font-display font-semibold text-gray-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-57px)]">
          {children}
        </div>
      </div>
    </>
  )
}
