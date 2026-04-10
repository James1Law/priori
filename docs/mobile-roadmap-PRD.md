# Mobile Roadmap — Product Requirements Document

## Overview

Replace the "Roadmap redesign in progress" placeholder on mobile with a **view-only pannable Gantt chart**. Users can scroll and zoom the timeline to explore the roadmap, and tap any bar to open the ItemDrawer for editing dates. No drag-and-drop or resize interactions — those remain desktop-only.

**Design mockup:** `plans/mobile-roadmap-readonly.mockup.html` (Option A)

## Motivation

The roadmap is one of five core modules but is currently inaccessible on mobile. Previous attempts at a stacked/drag-and-drop mobile UI were abandoned because touch-based drag interactions on small bars (8px resize handles, 18–28px bar heights) are far below Apple's 44px minimum touch target. The desktop Gantt uses `onMouseDown` only — no touch event handlers exist.

Rather than trying to make drag-and-drop work on touch, we simplify: **view the Gantt, edit dates through the form**. This gives mobile users full access to the roadmap data while keeping the interaction model reliable.

## Design Decisions

| Decision | Rationale |
| --- | --- |
| View-only Gantt (no drag/resize) | Desktop Gantt has no touch handlers, targets too small for fingers |
| ItemDrawer for editing (not bottom sheet) | Consistent with backlog, capacity, prioritisation, estimation — all use ItemDrawer |
| View-only in both portrait AND landscape | Desktop Gantt can't be reused for touch even in landscape (same touch target issues) |
| Same zoom presets (3M/6M/1Y/Fit) | Reuse existing `getViewRange()` logic, familiar to users |
| Touch-capability detection (not just width) | Prevent landscape phones from showing interactive desktop Gantt |

## Scope

### In Scope
- New `RoadmapMobileView` component — read-only Gantt with horizontal scroll
- Pinned item labels on the left (sticky positioning)
- Colour-coded bars by hierarchy level (same palette as desktop)
- Hierarchy indentation and expand/collapse toggles
- Today marker (red vertical line)
- Zoom preset pills (3M / 6M / 1Y / Fit)
- Unscheduled items section at bottom
- Tap bar or item label → opens existing ItemDrawer (date editing)
- Tap unscheduled item → opens ItemDrawer (set dates)
- Landscape support (wider Gantt, same view-only behaviour)
- Touch device detection to gate desktop vs mobile Gantt
- Dismissable "Scroll to pan" hint on first visit

### Out of Scope
- Drag-and-drop or resize on mobile
- Custom date range zoom on mobile (just the 4 presets)
- Pinch-to-zoom (rely on zoom presets instead — pinch conflicts with browser zoom)
- Dependencies or milestones (not in desktop either)
- New database migrations (reads existing `start_date`/`end_date` fields)

---

## Implementation Steps

All steps follow TDD: write failing tests first, then implement, then verify tests pass. **Do not push to main until explicitly told to.**

### Step 1: Touch Detection Utility

Create a utility to detect touch-capable devices, used to decide which Gantt component to render.

**File:** `src/lib/device.ts`

```typescript
export function isTouchDevice(): boolean
```

**Acceptance Criteria:**
- [ ] Returns `true` when `'ontouchstart' in window` or `navigator.maxTouchPoints > 0`
- [ ] Returns `false` on desktop browsers without touch
- [ ] Exported and importable from `src/lib/device.ts`

**Tests:**
- Mock `window.ontouchstart` → returns `true`
- Mock `navigator.maxTouchPoints = 0`, no `ontouchstart` → returns `false`
- Edge case: touch-enabled laptop (returns `true` — acceptable, view-only is safe fallback)

---

### Step 2: RoadmapMobileView Component — Empty Shell

Create the component with the outer structure: zoom bar, scrollable container, pinned label column, timeline area. No data rendering yet.

**File:** `src/components/RoadmapMobileView.tsx`

**Props interface:**
```typescript
interface RoadmapMobileViewProps {
  items: ItemWithScore[]
  session: Session
  onItemClick: (itemId: string) => void
  onSetZoom: (zoom: string) => Promise<void>
}
```

**Acceptance Criteria:**
- [ ] Renders zoom preset pills (3M, 6M, 1Y, Fit) with active state matching `session.roadmap_zoom`
- [ ] Tapping a zoom pill calls `onSetZoom` with the preset value
- [ ] Contains a horizontally scrollable container (`overflow-x: auto`)
- [ ] Has a left column area (sticky, for item labels) and a right area (for timeline)
- [ ] Renders a dismissable hint banner: "Scroll to pan →" (stored in localStorage)

