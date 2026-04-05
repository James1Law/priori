import { describe, it, expect } from 'vitest'
import {
  buildTree,
  flattenTree,
  getAncestors,
  getDescendants,
  getDirectChildren,
  countDescendants,
  getDeepestDescendantLevel,
  canReparent,
  canAddChild,
  getRolledUpEstimate,
  getRolledUpScore,
  hasChildren,
  getStatusRollup,
  isAncestorOf,
} from '../../src/lib/hierarchy'
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
    roadmap_row: 0, start_date: null, end_date: null,
    story_points: null,
    effort_estimate: null,
    parent_item_id: null,
    item_level: 0 as ItemLevel,
    ...overrides,
  }
}

// ============================================
// Sample data: a 3-level hierarchy
// Goal A (level 0)
//   Initiative A1 (level 1)
//     Epic A1a (level 2)
//     Epic A1b (level 2)
//   Initiative A2 (level 1)
// Goal B (level 0, standalone)
// ============================================
const sampleItems: ItemWithScore[] = [
  makeItem('A', { item_level: 0, position: 0, backlog_position: 0 }),
  makeItem('A1', { item_level: 1, parent_item_id: 'A', position: 0, backlog_position: 0 }),
  makeItem('A1a', { item_level: 2, parent_item_id: 'A1', position: 0, backlog_position: 0 }),
  makeItem('A1b', { item_level: 2, parent_item_id: 'A1', position: 1, backlog_position: 1 }),
  makeItem('A2', { item_level: 1, parent_item_id: 'A', position: 1, backlog_position: 1 }),
  makeItem('B', { item_level: 0, position: 1, backlog_position: 1 }),
]

describe('buildTree', () => {
  it('builds a tree from flat items', () => {
    const tree = buildTree(sampleItems)
    expect(tree).toHaveLength(2) // A, B
    expect(tree[0].id).toBe('A')
    expect(tree[0].children).toHaveLength(2) // A1, A2
    expect(tree[0].children[0].id).toBe('A1')
    expect(tree[0].children[0].children).toHaveLength(2) // A1a, A1b
    expect(tree[0].children[1].id).toBe('A2')
    expect(tree[0].children[1].children).toHaveLength(0)
    expect(tree[1].id).toBe('B')
    expect(tree[1].children).toHaveLength(0)
  })

  it('handles empty array', () => {
    expect(buildTree([])).toEqual([])
  })

  it('handles flat items (no parents)', () => {
    const flat = [makeItem('X'), makeItem('Y')]
    const tree = buildTree(flat)
    expect(tree).toHaveLength(2)
    expect(tree[0].children).toEqual([])
  })

  it('sorts children by backlog_position', () => {
    const items = [
      makeItem('P', { item_level: 0 }),
      makeItem('C2', { item_level: 1, parent_item_id: 'P', backlog_position: 2 }),
      makeItem('C1', { item_level: 1, parent_item_id: 'P', backlog_position: 0 }),
      makeItem('C3', { item_level: 1, parent_item_id: 'P', backlog_position: 1 }),
    ]
    const tree = buildTree(items)
    expect(tree[0].children.map((c) => c.id)).toEqual(['C1', 'C3', 'C2'])
  })

  it('orphaned items (parent not in list) become roots', () => {
    const items = [
      makeItem('X', { item_level: 1, parent_item_id: 'missing-parent' }),
    ]
    const tree = buildTree(items)
    expect(tree).toHaveLength(1)
    expect(tree[0].id).toBe('X')
  })
})

describe('flattenTree', () => {
  it('flattens tree in depth-first order', () => {
    const tree = buildTree(sampleItems)
    const flat = flattenTree(tree)
    expect(flat.map((i) => i.id)).toEqual(['A', 'A1', 'A1a', 'A1b', 'A2', 'B'])
  })

  it('respects expand state', () => {
    const tree = buildTree(sampleItems)
    const expanded = new Set(['A']) // Only A is expanded (A1 is not)
    const flat = flattenTree(tree, expanded)
    // A is expanded, so A1 and A2 are visible
    // A1 is NOT expanded, so A1a and A1b are hidden
    expect(flat.map((i) => i.id)).toEqual(['A', 'A1', 'A2', 'B'])
  })

  it('shows everything when no expandedIds provided', () => {
    const tree = buildTree(sampleItems)
    const flat = flattenTree(tree)
    expect(flat).toHaveLength(6)
  })

  it('hides all children when nothing is expanded', () => {
    const tree = buildTree(sampleItems)
    const expanded = new Set<string>() // Nothing expanded
    const flat = flattenTree(tree, expanded)
    // Only root items visible
    expect(flat.map((i) => i.id)).toEqual(['A', 'B'])
  })
})

