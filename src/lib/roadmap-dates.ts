import type { ItemWithScore } from '../types/database'
import { getDescendants } from './hierarchy'

/** Whether an item has dates set (is scheduled on the roadmap) */
function isScheduled(item: ItemWithScore): boolean {
  return item.start_date != null && item.end_date != null
}

/** Parse a date string (YYYY-MM-DD) to a Date object at midnight UTC */
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Format a Date object to YYYY-MM-DD string */
function formatDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Add days to a date string, returning a new date string */
function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr)
  date.setUTCDate(date.getUTCDate() + days)
  return formatDate(date)
}

/** Difference in days between two date strings (end - start) */
function diffDays(startStr: string, endStr: string): number {
  const start = parseDate(startStr)
  const end = parseDate(endStr)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

// ============================================
// Hierarchy constraint functions
// ============================================

/**
 * Calculate the aggregate date span of a parent's scheduled descendants.
 * Returns the min start date and max end date across all descendants.
 * Returns null if no descendants are scheduled.
 */
export function getParentDateSpan(
  parentId: string,
  items: ItemWithScore[]
): { start: string; end: string } | null {
  const descendants = getDescendants(parentId, items)
  const scheduled = descendants.filter(isScheduled)

  if (scheduled.length === 0) return null

  const start = scheduled.reduce((min, d) => d.start_date! < min ? d.start_date! : min, scheduled[0].start_date!)
  const end = scheduled.reduce((max, d) => d.end_date! > max ? d.end_date! : max, scheduled[0].end_date!)

  return { start, end }
}

/**
 * Check if resizing a child item to new date bounds is valid.
 * A child can't extend past ANY ancestor's bounds (parent, grandparent, etc.).
 * Returns true for top-level/flat items (no parent constraint).
 */
export function canResizeDateChild(
  itemId: string,
  newStart: string,
  newEnd: string,
  items: ItemWithScore[]
): boolean {
  const item = items.find((i) => i.id === itemId)
  if (!item || !item.parent_item_id) return true

  let currentParentId: string | null = item.parent_item_id
  while (currentParentId) {
    const ancestor = items.find((i) => i.id === currentParentId)
    if (!ancestor) break
    if (isScheduled(ancestor)) {
      if (newStart < ancestor.start_date! || newEnd > ancestor.end_date!) {
        return false
      }
    }
    currentParentId = ancestor.parent_item_id
  }

  return true
}

/**
 * Check if resizing a parent item to new date bounds is valid.
 * A parent can't shrink past the aggregate span of its scheduled descendants.
 * Returns true if no descendants are scheduled or if no children exist.
 */
export function canResizeDateParent(
  itemId: string,
  newStart: string,
  newEnd: string,
  items: ItemWithScore[]
): boolean {
  const childSpan = getParentDateSpan(itemId, items)
  if (!childSpan) return true

  return newStart <= childSpan.start && newEnd >= childSpan.end
}

/**
 * Calculate new dates for all scheduled descendants when a parent moves.
 * Each descendant is shifted by the same number of days.
 * Unscheduled descendants are skipped.
 */
export function getDateProportionalMoves(
  parentId: string,
  daysDelta: number,
  items: ItemWithScore[]
): Array<{ itemId: string; newStart: string; newEnd: string }> {
  const descendants = getDescendants(parentId, items)
  const scheduled = descendants.filter(isScheduled)

  return scheduled.map((d) => ({
    itemId: d.id,
    newStart: addDays(d.start_date!, daysDelta),
    newEnd: addDays(d.end_date!, daysDelta),
  }))
}

// ============================================
// Tree building for roadmap display
// ============================================

/**
 * Build a flat, display-ordered list of items for the date-based roadmap view.
 * - Subtasks (level 4) are excluded.
 * - Children of collapsed parents are hidden.
 * - Scheduled items sorted by start_date, with children after their parent (depth-first).
 * - Unscheduled children of expanded scheduled parents ARE included.
 */
export function getRoadmapDateTree(
  items: ItemWithScore[],
  expandedIds: Set<string>
): ItemWithScore[] {
  const eligible = items

  // Build parent→children map
  const childrenMap = new Map<string | null, ItemWithScore[]>()
  for (const item of eligible) {
    const key = item.parent_item_id
    const list = childrenMap.get(key) ?? []
    list.push(item)
    childrenMap.set(key, list)
  }

  const roots = childrenMap.get(null) ?? []

  // Sort roots: scheduled first (by start date), then unscheduled
  roots.sort((a, b) => {
    const aScheduled = isScheduled(a)
    const bScheduled = isScheduled(b)
    if (aScheduled && !bScheduled) return -1
    if (!aScheduled && bScheduled) return 1
    if (aScheduled && bScheduled) {
      return a.start_date! < b.start_date! ? -1 : a.start_date! > b.start_date! ? 1 : 0
    }
    return a.position - b.position
  })

  const result: ItemWithScore[] = []

  const walk = (parentItems: ItemWithScore[]) => {
    for (const item of parentItems) {
      result.push(item)

      if (expandedIds.has(item.id)) {
        const children = childrenMap.get(item.id) ?? []
        children.sort((a, b) => {
          const aScheduled = isScheduled(a)
          const bScheduled = isScheduled(b)
          if (aScheduled && !bScheduled) return -1
          if (!aScheduled && bScheduled) return 1
          if (aScheduled && bScheduled) {
            return a.start_date! < b.start_date! ? -1 : a.start_date! > b.start_date! ? 1 : 0
          }
          return a.position - b.position
        })
        walk(children)
      }
    }
  }

  walk(roots)
  return result
}

// ============================================
// Unscheduled groups
// ============================================

/** A group of unscheduled items, optionally under a parent */
export interface UnscheduledDateGroup {
  parentId: string | null
  parentTitle: string | null
  parentLevel: number | null
  parentItem: ItemWithScore | null
  isParentScheduled: boolean
  children: ItemWithScore[]
  totalChildren: number
  scheduledChildren: number
}

/**
 * Group unscheduled items by their parent hierarchy for the unscheduled panel.
 * Uses start_date/end_date to determine scheduling status.
 */
export function getDateUnscheduledGroups(items: ItemWithScore[]): UnscheduledDateGroup[] {
  const eligible = items
  const unscheduled = eligible.filter((i) => !isScheduled(i))

  const allChildrenMap = new Map<string, ItemWithScore[]>()
  for (const item of eligible) {
    if (item.parent_item_id) {
      const list = allChildrenMap.get(item.parent_item_id) ?? []
      list.push(item)
      allChildrenMap.set(item.parent_item_id, list)
    }
  }

  const groups: UnscheduledDateGroup[] = []
  const handledIds = new Set<string>()

  // Group unscheduled items that have a parent
  for (const item of unscheduled) {
    if (handledIds.has(item.id)) continue

    if (item.parent_item_id) {
      const parent = eligible.find((i) => i.id === item.parent_item_id)
      if (!parent) continue

      const existingGroup = groups.find((g) => g.parentId === parent.id)
      if (existingGroup) {
        if (!existingGroup.children.some((c) => c.id === item.id)) {
          existingGroup.children.push(item)
        }
        handledIds.add(item.id)
        continue
      }

      const allChildren = allChildrenMap.get(parent.id) ?? []
      const scheduledChildrenList = allChildren.filter(isScheduled)
      const unscheduledChildren = allChildren.filter((c) => !isScheduled(c))
      const parentIsScheduled = isScheduled(parent)

      groups.push({
        parentId: parent.id,
        parentTitle: parent.title,
        parentLevel: parent.item_level,
        parentItem: parentIsScheduled ? null : parent,
        isParentScheduled: parentIsScheduled,
        children: unscheduledChildren,
        totalChildren: allChildren.length,
        scheduledChildren: scheduledChildrenList.length,
      })

      for (const child of unscheduledChildren) {
        handledIds.add(child.id)
      }
      if (!parentIsScheduled) {
        handledIds.add(parent.id)
      }
    }
  }

  // Collect standalone unscheduled items (no parent, not already handled)
  const standaloneItems = unscheduled.filter(
    (i) => !handledIds.has(i.id) && !i.parent_item_id
  )
  const pureStandalone = standaloneItems.filter(
    (i) => !(allChildrenMap.get(i.id)?.some((c) => !isScheduled(c)))
  )

  if (pureStandalone.length > 0) {
    groups.push({
      parentId: null,
      parentTitle: null,
      parentLevel: null,
      parentItem: null,
      isParentScheduled: false,
      children: pureStandalone,
      totalChildren: pureStandalone.length,
      scheduledChildren: 0,
    })
  }

  // Add groups for unscheduled parents with unscheduled children
  const unscheduledParentsWithChildren = standaloneItems.filter(
    (i) => !handledIds.has(i.id) && allChildrenMap.get(i.id)?.some((c) => !isScheduled(c))
  )
  for (const parent of unscheduledParentsWithChildren) {
    if (groups.some((g) => g.parentId === parent.id)) continue

    const allChildren = allChildrenMap.get(parent.id) ?? []
    const scheduledChildrenList = allChildren.filter(isScheduled)
    const unscheduledChildren = allChildren.filter((c) => !isScheduled(c))

    groups.push({
      parentId: parent.id,
      parentTitle: parent.title,
      parentLevel: parent.item_level,
      parentItem: parent,
      isParentScheduled: false,
      children: unscheduledChildren,
      totalChildren: allChildren.length,
      scheduledChildren: scheduledChildrenList.length,
    })
  }

  return groups
}

// ============================================
// Pixel ↔ Date mapping
// ============================================

/**
 * Convert a date to a pixel position within the container.
 * @param dateStr - The date to convert (YYYY-MM-DD)
 * @param viewStart - Start of the visible range (YYYY-MM-DD)
 * @param viewEnd - End of the visible range (YYYY-MM-DD)
 * @param containerWidth - Width of the container in pixels
 */
export function dateToPixel(
  dateStr: string,
  viewStart: string,
  viewEnd: string,
  containerWidth: number
): number {
  const totalDays = diffDays(viewStart, viewEnd)
  if (totalDays === 0) return 0
  const dayOffset = diffDays(viewStart, dateStr)
  return (dayOffset / totalDays) * containerWidth
}

/**
 * Convert a pixel position to a date string.
 * Rounds to the nearest day.
 */
export function pixelToDate(
  px: number,
  viewStart: string,
  viewEnd: string,
  containerWidth: number
): string {
  const totalDays = diffDays(viewStart, viewEnd)
  if (containerWidth === 0) return viewStart
  const dayOffset = Math.round((px / containerWidth) * totalDays)
  return addDays(viewStart, dayOffset)
}

// ============================================
// View range calculation
// ============================================

/**
 * Calculate the visible date range based on zoom mode.
 * @param items - All items (used for 'fit' mode)
 * @param zoom - Zoom preset
 * @param customStart - Custom start date (for 'custom' mode)
 * @param customEnd - Custom end date (for 'custom' mode)
 */
export function getViewRange(
  items: ItemWithScore[],
  zoom: string,
  customStart?: string,
  customEnd?: string
): { start: string; end: string } {
  const today = formatDate(new Date())

  if (zoom === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd }
  }

  if (zoom === '3m') {
    return {
      start: addDays(today, -14),
      end: addDays(today, 75),
    }
  }

  if (zoom === '6m') {
    return {
      start: addDays(today, -30),
      end: addDays(today, 150),
    }
  }

  if (zoom === '1y') {
    return {
      start: addDays(today, -30),
      end: addDays(today, 335),
    }
  }

  // 'fit' mode: auto-size to contain all scheduled items with 7-day padding
  const scheduled = items.filter(isScheduled)
  if (scheduled.length === 0) {
    return {
      start: addDays(today, -7),
      end: addDays(today, 37),
    }
  }

  let minStart = scheduled.reduce((min, i) => i.start_date! < min ? i.start_date! : min, scheduled[0].start_date!)
  const maxEnd = scheduled.reduce((max, i) => i.end_date! > max ? i.end_date! : max, scheduled[0].end_date!)

  // Ensure today is always visible in fit mode
  if (today < minStart) minStart = today

  return {
    start: addDays(minStart, -7),
    end: addDays(maxEnd, 7),
  }
}

