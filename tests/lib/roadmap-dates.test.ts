import { describe, it, expect } from 'vitest'
import {
  getParentDateSpan,
  canResizeDateChild,
  canResizeDateParent,
  getDateProportionalMoves,
  getDefaultChildDates,
  formatDisplayDate,
  getRoadmapDateTree,
  getDateUnscheduledGroups,
  dateToPixel,
  pixelToDate,
  getViewRange,
  getTimelineMonths,
  getTimelineWeeks,
} from '../../src/lib/roadmap-dates'
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
    start_date: null,
    end_date: null,
    story_points: null,
    effort_estimate: null,
    parent_item_id: null,
    item_level: 0 as ItemLevel,
    ...overrides,
  }
}

// ============================================
// Sample hierarchy with dates:
// Goal A (level 0) — Apr 1 – May 31
//   Init A1 (level 1) — Apr 1 – Apr 30
//     Epic A1a (level 2) — Apr 1 – Apr 15
//     Epic A1b (level 2) — Apr 16 – Apr 30
//   Init A2 (level 1) — May 1 – May 31
// Goal B (level 0) — May 1 – Jul 31
//   Init B1 (level 1) — Jun 1 – Jul 31
// Flat item C — Apr 1 – Apr 30
// Flat item D — unscheduled
// Goal E (level 0) — unscheduled
//   Init E1 (level 1) — unscheduled
//   Init E2 (level 1) — unscheduled
// ============================================

function makeSampleItems(): ItemWithScore[] {
  return [
    makeItem('A', { item_level: 0, position: 0, start_date: '2026-04-01', end_date: '2026-05-31' }),
    makeItem('A1', { item_level: 1, parent_item_id: 'A', position: 1, start_date: '2026-04-01', end_date: '2026-04-30' }),
    makeItem('A1a', { item_level: 2, parent_item_id: 'A1', position: 2, start_date: '2026-04-01', end_date: '2026-04-15' }),
    makeItem('A1b', { item_level: 2, parent_item_id: 'A1', position: 3, start_date: '2026-04-16', end_date: '2026-04-30' }),
    makeItem('A2', { item_level: 1, parent_item_id: 'A', position: 4, start_date: '2026-05-01', end_date: '2026-05-31' }),
    makeItem('B', { item_level: 0, position: 5, start_date: '2026-05-01', end_date: '2026-07-31' }),
    makeItem('B1', { item_level: 1, parent_item_id: 'B', position: 6, start_date: '2026-06-01', end_date: '2026-07-31' }),
    makeItem('C', { item_level: 0, parent_item_id: null, position: 7, start_date: '2026-04-01', end_date: '2026-04-30' }),
    makeItem('D', { item_level: 0, parent_item_id: null, position: 8 }),
    makeItem('E', { item_level: 0, position: 9 }),
    makeItem('E1', { item_level: 1, parent_item_id: 'E', position: 10 }),
    makeItem('E2', { item_level: 1, parent_item_id: 'E', position: 11 }),
  ]
}

