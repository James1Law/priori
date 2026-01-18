# PRD: UX Enhancement - Layout Redesign

## Overview

This PRD covers a comprehensive UX redesign to improve screen utilisation, enable mobile item creation, and consolidate session actions. The goal is to modernise the layout without changing any underlying functionality.

**Design Mockup:** `plans/add-item-ux-redesign.mockup.html`

---

## Problem Statement

### Current Issues

1. **Desktop sidebar takes 30% of screen space** - The add item form and framework selector occupy a fixed sidebar, even when not in use. This wastes valuable screen real estate for the main content.

2. **Roadmap collapse is inconsistent** - The collapse feature exists only in Roadmap view and defaults to expanded, making it easy to miss.

3. **Mobile cannot add items with descriptions** - The current bottom bar only allows title-only items. Users must switch to desktop to add descriptions.

4. **Framework selector shown in all views** - The framework is only relevant for Scoring view, but the selector appears everywhere.

5. **Session actions (Export, Clear, Copy URL, New) are scattered** - These buttons occupy header space on desktop but are hidden on mobile.

---

## Goals

- **G1:** Reclaim screen space on desktop by collapsing the sidebar by default
- **G2:** Enable full item creation (title + description) on mobile
- **G3:** Show framework selector only where relevant (Scoring view)
- **G4:** Consolidate session actions into a consistent location
- **G5:** Maintain all existing functionality - this is a visual/layout change only

---

## Non-Goals

- No database schema changes
- No new features (only layout/UX changes)
- No changes to scoring frameworks or calculation logic
- No changes to real-time sync behaviour

---

## Design Summary

### Desktop Layout

**Header Row:**
- Logo + Session name (editable) + Session ID
- Participant indicator (green dot + "X participants")
- Session actions: Export CSV | Clear | Copy URL | New (green)

**Tab Bar Row:**
- View tabs: Scoring | Estimates | Backlog | Roadmap
- Framework selector (only visible in Scoring view)
- "+ Add Item" button

**Main Content:**
- Full width (no sidebar by default)
- Items list with scores and story points

**Add Item Panel (when expanded):**
- Slide-in panel from right (320px width)
- Title input + Description textarea
- "Add Item" button
- Panel closes after adding or clicking "Close"

### Mobile Layout

**Header:**
- Logo + Session name (truncated)
- Participant indicator (green dot + count)
- Kebab menu (three dots)

**Sub-header (Scoring view only):**
- Framework badge showing current framework

**Content:**
- Full-screen item list

**FAB (Floating Action Button):**
- Fixed position, bottom-right (above bottom nav)
- Always visible on all views
- Opens bottom sheet modal

**Bottom Sheet Modal (on FAB tap):**
- Drag handle
- Title input
- Description textarea
- Cancel + Add Item buttons

**Kebab Menu Contents:**
- Framework section (only in Scoring view)
  - RICE / ICE / Value vs Effort / MoSCoW / Weighted
- Session section
  - Copy URL
  - Export CSV
  - Clear Items (red)
  - New Session (green)

---

## Implementation Steps

### Phase 1: Desktop Header Consolidation ✅

#### Step 1.1: Redesign Desktop Header ✅
Move session actions into a consolidated header row.

**Changes:**
- [x] Update `SessionPage.tsx` header layout
- [x] Add participant indicator with green dot (reuse existing presence data)
- [x] Add session ID display next to session name (only when unnamed)
- [x] Move Export CSV, Clear, Copy URL, New buttons to header row
- [x] Style buttons: grey background for secondary actions, indigo for "New"

**Acceptance Criteria:**
- [x] Header shows: Logo | Name + ID | Participant indicator | Actions
- [x] All existing header functionality preserved
- [x] Responsive at different desktop widths

**Tests:**
- Header renders with all elements
- Session actions still work correctly
- Participant count updates in real-time

---

#### Step 1.2: Create Tab Bar Component ✅
Consolidate view tabs and framework selector into a single tab bar.

**Changes:**
- [x] Extend `ViewTabs.tsx` component
- [x] Move framework selector into tab bar (right side)
- [x] Add "+ Add Item" button to tab bar
- [x] Framework selector only visible when `view === 'scoring'`
- [x] Non-scoring views show framework as read-only badge (optional, skipped)

**Acceptance Criteria:**
- [x] Tab bar shows: [Scoring] [Estimates] [Backlog] [Roadmap] ... [Framework Selector] [+ Add Item]
- [x] Framework selector hidden on non-Scoring views
- [x] View switching still works correctly
- [x] Framework changes still work correctly

**Tests:**
- Framework selector visibility toggles with view
- View switching persists to database
- Framework change creates default scores

---

### Phase 2: Desktop Add Item Panel ✅

#### Step 2.1: Create Slide-in Panel Component ✅
Build a reusable slide-in panel for the add item form.

**Changes:**
- [x] Create `SlideInPanel.tsx` component
- [x] Props: `isOpen`, `onClose`, `title`, `children`
- [x] Animates in from right (320px width)
- [x] Semi-transparent overlay on main content
- [x] Close on Escape key or overlay click

