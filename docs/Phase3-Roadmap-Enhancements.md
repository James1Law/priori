# Phase 3: Roadmap Grid Enhancements

## Overview

This phase enhances the Roadmap view with a **4-quadrant grid system** that allows items to be positioned with finer granularity than the current period-based approach. Items can now start and end at any quadrant boundary, enabling cross-period positioning without being constrained to full period boundaries.

## Current State

- Items are positioned using `roadmap_start_period` and `roadmap_end_period` (FK to `roadmap_periods`)
- Items must align to full period boundaries
- Each period has a configurable `width` (1-4) for visual sizing
- Items can span multiple consecutive periods

## New 4-Quadrant System

### Concept

Each period is divided into 4 quadrants. Instead of referencing periods directly, items reference **absolute quadrant indices**:

- Period 1 (position 0) = quadrants 0, 1, 2, 3
- Period 2 (position 1) = quadrants 4, 5, 6, 7
- Period 3 (position 2) = quadrants 8, 9, 10, 11
- And so on...

This allows an item to:
- Start at quadrant 2 of "Now" and end at quadrant 1 of "Next" (crossing the period boundary mid-way)
- Occupy just 2 quadrants within a single period
- Span any arbitrary range of quadrants across multiple periods

### Visual Representation

```
Period:    |     Now     |     Next    |    Later    |
Quadrants: | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |10|11|
           |---|---|---|---|---|---|---|---|---|---|--|--|
Item A:        [=========]                              (quads 1-3)
Item B:                    [=================]          (quads 4-9, crosses periods)
Item C:                                    [===]        (quads 8-9, partial period)
```

The grid displays:
- **Solid lines** at period boundaries
- **Dotted lines** at quadrant boundaries within periods

## Data Model Changes

### Database Migration

```sql
-- Add quadrant-based columns
ALTER TABLE items
ADD COLUMN roadmap_start_quadrant INTEGER;

ALTER TABLE items
ADD COLUMN roadmap_end_quadrant INTEGER;

-- Migrate existing data (convert period references to quadrants)
-- Items spanning period N to M become quadrant N*4 to (M+1)*4-1
UPDATE items
SET
  roadmap_start_quadrant = (
    SELECT p.position * 4
    FROM roadmap_periods p
    WHERE p.id = items.roadmap_start_period
  ),
  roadmap_end_quadrant = (
    SELECT (p.position + 1) * 4 - 1
    FROM roadmap_periods p
    WHERE p.id = items.roadmap_end_period
  )
WHERE roadmap_start_period IS NOT NULL;

-- After migration is verified, drop old columns
-- ALTER TABLE items DROP COLUMN roadmap_start_period;
-- ALTER TABLE items DROP COLUMN roadmap_end_period;
```

### TypeScript Types

```typescript
interface Item {
  // ... existing fields
  roadmap_start_quadrant: number | null  // Absolute quadrant index (0-based)
  roadmap_end_quadrant: number | null    // Inclusive end quadrant
}
```

## Implementation Plan

### Step 1: Database Schema Update ✅
- [x] Create migration `007_add_quadrant_columns.sql`
- [x] Add `roadmap_start_quadrant` and `roadmap_end_quadrant` columns
- [x] Write migration script to convert existing period-based data
- [x] Update TypeScript types in `src/types/database.ts`

### Step 2: Update RoadmapView Grid Rendering ✅
- [x] Modify grid to show quadrant divisions (dotted lines within periods, solid at boundaries)
- [x] Update period headers to span their 4 quadrants
- [x] Calculate item positions based on quadrant indices
- [x] Update `getItemBarStyle()` to use quadrant-based positioning

### Step 3: Update Drag-and-Drop Positioning ✅
- [x] Modify `getQuadrantAtPosition()` to return quadrant index
- [x] Update resize handlers to snap to quadrant boundaries
- [x] Update move handler to preserve item width in quadrants
- [x] Add ghost preview showing full 4-quadrant drop zone when dragging items in

### Step 4: Update Scheduling Logic ✅
- [x] Modify `onScheduleItem` to accept quadrant indices
- [x] Update SessionPage with new scheduling logic
- [x] Handle edge cases (item extends beyond available quadrants)

### Step 5: Handle Period Width Changes ✅
- [x] Removed period width controls - each period is now fixed at 4 quadrants
- [x] This simplifies the mental model and aligns with the quadrant system

### Step 6: Backward Compatibility & Migration ✅
- [x] Migration script converts existing period-based data to quadrants
- [x] Old period reference columns kept for backward compatibility
- [x] New quadrant columns used for all positioning

### Step 7: Testing ✅
- [x] Unit tests updated for quadrant-based mock data
- [x] All 232 unit tests passing

### Step 8: Polish & Edge Cases ✅
- [x] Handle orphaned items when periods are deleted (items cleared when their period is deleted)
- [x] Ghost preview shows full 4-quadrant drop zone during drag
- [x] Info message "Items are sorted by start position" below timeline
- [x] Empty state message updated for when no periods exist
- [x] Mobile: Roadmap button now clickable, shows placeholder message

## Additional Enhancement Ideas

### Row Management (Swimlanes)
Allow multiple items on the same row when their quadrant ranges don't overlap. This maximises vertical space usage and allows parallel workstreams to be visualised.

### Snap-to-Grid Toggle
Add a toggle to switch between:
- **Snap mode**: Items snap to nearest quadrant boundary (default)
- **Free mode**: Items can be positioned anywhere (for advanced users)

### Keyboard Controls
- Arrow keys to nudge selected item by one quadrant
- Shift+Arrow to resize by one quadrant
- Tab to cycle through items

### Visual Enhancements
- Highlight quadrant boundaries on hover during drag
- Show "ghost" preview of item position while dragging
- Colour-code quadrants by period for easier visual scanning

## Design Mockup

See: `plans/roadmap-grid-enhancement.mockup.html`

## Success Criteria

1. Items can be positioned at any quadrant boundary
2. Items can span across period boundaries without alignment constraints
3. Existing scheduled items are migrated without data loss
4. Drag-and-drop interactions are smooth and intuitive
5. All existing E2E tests continue to pass
6. New E2E tests cover quadrant-based positioning

## Open Questions

1. **Period width behaviour**: If a period's width changes (e.g., from 4 to 2), should items within that period:
  - Scale proportionally (item spanning quads 0-1 stays at 0-1, but now represents less visual width)?
  - Maintain absolute quadrant indices (potentially extending beyond the period)?
  - Be flagged for user review?

2. **Minimum item width**: Should items have a minimum width of 1 quadrant, or can they be zero-width markers?

3. **Period deletion**: When a period is deleted, what happens to items spanning that period? Current behaviour makes them "orphaned" - should this change?

---

*Created: 2026-01-16*
*Status: COMPLETE*
*Last updated: 2026-01-16*