describe('getAncestors', () => {
  it('returns ancestors from parent to root', () => {
    const ancestors = getAncestors('A1a', sampleItems)
    expect(ancestors.map((a) => a.id)).toEqual(['A1', 'A'])
  })

  it('returns empty for root items', () => {
    expect(getAncestors('A', sampleItems)).toEqual([])
  })

  it('returns empty for items not in the list', () => {
    expect(getAncestors('nonexistent', sampleItems)).toEqual([])
  })
})

describe('getDescendants', () => {
  it('returns all descendants', () => {
    const desc = getDescendants('A', sampleItems)
    expect(desc.map((d) => d.id).sort()).toEqual(['A1', 'A1a', 'A1b', 'A2'])
  })

  it('returns direct children for leaf-like parents', () => {
    const desc = getDescendants('A1', sampleItems)
    expect(desc.map((d) => d.id).sort()).toEqual(['A1a', 'A1b'])
  })

  it('returns empty for leaf items', () => {
    expect(getDescendants('A1a', sampleItems)).toEqual([])
  })

  it('returns empty for standalone items', () => {
    expect(getDescendants('B', sampleItems)).toEqual([])
  })
})

describe('getDirectChildren', () => {
  it('returns only direct children', () => {
    const children = getDirectChildren('A', sampleItems)
    expect(children.map((c) => c.id).sort()).toEqual(['A1', 'A2'])
  })

  it('returns empty for leaf items', () => {
    expect(getDirectChildren('A1a', sampleItems)).toEqual([])
  })
})

describe('countDescendants', () => {
  it('counts all descendants recursively', () => {
    expect(countDescendants('A', sampleItems)).toBe(4) // A1, A1a, A1b, A2
  })

  it('returns 0 for leaf items', () => {
    expect(countDescendants('B', sampleItems)).toBe(0)
  })
})

describe('getDeepestDescendantLevel', () => {
  it('returns deepest level among descendants', () => {
    expect(getDeepestDescendantLevel('A', sampleItems)).toBe(2) // A1a/A1b at level 2
  })

  it('returns own level for leaf items', () => {
    expect(getDeepestDescendantLevel('A1a', sampleItems)).toBe(2)
  })
})

describe('canReparent', () => {
  it('allows reparenting within depth limits', () => {
    // Move B (level 0, no children) under A1 (level 1) → would become level 2
    expect(canReparent('B', 'A1', sampleItems)).toBe(true)
  })

  it('prevents reparenting that would exceed max depth', () => {
    // Create items at deeper levels
    const deepItems = [
      makeItem('root', { item_level: 0 }),
      makeItem('L1', { item_level: 1, parent_item_id: 'root' }),
      makeItem('L2', { item_level: 2, parent_item_id: 'L1' }),
      makeItem('L3', { item_level: 3, parent_item_id: 'L2' }),
      makeItem('target', { item_level: 3 }), // Reparent under this → child would be level 4
      makeItem('itemWithChild', { item_level: 0 }),
      makeItem('child', { item_level: 1, parent_item_id: 'itemWithChild' }),
    ]
    // Moving itemWithChild (has child at level 1) under target (level 3)
    // would make itemWithChild level 4 and child level 5 — exceeds max
    expect(canReparent('itemWithChild', 'target', deepItems)).toBe(false)
  })

  it('allows reparenting a standalone item under a level 3 parent', () => {
    const items = [
      makeItem('parent', { item_level: 3 }),
      makeItem('standalone', { item_level: 0 }),
    ]
    // standalone under parent → becomes level 4 (Subtask), valid
    expect(canReparent('standalone', 'parent', items)).toBe(true)
  })

  it('prevents reparenting under a level 4 item', () => {
    const items = [
      makeItem('parent', { item_level: 4 as ItemLevel }),
      makeItem('standalone', { item_level: 0 }),
    ]
    expect(canReparent('standalone', 'parent', items)).toBe(false)
  })

  it('returns false for nonexistent target', () => {
    expect(canReparent('B', 'nonexistent', sampleItems)).toBe(false)
  })
})

