# PRD: Mobile Roadmap View

## Overview

This PRD covers the implementation of a mobile-friendly roadmap view using a vertical stacked timeline layout. Currently, mobile users see a placeholder message and cannot view or edit their roadmap. This feature enables full roadmap functionality on mobile devices.

**Design Mockup:** `plans/mobile-roadmap-ux.mockup.html`

---

## Problem Statement

### Current State

1. **Roadmap is desktop-only** - Mobile users see a placeholder message: "The Roadmap view is optimised for desktop screens. Open this session on a computer to plan your timeline."

2. **No visibility into planned work** - Mobile users cannot see what items are scheduled in which periods, forcing them to switch to desktop.

3. **No editing capability** - Even basic operations like adding items to periods or adjusting timings require desktop access.

### User Impact

- Teams cannot review or adjust roadmaps during mobile meetings
- Product managers can't check timeline status on the go
- The roadmap becomes a "desktop-only" feature, reducing the app's utility

---

## Goals

- **G1:** Enable mobile users to view the complete roadmap with all periods and items
- **G2:** Allow mobile users to add items to periods
- **G3:** Allow mobile users to resize/move items within and across periods
- **G4:** Allow mobile users to manage periods (add, rename, delete)
- **G5:** Maintain feature parity with desktop (no capabilities removed)
- **G6:** Use touch-optimised interactions that feel natural on mobile

---

## Non-Goals

- No changes to desktop roadmap layout or interactions
- No new database schema changes (reuse existing columns)
- No changes to the 4-quadrant positioning system
- No drag-to-reposition entire items (use resize-based movement instead)
- No period reordering (not supported on desktop either)

---

## Design Summary

### Core Concept: Vertical Stacked Timeline

Instead of the horizontal desktop timeline, mobile uses a **vertical stacked layout**:

