import { useState } from 'react'

type CapacityUnit = 'days' | 'hours'

interface CapacitySettingsProps {
  teamSize: number
  workingDays: number
  focusFactor: number
  contingency: number
  unit: CapacityUnit
  hoursPerDay: number
  onTeamSizeChange: (value: number) => void
  onWorkingDaysChange: (value: number) => void
  onFocusFactorChange: (value: number) => void
  onContingencyChange: (value: number) => void
  onUnitChange: (value: CapacityUnit) => void
  onHoursPerDayChange: (value: number) => void
  onExportCsv?: () => void
  exportDisabled?: boolean
}

function Stepper({
  label,
  displayValue,
  onIncrement,
  onDecrement,
  onChange,
  parseDisplay,
}: {
  label: string
  displayValue: string
  onIncrement: () => void
  onDecrement: () => void
  onChange: (value: number) => void
  parseDisplay?: (input: string) => number
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(displayValue)

  const commitValue = () => {
    setEditing(false)
    const parsed = parseDisplay ? parseDisplay(editText) : Number(editText)
    if (!isNaN(parsed) && isFinite(parsed)) {
      onChange(parsed)
    }
  }

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </div>
      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden h-9">
        <button
          type="button"
          onClick={onDecrement}
          className="w-8 h-full border-r border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center text-base"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          type="text"
          inputMode="decimal"
          value={editing ? editText : displayValue}
          readOnly={false}
          onFocus={(e) => {
            setEditing(true)
            setEditText(displayValue.replace('%', ''))
            // Select all text on focus for easy replacement
            requestAnimationFrame(() => e.target.select())
          }}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={commitValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          className="w-14 h-full text-center text-sm font-medium text-gray-900 border-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-white"
          aria-label={label}
        />
        <button
          type="button"
          onClick={onIncrement}
          className="w-8 h-full border-l border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 flex items-center justify-center text-base"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

const UNITS: { value: CapacityUnit; label: string }[] = [
  { value: 'days', label: 'Days' },
  { value: 'hours', label: 'Hours' },
]

export default function CapacitySettings({
  teamSize,
  workingDays,
  focusFactor,
  contingency,
  unit,
  hoursPerDay,
  onTeamSizeChange,
  onWorkingDaysChange,
  onFocusFactorChange,
  onContingencyChange,
  onUnitChange,
  onHoursPerDayChange,
  onExportCsv,
  exportDisabled,
}: CapacitySettingsProps) {
  // Round to avoid floating point drift
  const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:px-5 flex flex-wrap sm:flex-nowrap gap-3 sm:gap-5 items-end">
      <Stepper
        label="Team Size"
        displayValue={String(teamSize)}
        onIncrement={() => onTeamSizeChange(teamSize + 1)}
        onDecrement={() => onTeamSizeChange(teamSize - 1)}
        onChange={(v) => onTeamSizeChange(Math.round(v))}
      />
      <Stepper
        label="Working Days"
        displayValue={String(workingDays)}
        onIncrement={() => onWorkingDaysChange(workingDays + 1)}
        onDecrement={() => onWorkingDaysChange(workingDays - 1)}
        onChange={(v) => onWorkingDaysChange(Math.round(v))}
      />
      <Stepper
        label="Focus Factor"
        displayValue={String(round(focusFactor, 1))}
        onIncrement={() => onFocusFactorChange(round(focusFactor + 0.1, 1))}
        onDecrement={() => onFocusFactorChange(round(focusFactor - 0.1, 1))}
        onChange={onFocusFactorChange}
      />
      <Stepper
        label="Contingency"
        displayValue={`${Math.round(contingency * 100)}%`}
        onIncrement={() => onContingencyChange(round(contingency + 0.05, 2))}
        onDecrement={() => onContingencyChange(round(contingency - 0.05, 2))}
        onChange={(v) => onContingencyChange(v / 100)}
        parseDisplay={(input) => Number(input)}
      />

      {/* Hours per day - only shown when unit is hours */}
      {unit === 'hours' && (
        <Stepper
          label="Hours/Day"
          displayValue={String(hoursPerDay)}
          onIncrement={() => onHoursPerDayChange(hoursPerDay + 1)}
          onDecrement={() => onHoursPerDayChange(hoursPerDay - 1)}
          onChange={(v) => onHoursPerDayChange(Math.round(v))}
        />
      )}

      {/* Unit segmented control */}
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Unit
        </div>
        <div className="flex border border-gray-300 rounded-lg overflow-hidden h-9">
          {UNITS.map((u) => (
            <button
              key={u.value}
              type="button"
              onClick={() => onUnitChange(u.value)}
              className={`flex-1 sm:px-3.5 text-[13px] font-medium transition-colors ${
                unit === u.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50 border-r border-gray-200 last:border-r-0'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* Export CSV button */}
      {onExportCsv && (
        <button
          type="button"
          onClick={onExportCsv}
          disabled={exportDisabled}
          className="inline-flex items-center gap-1.5 px-3.5 h-9 border border-gray-300 rounded-lg text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-400 transition-colors ml-auto flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      )}
    </div>
  )
}
