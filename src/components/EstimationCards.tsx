// Fibonacci sequence for story point estimation
// -1 = uncertain (?), -2 = coffee break
const FIBONACCI_VALUES = [0, 1, 2, 3, 5, 8, 13, 21] as const
const SPECIAL_UNCERTAIN = -1
const SPECIAL_COFFEE = -2

interface EstimationCardsProps {
  selectedValue: number | null
  onSelect: (value: number) => void
  disabled?: boolean
}

function getCardLabel(value: number): string {
  if (value === SPECIAL_UNCERTAIN) return '?'
  if (value === SPECIAL_COFFEE) return '☕'
  return String(value)
}

function CardButton({
  value,
  isSelected,
  onClick,
  disabled,
}: {
  value: number
  isSelected: boolean
  onClick: () => void
  disabled?: boolean
}) {
  const label = getCardLabel(value)
  const isSpecial = value < 0

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex items-center justify-center
        w-full aspect-[3/4] rounded-lg border-2 font-bold
        transition-[colors,transform,box-shadow] duration-150 motion-reduce:transition-none
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${isSelected
          ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg scale-105'
          : 'border-gray-300 bg-white text-gray-900 hover:border-indigo-300 hover:shadow-md'
        }
        ${isSpecial && !isSelected ? 'text-gray-500' : ''}
      `}
      aria-pressed={isSelected}
      aria-label={`${value === SPECIAL_UNCERTAIN ? 'Uncertain' : value === SPECIAL_COFFEE ? 'Coffee break' : `${value} story points`}`}
    >
      <span className={`text-xl sm:text-2xl ${value === SPECIAL_COFFEE ? '' : ''}`}>
        {label}
      </span>
      {isSelected && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
    </button>
  )
}

export default function EstimationCards({
  selectedValue,
  onSelect,
  disabled = false,
}: EstimationCardsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 text-center">
        Select your estimate
      </p>

      {/* Fibonacci cards - 5x2 grid */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {FIBONACCI_VALUES.map((value) => (
          <CardButton
            key={value}
            value={value}
            isSelected={selectedValue === value}
            onClick={() => onSelect(value)}
            disabled={disabled}
          />
        ))}
        {/* Special cards */}
        <CardButton
          value={SPECIAL_UNCERTAIN}
          isSelected={selectedValue === SPECIAL_UNCERTAIN}
          onClick={() => onSelect(SPECIAL_UNCERTAIN)}
          disabled={disabled}
        />
        <CardButton
          value={SPECIAL_COFFEE}
          isSelected={selectedValue === SPECIAL_COFFEE}
          onClick={() => onSelect(SPECIAL_COFFEE)}
          disabled={disabled}
        />
      </div>

      {/* Selection feedback */}
      {selectedValue !== null && (
        <p className="text-center text-sm text-indigo-600 font-medium">
          {selectedValue === SPECIAL_UNCERTAIN
            ? "You're uncertain about this estimate"
            : selectedValue === SPECIAL_COFFEE
              ? 'You need a break!'
              : `You selected ${selectedValue} story point${selectedValue !== 1 ? 's' : ''}`}
        </p>
      )}
    </div>
  )
}

// Export constants for use in other components
export { FIBONACCI_VALUES, SPECIAL_UNCERTAIN, SPECIAL_COFFEE }
