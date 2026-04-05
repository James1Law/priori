---
planStatus:
  planId: plan-date-based-roadmap
  title: Date-Based Gantt Roadmap
  status: draft
  planType: feature
  priority: high
  owner: james
  tags:
    - roadmap
    - gantt
    - dates
    - hierarchy
  created: "2026-04-04"
  updated: "2026-04-04T10:30:00.000Z"
  progress: 0
---

# Date-Based Gantt Roadmap

## Goals
- Replace the period/quadrant roadmap with a date-based Gantt chart (like Aha!)
- Items have real `start_date` and `end_date` fields, editable anywhere (drawer, backlog, roadmap drag)
- Zoomable/pannable timeline with presets (Fit, 3M, 6M, 1Y) and custom date range
- Maintain all hierarchy constraints (children within parents, parent auto-contains children)
- Clean up the period/quadrant system entirely

## Overview

The current roadmap uses an abstract "period + quadrant" model (Now/Next/Later with 4 sub-slots each). This is limiting — it doesn't convey duration, can't represent real timelines, and the drag UX has multiple bugs. We're replacing it with a proper date-based Gantt chart where items have calendar dates and the timeline scales to show weeks/months.

**Mockup:** `plans/date-based-roadmap.mockup.html`

## Phase 1: Database Migration & Types

### 1.1 New migration (`supabase/018_date_based_roadmap.sql`)
```sql
-- Add date fields to items
ALTER TABLE items ADD COLUMN start_date date;
ALTER TABLE items ADD COLUMN end_date date;

-- Add roadmap view settings to sessions
ALTER TABLE sessions ADD COLUMN roadmap_zoom text DEFAULT 'fit';
ALTER TABLE sessions ADD COLUMN roadmap_start_date date;
ALTER TABLE sessions ADD COLUMN roadmap_end_date date;
```