// ============================================
// getParentDateSpan
// ============================================
describe('getParentDateSpan', () => {
  it('returns min start and max end across all scheduled descendants', () => {
    const items = makeSampleItems()
    const span = getParentDateSpan('A', items)
    expect(span).toEqual({ start: '2026-04-01', end: '2026-05-31' })
  })

  it('returns span from deeply nested descendants', () => {
    const items = makeSampleItems()
    const span = getParentDateSpan('A1', items)
    expect(span).toEqual({ start: '2026-04-01', end: '2026-04-30' })
  })

  it('returns null when no descendants are scheduled', () => {
    const items = makeSampleItems()
    const span = getParentDateSpan('E', items)
    expect(span).toBeNull()
  })

  it('returns null for an item with no children', () => {
    const items = makeSampleItems()
    const span = getParentDateSpan('C', items)
    expect(span).toBeNull()
  })

  it('handles partially scheduled children', () => {
    const items = [
      makeItem('P', { item_level: 0, position: 0, start_date: '2026-04-01', end_date: '2026-06-30' }),
      makeItem('C1', { item_level: 1, parent_item_id: 'P', position: 1, start_date: '2026-05-01', end_date: '2026-05-31' }),
      makeItem('C2', { item_level: 1, parent_item_id: 'P', position: 2 }), // unscheduled
    ]
    const span = getParentDateSpan('P', items)
    expect(span).toEqual({ start: '2026-05-01', end: '2026-05-31' })
  })

  it('returns span from grandchildren even if direct children are unscheduled', () => {
    const items = [
      makeItem('G', { item_level: 0, position: 0 }),
      makeItem('I', { item_level: 1, parent_item_id: 'G', position: 1 }),
      makeItem('E', { item_level: 2, parent_item_id: 'I', position: 2, start_date: '2026-04-10', end_date: '2026-05-20' }),
    ]
    const span = getParentDateSpan('G', items)
    expect(span).toEqual({ start: '2026-04-10', end: '2026-05-20' })
  })
})

// ============================================
// canResizeDateChild
// ============================================
describe('canResizeDateChild', () => {
  it('allows resize within parent bounds', () => {
    const items = makeSampleItems()
    // A1a child of A1 (Apr 1 – Apr 30). Resize to Apr 1 – Apr 20 — within parent.
    expect(canResizeDateChild('A1a', '2026-04-01', '2026-04-20', items)).toBe(true)
  })

  it('rejects resize past parent end', () => {
    const items = makeSampleItems()
    // A1a child of A1 (Apr 1 – Apr 30). Resize to Apr 1 – May 15 — exceeds parent.
    expect(canResizeDateChild('A1a', '2026-04-01', '2026-05-15', items)).toBe(false)
  })

  it('rejects resize past parent start', () => {
    const items = makeSampleItems()
    // B1 child of B (May 1 – Jul 31). Resize to Apr 15 – Jul 31 — before parent start.
    expect(canResizeDateChild('B1', '2026-04-15', '2026-07-31', items)).toBe(false)
  })

  it('allows resize to exactly match parent bounds', () => {
    const items = makeSampleItems()
    // A1a child of A1 (Apr 1 – Apr 30). Resize to Apr 1 – Apr 30.
    expect(canResizeDateChild('A1a', '2026-04-01', '2026-04-30', items)).toBe(true)
  })

  it('returns true for flat items (no parent)', () => {
    const items = makeSampleItems()
    expect(canResizeDateChild('C', '2026-01-01', '2026-12-31', items)).toBe(true)
  })

  it('returns true for top-level items with no parent', () => {
    const items = makeSampleItems()
    expect(canResizeDateChild('A', '2026-01-01', '2026-12-31', items)).toBe(true)
  })

  it('validates against grandparent too (multi-level constraint)', () => {
    const items = makeSampleItems()
    // A1a child of A1 (Apr 1 – Apr 30), grandchild of A (Apr 1 – May 31).
    // A1a can't extend past A1 (Apr 30), even though A goes to May 31.
    expect(canResizeDateChild('A1a', '2026-04-01', '2026-05-15', items)).toBe(false)
  })
})

