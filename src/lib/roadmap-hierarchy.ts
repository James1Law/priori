import type { ItemWithScore } from '../types/database'
import { getDescendants } from './hierarchy'

/** Whether an item is scheduled on the roadmap */
function isScheduled(item: ItemWithScore): boolean {
  return item.roadmap_start_quadrant != null && item.roadmap_end_quadrant != null
}

/**
 * Calculate the aggregate span of a parent's scheduled descendants.
 * Returns the min start quadrant and max end quadrant across all descendants.
 * Returns null if no descendants are scheduled.
 */
export function getParentSpan(
  parentId: string,
  items: ItemWithScore[]
): { start: number; end: number } | null {
  const descendants = getDescendants(parentId, items)
  const scheduled = descendants.filter(isScheduled)

  if (scheduled.length === 0) return null

  const start = Math.min(...scheduled.map((d) => d.roadmap_start_quadrant!))
  const end = Math.max(...scheduled.map((d) => d.roadmap_end_quadrant!))

  return { start, end }
}

/**
 * Check if resizing a child item to new bounds is valid.
 * A child can't extend past ANY ancestor's bounds (parent, grandparent, etc.).
 * Returns true for top-level/flat items (no parent constraint).
 */
export function canResizeChild(
  itemId: string,
  newStart: number,
  newEnd: number,
  items: ItemWithScore[]
): boolean {
  const item = items.find((i) => i.id === itemId)
  if (!item || !item.parent_item_id) return true

  // Walk up the ancestor chain — must fit within every scheduled ancestor
  let currentParentId: string | null = item.parent_item_id
  while (currentParentId) {
    const ancestor = items.find((i) => i.id === currentParentId)
    if (!ancestor) break
    if (isScheduled(ancestor)) {
      if (newStart < ancestor.roadmap_start_quadrant! || newEnd > ancestor.roadmap_end_quadrant!) {
        return false
      }
    }
    currentParentId = ancestor.parent_item_id
  }

  return true
}

/**
 * Check if resizing a parent item to new bounds is valid.
 * A parent can't shrink past the aggregate span of its scheduled descendants.
 * Returns true if no descendants are scheduled or if no children exist.
 */
export function canResizeParent(
  itemId: string,
  newStart: number,
  newEnd: number,
  items: ItemWithScore[]
): boolean {
  const childSpan = getParentSpan(itemId, items)
  if (!childSpan) return true

  return newStart <= childSpan.start && newEnd >= childSpan.end
}

/**
 * Calculate new positions for all scheduled descendants when a parent moves.
 * Each descendant is shifted by the same delta (number of quadrants).
 * Unscheduled descendants are skipped.
 */
export function getProportionalMoves(
  parentId: string,
  deltaQuadrants: number,
  items: ItemWithScore[]
): Array<{ itemId: string; newStart: number; newEnd: number }> {
  const descendants = getDescendants(parentId, items)
  const scheduled = descendants.filter(isScheduled)

  return scheduled.map((d) => ({
    itemId: d.id,
    newStart: d.roadmap_start_quadrant! + deltaQuadrants,
    newEnd: d.roadmap_end_quadrant! + deltaQuadrants,
  }))
}

/**
 * Build a flat, display-ordered list of items for the roadmap view.
 * - Subtasks (level 4) are excluded from the roadmap.
 * - Children of collapsed parents are hidden.
 * - Items are ordered: scheduled top-level/flat items sorted by start quadrant,
 *   with children inserted after their parent (depth-first).
 * - Unscheduled items with no scheduled parent go to the unscheduled panel (not included here),
 *   but unscheduled children of expanded scheduled parents ARE included (shown as empty rows).
 */