// ============================================
// Timeline header generation
// ============================================

export interface TimelineMonth {
  label: string
  widthPercent: number
}

/**
 * Generate month labels with proportional widths for the timeline header.
 */
export function getTimelineMonths(viewStart: string, viewEnd: string): TimelineMonth[] {
  const totalDays = diffDays(viewStart, viewEnd) + 1  // inclusive of both endpoints
  if (totalDays <= 0) return []

  const months: TimelineMonth[] = []
  const startDate = parseDate(viewStart)
  const endDate = parseDate(viewEnd)

  let current = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1))

  while (current <= endDate) {
    const monthStart = current < startDate ? startDate : current
    const nextMonth = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1))
    const monthEnd = nextMonth > endDate ? endDate : new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), nextMonth.getUTCDate() - 1))

    const daysInView = diffDays(formatDate(monthStart), formatDate(monthEnd)) + 1
    const widthPercent = (daysInView / totalDays) * 100

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthName = monthNames[current.getUTCMonth()]
    const year = current.getUTCFullYear()

    // Show year on first month or when year changes (January)
    const isFirst = months.length === 0
    const isJan = current.getUTCMonth() === 0
    const label = isFirst || isJan ? `${monthName} ${year}` : monthName

    if (widthPercent > 0) {
      months.push({ label, widthPercent })
    }

    current = nextMonth
  }

  return months
}