**Tests:**
- Renders all 4 zoom pills
- Active zoom pill matches session zoom setting
- Clicking a pill calls `onSetZoom` with correct value
- Hint banner renders on first view
- Hint banner hidden after dismissal (mock localStorage)

---

### Step 3: Timeline Header (Months + Weeks)

Render month and week labels in the timeline header area, reusing existing `getTimelineMonths()` and `getTimelineWeeks()` utilities.

**Acceptance Criteria:**
- [ ] Month labels display with proportional widths across the timeline
- [ ] Week labels display below months (hidden on 1Y zoom, same as desktop)
- [ ] Timeline header is sticky (stays visible while scrolling vertically)
- [ ] Header width scales with zoom level: ~600px for 3M, ~900px for 6M, ~1400px for 1Y

**Tests:**
- Correct month labels render for a 6M view range
- Week labels render for 3M/6M, hidden for 1Y
- Header re-renders when zoom changes

---

### Step 4: Item Rows with Pinned Labels

Render a row for each item from `getRoadmapDateTree()`. Left column shows item name (pinned), right column is empty for now.

**Acceptance Criteria:**
- [ ] Items rendered in tree order (same as desktop) using `getRoadmapDateTree()`
- [ ] Item labels pinned to left edge during horizontal scroll (`position: sticky; left: 0`)
- [ ] Hierarchy indentation shown (indent per level, matching desktop `INDENT_PER_LEVEL`)
- [ ] Level colour dots next to item names (pink/blue/purple/green)
- [ ] Expand/collapse toggles for parent items
- [ ] Tapping an item label calls `onItemClick(item.id)`
- [ ] Row height 44px (larger than desktop's 40px — meets touch target minimum)
- [ ] Subtasks (level 4) excluded, same as desktop

**Tests:**
- Correct number of rows rendered for a flat item list
- Hierarchical items show indentation
- Collapsed parent hides children
- Expanding parent shows children
- `onItemClick` called when label tapped
- Subtasks not rendered

---

### Step 5: Gantt Bars (View-Only)

Render coloured bars for scheduled items. No drag handles, no resize, no mouse/touch interaction on the bars themselves (only click/tap).

**Acceptance Criteria:**
- [ ] Scheduled items show a coloured bar positioned by date range
- [ ] Bar colours match desktop level styles (pink Goal, blue Initiative, purple Epic, green Story)
- [ ] Bar heights: Goal 32px, Initiative 28px, Epic 24px, Story 22px (larger than desktop for touch)
- [ ] Bar shows item title text (truncated if too narrow)
- [ ] Level chip on Goal/Initiative bars (same as desktop)
- [ ] Bars have no resize handles, no drag cursors
- [ ] Tapping a bar calls `onItemClick(item.id)` — opens ItemDrawer
- [ ] Unscheduled items show amber background row with "No dates set" text
- [ ] Tapping unscheduled row also calls `onItemClick(item.id)`

**Tests:**
- Scheduled item renders a bar with correct colour class
- Bar position calculated correctly for known date/view range
- Unscheduled item shows "No dates set" text
- Tapping a bar calls `onItemClick` with correct item ID
- Tapping unscheduled row calls `onItemClick`
- No resize handles rendered (query for them, expect 0)
- No drag-related event handlers on bars

---

### Step 6: Today Marker

Render a vertical red line at today's date position.

**Acceptance Criteria:**
- [ ] Red 2px vertical line at today's date position
- [ ] "Today" label at the top of the marker
- [ ] Only visible when today falls within the view range
- [ ] Positioned correctly relative to bar positions

**Tests:**
- Marker renders when today is in view range
- Marker hidden when today is outside view range
- Marker positioned at correct percentage

---

### Step 7: Wire Into SessionPage

Replace the mobile placeholder in `SessionPage.tsx` with `RoadmapMobileView`. Use touch detection to decide which component to show.

**File:** `src/pages/SessionPage.tsx` (lines 1064–1095)

**Acceptance Criteria:**
- [ ] Touch devices: show `RoadmapMobileView` regardless of screen width
- [ ] Non-touch devices below `sm` breakpoint: show `RoadmapMobileView`
- [ ] Non-touch devices at `sm`+ breakpoint: show desktop `RoadmapView`
- [ ] Tapping a bar/label in mobile view opens ItemDrawer with that item
- [ ] ItemDrawer date fields work — saving dates updates the Gantt bar position
- [ ] Tapping an unscheduled item opens ItemDrawer — setting dates shows a new bar
- [ ] FAB "Add Item" still works on the roadmap mobile view

**Tests (unit):**
- Touch device renders `RoadmapMobileView` (mock `isTouchDevice`)
- Non-touch narrow renders `RoadmapMobileView`
- Non-touch wide renders desktop `RoadmapView`

**Tests (E2E — Playwright):**
- Mobile viewport: roadmap shows pannable Gantt (not placeholder)
- Can scroll timeline horizontally
- Tap bar → ItemDrawer opens with correct item
- Edit dates in drawer → bar updates position
- Zoom pill changes timeline range
- Unscheduled item tappable, can set dates

---

### Step 8: Landscape Optimisation

Ensure the view-only Gantt works well when the device is rotated to landscape.

**Acceptance Criteria:**
- [ ] Gantt container fills available width in landscape (wider timeline visible)
- [ ] Bottom nav bar and header don't consume excessive vertical space
- [ ] Gantt content area gets at least 250px of vertical space in landscape
- [ ] Zoom presets still accessible
- [ ] No horizontal overflow or layout breakage at typical landscape widths (667–926px)

**Tests (E2E — Playwright):**
- Set viewport to 812×375 (iPhone landscape): RoadmapMobileView renders
- More timeline visible than portrait (compare scrollWidth ratios)
- All zoom pills visible and functional
- Item labels still pinned during scroll

---

### Step 9: Polish and Edge Cases

Handle empty states, loading, and visual polish.

**Acceptance Criteria:**
- [ ] Empty state: "No items yet" message when session has no items
- [ ] All items unscheduled: Gantt area shows message, unscheduled list below
- [ ] Loading state: skeleton or spinner while items load
- [ ] Smooth scroll behaviour (`-webkit-overflow-scrolling: touch`)
- [ ] Scroll hint dismisses on first horizontal scroll (not just X button)
- [ ] Bars with very short durations (1–2 days) still tappable (min-width: 44px)
- [ ] Performance: no jank with 50+ items

**Tests:**
- Empty session shows empty state
- All-unscheduled session shows appropriate message
- Short-duration bars have minimum tappable width

---

## Component Structure

```
src/
├── components/
│   ├── RoadmapView.tsx              # Existing desktop Gantt (unchanged)
│   └── RoadmapMobileView.tsx        # NEW: View-only mobile Gantt
├── lib/
│   ├── roadmap-dates.ts             # Existing — reused by mobile view
│   └── device.ts                    # NEW: Touch detection utility
└── pages/
    └── SessionPage.tsx              # Modified: conditional rendering
```

## Reused Utilities (No Changes Needed)

| Utility | File | Purpose |
| --- | --- | --- |
| `getRoadmapDateTree()` | `src/lib/roadmap-dates.ts` | Build display-ordered item list |
| `getViewRange()` | `src/lib/roadmap-dates.ts` | Calculate visible date range for zoom |
| `getTimelineMonths()` | `src/lib/roadmap-dates.ts` | Generate month header labels |
| `getTimelineWeeks()` | `src/lib/roadmap-dates.ts` | Generate week header labels |
| `dateToPixel()` | `src/lib/roadmap-dates.ts` | Convert date to position |
| `ItemDrawer` | `src/components/ItemDrawer.tsx` | Item editing (dates, details) |
| `getRoadmapDateTree` expand logic | `src/lib/roadmap-dates.ts` | Auto-expand parents with scheduled children |

## Testing Strategy

| Layer | Tool | What |
| --- | --- | --- |
| Unit | Vitest + RTL | Component rendering, props, callbacks, touch detection |
| Integration | Vitest + RTL | Zoom changes update timeline, item tap opens drawer |
| E2E | Playwright | Full mobile flow: scroll, tap, edit dates, verify bar moves |

**TDD workflow for each step:**
1. Write failing test(s)
2. Implement minimum code to pass
3. Refactor if needed
4. Verify all existing tests still pass (`npm run test:run`)

## Out of Scope (Future Considerations)

- Drag-and-drop on mobile (would need complete touch event system + larger targets)
- Pinch-to-zoom (conflicts with native browser zoom)
- Offline support
- Custom date range input on mobile
- Sharing/screenshot of mobile roadmap
