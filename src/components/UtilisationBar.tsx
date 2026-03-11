type CapacityUnit = 'days' | 'hours'

interface UtilisationBarProps {
  totalEffort: number
  netCapacity: number
  utilisation: number
  statusColour: string
  unit: CapacityUnit
}

export default function UtilisationBar({
  totalEffort,
  netCapacity,
  utilisation,
  statusColour,
  unit,
}: UtilisationBarProps) {
  const pct = Math.round(utilisation)
  const barWidth = Math.min(pct, 100)

  return (
    <div className="px-5 py-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
        <span>Capacity utilisation</span>
        <span>
          {Math.round(totalEffort)} / {Math.round(netCapacity)} {unit} ({pct}%)
        </span>
      </div>
      <div className="h-3 bg-gray-200 rounded-md overflow-hidden relative">
        <div
          data-testid="util-bar-fill"
          className="h-full rounded-md transition-all duration-500"
          style={{
            width: `${barWidth}%`,
            backgroundColor: statusColour,
          }}
        />
      </div>
      <div className="flex gap-4 mt-2 text-[11px] text-gray-500 font-medium">
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{ backgroundColor: statusColour }}
          />
          Effort (incl. contingency)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-gray-200" />
          Remaining capacity
        </span>
      </div>
    </div>
  )
}