// ============================================
// canResizeDateParent
// ============================================
describe('canResizeDateParent', () => {
  it('allows growing a parent beyond children', () => {
    const items = makeSampleItems()
    // A has children spanning Apr 1 – May 31. Growing to Jan 1 – Dec 31 is fine.
    expect(canResizeDateParent('A', '2026-01-01', '2026-12-31', items)).toBe(true)
  })

  it('rejects shrinking past earliest child', () => {
    const items = makeSampleItems()
    // A has children starting at Apr 1. Shrinking start to Apr 10 cuts off A1a (Apr 1 – Apr 15).
    expect(canResizeDateParent('A', '2026-04-10', '2026-05-31', items)).toBe(false)
  })

  it('rejects shrinking past latest child', () => {
    const items = makeSampleItems()
    // A has children ending at May 31. Shrinking end to May 15 cuts off A2 (May 1 – May 31).
    expect(canResizeDateParent('A', '2026-04-01', '2026-05-15', items)).toBe(false)
  })

  it('allows resize to exactly match children span', () => {
    const items = makeSampleItems()
    // A's children span Apr 1 – May 31 exactly.
    expect(canResizeDateParent('A', '2026-04-01', '2026-05-31', items)).toBe(true)
  })

  it('returns true for items with no scheduled children', () => {
    const items = makeSampleItems()
    expect(canResizeDateParent('E', '2026-04-01', '2026-05-31', items)).toBe(true)
  })

  it('returns true for leaf items (no children at all)', () => {
    const items = makeSampleItems()
    expect(canResizeDateParent('C', '2026-01-01', '2026-12-31', items)).toBe(true)
  })

  it('considers grandchildren bounds too', () => {
    const items = makeSampleItems()
    // A1 has children A1a (Apr 1 – 15) and A1b (Apr 16 – 30). Can't shrink A1 to Apr 5 – 30 (cuts off A1a start).
    expect(canResizeDateParent('A1', '2026-04-05', '2026-04-30', items)).toBe(false)
  })
})

// ============================================
// getDateProportionalMoves
// ============================================
describe('getDateProportionalMoves', () => {
  it('shifts all descendants by the day delta', () => {
    const items = makeSampleItems()
    // Move A by +30 days
    const moves = getDateProportionalMoves('A', 30, items)

    expect(moves).toHaveLength(4) // A1, A1a, A1b, A2

    const a1Move = moves.find((m) => m.itemId === 'A1')
    expect(a1Move).toEqual({ itemId: 'A1', newStart: '2026-05-01', newEnd: '2026-05-30' })

    const a1aMove = moves.find((m) => m.itemId === 'A1a')
    expect(a1aMove).toEqual({ itemId: 'A1a', newStart: '2026-05-01', newEnd: '2026-05-15' })
  })

  it('shifts by negative delta', () => {
    const items = makeSampleItems()
    // Move B by -31 days (B starts May 1)
    const moves = getDateProportionalMoves('B', -31, items)

    const b1Move = moves.find((m) => m.itemId === 'B1')
    expect(b1Move).toEqual({ itemId: 'B1', newStart: '2026-05-01', newEnd: '2026-06-30' })
  })

  it('returns empty array when no descendants', () => {
    const items = makeSampleItems()
    const moves = getDateProportionalMoves('C', 30, items)
    expect(moves).toEqual([])
  })

  it('skips unscheduled descendants', () => {
    const items = makeSampleItems()
    const moves = getDateProportionalMoves('E', 30, items)
    expect(moves).toEqual([])
  })

  it('handles delta of 0', () => {
    const items = makeSampleItems()
    const moves = getDateProportionalMoves('A', 0, items)
    const a1Move = moves.find((m) => m.itemId === 'A1')
    expect(a1Move).toEqual({ itemId: 'A1', newStart: '2026-04-01', newEnd: '2026-04-30' })
  })
})

