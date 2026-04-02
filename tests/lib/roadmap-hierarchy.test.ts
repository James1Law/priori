import { describe, it, expect } from 'vitest'
import {
  getParentSpan,
  canResizeChild,
  canResizeParent,
  getProportionalMoves,
  getRoadmapTree,
  getUnscheduledGroups,
} from '../../src/lib/roadmap-hierarchy'
import type { ItemWithScore, ItemLevel } from '../../src/types/database'

// Helper to create a minimal item for testing
function makeItem(
  id: string,
  overrides: Partial<ItemWithScore> = {}
): ItemWithScore {
  return {
    id,
    session_id: 'session-1',
    title: `Item ${id}`,
    description: null,
    position: 0,
    backlog_position: null,
    status: 'todo',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    roadmap_start_period: null,
    roadmap_end_period: null,
    roadmap_start_quadrant: null,
    roadmap_end_quadrant: null,
    roadmap_row: 0,
    story_points: null,
    effort_estimate: null,
    parent_item_id: null,
    item_level: 0 as ItemLevel,
    ...overrides,
  }
}

// ============================================
// Sample hierarchy:
// Goal A (level 0) — scheduled Q1–Q2 (quadrants 0–7)
//   Init A1 (level 1) — scheduled Q1 (quadrants 0–3)
//     Epic A1a (level 2) — scheduled first half Q1 (quadrants 0–1)
//     Epic A1b (level 2) — scheduled second half Q1 (quadrants 2–3)
//   Init A2 (level 1) — scheduled Q2 (quadrants 4–7)
// Goal B (level 0) — scheduled Q2–Q3 (quadrants 4–11)
//   Init B1 (level 1) — scheduled Q3 (quadrants 8–11)
// Flat item C — scheduled Q1 (quadrants 0–3)
// Flat item D — unscheduled
// Goal E (level 0) — unscheduled
//   Init E1 (level 1) — unscheduled
//   Init E2 (level 1) — unscheduled
// ============================================

function makeSampleItems(): ItemWithScore[] {
  return [
    makeItem('A', { item_level: 0, position: 0, roadmap_start_quadrant: 0, roadmap_end_quadrant: 7 }),
    makeItem('A1', { item_level: 1, parent_item_id: 'A', position: 1, roadmap_start_quadrant: 0, roadmap_end_quadrant: 3 }),
    makeItem('A1a', { item_level: 2, parent_item_id: 'A1', position: 2, roadmap_start_quadrant: 0, roadmap_end_quadrant: 1 }),
    makeItem('A1b', { item_level: 2, parent_item_id: 'A1', position: 3, roadmap_start_quadrant: 2, roadmap_end_quadrant: 3 }),
    makeItem('A2', { item_level: 1, parent_item_id: 'A', position: 4, roadmap_start_quadrant: 4, roadmap_end_quadrant: 7 }),
    makeItem('B', { item_level: 0, position: 5, roadmap_start_quadrant: 4, roadmap_end_quadrant: 11 }),
    makeItem('B1', { item_level: 1, parent_item_id: 'B', position: 6, roadmap_start_quadrant: 8, roadmap_end_quadrant: 11 }),
    makeItem('C', { item_level: 0, parent_item_id: null, position: 7, roadmap_start_quadrant: 0, roadmap_end_quadrant: 3 }),
    makeItem('D', { item_level: 0, parent_item_id: null, position: 8 }),
    makeItem('E', { item_level: 0, position: 9 }),
    makeItem('E1', { item_level: 1, parent_item_id: 'E', position: 10 }),
    makeItem('E2', { item_level: 1, parent_item_id: 'E', position: 11 }),
  ]
}

