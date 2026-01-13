import type { ItemWithScore, Framework } from '../types/database'
import { MoscowCategory, MOSCOW_LABELS } from './moscow'

interface ExportOptions {
  items: ItemWithScore[]
  framework: Framework
  sessionName?: string
}

/**
 * Generate CSV content from items
 */
export function generateCsvContent({ items, framework }: ExportOptions): string {
  const rows: string[][] = []

  // Header row based on framework
  const baseHeaders = ['Rank', 'Title', 'Description', 'Created By']
  let frameworkHeaders: string[] = []

  switch (framework) {
    case 'rice':
      frameworkHeaders = ['Reach', 'Impact', 'Confidence', 'Effort', 'RICE Score']
      break
    case 'ice':
      frameworkHeaders = ['Impact', 'Confidence', 'Ease', 'ICE Score']
      break
    case 'value_effort':
      frameworkHeaders = ['Value', 'Effort', 'Quadrant']
      break
    case 'moscow':
      frameworkHeaders = ['Category']
      break
    case 'weighted':
      frameworkHeaders = ['Weighted Score']
      break
  }

  rows.push([...baseHeaders, ...frameworkHeaders])

  // Data rows
  items.forEach((item, index) => {
    const baseData = [
      String(index + 1),
      item.title,
      item.description || '',
      item.created_by || '',
    ]

    let frameworkData: string[] = []
    const criteria = item.score?.criteria || {}

    switch (framework) {
      case 'rice':
        frameworkData = [
          String(criteria.reach || 0),
          String(criteria.impact || 1),
          String(criteria.confidence || 0.8),
          String(criteria.effort || 1),
          String(item.score?.calculated_score?.toFixed(2) || '0'),
        ]
        break
      case 'ice':
        frameworkData = [
          String(criteria.impact || 5),
          String(criteria.confidence || 5),
          String(criteria.ease || 5),
          String(item.score?.calculated_score?.toFixed(2) || '0'),
        ]
        break
      case 'value_effort':
        const value = (criteria.value as number) || 5
        const effort = (criteria.effort as number) || 5
        const quadrant = getQuadrantLabel(value, effort)
        frameworkData = [
          String(value),
          String(effort),
          quadrant,
        ]
        break
      case 'moscow':
        const category = (criteria.category as string) || MoscowCategory.Must
        frameworkData = [MOSCOW_LABELS[category as MoscowCategory] || category]
        break
      case 'weighted':
        frameworkData = [
          String(item.score?.calculated_score?.toFixed(2) || '0'),
        ]
        break
    }

    rows.push([...baseData, ...frameworkData])
  })

  // Convert to CSV string
  return rows
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const escaped = cell.replace(/"/g, '""')
          if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
            return `"${escaped}"`
          }
          return escaped
        })
        .join(',')
    )
    .join('\n')
}

/**
 * Get quadrant label for value/effort
 */
function getQuadrantLabel(value: number, effort: number): string {
  const midpoint = 5.5
  const isHighValue = value > midpoint
  const isHighEffort = effort > midpoint

  if (isHighValue && !isHighEffort) return 'Quick Wins'
  if (isHighValue && isHighEffort) return 'Big Bets'
  if (!isHighValue && !isHighEffort) return 'Fill-ins'
  return 'Avoid'
}

/**
 * Download CSV file
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export items to CSV and trigger download
 */
export function exportToCsv({ items, framework, sessionName }: ExportOptions): void {
  const content = generateCsvContent({ items, framework })
  const filename = `${sessionName || 'priori-export'}-${new Date().toISOString().split('T')[0]}.csv`
  downloadCsv(content, filename)
}