// ============================================
// getRoadmapDateTree
// ============================================
describe('getRoadmapDateTree', () => {
  it('returns flat list sorted by start date', () => {
    const items = makeSampleItems()
    const tree = getRoadmapDateTree(items, new Set(['A', 'A1', 'B']))

    expect(tree.length).toBeGreaterThan(0)
    // First should be something starting Apr 1
    expect(tree[0].id).toBe('A')
  })

  it('hides children of collapsed parents', () => {
    const items = makeSampleItems()
    const tree = getRoadmapDateTree(items, new Set(['A']))

    const ids = tree.map((i) => i.id)
    expect(ids).toContain('A1')
    expect(ids).toContain('A2')
    expect(ids).not.toContain('A1a')
    expect(ids).not.toContain('A1b')
  })

  it('shows all items when fully expanded', () => {
    const items = makeSampleItems()
    const tree = getRoadmapDateTree(items, new Set(['A', 'A1', 'B', 'E']))

    const ids = tree.map((i) => i.id)
    expect(ids).toContain('A')
    expect(ids).toContain('A1')
    expect(ids).toContain('A1a')
    expect(ids).toContain('A1b')
    expect(ids).toContain('A2')
    expect(ids).toContain('B')
    expect(ids).toContain('B1')
    expect(ids).toContain('C')
  })

  it('includes subtasks (level 4) on roadmap', () => {
    const items = [
      makeItem('G', { item_level: 0, position: 0, start_date: '2026-04-01', end_date: '2026-06-30' }),
      makeItem('S', { item_level: 3, parent_item_id: 'G', position: 1, start_date: '2026-04-01', end_date: '2026-04-30' }),
      makeItem('ST', { item_level: 4, parent_item_id: 'S', position: 2, start_date: '2026-04-01', end_date: '2026-04-15' }),
    ]
    const tree = getRoadmapDateTree(items, new Set(['G', 'S']))
    const ids = tree.map((i) => i.id)
    expect(ids).toContain('G')
    expect(ids).toContain('S')
    expect(ids).toContain('ST')
  })

  it('includes unscheduled children of expanded scheduled parents', () => {
    const items = [
      makeItem('P', { item_level: 0, position: 0, start_date: '2026-04-01', end_date: '2026-05-31' }),
      makeItem('C1', { item_level: 1, parent_item_id: 'P', position: 1, start_date: '2026-04-01', end_date: '2026-04-30' }),
      makeItem('C2', { item_level: 1, parent_item_id: 'P', position: 2 }), // unscheduled
    ]
    const tree = getRoadmapDateTree(items, new Set(['P']))
    const ids = tree.map((i) => i.id)
    expect(ids).toContain('P')
    expect(ids).toContain('C1')
    expect(ids).toContain('C2')
  })
})

// ============================================
// getDateUnscheduledGroups
// ============================================
describe('getDateUnscheduledGroups', () => {
  it('groups unscheduled children under their parent', () => {
    const items = makeSampleItems()
    const groups = getDateUnscheduledGroups(items)

    const eGroup = groups.find((g) => g.parentId === 'E')
    expect(eGroup).toBeDefined()
    expect(eGroup!.parentTitle).toBe('Item E')
    expect(eGroup!.children.map((c) => c.id)).toEqual(expect.arrayContaining(['E1', 'E2']))
  })

  it('puts flat unscheduled items in standalone group', () => {
    const items = makeSampleItems()
    const groups = getDateUnscheduledGroups(items)

    const standalone = groups.find((g) => g.parentId === null)
    expect(standalone).toBeDefined()
    expect(standalone!.children.map((c) => c.id)).toContain('D')
  })

  it('does not include scheduled items', () => {
    const items = makeSampleItems()
    const groups = getDateUnscheduledGroups(items)

    const allIds = groups.flatMap((g) => g.children).map((c) => c.id)
    expect(allIds).not.toContain('A')
    expect(allIds).not.toContain('A1')
    expect(allIds).not.toContain('C')
  })

  it('returns empty groups when everything is scheduled', () => {
    const items = [
      makeItem('A', { item_level: 0, position: 0, start_date: '2026-04-01', end_date: '2026-04-30' }),
      makeItem('B', { item_level: 0, position: 1, start_date: '2026-05-01', end_date: '2026-05-31' }),
    ]
    const groups = getDateUnscheduledGroups(items)
    const allChildren = groups.flatMap((g) => g.children)
    expect(allChildren).toHaveLength(0)
  })

  it('includes subtasks (level 4) in unscheduled groups', () => {
    const items = [
      makeItem('S', { item_level: 3, position: 0 }),
      makeItem('ST', { item_level: 4, parent_item_id: 'S', position: 1 }),
    ]
    const groups = getDateUnscheduledGroups(items)
    const allIds = groups.flatMap((g) => g.children).map((c) => c.id)
    expect(allIds).toContain('ST')
  })
})