// ============================================
// getParentSpan
// ============================================
describe('getParentSpan', () => {
  it('returns min start and max end across all scheduled descendants', () => {
    const items = makeSampleItems()
    const span = getParentSpan('A', items)
    expect(span).toEqual({ start: 0, end: 7 })
  })

  it('returns span from deeply nested descendants', () => {
    const items = makeSampleItems()
    // A1 has children A1a (0–1) and A1b (2–3)
    const span = getParentSpan('A1', items)
    expect(span).toEqual({ start: 0, end: 3 })
  })

  it('returns null when no descendants are scheduled', () => {
    const items = makeSampleItems()
    const span = getParentSpan('E', items)
    expect(span).toBeNull()
  })

  it('returns null for an item with no children', () => {
    const items = makeSampleItems()
    const span = getParentSpan('C', items)
    expect(span).toBeNull()
  })

  it('handles partially scheduled children', () => {
    const items = [
      makeItem('P', { item_level: 0, position: 0, roadmap_start_quadrant: 0, roadmap_end_quadrant: 11 }),
      makeItem('C1', { item_level: 1, parent_item_id: 'P', position: 1, roadmap_start_quadrant: 4, roadmap_end_quadrant: 7 }),
      makeItem('C2', { item_level: 1, parent_item_id: 'P', position: 2 }), // unscheduled
    ]
    const span = getParentSpan('P', items)
    expect(span).toEqual({ start: 4, end: 7 })
  })

  it('returns span from grandchildren even if direct children are unscheduled', () => {
    const items = [
      makeItem('G', { item_level: 0, position: 0 }),
      makeItem('I', { item_level: 1, parent_item_id: 'G', position: 1 }), // unscheduled
      makeItem('E', { item_level: 2, parent_item_id: 'I', position: 2, roadmap_start_quadrant: 2, roadmap_end_quadrant: 5 }),
    ]
    const span = getParentSpan('G', items)
    expect(span).toEqual({ start: 2, end: 5 })
  })
})

// ============================================
// canResizeChild
// ============================================
describe('canResizeChild', () => {
  it('allows resize within parent bounds', () => {
    const items = makeSampleItems()
    // A1a is child of A1 (0–3). Resize A1a from 0–1 to 0–2 — within parent.
    expect(canResizeChild('A1a', 0, 2, items)).toBe(true)
  })

  it('rejects resize past parent end', () => {
    const items = makeSampleItems()
    // A1a is child of A1 (0–3). Resize A1a to 0–5 — exceeds parent.
    expect(canResizeChild('A1a', 0, 5, items)).toBe(false)
  })

  it('rejects resize past parent start', () => {
    const items = makeSampleItems()
    // A1b (2–3) child of A1 (0–3). Trying to start before parent is fine since parent starts at 0.
    // But A2 (4–7) child of A (0–7). If we tried to move A2 to start at -1, that's invalid quadrant, but let's test with B1
    // B1 child of B (4–11). Resize B1 to 2–11 — before parent start.
    expect(canResizeChild('B1', 2, 11, items)).toBe(false)
  })

  it('allows resize to exactly match parent bounds', () => {
    const items = makeSampleItems()
    // A1a child of A1 (0–3). Resize to 0–3 — matches parent exactly.
    expect(canResizeChild('A1a', 0, 3, items)).toBe(true)
  })

  it('returns true for flat items (no parent)', () => {
    const items = makeSampleItems()
    // C is a flat item — no parent constraint.
    expect(canResizeChild('C', 0, 11, items)).toBe(true)
  })

  it('returns true for top-level items with no parent', () => {
    const items = makeSampleItems()
    expect(canResizeChild('A', 0, 11, items)).toBe(true)
  })

  it('validates against grandparent too (multi-level constraint)', () => {
    const items = makeSampleItems()
    // A1a is child of A1 (0–3), which is child of A (0–7).
    // A1a can't extend past A1's bounds (0–3), even though A goes to 7.
    expect(canResizeChild('A1a', 0, 5, items)).toBe(false)
  })
})

// ============================================
// canResizeParent
// ============================================
describe('canResizeParent', () => {
  it('allows growing a parent beyond children', () => {
    const items = makeSampleItems()
    // A has children spanning 0–7. Growing to 0–11 is fine.
    expect(canResizeParent('A', 0, 11, items)).toBe(true)
  })

  it('rejects shrinking past earliest child', () => {
    const items = makeSampleItems()
    // A has children starting at 0. Shrinking start to 2 cuts off A1a (0–1).
    expect(canResizeParent('A', 2, 7, items)).toBe(false)
  })

  it('rejects shrinking past latest child', () => {
    const items = makeSampleItems()
    // A has children ending at 7. Shrinking end to 5 cuts off A2 (4–7).
    expect(canResizeParent('A', 0, 5, items)).toBe(false)
  })

  it('allows resize to exactly match children span', () => {
    const items = makeSampleItems()
    // A's children span 0–7 exactly.
    expect(canResizeParent('A', 0, 7, items)).toBe(true)
  })

  it('returns true for items with no scheduled children', () => {
    const items = makeSampleItems()
    // E has children but none are scheduled.
    expect(canResizeParent('E', 4, 7, items)).toBe(true)
  })

  it('returns true for leaf items (no children at all)', () => {
    const items = makeSampleItems()
    expect(canResizeParent('C', 0, 11, items)).toBe(true)
  })

  it('considers grandchildren bounds too', () => {
    const items = makeSampleItems()
    // A1 has children A1a (0–1) and A1b (2–3). Can't shrink A1 to 1–3 (cuts off A1a start).
    expect(canResizeParent('A1', 1, 3, items)).toBe(false)
  })
})

