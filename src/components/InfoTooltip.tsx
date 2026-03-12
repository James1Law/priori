import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface InfoTooltipProps {
  text: string
  className?: string
}

export default function InfoTooltip({ text, className = '' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; above: boolean } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const above = rect.top > 120
    setCoords({
      top: above ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
      above,
    })
  }, [])

  useEffect(() => {
    if (open) {
      updateCoords()
    }
  }, [open, updateCoords])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Clamp tooltip horizontally so it doesn't overflow the viewport
  const getStyle = (): React.CSSProperties => {
    if (!coords) return {}
    const tooltipWidth = 208 // w-52 = 13rem = 208px
    const margin = 8
    // Default: centre on the trigger
    let left = coords.left - tooltipWidth / 2
    // Clamp to viewport edges
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin))
    return {
      position: 'fixed',
      top: coords.above ? undefined : coords.top,
      bottom: coords.above ? window.innerHeight - coords.top : undefined,
      left,
      width: tooltipWidth,
    }
  }

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-3.5 h-3.5 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700 inline-flex items-center justify-center text-[9px] font-bold leading-none transition-colors flex-shrink-0"
        aria-label="More info"
      >
        i
      </button>
      {open &&
        coords &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={getStyle()}
            className="z-50 px-3 py-2 text-xs leading-relaxed text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg"
          >
            {text}
          </div>,
          document.body
        )}
    </span>
  )
}