// ============================================
// dateToPixel / pixelToDate
// ============================================
describe('dateToPixel', () => {
  it('maps start of view to 0', () => {
    expect(dateToPixel('2026-04-01', '2026-04-01', '2026-04-30', 900)).toBe(0)
  })

  it('maps end of view to container width', () => {
    const px = dateToPixel('2026-04-30', '2026-04-01', '2026-04-30', 900)
    expect(px).toBe(900)
  })

  it('maps mid-point correctly', () => {
    // Apr 1 – Apr 30 = 29 days span. Apr 15 = 14 days in.
    const px = dateToPixel('2026-04-15', '2026-04-01', '2026-04-30', 900)
    const expected = (14 / 29) * 900
    expect(px).toBeCloseTo(expected, 0)
  })

  it('handles dates before view start (negative pixel)', () => {
    const px = dateToPixel('2026-03-25', '2026-04-01', '2026-04-30', 900)
    expect(px).toBeLessThan(0)
  })

  it('handles dates after view end (beyond container)', () => {
    const px = dateToPixel('2026-05-15', '2026-04-01', '2026-04-30', 900)
    expect(px).toBeGreaterThan(900)
  })
})

describe('pixelToDate', () => {
  it('maps 0 to view start', () => {
    expect(pixelToDate(0, '2026-04-01', '2026-04-30', 900)).toBe('2026-04-01')
  })

  it('maps container width to view end', () => {
    expect(pixelToDate(900, '2026-04-01', '2026-04-30', 900)).toBe('2026-04-30')
  })

  it('rounds to nearest date', () => {
    // Mid-point of 29-day span
    const midPx = 450
    const date = pixelToDate(midPx, '2026-04-01', '2026-04-30', 900)
    // Should be around Apr 15-16
    expect(date >= '2026-04-14' && date <= '2026-04-16').toBe(true)
  })
})

// ============================================
// getViewRange
// ============================================
describe('getViewRange', () => {
  it('fit mode auto-sizes to contain all items with padding', () => {
    const items = makeSampleItems()
    const range = getViewRange(items, 'fit')
    // Earliest: Apr 1, latest: Jul 31, so range should include those with padding
    expect(range.start <= '2026-04-01').toBe(true)
    expect(range.end >= '2026-07-31').toBe(true)
  })

  it('fit mode defaults to today + 1 month when no items have dates', () => {
    const items = [makeItem('A'), makeItem('B')]
    const range = getViewRange(items, 'fit')
    // Should have some range (today-ish to today + 1 month-ish)
    expect(range.start).toBeDefined()
    expect(range.end).toBeDefined()
    // End should be after start
    expect(range.end > range.start).toBe(true)
  })

  it('custom mode uses provided dates', () => {
    const items = makeSampleItems()
    const range = getViewRange(items, 'custom', '2026-01-01', '2026-12-31')
    expect(range.start).toBe('2026-01-01')
    expect(range.end).toBe('2026-12-31')
  })

  it('3m mode returns approximately 3-month window', () => {
    const items = makeSampleItems()
    const range = getViewRange(items, '3m')
    const start = new Date(range.start)
    const end = new Date(range.end)
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    // ~90 days give or take
    expect(diffDays).toBeGreaterThan(70)
    expect(diffDays).toBeLessThan(120)
  })

  it('6m mode returns approximately 6-month window', () => {
    const items = makeSampleItems()
    const range = getViewRange(items, '6m')
    const start = new Date(range.start)
    const end = new Date(range.end)
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThan(150)
    expect(diffDays).toBeLessThan(210)
  })

  it('1y mode returns approximately 12-month window', () => {
    const items = makeSampleItems()
    const range = getViewRange(items, '1y')
    const start = new Date(range.start)
    const end = new Date(range.end)
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThan(330)
    expect(diffDays).toBeLessThan(400)
  })
})