- Each period becomes a card that stacks vertically
- Users scroll vertically to see all periods (matches mobile's natural scroll direction)
- Each period card has full screen width, giving more space for item positioning
- Items are shown as horizontal bars within each period card

### Position Representation

An item's position within a period is shown by **bar width and horizontal offset**:

| Desktop Position | Mobile Representation |
| --- | --- |
| Full period (Q1-Q4) | 100% width bar |
| First half (Q1-Q2) | 50% width bar, left-aligned |
| Last quarter (Q4) | 25% width bar, 75% margin-left |
| Spans multiple periods | Appears in each period with overflow indicators (→ ←) |

### Interaction Model

1. **Viewing** - Scroll vertically to see all periods and items
2. **Selecting** - Tap an item bar to select it (shows resize handles)
3. **Resizing** - Drag left/right handles to change item span
4. **Moving** - Achieved by shrinking one side and extending the other
5. **Adding items** - FAB or "+ Add Item" button in empty periods
6. **Managing periods** - Tap period header to rename/delete, button at bottom to add

---

## Implementation Steps

### Phase 1: Read-Only Mobile Roadmap View

#### Step 1.1: Create MobileRoadmapView Component ✓

Build the basic vertical timeline layout for viewing only.

**Changes:**
- [ ] Create `src/components/MobileRoadmapView.tsx`
- [ ] Accept props: `periods`, `items`, `session`
- [ ] Render periods as vertical cards
- [ ] Render items as horizontal bars within period cards
- [ ] Calculate bar width/offset from `roadmap_start_quadrant` and `roadmap_end_quadrant`
- [ ] Show overflow indicators (→ ←) for items spanning periods

**Component Structure:**
```tsx
<div className="flex flex-col gap-4 p-4 pb-32">
  {periods.map(period => (
    <PeriodCard key={period.id}>
      <PeriodHeader name={period.name} />
      <PeriodContent>
        {itemsInPeriod.map(item => (
          <ItemBar
            key={item.id}
            item={item}
            periodIndex={period.position}
            startQuadrant={item.roadmap_start_quadrant}
            endQuadrant={item.roadmap_end_quadrant}
          />
        ))}
      </PeriodContent>
    </PeriodCard>
  ))}
</div>
```

**Acceptance Criteria:**
- [ ] Periods display vertically in correct order
- [ ] Items appear in the correct period(s)
- [ ] Item bar widths accurately represent quadrant positions
- [ ] Overflow indicators show for multi-period items
- [ ] Scrolling works smoothly

**Tests:**
- Component renders with mock data
- Items positioned correctly based on quadrant values
- Multi-period items show in all relevant periods

---

#### Step 1.2: Replace Placeholder with MobileRoadmapView ✓

Wire the new component into the session page.

**Changes:**
- [ ] Update `SessionPage.tsx` mobile view detection
- [ ] Replace `RoadmapMobilePlaceholder` with `MobileRoadmapView` on mobile
- [ ] Pass required props: periods, items, session data
- [ ] Keep desktop `RoadmapView` unchanged

**Acceptance Criteria:**
- [ ] Mobile users see the vertical roadmap instead of placeholder
- [ ] Desktop users see unchanged horizontal roadmap
- [ ] Real-time updates work (items/periods sync)

**Tests:**
- Mobile viewport shows MobileRoadmapView
- Desktop viewport shows RoadmapView
- Adding item on desktop appears on mobile in real-time

---

#### Step 1.3: Style Period Cards ✓

Apply visual styling to match mockups.

**Changes:**
- [ ] Period card: white background, rounded corners, shadow
- [ ] Period header: grey background, uppercase text, edit icon placeholder
- [ ] Period content: subtle 4-quadrant grid lines (25% intervals)
- [ ] Item bars: coloured gradients matching desktop
- [ ] Consistent spacing and padding

**Acceptance Criteria:**
- [ ] Visual match to mockup design
- [ ] Quadrant grid visible but subtle
- [ ] Colour coding consistent with desktop

**Tests:**
- Visual review against mockup
- Colours match desktop roadmap items

---

### Phase 2: Item Selection & Resize Handles ✓

#### Step 2.1: Implement Item Selection ✓

Allow tapping items to select them.

**Changes:**
- [ ] Add `selectedItemId` state to MobileRoadmapView
- [ ] Tap item bar → sets selectedItemId
- [ ] Tap elsewhere → clears selection
- [ ] Selected item shows highlight ring (indigo border)
- [ ] ~~Show quadrant labels (Q1, Q2, Q3, Q4) below selected item's period~~ (Removed - confusing with calendar quarters)

**Acceptance Criteria:**
- [ ] Tapping item selects it (visual highlight)
- [ ] Tapping elsewhere deselects
- [ ] Only one item selected at a time
- [ ] ~~Quadrant labels visible for context~~ (Removed per user feedback)

**Tests:**
- Selection state updates on tap
- Visual highlight appears

---

#### Step 2.2: Add Resize Handles ✓

Show draggable handles on selected items.

**Changes:**
- [ ] When item selected, show left and right resize handles
- [ ] Handles: white rounded rectangles with grip lines
- [ ] Handles extend slightly outside item bar bounds
- [ ] Show hint text: "Drag handles to resize"

**Acceptance Criteria:**
- [ ] Handles visible on selected item
- [ ] Handles clearly indicate draggability
- [ ] Hint text guides user

**Tests:**
- Handles render when item selected
- Handles disappear when deselected

---

#### Step 2.3: Implement Resize Logic ✓

Enable dragging handles to resize items.

**Changes:**
- [ ] Track touch/drag on resize handles
- [ ] Calculate new quadrant position based on drag distance
- [ ] Snap to quadrant boundaries (25% increments)
- [ ] Update item in database on drag end
- [ ] Optimistic update for responsiveness

**Resize Rules:**
- Minimum size: 1 quadrant
- Left handle adjusts `roadmap_start_quadrant`
- Right handle adjusts `roadmap_end_quadrant`
- If resized past period boundary, extend into adjacent period

**Acceptance Criteria:**
- [ ] Dragging left handle changes start position
- [ ] Dragging right handle changes end position
- [ ] Changes persist to database
- [ ] Visual feedback during drag

**Tests:**
- Resize updates quadrant values correctly
- Database persistence works
- Real-time sync to other clients

---

#### Step 2.4: Handle Cross-Period Resizing ✓

Allow resizing items to span multiple periods.

**Changes:**
- [ ] When right handle dragged past period end → extend to next period
- [ ] When left handle dragged past period start → extend to previous period
- [ ] ~~Auto-scroll to show the extended period~~ (Not implemented - deferred for polish)
- [ ] Update both `roadmap_start_quadrant` and `roadmap_end_quadrant` (absolute values)

**Acceptance Criteria:**
- [ ] Items can be extended into adjacent periods
- [ ] Items can be shrunk to remove from periods
- [ ] Auto-scroll keeps focus on resize action (deferred)
- [ ] Overflow indicators update correctly

**Known Issue:** Drag resizing across periods can be slightly jerky when moving quickly back and forth. Works functionally but could be smoother. Deferred for future polish.

**Tests:**
- Resize across period boundary works
- Quadrant values correct for multi-period items

---

### Phase 3: Adding Items to Roadmap ✓

#### Step 3.1: Empty Period State ✓

Show "+ Add Item" button in empty periods.

**Changes:**
- [ ] When period has no items, show empty state
- [ ] Empty state: "No items scheduled" text + "+ Add Item" button
- [ ] Button has dashed border styling

**Acceptance Criteria:**
- [ ] Empty periods show add button
- [ ] Button is touch-friendly (adequate size)
- [ ] Visual matches mockup

**Tests:**
- Empty state renders for periods with no items
- Button is tappable

---

#### Step 3.2: Create Unscheduled Items Picker ✓

Build bottom sheet to select items to add.

**Changes:**
- [ ] Create `UnscheduledItemsPicker.tsx` component
- [ ] Fetches items not on roadmap (no `roadmap_start_quadrant`)
- [ ] Shows item title, coloured indicator, score badge
- [ ] Tapping item selects it for scheduling

**Picker Contents:**
- Sheet header: "Add to [Period Name]"
- Subtitle: "Select an item to schedule"
- List of unscheduled items with:
  - Colour bar (matching item colour)
  - Title
  - Score badge (if scored)
- Cancel button at bottom

**Acceptance Criteria:**
- [ ] Shows only unscheduled items
- [ ] Items display with relevant metadata
- [ ] Selection is clear and responsive

**Tests:**
- Unscheduled items filter works
- Tapping item triggers callback

---

#### Step 3.3: Wire Add Item Flow ✓

Connect empty period button to picker and scheduling.

**Changes:**
- [ ] Tap "+ Add Item" → open picker bottom sheet
- [ ] Picker shows which period will receive the item
- [ ] Select item → schedule to period (full width initially)
- [ ] Close picker and show item in period

**Scheduling Logic:**
- Set `roadmap_start_quadrant` to period's first quadrant (period.position * 4)
- Set `roadmap_end_quadrant` to period's last quadrant (period.position * 4 + 3)
- Item now appears full-width in that period

**Acceptance Criteria:**
- [ ] Full flow works: tap add → select item → item appears
- [ ] Item defaults to full period width
- [ ] User can then resize as needed

**Tests:**
- E2E: Add item to empty period
- Quadrant values set correctly
- Item appears in real-time

---

#### Step 3.4: Unscheduled Items Section & FAB Consistency ✓

**Design Change:** Original design had FAB open a period selector, then item picker. User feedback indicated this was inconsistent with other views where FAB always means "add new item". The design was revised to:

1. **FAB always adds new items** (consistent with Scoring, Estimates, Backlog views)
2. **Unscheduled items shown at bottom of roadmap** (like desktop sidebar)
3. **Tap unscheduled item → period selector** (reverse flow from original)

**Changes:**
- [ ] Add unscheduled items section at bottom of MobileRoadmapView
- [x] Show items with colour indicator, title, description, score badge
- [ ] Tap unscheduled item → open PeriodSelector bottom sheet
- [x] Select period → schedule item to full width of that period
- [x] FAB opens add item sheet (same as other views)
- [ ] Create `PeriodSelector.tsx` component for period selection

**Acceptance Criteria:**
- [ ] Unscheduled items visible at bottom of roadmap
- [ ] Tapping unscheduled item shows period selector
- [x] FAB behaviour consistent with other views
- [x] Items scheduled to full period width by default

**Tests:**
- Unscheduled items render correctly
- Period selector shows all periods
- Scheduling flow completes successfully

---

### Phase 4: Period Management ✓

#### Step 4.1: Period Header Tap Action ✓

Allow tapping period headers to edit.

**Changes:**
- [x] Tap period header → open edit modal
- [x] Edit modal shows:
  - Period name input
  - Save button
  - Cancel button
  - Divider
  - Item count info ("X items scheduled")
  - Delete button (red, below divider)

**Acceptance Criteria:**
- [x] Tapping header opens modal
- [x] Current name pre-filled in input
- [x] Modal can be dismissed

**Tests:**
- Modal opens with correct period data
- Modal closes on cancel

---

#### Step 4.2: Rename Period ✓

Implement period renaming.

**Changes:**
- [x] Save button updates period name in database
- [x] Optimistic update for responsiveness
- [x] Modal closes after save
- [x] Error handling for empty names

**Acceptance Criteria:**
- [x] Name changes persist
- [x] Real-time sync to other clients
- [x] Validation prevents empty names

**Tests:**
- Rename updates database
- Sync works across clients

---

#### Step 4.3: Delete Period ✓

Implement period deletion with orphan handling.

**Changes:**
- [x] Delete button shows confirmation if period has items
- [x] Confirmation: "This will unschedule X items. Continue?"
- [x] On confirm: clear item roadmap fields, delete period
- [x] On cancel: close confirmation, keep modal open

**Orphan Handling:**
- Items in deleted period have `roadmap_start_quadrant` and `roadmap_end_quadrant` cleared
- Items become "unscheduled" and appear in picker

**Acceptance Criteria:**
- [x] Confirmation shows when items exist
- [x] Delete removes period and clears item schedules
- [x] No confirmation needed for empty periods

**Tests:**
- Delete empty period works
- Delete period with items shows confirmation
- Items become unscheduled after period deletion

---

#### Step 4.4: Add Period Button ✓

Allow adding new periods.

**Changes:**
- [x] "+ Add Period" button at bottom of period list
- [x] Dashed border styling
- [x] Tap → creates new period at end
- [x] New period has default name "Period X" (or prompt for name)

**Design Decision:** Create immediately with default name, user can rename via header tap

**Acceptance Criteria:**
- [x] Button visible at bottom
- [x] Creates period with unique default name
- [x] New period appears immediately

**Tests:**
- Add period creates in database
- Period appears in correct position
- Default naming works

---

### Phase 5: Polish & Edge Cases ✓

#### Step 5.1: Real-Time Sync ✓

Ensure all mobile operations sync correctly.

**Changes:**
- [x] Verify item resize syncs to other clients
- [x] Verify item scheduling syncs
- [x] Verify period changes sync
- [x] Handle concurrent edits gracefully

**Acceptance Criteria:**
- [x] All changes visible to other clients immediately
- [x] No data loss on concurrent edits
- [x] Optimistic updates don't cause flicker

**Tests:**
- Two clients: edit on one, verify on other
- Concurrent resize doesn't cause issues

**Note:** Real-time sync is handled by existing Supabase hooks - no additional implementation needed.

---

#### Step 5.2: Empty Roadmap State ✓

Handle when there are no periods.

**Changes:**
- [x] Show friendly empty state when no periods exist
- [x] "No periods yet" message
- [x] "+ Add Period" button prominently displayed
- [x] Brief explanation of roadmap feature

**Acceptance Criteria:**
- [x] Empty state is helpful, not confusing
- [x] Clear path to create first period

**Tests:**
- Empty state renders correctly
- Add period from empty state works

---

#### Step 5.3: Animation & Transitions ✓

Add polish to interactions.

**Changes:**
- [x] Smooth scroll when auto-scrolling to periods (deferred - not critical)
- [x] Item bar resize preview during drag (opacity change shows drag state)
- [x] Selection highlight animation (scale + transition)
- [x] Bottom sheet slide-up animation (reuse existing)
- [x] Respect reduced-motion preference (motion-reduce:transition-none)

**Acceptance Criteria:**
- [x] Animations feel smooth
- [x] No janky transitions
- [x] Respects accessibility preferences

**Tests:**
- Visual review of animations
- No performance issues

---

#### Step 5.4: Accessibility ✓

Ensure mobile roadmap is accessible.

**Changes:**
- [x] Item bars have appropriate aria-labels
- [x] Period headers are tappable via keyboard
- [x] Resize handles have aria descriptions
- [x] Focus management in modals

**Acceptance Criteria:**
- [x] Screen reader can navigate roadmap
- [x] All actions have accessible labels
- [x] Focus trapped in modals

**Tests:**
- VoiceOver/TalkBack basic navigation
- Focus management works

---

## Component Summary

### New Components

| Component | Purpose | Status |
| --- | --- | --- |
| `MobileRoadmapView.tsx` | Main vertical timeline with periods, items, resize logic, and unscheduled items section | ✓ Complete |
| `UnscheduledItemsPicker.tsx` | Bottom sheet to select unscheduled items (used for empty period "+ Add Item" flow) | ✓ Complete |
| `PeriodSelector.tsx` | Bottom sheet to select target period (used when tapping unscheduled item) | ✓ Complete |
| `PeriodEditModal.tsx` | Modal for rename/delete period with confirmation for items | ✓ Complete |

**Note:** `MobilePeriodCard` and `MobileItemBar` were implemented as internal components within `MobileRoadmapView.tsx` rather than separate files.

### Modified Components

| Component | Changes |
| --- | --- |
| `SessionPage.tsx` | Replaced `RoadmapMobilePlaceholder` import with `MobileRoadmapView`, passes `onScheduleItem` prop |
| `FAB.tsx` | No changes needed - FAB behaviour is consistent across all views (always opens add item sheet) |

### Unchanged Components

- `RoadmapView.tsx` (desktop) - No changes
- All scoring/backlog/estimates components
- Database hooks (reuse existing)

---

## Database Notes

**No schema changes required.** The feature uses existing columns:

- `items.roadmap_start_quadrant` - Absolute quadrant index (0-based)
- `items.roadmap_end_quadrant` - Inclusive end quadrant
- `roadmap_periods` table - Existing period management

**Quadrant Calculation:**
- Period 0 (first period): quadrants 0, 1, 2, 3
- Period 1 (second period): quadrants 4, 5, 6, 7
- Period N: quadrants N*4 through N*4+3

---

## Migration Notes

- No database migrations required
- No breaking changes
- Mobile users get new functionality; desktop unchanged
- Can be deployed incrementally (read-only first, then editing)

---

## Success Metrics

- [x] Mobile users can view complete roadmap
- [x] Mobile users can add items to any period
- [x] Mobile users can resize items to change timing
- [x] Mobile users can manage periods (add/rename/delete)
- [x] All E2E tests continue to pass
- [x] No regressions in desktop functionality

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Touch resize is imprecise | Medium | Snap to quadrants, provide clear visual feedback |
| Auto-scroll during resize is jarring | Low | Smooth scroll with appropriate timing |
| Users miss period header tap target | Medium | Add visible edit icon, show hint on first use |
| Performance with many items | Low | Virtualise list if needed (unlikely given typical item counts) |
| Concurrent edits cause conflicts | Medium | Use optimistic updates with database as source of truth |

---

## Future Enhancements

These are explicitly **out of scope** for this PRD but could be considered later:

- **Drag to reposition entire items** - More complex than resize-based movement
- **Period reordering** - Would require desktop support first
- **Swimlanes/rows** - Visual grouping of items
- **Pinch-to-zoom** - Adjust view density
- **Landscape mode optimisation** - Show more horizontal detail

---

*Document version: 1.0*
*Created: 2026-01-21*
*Design mockup: plans/mobile-roadmap-ux.mockup.html*
