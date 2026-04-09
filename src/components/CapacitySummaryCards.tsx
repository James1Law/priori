type CapacityUnit = 'days' | 'hours'

interface CapacitySummaryCardsProps {
  netCapacity: number
  baseEffort: number
  totalEffort: number
  utilisation: number
  estimatedCount: number
  totalCount: number
  remaining: number
  status: 'healthy' | 'at-risk' | 'over-capacity'
  statusColour: string
  statusLabel: string
  unit: CapacityUnit
  teamSize: number
  workingDays: number
  focusFactor: number
  contingency: number
  hoursPerDay: number
}

export default function CapacitySummaryCards({
  netCapacity,
  baseEffort,
  totalEffort,
  utilisation,
  estimatedCount,
  totalCount,
  remaining,
  statusColour,
  statusLabel,
  unit,
  teamSize,
  workingDays,
  focusFactor,
  contingency,
  hoursPerDay,
}: CapacitySummaryCardsProps) {
  const contingencyAmount = Math.round(totalEffort - baseEffort)
  const contingencyPct = Math.round(contingency * 100)
  const utilisationPct = Math.round(utilisation)
  const coveragePct = totalCount > 0 ? (estimatedCount / totalCount) * 100 : 0

  // Gauge ring calculations
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const gaugeProgress = Math.min(utilisation / 100, 1) // Cap at 100% for visual
  const dashOffset = circumference * (1 - gaugeProgress)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Card 1: Total Effort (accent) */}
      <div className="rounded-xl p-4 sm:px-5 bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-1">
          Total Effort
        </div>
        <div className="font-display text-[22px] sm:text-[28px] font-bold leading-tight">
          {Math.round(totalEffort)} {unit}
        </div>
        <div className="text-xs text-white/70 mt-1">
          {Math.round(baseEffort)} base + {contingencyAmount} contingency ({contingencyPct}%)
        </div>
      </div>

      {/* Card 2: Net Capacity */}
      <div className="rounded-xl p-4 sm:px-5 bg-white border border-gray-200 shadow">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
          Net Capacity
        </div>
        <div className="font-display text-[22px] sm:text-[28px] font-bold leading-tight text-gray-900">
          {Math.round(netCapacity)} {unit}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {teamSize} devs × {workingDays} days × {focusFactor} focus{unit === 'hours' ? ` × ${hoursPerDay}h` : ''}
        </div>
      </div>

      {/* Card 3: Utilisation with gauge */}
      <div className="rounded-xl p-4 sm:px-5 bg-white border border-gray-200 shadow">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
          Utilisation
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative w-[52px] h-[52px] sm:w-16 sm:h-16 flex-shrink-0">
            <svg
              className="w-full h-full"
              viewBox="0 0 64 64"
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="6"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke={statusColour}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-[stroke-dashoffset] duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-display text-[13px] sm:text-base font-bold text-gray-900">
              {utilisationPct}%
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold" style={{ color: statusColour }}>
              {statusLabel}
            </div>
            <div className="text-[11px] text-gray-400">
              {Math.round(Math.abs(remaining))} {unit} {remaining >= 0 ? 'remaining' : 'over'}
            </div>
          </div>
        </div>
      </div>

      {/* Card 4: Coverage */}
      <div className="rounded-xl p-4 sm:px-5 bg-white border border-gray-200 shadow">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
          Coverage
        </div>
        <div className="font-display text-[22px] sm:text-[28px] font-bold leading-tight text-gray-900">
          {estimatedCount}
          <span className="text-base font-medium text-gray-400"> / {totalCount}</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">items estimated</div>
        <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-[width] duration-300"
            style={{ width: `${Math.min(coveragePct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
