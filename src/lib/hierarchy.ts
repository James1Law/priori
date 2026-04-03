import type { ItemWithScore, ItemWithChildren, ItemLevel } from '../types/database'
import { MAX_ITEM_LEVEL } from '../types/database'

/** Mobile hierarchy layout constants */
export const MOBILE_INDENT_REM = 0.75
export const MOBILE_MAX_INDENT_REM = 2.25

/** Level-to-border-colour mapping for the left accent bar */
export const LEVEL_BORDER_COLOURS: Record<number, string> = {
  0: 'border-l-pink-400',
  1: 'border-l-blue-400',
  2: 'border-l-purple-400',
  3: 'border-l-amber-400',
  4: 'border-l-slate-400',
}

/** Calculate clamped mobile indent in rem */
export function getMobileIndent(level: number): number {
  return Math.min(level * MOBILE_INDENT_REM, MOBILE_MAX_INDENT_REM)
}

/**
 * Build a tree structure from a flat array of items.
 * Top-level items (parent_item_id === null) become roots.
 * By default, children are sorted by backlog_position (fallback to position).
 * Pass preserveOrder=true to keep the input array order (useful when items are pre-sorted).
 */
export function buildTree(items: ItemWithScore[], preserveOrder = false): ItemWithChildren[] {
  const itemMap = new Map<string, ItemWithChildren>()
  const roots: ItemWithChildren[] = []

  // First pass: create ItemWithChildren wrappers
  for (const item of items) {
    itemMap.set(item.id, { ...item, children: [] })
  }

  // Second pass: attach children to parents
  for (const item of items) {
    const node = itemMap.get(item.id)!
    if (item.parent_item_id && itemMap.has(item.parent_item_id)) {
      itemMap.get(item.parent_item_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Sort children within each group (unless preserving input order)
  if (!preserveOrder) {
    const sortChildren = (nodes: ItemWithChildren[]) => {
      nodes.sort((a, b) => {
        const posA = a.backlog_position ?? a.position
        const posB = b.backlog_position ?? b.position
        return posA - posB
      })
      for (const node of nodes) {
        sortChildren(node.children)
      }
    }

    sortChildren(roots)
  }

  return roots
}

/**
 * Flatten a tree back into a display-ordered array.
 * Uses depth-first traversal so children appear directly after their parent.
 * Only includes visible items (respects expand state).
 */
export function flattenTree(
  tree: ItemWithChildren[],
  expandedIds?: Set<string>
): ItemWithScore[] {
  const result: ItemWithScore[] = []

  const walk = (nodes: ItemWithChildren[]) => {
    for (const node of nodes) {
      // Extract children before pushing to avoid including them in the flat item
      const { children, ...item } = node
      result.push(item)

      // If expandedIds is provided, only recurse into expanded nodes
      // If not provided, show everything (fully expanded)
      if (children.length > 0) {
        if (!expandedIds || expandedIds.has(node.id)) {
          walk(children)
        }
      }
    }
  }

  walk(tree)
  return result
}

/**
 * Get all ancestor items of a given item (parent, grandparent, etc.)
 * Returns ordered from immediate parent to root.
 */
export function getAncestors(
  itemId: string,
  items: ItemWithScore[]
): ItemWithScore[] {
  const itemMap = new Map(items.map((i) => [i.id, i]))
  const ancestors: ItemWithScore[] = []

  let current = itemMap.get(itemId)
  while (current?.parent_item_id) {
    const parent = itemMap.get(current.parent_item_id)
    if (!parent) break
    ancestors.push(parent)
    current = parent
  }

  return ancestors
}

/**
 * Get all descendant items of a given item (children, grandchildren, etc.)
 */
export function getDescendants(
  itemId: string,
  items: ItemWithScore[]
): ItemWithScore[] {
  const childrenMap = new Map<string, ItemWithScore[]>()
  for (const item of items) {
    if (item.parent_item_id) {
      const siblings = childrenMap.get(item.parent_item_id) ?? []
      siblings.push(item)
      childrenMap.set(item.parent_item_id, siblings)
    }
  }

  const descendants: ItemWithScore[] = []
  const collect = (parentId: string) => {
    const children = childrenMap.get(parentId) ?? []
    for (const child of children) {
      descendants.push(child)
      collect(child.id)
    }
  }

  collect(itemId)
  return descendants
}

/**
 * Get direct children of an item.
 */
export function getDirectChildren(
  itemId: string,
  items: ItemWithScore[]
): ItemWithScore[] {
  return items.filter((i) => i.parent_item_id === itemId)
}

/**
 * Count all descendants (not just direct children).
 */
export function countDescendants(
  itemId: string,
  items: ItemWithScore[]
): number {
  return getDescendants(itemId, items).length
}

/**
 * Get the deepest level among an item's descendants.
 * Returns the item's own level if it has no children.
 */
export function getDeepestDescendantLevel(
  itemId: string,
  items: ItemWithScore[]
): ItemLevel {
  const descendants = getDescendants(itemId, items)
  if (descendants.length === 0) {
    const item = items.find((i) => i.id === itemId)
    return item?.item_level ?? 0
  }
  return Math.max(...descendants.map((d) => d.item_level)) as ItemLevel
}

/**
 * Check if reparenting an item under a target would exceed max depth.
 * Considers the item's own descendants too.
 */
export function canReparent(
  itemId: string,
  targetParentId: string,
  items: ItemWithScore[]
): boolean {
  const target = items.find((i) => i.id === targetParentId)
  if (!target) return false

  const newLevel = (target.item_level + 1) as ItemLevel
  if (newLevel > MAX_ITEM_LEVEL) return false

  // Check if the item has descendants that would exceed max depth
  const item = items.find((i) => i.id === itemId)
  if (!item) return false

  const descendants = getDescendants(itemId, items)
  const currentDepth = descendants.length > 0
    ? Math.max(...descendants.map((d) => d.item_level)) - item.item_level
    : 0

  return (newLevel + currentDepth) <= MAX_ITEM_LEVEL
}

/**
 * Check if an item can have children added to it.
 */
export function canAddChild(item: ItemWithScore): boolean {
  return item.item_level < MAX_ITEM_LEVEL
}

/**
 * Calculate rolled-up effort estimate from descendants.
 * Only counts leaf-level items (items with no children) to avoid double-counting.
 */
export function getRolledUpEstimate(
  itemId: string,
  items: ItemWithScore[]
): number | null {
  const descendants = getDescendants(itemId, items)
  if (descendants.length === 0) return null // No children — use own estimate

  const childrenMap = new Map<string, boolean>()
  for (const item of items) {
    if (item.parent_item_id) {
      childrenMap.set(item.parent_item_id, true)
    }
  }

  // Only sum leaf items (those without children)
  const leafDescendants = descendants.filter((d) => !childrenMap.has(d.id))
  const estimatedLeaves = leafDescendants.filter((d) => d.effort_estimate != null)

  if (estimatedLeaves.length === 0) return null

  return estimatedLeaves.reduce((sum, d) => sum + (d.effort_estimate ?? 0), 0)
}

/**
 * Calculate status roll-up for a parent item.
 * Returns counts of each status among descendants.
 */
export function getStatusRollup(
  itemId: string,
  items: ItemWithScore[]
): { todo: number; in_progress: number; done: number; total: number } {
  const descendants = getDescendants(itemId, items)
  const childrenMap = new Map<string, boolean>()
  for (const item of items) {
    if (item.parent_item_id) {
      childrenMap.set(item.parent_item_id, true)
    }
  }

  // Only count leaf items for status
  const leaves = descendants.filter((d) => !childrenMap.has(d.id))

  return {
    todo: leaves.filter((d) => d.status === 'todo').length,
    in_progress: leaves.filter((d) => d.status === 'in_progress').length,
    done: leaves.filter((d) => d.status === 'done').length,
    total: leaves.length,
  }
}

/**
 * Compute cascaded parent status updates after a child status changes.
 * Returns an array of { id, status } for parents that need updating.
 *
 * Rules:
 * - All children done → parent becomes 'done'
 * - Any child in_progress or done (but not all done) → parent becomes 'in_progress'
 * - All children todo → parent becomes 'todo'
 */
export function getCascadedStatusUpdates(
  itemId: string,
  items: ItemWithScore[]
): { id: string; status: 'todo' | 'in_progress' | 'done' }[] {
  const itemMap = new Map(items.map((i) => [i.id, i]))
  const updates: { id: string; status: 'todo' | 'in_progress' | 'done' }[] = []
  // Track status overrides as we walk up so each level sees the cascaded result
  const statusOverrides = new Map<string, 'todo' | 'in_progress' | 'done'>()

  let current = itemMap.get(itemId)
  while (current?.parent_item_id) {
    const parent = itemMap.get(current.parent_item_id)
    if (!parent) break

    const siblings = items.filter((i) => i.parent_item_id === parent.id)
    // Use overridden status if a sibling was already updated in a prior iteration
    const getStatus = (s: ItemWithScore) => statusOverrides.get(s.id) ?? s.status ?? 'todo'
    const allDone = siblings.every((s) => getStatus(s) === 'done')
    const allTodo = siblings.every((s) => getStatus(s) === 'todo')

    let newStatus: 'todo' | 'in_progress' | 'done'
    if (allDone) {
      newStatus = 'done'
    } else if (allTodo) {
      newStatus = 'todo'
    } else {
      newStatus = 'in_progress'
    }

    if (newStatus !== (parent.status || 'todo')) {
      updates.push({ id: parent.id, status: newStatus })
      // Record override so the next level up sees this parent's new status
      statusOverrides.set(parent.id, newStatus)
    }

    current = parent
  }

  return updates
}

/**
 * Check if a given item is an ancestor of another item.
 * Used to prevent circular references when reparenting.
 */
export function isAncestorOf(
  potentialAncestorId: string,
  itemId: string,
  items: ItemWithScore[]
): boolean {
  const ancestors = getAncestors(itemId, items)
  return ancestors.some((a) => a.id === potentialAncestorId)
}

/**
 * Calculate rolled-up prioritisation score for a parent item.
 * Returns the average calculated_score of scored leaf descendants, or null if none are scored.
 * For MoSCoW, returns the highest-priority category among leaf descendants.
 */
export function getRolledUpScore(
  itemId: string,
  items: ItemWithScore[]
): { score: number | null; moscowCategory: string | null } {
  const descendants = getDescendants(itemId, items)
  if (descendants.length === 0) return { score: null, moscowCategory: null }

  // Build set of parent IDs to identify leaves
  const parentIds = new Set<string>()
  for (const item of items) {
    if (item.parent_item_id) {
      parentIds.add(item.parent_item_id)
    }
  }

  const leaves = descendants.filter((d) => !parentIds.has(d.id))

  // Numeric score: average of scored leaves
  const scoredLeaves = leaves.filter(
    (d) => d.score?.calculated_score !== undefined && d.score?.calculated_score !== null && d.score.calculated_score > 0
  )

  const avgScore = scoredLeaves.length > 0
    ? Math.round((scoredLeaves.reduce((sum, d) => sum + (d.score?.calculated_score ?? 0), 0) / scoredLeaves.length) * 100) / 100
    : null

  // MoSCoW: highest priority category among leaves
  const moscowPriority: Record<string, number> = { must: 4, should: 3, could: 2, wont: 1 }
  let highestMoscow: string | null = null
  let highestMoscowPriority = 0

  for (const leaf of leaves) {
    const category = (leaf.score?.criteria as Record<string, unknown>)?.category as string | undefined
    if (category && (moscowPriority[category] ?? 0) > highestMoscowPriority) {
      highestMoscow = category
      highestMoscowPriority = moscowPriority[category] ?? 0
    }
  }

  return { score: avgScore, moscowCategory: highestMoscow }
}

/**
 * Check whether an item has children in the given items array.
 */
export function hasChildren(itemId: string, items: ItemWithScore[]): boolean {
  return items.some((i) => i.parent_item_id === itemId)
}
