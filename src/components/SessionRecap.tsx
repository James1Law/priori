import { useState } from 'react'
import type { ItemWithScore } from '../types/database'

interface SessionRecapProps {
  items: ItemWithScore[]
}

// End-of-session summary: each estimated item with its agreed points and a
// total, copyable as plain text for Slack / Jira
export default function SessionRecap({ items }: SessionRecapProps) {
  const [copied, setCopied] = useState(false)

  const estimatedItems = items.filter(
    (item) => item.story_points !== null && item.story_points !== undefined
  )
  const totalPoints = estimatedItems.reduce(
    (sum, item) => sum + (item.story_points ?? 0),
    0
  )

  if (estimatedItems.length === 0) return null

  const handleCopy = () => {
    const lines = estimatedItems.map(
      (item) => `${item.title} — ${item.story_points} SP`
    )
    const summary = [...lines, `Total: ${totalPoints} SP`].join('\n')
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="w-full max-w-md mb-6 text-left">
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {estimatedItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-sm text-gray-800 truncate">{item.title}</span>
            <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-semibold whitespace-nowrap">
              {item.story_points} SP
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-50 rounded-b-lg">
          <span className="text-sm font-semibold text-gray-900">Total</span>
          <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{totalPoints} SP</span>
        </div>
      </div>
      <div className="flex justify-center mt-3">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy summary
            </>
          )}
        </button>
      </div>
    </div>
  )
}