// ============================================
// getProportionalMoves
// ============================================
describe('getProportionalMoves', () => {
  it('shifts all descendants by the delta', () => {
    const items = makeSampleItems()
    // Move A by +4 quadrants
    const moves = getProportionalMoves('A', 4, items)

    // Should include A1, A1a, A1b, A2 — all descendants
    expect(moves).toHaveLength(4)

    const a1Move = moves.find((m) => m.itemId === 'A1')
    expect(a1Move).toEqual({ itemId: 'A1', newStart: 4, newEnd: 7 })

    const a1aMove = moves.find((m) => m.itemId === 'A1a')
    expect(a1aMove).toEqual({ itemId: 'A1a', newStart: 4, newEnd: 5 })

    const a1bMove = moves.find((m) => m.itemId === 'A1b')
    expect(a1bMove).toEqual({ itemId: 'A1b', newStart: 6, newEnd: 7 })

    const a2Move = moves.find((m) => m.itemId === 'A2')
    expect(a2Move).toEqual({ itemId: 'A2', newStart: 8, newEnd: 11 })
  })

  it('shifts by negative delta', () => {
    const items = makeSampleItems()
    // Move B by -4 quadrants (B starts at 4)
    const moves = getProportionalMoves('B', -4, items)

    const b1Move = moves.find((m) => m.itemId === 'B1')
    expect(b1Move).toEqual({ itemId: 'B1', newStart: 4, newEnd: 7 })
  })

  it('returns empty array when no descendants', () => {
    const items = makeSampleItems()
    const moves = getProportionalMoves('C', 4, items)
    expect(moves).toEqual([])
  })

  it('skips unscheduled descendants', () => {
    const items = makeSampleItems()
    // E has unscheduled children
    const moves = getProportionalMoves('E', 4, items)
    expect(moves).toEqual([])
  })

  it('handles delta of 0', () => {
    const items = makeSampleItems()
    const moves = getProportionalMoves('A', 0, items)
    // All descendants should have same positions
    const a1Move = moves.find((m) => m.itemId === 'A1')
    expect(a1Move).toEqual({ itemId: 'A1', newStart: 0, newEnd: 3 })
  })
})

// ============================================
// getRoadmapTree
// ============================================
describe('getRoadmapTree', () => {
  it('returns flat list sorted by start quadrant', () => {
    const items = makeSampleItems()
    // Everything expanded
    const tree = getRoadmapTree(items, new Set(['A', 'A1', 'B']))

    // Should include all items except subtasks (level 4)
    // Order: by start quadrant, with children after parents
    expect(tree.length).toBeGreaterThan(0)

    // First should be something starting at quadrant 0
    // A starts at 0 and is a parent
    expect(tree[0].id).toBe('A')
  })

  it('hides children of collapsed parents', () => {
    const items = makeSampleItems()
    // Only A expanded, A1 collapsed
    const tree = getRoadmapTree(items, new Set(['A']))

    const ids = tree.map((i) => i.id)
    // A's direct children should be visible
    expect(ids).toContain('A1')
    expect(ids).toContain('A2')
    // But A1's children should be hidden (A1 not in expanded set)
    expect(ids).not.toContain('A1a')
    expect(ids).not.toContain('A1b')
  })

  it('shows all items when fully expanded', () => {
    const items = makeSampleItems()
    const tree = getRoadmapTree(items, new Set(['A', 'A1', 'B', 'E']))

    const ids = tree.map((i) => i.id)
    // All scheduled items should be present
    expect(ids).toContain('A')
    expect(ids).toContain('A1')
    expect(ids).toContain('A1a')
    expect(ids).toContain('A1b')
    expect(ids).toContain('A2')
    expect(ids).toContain('B')
    expect(ids).toContain('B1')
    expect(ids).toContain('C')
  })

  it('excludes subtasks (level 4) from roadmap', () => {
    const items = [
      makeItem('G', { item_level: 0, position: 0, roadmap_start_quadrant: 0, roadmap_end_quadrant: 11 }),
      makeItem('S', { item_level: 3, parent_item_id: 'G', position: 1, roadmap_start_quadrant: 0, roadmap_end_quadrant: 3 }),
      makeItem('ST', { item_level: 4, parent_item_id: 'S', position: 2, roadmap_start_quadrant: 0, roadmap_end_quadrant: 1 }),
    ]
    const tree = getRoadmapTree(items, new Set(['G', 'S']))
    const ids = tree.map((i) => i.id)
    expect(ids).toContain('G')
    expect(ids).toContain('S')
    expect(ids).not.toContain('ST')
  })

  it('includes unscheduled children of expanded scheduled parents', () => {
    const items = [
      makeItem('P', { item_level: 0, position: 0, roadmap_start_quadrant: 0, roadmap_end_quadrant: 7 }),
      makeItem('C1', { item_level: 1, parent_item_id: 'P', position: 1, roadmap_start_quadrant: 0, roadmap_end_quadrant: 3 }),
      makeItem('C2', { item_level: 1, parent_item_id: 'P', position: 2 }), // unscheduled
    ]
    const tree = getRoadmapTree(items, new Set(['P']))
    const ids = tree.map((i) => i.id)
    expect(ids).toContain('P')
    expect(ids).toContain('C1')
    expect(ids).toContain('C2') // unscheduled child visible when parent expanded
  })

  it('flat items appear in the list without expand/collapse', () => {
    const items = makeSampleItems()
    const tree = getRoadmapTree(items, new Set())

    // Only top-level items + flat items visible (everything collapsed)
    const ids = tree.map((i) => i.id)
    expect(ids).toContain('C') // flat scheduled
  })
})

