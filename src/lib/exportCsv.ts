import type { ItemWithScore, Framework } from '../types/database'
import { MoscowCategory, MOSCOW_LABELS } from './moscow'

interface ExportOptions {
  items: ItemWithScore[]
  framework: Framework
  sessionName?: string
}

/**
 * Format status for display
 */
function formatStatus(status: string | undefined): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress'
    case 'done':
      return 'Done'
    case 'todo':
    default:
      return 'To Do'
  }
}

/**
 * Generate CSV content from items
 */
export function generateCsvContent({ items, framework }: ExportOptions): string {
  const rows: string[][] = []

  // Check what data we have to determine columns
  const hasAnyScores = items.some(item => item.score?.calculated_score !== undefined && item.score?.calculated_score !== null)
  const hasAnyEstimates = items.some(item => item.story_points !== null && item.story_points !== undefined)
  const hasAnyDates = items.some(item => item.start_date !== null)

  // Header row - always include base columns, conditionally add others
  const headers = ['Rank', 'Title', 'Description', 'Status', 'Created By']

  // Add estimate column if any items have estimates
  if (hasAnyEstimates) {
    headers.push('Story Points')
  }

  // Add dates column if any items are scheduled
  if (hasAnyDates) {
    headers.push('Start Date', 'End Date')
  }

  // Add framework-specific headers if any items have scores
  if (hasAnyScores) {
    switch (framework) {
      case 'rice':
        headers.push('Reach', 'Impact', 'Confidence', 'Effort', 'RICE Score')
        break
      case 'ice':
        headers.push('Impact', 'Confidence', 'Ease', 'ICE Score')
        break
      case 'value_effort':
        headers.push('Value', 'Effort', 'Quadrant')
        break
      case 'moscow':
        headers.push('Category')
        break
      case 'weighted':
        headers.push('Weighted Score')
        break
    }
  }

  rows.push(headers)

  // Data rows
  items.forEach((item, index) => {
    const rowData: string[] = [
      String(index + 1),
      item.title,
      item.description || '',
      formatStatus(item.status),
      item.created_by || '',
    ]

    // Add estimate if column exists
    if (hasAnyEstimates) {
      rowData.push(item.story_points !== null && item.story_points !== undefined ? String(item.story_points) : '')
    }

    // Add dates if column exists
    if (hasAnyDates) {
      rowData.push(item.start_date || '', item.end_date || '')
    }

    // Add framework-specific data if scores exist
    if (hasAnyScores) {
      const criteria = item.score?.criteria || {}

      switch (framework) {
        case 'rice':
          rowData.push(
            String(criteria.reach || ''),
            String(criteria.impact || ''),
            String(criteria.confidence || ''),
            String(criteria.effort || ''),
            item.score?.calculated_score !== undefined ? String(item.score.calculated_score.toFixed(2)) : ''
          )
          break
        case 'ice':
          rowData.push(
            String(criteria.impact || ''),
            String(criteria.confidence || ''),
            String(criteria.ease || ''),
            item.score?.calculated_score !== undefined ? String(item.score.calculated_score.toFixed(2)) : ''
          )
          break
        case 'value_effort':
          const value = criteria.value as number | undefined
          const effort = criteria.effort as number | undefined
          const quadrant = value !== undefined && effort !== undefined ? getQuadrantLabel(value, effort) : ''
          rowData.push(
            value !== undefined ? String(value) : '',
            effort !== undefined ? String(effort) : '',
            quadrant
          )
          break
        case 'moscow':
          const category = criteria.category as string | undefined
          rowData.push(category ? (MOSCOW_LABELS[category as MoscowCategory] || category) : '')
          break
        case 'weighted':
          rowData.push(item.score?.calculated_score !== undefined ? String(item.score.calculated_score.toFixed(2)) : '')
          break
      }
    }

    rows.push(rowData)
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

// --- Capacity Planning CSV Export ---

interface CapacityCsvOptions {
  items: import('../types/database').Item[]
  sessionName: string
  teamSize: number
  workingDays: number
  focusFactor: number
  contingency: number
  unit: string
  hoursPerDay?: number
  netCapacity: number
  totalEffort: number
  baseEffort: number
  utilisation: number
  estimatedCount: number
  totalCount: number
}

/**
 * Escape a CSV cell value
 */
function escapeCsvCell(value: string): string {
  const escaped = value.replace(/"/g, '""')
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
    return `"${escaped}"`
  }
  return escaped
}

/**
 * Generate CSV content for capacity planning export
 */
export function generateCapacityCsvContent(options: CapacityCsvOptions): string {
  const rows: string[] = []

  // Header rows
  rows.push(`Session,${escapeCsvCell(options.sessionName)}`)
  rows.push(`Exported,${new Date().toISOString().split('T')[0]}`)
  rows.push('')

  // Capacity settings
  rows.push(`Team Size,${options.teamSize}`)
  rows.push(`Working Days,${options.workingDays}`)
  rows.push(`Focus Factor,${options.focusFactor}`)
  rows.push(`Contingency,${Math.round(options.contingency * 100)}%`)
  rows.push(`Unit,${options.unit}`)
  if (options.unit === 'hours' && options.hoursPerDay) {
    rows.push(`Hours/Day,${options.hoursPerDay}`)
  }
  rows.push('')

  // Summary metrics
  rows.push(`Net Capacity,${Math.round(options.netCapacity)}`)
  rows.push(`Total Effort,${Math.round(options.totalEffort)}`)
  rows.push(`Utilisation,${Math.round(options.utilisation)}%`)
  rows.push(`Coverage,${options.estimatedCount} of ${options.totalCount}`)
  rows.push('')

  // Item table header
  rows.push('Rank,Title,Status,Estimate')

  // Item rows
  options.items.forEach((item, index) => {
    const estimate = item.effort_estimate != null ? String(item.effort_estimate) : ''
    rows.push(`${index + 1},${escapeCsvCell(item.title)},${formatStatus(item.status)},${estimate}`)
  })

  // Total row
  rows.push(`Total,,,${Math.round(options.baseEffort)}`)

  return rows.join('\n')
}

/**
 * Generate filename for capacity CSV export
 */
export function generateCapacityFilename(sessionName: string): string {
  return `${sessionName}-capacity-${new Date().toISOString().split('T')[0]}.csv`
}

/**
 * Export capacity planning data to CSV and trigger download
 */
export function exportCapacityCsv(options: CapacityCsvOptions): void {
  const content = generateCapacityCsvContent(options)
  const filename = generateCapacityFilename(options.sessionName || 'priori-export')
  downloadCsv(content, filename)
}