describe('canAddChild', () => {
  it('returns true for levels 0-3', () => {
    expect(canAddChild(makeItem('x', { item_level: 0 }))).toBe(true)
    expect(canAddChild(makeItem('x', { item_level: 3 }))).toBe(true)
  })

  it('returns false for level 4', () => {
    expect(canAddChild(makeItem('x', { item_level: 4 as ItemLevel }))).toBe(false)
  })
})

describe('getRolledUpEstimate', () => {
  it('sums leaf-level effort estimates', () => {
    const items = [
      makeItem('P', { item_level: 0 }),
      makeItem('C1', { item_level: 1, parent_item_id: 'P', effort_estimate: 5 }),
      makeItem('C2', { item_level: 1, parent_item_id: 'P', effort_estimate: 3 }),
    ]
    expect(getRolledUpEstimate('P', items)).toBe(8)
  })

  it('only counts leaf items, not intermediate parents', () => {
    const items = [
      makeItem('P', { item_level: 0 }),
      makeItem('M', { item_level: 1, parent_item_id: 'P', effort_estimate: 10 }),
      makeItem('L1', { item_level: 2, parent_item_id: 'M', effort_estimate: 3 }),
      makeItem('L2', { item_level: 2, parent_item_id: 'M', effort_estimate: 7 }),
    ]
    // M has children, so M's own estimate is NOT counted. Only L1 + L2 = 10
    expect(getRolledUpEstimate('P', items)).toBe(10)
  })

  it('returns null for items with no children', () => {
    expect(getRolledUpEstimate('B', sampleItems)).toBeNull()
  })

  it('returns null when no descendants have estimates', () => {
    expect(getRolledUpEstimate('A', sampleItems)).toBeNull() // all estimates are null
  })
})

describe('getStatusRollup', () => {
  it('counts leaf statuses', () => {
    const items = [
      makeItem('P', { item_level: 0 }),
      makeItem('C1', { item_level: 1, parent_item_id: 'P', status: 'done' }),
      makeItem('C2', { item_level: 1, parent_item_id: 'P', status: 'in_progress' }),
      makeItem('C3', { item_level: 1, parent_item_id: 'P', status: 'todo' }),
    ]
    const rollup = getStatusRollup('P', items)
    expect(rollup).toEqual({ todo: 1, in_progress: 1, done: 1, total: 3 })
  })

  it('only counts leaf items', () => {
    const items = [
      makeItem('P', { item_level: 0 }),
      makeItem('M', { item_level: 1, parent_item_id: 'P', status: 'in_progress' }),
      makeItem('L1', { item_level: 2, parent_item_id: 'M', status: 'done' }),
      makeItem('L2', { item_level: 2, parent_item_id: 'M', status: 'done' }),
    ]
    const rollup = getStatusRollup('P', items)
    // Only L1 and L2 are leaves, not M
    expect(rollup).toEqual({ todo: 0, in_progress: 0, done: 2, total: 2 })
  })
})

describe('isAncestorOf', () => {
  it('returns true for direct parent', () => {
    expect(isAncestorOf('A', 'A1', sampleItems)).toBe(true)
  })

  it('returns true for grandparent', () => {
    expect(isAncestorOf('A', 'A1a', sampleItems)).toBe(true)
  })

  it('returns false for non-ancestor', () => {
    expect(isAncestorOf('B', 'A1', sampleItems)).toBe(false)
  })

  it('returns false for self', () => {
    expect(isAncestorOf('A', 'A', sampleItems)).toBe(false)
  })
})