// ============================================
// getTimelineMonths
// ============================================
describe('getTimelineMonths', () => {
  it('returns month labels for the view range', () => {
    const months = getTimelineMonths('2026-04-01', '2026-06-30')
    expect(months.length).toBeGreaterThanOrEqual(3)
    expect(months[0].label).toContain('Apr')
    expect(months[months.length - 1].label).toContain('Jun')
  })

  it('includes year in first month and on year boundaries', () => {
    const months = getTimelineMonths('2026-11-01', '2027-02-28')
    // First month should have year
    expect(months[0].label).toContain('2026')
    // Jan 2027 should have year
    const jan = months.find((m) => m.label.includes('Jan'))
    expect(jan?.label).toContain('2027')
  })

  it('each month has a positive width', () => {
    const months = getTimelineMonths('2026-04-01', '2026-06-30')
    for (const m of months) {
      expect(m.widthPercent).toBeGreaterThan(0)
    }
  })

  it('widths sum to approximately 100%', () => {
    const months = getTimelineMonths('2026-04-01', '2026-06-30')
    const total = months.reduce((sum, m) => sum + m.widthPercent, 0)
    expect(total).toBeCloseTo(100, 0)
  })
})

// ============================================
// getTimelineWeeks
// ============================================
describe('getTimelineWeeks', () => {
  it('returns week labels for the view range', () => {
    const weeks = getTimelineWeeks('2026-04-01', '2026-04-30')
    expect(weeks.length).toBeGreaterThanOrEqual(4)
  })

  it('each week has a day-of-month label', () => {
    const weeks = getTimelineWeeks('2026-04-01', '2026-04-30')
    for (const w of weeks) {
      const day = parseInt(w.label)
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(31)
    }
  })

  it('widths sum to approximately 100%', () => {
    const weeks = getTimelineWeeks('2026-04-01', '2026-06-30')
    const total = weeks.reduce((sum, w) => sum + w.widthPercent, 0)
    expect(total).toBeCloseTo(100, 0)
  })
})

describe('formatDisplayDate', () => {
  it('converts YYYY-MM-DD to dd/mm/yyyy', () => {
    expect(formatDisplayDate('2026-04-10')).toBe('10/04/2026')
  })

  it('preserves leading zeros', () => {
    expect(formatDisplayDate('2026-01-05')).toBe('05/01/2026')
  })
})