export interface TimelineWeek {
  label: string
  widthPercent: number
}

/**
 * Generate week labels with proportional widths for the timeline header.
 * Each week starts on Monday.
 */
export function getTimelineWeeks(viewStart: string, viewEnd: string): TimelineWeek[] {
  const totalDays = diffDays(viewStart, viewEnd) + 1  // inclusive of both endpoints
  if (totalDays <= 0) return []

  const weeks: TimelineWeek[] = []
  const startDate = parseDate(viewStart)
  const endDate = parseDate(viewEnd)

  // Find the first Monday on or before viewStart
  const current = new Date(startDate)
  const dayOfWeek = current.getUTCDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  current.setUTCDate(current.getUTCDate() - daysToMonday)

  while (current <= endDate) {
    const weekStart = current < startDate ? startDate : new Date(current)
    const weekEndDate = new Date(current)
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6)
    const weekEnd = weekEndDate > endDate ? endDate : weekEndDate

    const daysInView = diffDays(formatDate(weekStart), formatDate(weekEnd)) + 1
    const widthPercent = (daysInView / totalDays) * 100

    const label = String(weekStart.getUTCDate())

    if (widthPercent > 0) {
      weeks.push({ label, widthPercent })
    }

    // Move to next Monday
    current.setUTCDate(current.getUTCDate() + 7)
  }

  return weeks
}