// ============================================
// getUnscheduledGroups
// ============================================
describe('getUnscheduledGroups', () => {
  it('groups unscheduled children under their parent', () => {
    const items = makeSampleItems()
    const groups = getUnscheduledGroups(items)

    // E is unscheduled with unscheduled children E1, E2
    const eGroup = groups.find((g) => g.parentId === 'E')
    expect(eGroup).toBeDefined()
    expect(eGroup!.parentTitle).toBe('Item E')
    expect(eGroup!.children.map((c) => c.id)).toEqual(expect.arrayContaining(['E1', 'E2']))
  })

  it('puts flat unscheduled items in standalone group', () => {
    const items = makeSampleItems()
    const groups = getUnscheduledGroups(items)

    const standalone = groups.find((g) => g.parentId === null)
    expect(standalone).toBeDefined()
    expect(standalone!.children.map((c) => c.id)).toContain('D')
  })

  it('does not include scheduled items', () => {
    const items = makeSampleItems()
    const groups = getUnscheduledGroups(items)

    const allChildren = groups.flatMap((g) => g.children)
    const allIds = allChildren.map((c) => c.id)
    // A, A1, A1a, A1b, A2, B, B1, C are all scheduled
    expect(allIds).not.toContain('A')
    expect(allIds).not.toContain('A1')
    expect(allIds).not.toContain('C')
  })

  it('handles partially scheduled parents', () => {
    const items = [
      makeItem('P', { item_level: 0, position: 0, roadmap_start_quadrant: 0, roadmap_end_quadrant: 7 }),
      makeItem('C1', { item_level: 1, parent_item_id: 'P', position: 1, roadmap_start_quadrant: 0, roadmap_end_quadrant: 3 }),
      makeItem('C2', { item_level: 1, parent_item_id: 'P', position: 2 }), // unscheduled
      makeItem('C3', { item_level: 1, parent_item_id: 'P', position: 3 }), // unscheduled
    ]
    const groups = getUnscheduledGroups(items)

    const pGroup = groups.find((g) => g.parentId === 'P')
    expect(pGroup).toBeDefined()
    expect(pGroup!.children).toHaveLength(2)
    expect(pGroup!.children.map((c) => c.id)).toEqual(expect.arrayContaining(['C2', 'C3']))
    expect(pGroup!.totalChildren).toBe(3)
    expect(pGroup!.scheduledChildren).toBe(1)
  })

  it('returns empty groups when everything is scheduled', () => {
    const items = [
      makeItem('A', { item_level: 0, position: 0, roadmap_start_quadrant: 0, roadmap_end_quadrant: 3 }),
      makeItem('B', { item_level: 0, position: 1, roadmap_start_quadrant: 4, roadmap_end_quadrant: 7 }),
    ]
    const groups = getUnscheduledGroups(items)
    const allChildren = groups.flatMap((g) => g.children)
    expect(allChildren).toHaveLength(0)
  })

  it('excludes subtasks (level 4) from unscheduled groups', () => {
    const items = [
      makeItem('S', { item_level: 3, position: 0 }),
      makeItem('ST', { item_level: 4, parent_item_id: 'S', position: 1 }),
    ]
    const groups = getUnscheduledGroups(items)
    const allChildren = groups.flatMap((g) => g.children)
    const allIds = allChildren.map((c) => c.id)
    expect(allIds).not.toContain('ST')
  })
})