describe('getDefaultChildDates', () => {
  it('returns parent dates when parent is scheduled', () => {
    const items = [
      makeItem('parent', { start_date: '2026-03-25', end_date: '2026-04-30' }),
    ]
    const result = getDefaultChildDates('parent', items)
    expect(result).toEqual({ start: '2026-03-25', end: '2026-04-30' })
  })

  it('returns today + 1 month when parent has no dates', () => {
    const items = [
      makeItem('parent', { start_date: null, end_date: null }),
    ]
    const result = getDefaultChildDates('parent', items)
    // Should be today-based defaults
    const today = new Date()
    const expectedStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(result.start).toBe(expectedStart)
    // End should be ~1 month later
    expect(result.end > result.start).toBe(true)
  })

  it('returns today + 1 month when parent not found', () => {
    const result = getDefaultChildDates('nonexistent', [])
    const today = new Date()
    const expectedStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(result.start).toBe(expectedStart)
  })

  it('returns today + 1 month when no parentId provided', () => {
    const result = getDefaultChildDates(undefined, [])
    const today = new Date()
    const expectedStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(result.start).toBe(expectedStart)
  })

  it('walks up to scheduled grandparent when parent is unscheduled', () => {
    const items = [
      makeItem('grandparent', { start_date: '2026-02-01', end_date: '2026-06-30' }),
      makeItem('parent', { parent_item_id: 'grandparent', start_date: null, end_date: null }),
    ]
    const result = getDefaultChildDates('parent', items)
    expect(result).toEqual({ start: '2026-02-01', end: '2026-06-30' })
  })

  // Full hierarchy scenarios matching user-reported flows
  it('epic under initiative inherits initiative dates (not goal dates)', () => {
    const items = [
      makeItem('goal', { item_level: 0, start_date: '2026-01-01', end_date: '2026-12-31' }),
      makeItem('init', { item_level: 1, parent_item_id: 'goal', start_date: '2026-03-01', end_date: '2026-06-30' }),
    ]
    // Adding epic under initiative
    const result = getDefaultChildDates('init', items)
    expect(result).toEqual({ start: '2026-03-01', end: '2026-06-30' })
  })

  it('story under epic inherits epic dates (not initiative or goal)', () => {
    const items = [
      makeItem('goal', { item_level: 0, start_date: '2026-01-01', end_date: '2026-12-31' }),
      makeItem('init', { item_level: 1, parent_item_id: 'goal', start_date: '2026-03-01', end_date: '2026-06-30' }),
      makeItem('epic', { item_level: 2, parent_item_id: 'init', start_date: '2026-04-01', end_date: '2026-04-15' }),
    ]
    // Adding story under epic — should get EPIC dates, not initiative
    const result = getDefaultChildDates('epic', items)
    expect(result).toEqual({ start: '2026-04-01', end: '2026-04-15' })
  })

  it('story under epic after epic dates were changed inherits updated epic dates', () => {
    // Simulates: user created epic (inherited init dates), then changed epic dates
    const items = [
      makeItem('goal', { item_level: 0, start_date: '2026-01-01', end_date: '2026-12-31' }),
      makeItem('init', { item_level: 1, parent_item_id: 'goal', start_date: '2026-03-01', end_date: '2026-06-30' }),
      makeItem('epic', { item_level: 2, parent_item_id: 'init', start_date: '2026-05-01', end_date: '2026-05-31' }),
    ]
    const result = getDefaultChildDates('epic', items)
    expect(result).toEqual({ start: '2026-05-01', end: '2026-05-31' })
  })

  it('child under unscheduled parent with scheduled grandparent inherits grandparent dates', () => {
    const items = [
      makeItem('goal', { item_level: 0, start_date: '2026-02-01', end_date: '2026-08-31' }),
      makeItem('init', { item_level: 1, parent_item_id: 'goal', start_date: null, end_date: null }),
    ]
    // Adding epic under unscheduled initiative — walks up to goal
    const result = getDefaultChildDates('init', items)
    expect(result).toEqual({ start: '2026-02-01', end: '2026-08-31' })
  })

  it('falls back to defaults when entire ancestor chain is unscheduled', () => {
    const items = [
      makeItem('goal', { item_level: 0, start_date: null, end_date: null }),
      makeItem('init', { item_level: 1, parent_item_id: 'goal', start_date: null, end_date: null }),
    ]
    const result = getDefaultChildDates('init', items)
    const today = new Date()
    const expectedStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(result.start).toBe(expectedStart)
  })

  it('uses direct parent even when parent dates are narrower than grandparent', () => {
    const items = [
      makeItem('goal', { item_level: 0, start_date: '2026-01-01', end_date: '2026-12-31' }),
      makeItem('init', { item_level: 1, parent_item_id: 'goal', start_date: '2026-06-01', end_date: '2026-06-15' }),
    ]
    // Should inherit the narrow initiative dates, not the wide goal dates
    const result = getDefaultChildDates('init', items)
    expect(result).toEqual({ start: '2026-06-01', end: '2026-06-15' })
  })
})