**Acceptance Criteria:**
- [x] Panel slides in smoothly from right
- [x] Main content is dimmed but visible
- [x] Panel can be closed via button, Escape, or overlay click
- [x] Focus trapped inside panel when open

**Tests:**
- Panel opens and closes correctly
- Keyboard navigation works
- Overlay click closes panel

---

#### Step 2.2: Move Add Item Form to Panel ✅
Replace the sidebar form with the slide-in panel.

**Changes:**
- [x] Add `isAddPanelOpen` state to `SessionPage.tsx`
- [x] Wire "+ Add Item" button to toggle panel
- [x] Move `ItemForm` component into `SlideInPanel`
- [x] Remove sidebar from Scoring/Backlog/Estimates views
- [x] Keep sidebar visible for Roadmap view (has its own layout)

**Acceptance Criteria:**
- [x] Clicking "+ Add Item" opens panel
- [x] Form submits and closes panel
- [x] Items appear in list immediately
- [x] Enter key submits form
- [x] Main content area is now full width

**Tests:**
- Adding item via panel works
- Panel closes after submission
- Item appears in real-time

---

#### Step 2.3: Remove Desktop Sidebar (Scoring/Backlog/Estimates) ✅
Clean up the grid layout to use full width.

**Changes:**
- [x] Update `SessionPage.tsx` grid layout
- [x] Remove `lg:grid-cols-3` for Scoring view
- [x] Remove sidebar column for Backlog view
- [x] Remove sidebar column for Estimates view
- [x] Roadmap view uses full width (sidebar removed)
- [x] Remove collapse button (no longer needed)

**Acceptance Criteria:**
- [x] Scoring view uses full width for item list
- [x] Backlog view uses full width
- [x] Estimates view uses full width
- [x] Roadmap view uses full width
- [x] No layout regressions

**Tests:**
- All views render correctly
- Item interactions work in full-width layout
- Scoring inputs display correctly

---

### Phase 3: Mobile Add Item FAB & Modal ✅

#### Step 3.1: Create FAB Component ✅
Add a floating action button for mobile.

**Changes:**
- [x] Create `FAB.tsx` component
- [x] Fixed position: bottom-right, above bottom nav
- [x] Indigo background with plus icon
- [x] Shadow for elevation
- [x] Only visible on mobile (< lg breakpoint)

**Acceptance Criteria:**
- [x] FAB visible on all mobile views
- [x] Positioned above bottom navigation
- [x] Does not obstruct content
- [x] Touch-friendly size (56px)

**Tests:**
- FAB renders on mobile only
- FAB position is correct
- FAB is tappable

---

#### Step 3.2: Create Bottom Sheet Modal ✅
Build a mobile-friendly modal for adding items.

**Changes:**
- [x] Create `BottomSheet.tsx` component
- [x] Props: `isOpen`, `onClose`, `title`, `children`
- [x] Slides up from bottom with drag handle
- [x] Rounded top corners
- [x] Dismissible via overlay tap or swipe down (stretch - overlay tap only)

**Acceptance Criteria:**
- [x] Modal slides up smoothly
- [x] Drag handle visible at top
- [x] Can be dismissed by tapping overlay
- [x] Keyboard-friendly (input focuses correctly)

**Tests:**
- Modal opens and closes correctly
- Form inside modal is usable
- Overlay dismisses modal

---

#### Step 3.3: Wire FAB to Bottom Sheet ✅
Connect the FAB to open the add item modal.

**Changes:**
- [x] Add `isAddSheetOpen` state to `SessionPage.tsx`
- [x] FAB click opens `BottomSheet` with `ItemForm`
- [x] Form submission closes modal and adds item
- [x] Close button closes modal

**Acceptance Criteria:**
- [x] Tapping FAB opens modal
- [x] Can add item with title and description
- [x] Item appears in list after adding
- [x] Modal closes after submission

**Tests:**
- Full add item flow works on mobile
- Items sync to database
- Real-time updates work

---

#### Step 3.4: Remove MobileBottomBar Add Form ✅
Clean up the old mobile add form.

**Changes:**
- [x] Remove inline add form from `MobileBottomBar.tsx`
- [x] Keep view tabs in bottom bar
- [x] Remove framework selector from bottom bar
- [x] Bottom bar is now just view navigation

**Acceptance Criteria:**
- [x] Bottom bar shows only view tabs
- [x] No add form in bottom bar
- [x] FAB is the only way to add items on mobile

**Tests:**
- Bottom bar renders correctly
- View switching works
- No regressions in navigation

---

### Phase 4: Mobile Menu Consolidation ✅

#### Step 4.1: Create Mobile Menu Component ✅
Build a dropdown menu for mobile session actions.

**Changes:**
- [x] Create `MobileMenu.tsx` component
- [x] Triggered by kebab icon in header
- [x] Sections: Framework (Scoring only), Session
- [x] Framework options with checkmark for current
- [x] Session options: Copy URL, Export CSV, Clear Items, New Session