### 1.2 Update TypeScript types (`src/types/database.ts`)
- Add `start_date: string | null` and `end_date: string | null` to `Item` interface
- Add `roadmap_zoom`, `roadmap_start_date`, `roadmap_end_date` to `Session` interface
- Keep old quadrant fields for now (don't break anything during migration)

### 1.3 Data migration consideration
- Existing quadrant data doesn't map cleanly to dates — just leave old fields as-is
- New date fields start null; users set dates going forward
- Old quadrant fields can be removed in a later cleanup migration

## Phase 2: Date Hierarchy Utilities

### 2.1 New utility: `src/lib/roadmap-dates.ts`
Replace the quadrant-based functions in `roadmap-hierarchy.ts` with date-based equivalents:

- **`canResizeDateChild(itemId, newStart, newEnd, items)`** — child dates must be within all ancestor date bounds
- **`canResizeDateParent(itemId, newStart, newEnd, items)`** — parent dates must contain all descendant date spans
- **`getDateProportionalMoves(parentId, daysDelta, items)`** — shift all descendants by N days when parent moves
- **`getParentDateSpan(parentId, items)`** — min start / max end across all scheduled descendants
- **`getRoadmapDateTree(items, expandedIds)`** — same tree logic as current, but using date fields for "scheduled" check
- **`getDateUnscheduledGroups(items)`** — items where `start_date` is null

### 2.2 Pixel ↔ Date mapping utility
- `dateToPixel(date, viewStart, viewEnd, containerWidth)` → number
- `pixelToDate(px, viewStart, viewEnd, containerWidth)` → Date
- `getViewRange(items, zoom, customStart?, customEnd?)` → { start: Date, end: Date }
  - `fit`: min(start_dates) - 7 days to max(end_dates) + 7 days, or today→today+1month if no dates
  - `3m`: today - 2 weeks → today + 2.5 months
  - `6m`: today - 1 month → today + 5 months
  - `1y`: today - 1 month → today + 11 months
  - `custom`: use provided dates

### 2.3 Timeline header generation
- `getTimelineMonths(viewStart, viewEnd)` → month labels with pixel widths
- `getTimelineWeeks(viewStart, viewEnd)` → week labels (hidden at 1Y zoom for cleanliness)

## Phase 3: Rewrite RoadmapView Component

### 3.1 New `RoadmapView.tsx` (complete rewrite)
**Layout:** Split panel — fixed-width left panel (item names) + scrollable right panel (timeline)

**Left panel:**
- Item names with hierarchy indentation (same expand/collapse as current)
- Level chips (G/I/E/S)
- Click to open item drawer

**Right panel — Timeline header:**
- Top row: month labels
- Bottom row: week number labels (hidden in 1Y zoom)
- Grid lines at week/month boundaries

**Right panel — Timeline body:**
- Bars positioned using `dateToPixel()` for left/width
- Bar colours by level (same gradient scheme as current)
- Today marker (red vertical line)
- Resize handles on bar edges
- Hover → shadow; active drag → ring

**Toolbar (above gantt):**
- Left: expand/collapse toggle, item count + date range summary
- Right: start date input, end date input, zoom presets (3M, 6M, 1Y, Fit)
- Date inputs auto-switch to Custom mode when edited
- Preset buttons switch zoom and clear custom dates

### 3.2 Drag interactions (same approach as current, but date-based)
- **Move:** mousedown on bar body → track mouse delta → convert px delta to day delta → preview new dates → save on mouseup
- **Resize-start:** mousedown on left handle → change start_date only
- **Resize-end:** mousedown on right handle → change end_date only
- **Hierarchy constraints:** enforced during drag preview (same clamp logic, dates not quadrants)
- **Click suppression after drag:** use the `wasDraggingRef` pattern we just added

### 3.3 Unscheduled panel
- Below the timeline grid
- Shows items with no `start_date`/`end_date`
- Chips grouped by parent (same as current)
- Click chip → open item drawer to set dates (no drag-to-timeline needed initially; can add later)

## Phase 4: Update Item Drawer

### 4.1 Add date pickers to `ItemDrawer.tsx`
- Replace the "Period" dropdown with a "Schedule" section
- Two date inputs: Start date, End date
- Helper text showing parent date bounds (if item has a parent with dates)
- Clearing both dates = unscheduling the item
- Validation: end_date >= start_date, dates within parent bounds, parent dates contain all children

### 4.2 Hierarchy-aware validation on save
- If setting dates on a child: validate within ancestor bounds
- If narrowing dates on a parent: validate still contains all children
- Show inline error message if dates would violate hierarchy

## Phase 5: Update BacklogList

### 5.1 Replace period badge with date display
- Currently shows "Now" / "Next" / "Later" badge in backlog rows
- Replace with compact date range: "6 Apr – 24 Apr" or "—" if unscheduled
- Click the date range to open item drawer (same as current period badge click)

### 5.2 Update bulk actions
- Remove "Assign Period" dropdown from action bar
- Optionally add "Set Dates" bulk action later (not MVP — can just use drawer)

### 5.3 Update filters
- Remove period filter from BacklogToolbar
- Replace `onRoadmap` filter: true = has start_date, false = no start_date
- Remove period dropdown filter entirely

## Phase 6: Update SessionPage Handlers

### 6.1 Replace schedule/move/unschedule handlers
- **handleScheduleItem** → **handleSetItemDates(itemId, startDate, endDate)**
  - Validates hierarchy constraints
  - Updates item + constrains descendants if needed
  - Optimistic local state update
- **handleMoveItem** → **handleMoveItemDates(itemId, newStart, newEnd)**
  - Calculates day delta, shifts all descendants proportionally
  - Uses `getDateProportionalMoves()`
- **handleUnscheduleItem** → **handleClearItemDates(itemId)**
  - Sets start_date = null, end_date = null
- **handleSetRoadmapZoom(zoom, customStart?, customEnd?)**
  - Updates session.roadmap_zoom (and custom dates if applicable)

### 6.2 Update RoadmapView props
```typescript
interface RoadmapViewProps {
  items: ItemWithScore[]
  loading: boolean
  session: Session  // for zoom settings
  onSetItemDates: (itemId: string, startDate: string, endDate: string) => Promise<void>
  onMoveItem: (itemId: string, startDate: string, endDate: string) => Promise<void>
  onClearItemDates: (itemId: string) => Promise<void>
  onSetZoom: (zoom: string, customStart?: string, customEnd?: string) => Promise<void>
  onItemClick: (itemId: string) => void
}
```

## Phase 7: Mobile Roadmap

### 7.1 Replace `MobileRoadmapView` with placeholder
- Delete the existing `MobileRoadmapView.tsx` component
- Show a simple "Roadmap redesign in progress" placeholder on mobile (same pattern as the previous roadmap WIP placeholder)
- Message: "The roadmap is being redesigned. Use desktop for the full experience." with an icon
- Mobile roadmap will get a proper overhaul in a future phase to align with the new desktop Gantt view

### 7.2 Update SessionPage mobile rendering
- The `sm:hidden` / `hidden sm:block` pattern already gates mobile vs desktop
- Ensure the mobile path renders the placeholder, desktop path renders the new Gantt view

## Phase 8: Cleanup

### 8.1 Remove deprecated code
- Delete `useRoadmapPeriods` hook
- Delete `PeriodEditModal`, `PeriodSelector`, `UnscheduledItemsPicker` components
- Delete `MobileRoadmapView` (will need a new mobile approach, but that's a separate task)
- Remove period-related filters from `BacklogToolbar`
- Remove `roadmap-hierarchy.ts` quadrant functions (replaced by `roadmap-dates.ts`)
- Remove period columns from ItemDrawer

### 8.2 Update tests
- Update/rewrite roadmap-related unit tests for date-based logic
- Update backlog tests that reference period badges
- Update any E2E tests that use the roadmap

### 8.3 Future cleanup migration (not now)
- Drop `roadmap_start_quadrant`, `roadmap_end_quadrant`, `roadmap_row` from items
- Drop `roadmap_start_period`, `roadmap_end_period` from items
- Drop `roadmap_periods` table

## Acceptance Criteria

- [ ] Items have `start_date` and `end_date` fields in the database
- [ ] Roadmap shows a Gantt-style timeline with month/week headers
- [ ] Bars positioned by dates, draggable to move and resizable at edges
- [ ] Today marker shown on timeline
- [ ] Zoom presets work (Fit, 3M, 6M, 1Y) + custom date range
- [ ] "Fit" is the default and auto-sizes to contain all scheduled items
- [ ] Empty state shows today → today + 1 month with helpful message
- [ ] Item drawer has start/end date pickers with hierarchy constraint helper text
- [ ] Hierarchy constraints enforced: children within parents, parents contain children
- [ ] Moving a parent moves all descendants by the same day offset
- [ ] Backlog shows date range instead of period badges
- [ ] Unscheduled items (no dates) shown in panel below timeline
- [ ] Mobile roadmap shows "redesign in progress" placeholder
- [ ] Old period/quadrant code removed
- [ ] All existing unit tests pass (updated where needed)
- [ ] Build succeeds with no TypeScript errors

## Implementation Order

1. **Migration + types** (Phase 1) — foundation, no UI changes yet
2. **Date utilities** (Phase 2) — pure functions, fully testable
3. **RoadmapView rewrite** (Phase 3) — the big one, new component
4. **Item Drawer dates** (Phase 4) — editing UX
5. **BacklogList updates** (Phase 5) — replace period references
6. **SessionPage handlers** (Phase 6) — wire it all together
7. **Mobile placeholder** (Phase 7) — simple placeholder while desktop ships
8. **Cleanup** (Phase 8) — remove old code

Each phase is independently shippable (phases 1-2 have no visible impact; phase 3 replaces the view; phases 4-6 polish; phase 7 is quick; phase 8 cleans up).