describe('getRolledUpScore', () => {
  it('returns average score of scored leaf descendants', () => {
    const items = [
      makeItem('parent', { item_level: 0 as ItemLevel }),
      makeItem('child1', { parent_item_id: 'parent', item_level: 1 as ItemLevel, score: { id: 's1', item_id: 'child1', framework: 'rice', criteria: {}, calculated_score: 10 } }),
      makeItem('child2', { parent_item_id: 'parent', item_level: 1 as ItemLevel, score: { id: 's2', item_id: 'child2', framework: 'rice', criteria: {}, calculated_score: 20 } }),
    ]
    const result = getRolledUpScore('parent', items)
    expect(result.score).toBe(15) // (10 + 20) / 2
  })

  it('ignores unscored leaves in average', () => {
    const items = [
      makeItem('parent', { item_level: 0 as ItemLevel }),
      makeItem('child1', { parent_item_id: 'parent', item_level: 1 as ItemLevel, score: { id: 's1', item_id: 'child1', framework: 'rice', criteria: {}, calculated_score: 12 } }),
      makeItem('child2', { parent_item_id: 'parent', item_level: 1 as ItemLevel }),
    ]
    const result = getRolledUpScore('parent', items)
    expect(result.score).toBe(12) // only child1 is scored
  })

  it('returns null when no descendants are scored', () => {
    const items = [
      makeItem('parent', { item_level: 0 as ItemLevel }),
      makeItem('child1', { parent_item_id: 'parent', item_level: 1 as ItemLevel }),
    ]
    const result = getRolledUpScore('parent', items)
    expect(result.score).toBeNull()
  })

  it('returns null for items with no children', () => {
    const items = [makeItem('leaf', { item_level: 0 as ItemLevel })]
    const result = getRolledUpScore('leaf', items)
    expect(result.score).toBeNull()
  })

  it('only averages leaf items, not intermediate parents', () => {
    const items = [
      makeItem('grandparent', { item_level: 0 as ItemLevel }),
      makeItem('parent', { parent_item_id: 'grandparent', item_level: 1 as ItemLevel, score: { id: 's1', item_id: 'parent', framework: 'rice', criteria: {}, calculated_score: 99 } }),
      makeItem('leaf1', { parent_item_id: 'parent', item_level: 2 as ItemLevel, score: { id: 's2', item_id: 'leaf1', framework: 'rice', criteria: {}, calculated_score: 10 } }),
      makeItem('leaf2', { parent_item_id: 'parent', item_level: 2 as ItemLevel, score: { id: 's3', item_id: 'leaf2', framework: 'rice', criteria: {}, calculated_score: 20 } }),
    ]
    const result = getRolledUpScore('grandparent', items)
    expect(result.score).toBe(15) // (10 + 20) / 2, parent's 99 is ignored
  })

  it('returns highest MoSCoW category among leaves', () => {
    const items = [
      makeItem('parent', { item_level: 0 as ItemLevel }),
      makeItem('child1', { parent_item_id: 'parent', item_level: 1 as ItemLevel, score: { id: 's1', item_id: 'child1', framework: 'moscow', criteria: { category: 'could' }, calculated_score: 0 } }),
      makeItem('child2', { parent_item_id: 'parent', item_level: 1 as ItemLevel, score: { id: 's2', item_id: 'child2', framework: 'moscow', criteria: { category: 'must' }, calculated_score: 0 } }),
    ]
    const result = getRolledUpScore('parent', items)
    expect(result.moscowCategory).toBe('must')
  })

  it('returns null moscowCategory when no children have categories', () => {
    const items = [
      makeItem('parent', { item_level: 0 as ItemLevel }),
      makeItem('child1', { parent_item_id: 'parent', item_level: 1 as ItemLevel }),
    ]
    const result = getRolledUpScore('parent', items)
    expect(result.moscowCategory).toBeNull()
  })
})

describe('hasChildren', () => {
  it('returns true for parent items', () => {
    const items = [
      makeItem('parent'),
      makeItem('child', { parent_item_id: 'parent' }),
    ]
    expect(hasChildren('parent', items)).toBe(true)
  })

  it('returns false for leaf items', () => {
    const items = [makeItem('leaf')]
    expect(hasChildren('leaf', items)).toBe(false)
  })
})
