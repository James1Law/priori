import { useEffect, useRef, useState } from 'react'
import { formatCountdown, getRemainingSeconds } from '../lib/estimation'

const TIMER_OPTIONS = [30, 60, 90]

interface VotingTimerProps {
  endsAt: string | null
  isHost: boolean
  revealed: boolean
  onStart: (seconds: number) => void
  onCancel: () => void
  onExpire: () => void
}

// Host-controlled voting countdown. All clients derive the remaining time
// from the shared deadline; onExpire fires once when it hits zero (the
// page decides what expiry means — the host's client reveals).
export default function VotingTimer({
  endsAt,
  isHost,
  revealed,
  onStart,
  onCancel,
  onExpire,
}: VotingTimerProps) {
  const [remaining, setRemaining] = useState<number | null>(() =>
    getRemainingSeconds(endsAt, Date.now())
  )
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    expiredRef.current = false
    setRemaining(getRemainingSeconds(endsAt, Date.now()))
    if (!endsAt) return

    const tick = () => {
      const secondsLeft = getRemainingSeconds(endsAt, Date.now())
      setRemaining(secondsLeft)
      if (secondsLeft === 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpireRef.current()
      }
    }

    const interval = setInterval(tick, 500)
    return () => clearInterval(interval)
  }, [endsAt])

  if (revealed) return null

  const running = endsAt !== null && remaining !== null && remaining > 0

  if (!running) {
    if (!isHost) return null
    return (
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Timer
        </span>
        {TIMER_OPTIONS.map((seconds) => (
          <button
            key={seconds}
            type="button"
            onClick={() => onStart(seconds)}
            className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            {seconds}s
          </button>
        ))}
      </div>
    )
  }

  const urgent = remaining !== null && remaining <= 10

  return (
    <div className="flex items-center justify-center gap-3 mb-3">
      <span
        data-testid="voting-countdown"
        role="timer"
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold tabular-nums ${
          urgent
            ? 'bg-red-100 text-red-700 animate-pulse motion-reduce:animate-none'
            : 'bg-indigo-100 text-indigo-700'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {formatCountdown(remaining ?? 0)}
      </span>
      {isHost && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
        >
          Cancel timer
        </button>
      )}
    </div>
  )
}
