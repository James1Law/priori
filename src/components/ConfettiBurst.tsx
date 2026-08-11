import { useEffect, useState } from 'react'

const COLOURS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4']
const PARTICLE_COUNT = 36

interface Particle {
  left: number
  colour: string
  delay: number
  duration: number
  drift: number
}

// Lightweight dependency-free confetti burst, shown once on mount and
// self-removing after the animation completes. Skipped entirely for
// users who prefer reduced motion.
export default function ConfettiBurst() {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      left: (i / PARTICLE_COUNT) * 100 + (((i * 7919) % 100) / 100 - 0.5) * 6,
      colour: COLOURS[i % COLOURS.length],
      delay: ((i * 104729) % 600) / 1000,
      duration: 1.6 + ((i * 15485863) % 900) / 1000,
      drift: (((i * 32452843) % 100) / 100 - 0.5) * 120,
    }))
  )
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (done || prefersReducedMotion) return null

  return (
    <div
      data-testid="consensus-confetti"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-50"
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute block w-2 h-3 rounded-[1px] animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            top: '-16px',
            backgroundColor: p.colour,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--confetti-drift' as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  )
}
