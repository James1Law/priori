import type { ItemStatus } from '../types/database'

export interface ParsedImportItem {
  title: string
  description: string | null
  status: ItemStatus
  /** Source tracker key (e.g. Jira "CR-7489"), null for generic CSVs */
  sourceKey: string | null
  /** Set by markDuplicates: true if the item already exists in the session */
  isDuplicate: boolean
}

export type ImportFormat = 'jira' | 'generic'

export interface ImportParseResult {
  format: ImportFormat
  items: ParsedImportItem[]
}

/**
 * Parse CSV text into rows of cells (RFC 4180: quoted fields may contain
 * commas, escaped quotes, and newlines). Handles CRLF and a UTF-8 BOM.
 */
export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  let i = 0

  const endCell = () => {
    row.push(cell)
    cell = ''
  }
  const endRow = () => {
    endCell()
    // Drop rows that are entirely empty (e.g. trailing newline)
    if (row.length > 1 || row[0] !== '') {
      rows.push(row)
    }
    row = []
  }

  while (i < input.length) {
    const char = input[i]

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      cell += char
      i++
      continue
    }

    if (char === '"') {
      inQuotes = true
      i++
      continue
    }
    if (char === ',') {
      endCell()
      i++
      continue
    }
    if (char === '\r') {
      if (input[i + 1] === '\n') i++
      endRow()
      i++
      continue
    }
    if (char === '\n') {
      endRow()
      i++
      continue
    }

    cell += char
    i++
  }

  if (cell !== '' || row.length > 0) {
    endRow()
  }

  return rows
}

const DONE_STATUSES = ['done', 'closed', 'resolved', 'released', 'complete', 'completed']
const IN_PROGRESS_STATUSES = [
  'in progress',
  'in development',
  'in dev',
  'in review',
  'in test',
  'in testing',
  'doing',
]

/**
 * Map a source tracker status (e.g. Jira) onto priori's item statuses.
 * Anything unrecognised (e.g. "Ready for Refinement") lands as todo.
 */
export function mapImportStatus(status: string): ItemStatus {
  const normalised = status.trim().toLowerCase()
  if (DONE_STATUSES.includes(normalised)) return 'done'
  if (IN_PROGRESS_STATUSES.includes(normalised)) return 'in_progress'
  return 'todo'
}

const TITLE_HEADERS = ['title', 'summary', 'name', 'item']

function findColumn(headers: string[], candidates: string[]): number {
  return headers.findIndex(h => candidates.includes(h))
}

/**
 * Parse a CSV export into importable items.
 *
 * Auto-detects Jira's export format (Issue key + Summary headers) and keeps
 * the issue key in the title so items stay traceable back to Jira. Any other
 * CSV with a Title/Summary/Name column is imported generically.
 *
 * Throws an Error with a user-facing message when the file can't be imported.
 */
export function parseImportCsv(text: string): ImportParseResult {
  const rows = parseCsv(text)
  if (rows.length === 0) {
    throw new Error('The file is empty.')
  }

  const headers = rows[0].map(h => h.trim().toLowerCase())
  const dataRows = rows.slice(1)

  const keyCol = findColumn(headers, ['issue key'])
  const isJira = keyCol !== -1 && headers.includes('summary')

  const titleCol = isJira ? headers.indexOf('summary') : findColumn(headers, TITLE_HEADERS)
  if (titleCol === -1) {
    throw new Error(
      'No title column found. The CSV needs a "Title", "Summary" or "Name" column.'
    )
  }

  const descriptionCol = findColumn(headers, ['description'])
  const statusCol = findColumn(headers, ['status'])

  const items: ParsedImportItem[] = []
  for (const row of dataRows) {
    const rawTitle = (row[titleCol] || '').trim()
    if (!rawTitle) continue

    const sourceKey = isJira ? (row[keyCol] || '').trim() || null : null
    const description = descriptionCol !== -1 ? (row[descriptionCol] || '').trim() : ''
    const status = statusCol !== -1 ? mapImportStatus(row[statusCol] || '') : 'todo'

    items.push({
      title: sourceKey ? `${sourceKey} — ${rawTitle}` : rawTitle,
      description: description || null,
      status,
      sourceKey,
      isDuplicate: false,
    })
  }

  if (items.length === 0) {
    throw new Error('No items found in the file.')
  }

  return { format: isJira ? 'jira' : 'generic', items }
}

/**
 * Flag imported items that already exist in the session, so re-importing the
 * same Jira filter doesn't create duplicates. Items with a source key match
 * when the key appears (as a whole token) in any existing title; items
 * without one match on exact title (case-insensitive).
 */
export function markDuplicates(
  items: ParsedImportItem[],
  existing: { title: string }[]
): ParsedImportItem[] {
  const existingTitles = existing.map(e => e.title)
  const existingTitlesLower = new Set(existingTitles.map(t => t.trim().toLowerCase()))

  return items.map(item => {
    let isDuplicate: boolean
    if (item.sourceKey) {
      const keyPattern = new RegExp(`(^|[^A-Z0-9-])${item.sourceKey}([^0-9]|$)`, 'i')
      isDuplicate = existingTitles.some(t => keyPattern.test(t))
    } else {
      isDuplicate = existingTitlesLower.has(item.title.trim().toLowerCase())
    }
    return { ...item, isDuplicate }
  })
}
