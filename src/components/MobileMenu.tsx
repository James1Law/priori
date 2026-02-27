import { useEffect, useRef } from 'react'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  onCopyUrl: () => void
  onExportCsv: () => void
  onClearItems: () => void
  onNewSession: () => void
  itemCount: number
}

export default function MobileMenu({
  isOpen,
  onClose,
  onCopyUrl,
  onExportCsv,
  onClearItems,
  onNewSession,
  itemCount,
}: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      // Small delay to prevent immediate close from the button click
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside)
      }, 0)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const canExport = itemCount > 0

  return (
    <div
      ref={menuRef}
      className="absolute right-4 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
      role="menu"
    >
      {/* Session actions */}
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Session
      </div>
      <button
        onClick={() => {
          onCopyUrl()
          onClose()
        }}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
        role="menuitem"
      >
        Copy URL
      </button>
      <button
        onClick={() => {
          onExportCsv()
          onClose()
        }}
        disabled={!canExport}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        role="menuitem"
      >
        Export CSV
      </button>
      <button
        onClick={() => {
          onClearItems()
          onClose()
        }}
        disabled={itemCount === 0}
        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
        role="menuitem"
      >
        Clear Items
      </button>
      <div className="border-t border-gray-200 my-1" />
      <button
        onClick={() => {
          onNewSession()
          onClose()
        }}
        className="w-full px-3 py-2 text-left text-sm text-indigo-600 hover:bg-indigo-50 font-medium"
        role="menuitem"
      >
        New Session
      </button>
    </div>
  )
}