**Acceptance Criteria:**
- [x] Menu opens on kebab tap
- [x] Framework section shows only in Scoring view
- [x] All session actions work
- [x] Menu closes after selection

**Tests:**
- Framework change works from menu
- Copy URL copies to clipboard
- Export CSV downloads file
- Clear Items shows confirmation
- New Session navigates to new URL

---

#### Step 4.2: Add Participant Indicator to Mobile Header ✅
Show participant count on mobile.

**Changes:**
- [x] Green dot + count already in mobile header
- [x] Compact format: green dot + number (e.g., "3")
- [x] Position: left of kebab menu

**Acceptance Criteria:**
- [x] Participant count visible in header
- [x] Updates in real-time
- [x] Green dot indicates active connection

**Tests:**
- Count updates when participants join/leave
- Display is compact and fits header

---

#### Step 4.3: Add Framework Badge (Scoring View) ✅
Show current framework as a badge on mobile for context.

**Changes:**
- [x] Add sub-header bar below mobile header
- [x] Shows framework name with dropdown chevron
- [x] Only visible on Scoring view
- [x] Tap opens mobile menu to change framework

**Acceptance Criteria:**
- [x] Badge shows current framework
- [x] Non-intrusive but visible
- [x] Consistent with mobile design language

**Tests:**
- Badge displays correct framework
- Badge updates when framework changes

---

### Phase 5: Polish & Edge Cases ✅

#### Step 5.1: Keyboard Shortcuts ✅
Ensure keyboard navigation works with new layout.

**Changes:**
- [x] "N" key opens add item panel/modal (detects mobile vs desktop)
- [x] Escape closes panel/modal (already implemented)
- [x] Tab navigation works in panel (focus trap implemented)

**Acceptance Criteria:**
- [x] Keyboard shortcuts work
- [x] Work consistently across views

**Tests:**
- Keyboard shortcuts trigger correct actions

---

#### Step 5.2: Responsive Breakpoints ✅
Ensure smooth transition between mobile and desktop.

**Changes:**
- [x] Reviewed all breakpoint transitions
- [x] Mobile header shows logo + name + kebab menu
- [x] Desktop header shows full layout with all actions

**Acceptance Criteria:**
- [x] Smooth transition at lg breakpoint
- [x] No overlapping elements
- [x] No missing elements

**Tests:**
- Resize browser through breakpoints
- All elements visible at all sizes

---

#### Step 5.3: Animation & Transitions ✅
Add polish to the new UI elements.

**Changes:**
- [x] Panel slide-in animation (200ms ease-out)
- [x] Modal slide-up animation (200ms ease-out)
- [x] FAB hover/press states (active:bg-indigo-800)
- [x] Added motion-reduce:transition-none for accessibility

**Acceptance Criteria:**
- [x] Animations feel smooth and responsive
- [x] No janky transitions
- [x] Respects reduced-motion preference

**Tests:**
- Visual review of animations
- No performance issues

---

## Component Summary

### New Components
- `SlideInPanel.tsx` - Reusable slide-in panel for desktop
- `BottomSheet.tsx` - Reusable bottom sheet modal for mobile
- `FAB.tsx` - Floating action button for mobile
- `MobileMenu.tsx` - Kebab menu for mobile session actions

### Modified Components
- `SessionPage.tsx` - Layout restructure, remove sidebar
- `ViewTabs.tsx` - Add framework selector and add button
- `MobileBottomBar.tsx` - Remove add form, simplify to tabs only
- `ItemForm.tsx` - Minor styling updates for panel/modal context

### Unchanged Components
- All scoring framework components
- All item card components
- All database/hook logic
- `RoadmapView.tsx` (keeps its own layout)

---

## Migration Notes

- No database migrations required
- No breaking changes to existing functionality
- All existing E2E tests should continue to pass (may need selector updates)
- Gradual rollout possible (feature flag if needed)

---

## Success Metrics

- [x] Desktop main content area is 30% larger (sidebar removed, full-width layout)
- [x] Mobile users can add items with descriptions (FAB + BottomSheet)
- [x] All existing E2E tests pass (31 tests passing)
- [x] No regression in functionality
- [ ] Lighthouse scores maintained or improved (requires verification)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| E2E tests break due to selector changes | Medium | Update selectors incrementally, run tests after each step |
| Mobile FAB obscures content | Low | Position above bottom nav with sufficient spacing |
| Slide-in panel feels intrusive | Low | Keep panel narrow (320px), allow quick dismiss |
| Users miss the add button | Medium | Keep prominent position, consider onboarding tooltip |

---

## Timeline Estimate

- Phase 1 (Header + Tab Bar): 2-3 steps
- Phase 2 (Desktop Panel): 3 steps
- Phase 3 (Mobile FAB + Modal): 4 steps
- Phase 4 (Mobile Menu): 3 steps
- Phase 5 (Polish): 3 steps

**Total:** ~15 implementation steps

---

*Document version: 1.0*
*Created: 2026-01-18*
*Design mockup: plans/add-item-ux-redesign.mockup.html*
