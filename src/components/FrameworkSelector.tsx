import type { Framework } from '../types/database'

interface FrameworkSelectorProps {
  value: Framework
  onChange: (framework: Framework) => void
}

const FRAMEWORKS = [
  { value: 'rice' as const, label: 'RICE', description: 'Reach × Impact × Confidence / Effort' },
  { value: 'ice' as const, label: 'ICE', description: 'Impact + Confidence + Ease' },
  { value: 'value_effort' as const, label: 'Value vs Effort', description: '2×2 matrix' },
  { value: 'moscow' as const, label: 'MoSCoW', description: 'Must/Should/Could/Won\'t' },
  { value: 'weighted' as const, label: 'Weighted Scoring', description: 'Custom criteria' },
]

export default function FrameworkSelector({ value, onChange }: FrameworkSelectorProps) {
  return (
    <div className="mb-6">
      <label htmlFor="framework" className="block text-sm font-medium text-gray-700 mb-2">
        Prioritization Framework
      </label>
      <select
        id="framework"
        value={value}
        onChange={(e) => onChange(e.target.value as Framework)}
        className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
      >
        {FRAMEWORKS.map((framework) => (
          <option key={framework.value} value={framework.value}>
            {framework.label} — {framework.description}
          </option>
        ))}
      </select>
    </div>
  )
}