export function getRoadmapTree(
  items: ItemWithScore[],
  expandedIds: Set<string>
): ItemWithScore[] {
  // Exclude subtasks (level 4)
  const eligible = items.filter((i) => i.item_level < 4)

  // Build parent→children map
  const childrenMap = new Map<string | null, ItemWithScore[]>()
  for (const item of eligible) {
    const key = item.parent_item_id
    const list = childrenMap.get(key) ?? []
    list.push(item)
    childrenMap.set(key, list)
  }

  // Get root items (no parent)
  const roots = childrenMap.get(null) ?? []

  // Sort roots: scheduled first (by start quadrant), then unscheduled
  roots.sort((a, b) => {
    const aScheduled = isScheduled(a)
    const bScheduled = isScheduled(b)
    if (aScheduled && !bScheduled) return -1
    if (!aScheduled && bScheduled) return 1
    if (aScheduled && bScheduled) {
      return a.roadmap_start_quadrant! - b.roadmap_start_quadrant!
    }
    return a.position - b.position
  })

  const result: ItemWithScore[] = []

  const walk = (_parentKey: string | null, parentItems: ItemWithScore[]) => {
    for (const item of parentItems) {
      result.push(item)

      // Only show children if this item is expanded
      if (expandedIds.has(item.id)) {
        const children = childrenMap.get(item.id) ?? []
        // Sort children: scheduled first by start quadrant, then unscheduled by position
        children.sort((a, b) => {
          const aScheduled = isScheduled(a)
          const bScheduled = isScheduled(b)
          if (aScheduled && !bScheduled) return -1
          if (!aScheduled && bScheduled) return 1
          if (aScheduled && bScheduled) {
            return a.roadmap_start_quadrant! - b.roadmap_start_quadrant!
          }
          return a.position - b.position
        })
        walk(item.id, children)
      }
    }
  }

  walk(null, roots)
  return result
}

/** A group of unscheduled items, optionally under a parent */
export interface UnscheduledGroup {
  parentId: string | null
  parentTitle: string | null
  parentLevel: number | null
  parentItem: ItemWithScore | null  // The parent item itself (if unscheduled, it's draggable too)
  isParentScheduled: boolean
  children: ItemWithScore[]
  totalChildren: number
  scheduledChildren: number
}

/**
 * Group unscheduled items by their parent hierarchy for the unscheduled panel.
 * - Subtasks (level 4) are excluded.
 * - Unscheduled children of a parent are grouped under that parent.
 * - Flat unscheduled items go into a standalone group (parentId: null).
 * - Fully unscheduled parent+children: parent is the group header, children are listed.
 * - Partially scheduled parents: shows counts of total vs scheduled children.
 */
export function getUnscheduledGroups(items: ItemWithScore[]): UnscheduledGroup[] {
  // Exclude subtasks
  const eligible = items.filter((i) => i.item_level < 4)
  const unscheduled = eligible.filter((i) => !isScheduled(i))

  // Build a map of parent → all children (scheduled + unscheduled)
  const allChildrenMap = new Map<string, ItemWithScore[]>()
  for (const item of eligible) {
    if (item.parent_item_id) {
      const list = allChildrenMap.get(item.parent_item_id) ?? []
      list.push(item)
      allChildrenMap.set(item.parent_item_id, list)
    }
  }

  const groups: UnscheduledGroup[] = []
  const handledIds = new Set<string>()

  // Group unscheduled items that have a parent
  for (const item of unscheduled) {
    if (handledIds.has(item.id)) continue

    if (item.parent_item_id) {
      const parent = eligible.find((i) => i.id === item.parent_item_id)
      if (!parent) continue

      // Check if we already created a group for this parent
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

      // Mark all unscheduled children of this parent as handled
      for (const child of unscheduledChildren) {
        handledIds.add(child.id)
      }
      // Also mark the parent as handled if it's unscheduled (it's now the group header + draggable)
      if (!parentIsScheduled) {
        handledIds.add(parent.id)
      }
    }
  }

  // Collect standalone unscheduled items (no parent, not already handled)
  const standaloneItems = unscheduled.filter(
    (i) => !handledIds.has(i.id) && !i.parent_item_id
  )
  // Separate pure standalone (no unscheduled children) from parents-with-children
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

  // Add groups for unscheduled parents with unscheduled children (not yet handled)
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
