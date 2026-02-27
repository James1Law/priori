# PRD: Backlog-Centric Redesign

## Overview

This PRD describes a fundamental UX redesign of Priori, shifting from the current tab-based model (Scoring, Estimates, Backlog, Roadmap) to a **backlog-centric model** where the backlog is the home view and all other features are actions or views applied to items.

**Design Reference:** `plans/backlog-centric-redesign.mockup.html`

## Problem Statement

The current tab-based design treats all views as equal when they're actually stages in a workflow. Users struggle to understand the flow because:

1. It's unclear what order to use features (Score first? Estimate first?)
2. Results from one tab don't obviously flow to others
3. The structure doesn't scale for future features (statuses, filters, etc.)
4. Navigation between tabs loses context

## Solution

**Backlog is home.** All items live in a central list that's always accessible. Features like Scoring and Estimation become dedicated flows you enter by selecting items and taking an action. The Roadmap becomes a view toggle, not a separate tab.

## Core Principles

1. **Backlog is home** - All items live in a central list
2. **Features are actions** - Score, Estimate, Set Status are things you *do* to selected items
3. **Progressive disclosure** - Columns/badges only appear when data exists
4. **Dedicated flows** - Actions open focused experiences with breadcrumb navigation back
5. **Shareable URLs** - Each flow has a clean URL for easy collaboration

---

## Phase 1: Foundation

### 1.1 Database Schema Changes

Add new columns to support the redesign.

**items table:**
```sql
ALTER TABLE items ADD COLUMN status TEXT DEFAULT 'todo';
-- Values: 'todo', 'in_progress', 'done'
```

**sessions table:**
```sql
ALTER TABLE sessions ADD COLUMN view TEXT DEFAULT 'list';
-- Values: 'list', 'roadmap'
-- Replaces the current 4-tab model
```

**cutoffs table (new):**
```sql
CREATE TABLE cutoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  label TEXT NOT NULL DEFAULT 'Cutoff',
  color TEXT NOT NULL DEFAULT 'red',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cutoffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage cutoffs" ON cutoffs FOR ALL USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE cutoffs;
```

**Tests:**
- Migration runs without errors
- New columns have correct defaults
- Cutoffs table has proper RLS and realtime

---

### 1.2 Remove Tab Navigation

Replace the current 4-tab navigation with a simpler view toggle.

**Current:**
```
[Scoring] [Estimates] [Backlog] [Roadmap]
```

**New:**
```
[List] [Roadmap]    (toggle in toolbar)
```

**Implementation:**
1. Update `SessionPage.tsx` to remove ViewTabs component
2. Add view toggle to new toolbar component
3. Session `view` column stores 'list' or 'roadmap'
4. List view shows backlog with all columns
5. Roadmap view shows existing RoadmapView component

**URL Structure:**
- `/session/:slug` - List view (default)
- `/session/:slug/roadmap` - Roadmap view

**Tests:**
- View toggle switches between list and roadmap
- URL updates when view changes
- Direct navigation to `/roadmap` works
- Session view preference persists

---

### 1.3 New Backlog List Component

Create the new backlog list with columns, checkboxes, and sorting.

**Component:** `src/components/BacklogList.tsx`

**Columns:**
- Checkbox (for multi-select)
- Rank number
- Item title + description
- Status badge (To Do / In Progress / Done)
- Score (if scored)
- Estimate (if estimated)
- Period (if on roadmap)
- More menu (⋮)

**Features:**
- Click row to open item drawer (not checkbox)
- Click checkbox to select for actions
- Click column header to sort
- Drag rows to reorder (manual sort mode)
- Progressive disclosure: hide Score column if nothing scored, etc.

**Sorting Options:**
- Manual (default, drag to reorder)
- Score (high to low)
- Estimate (low to high, or high to low)
- Status
- Period
- Title (A-Z)

**Tests:**
- Items render with all columns
- Checkbox selection works
- Column sorting works
- Empty columns hidden when no data
- Drag reorder works in manual mode

---

### 1.4 Item Status Field

Add status tracking to items.

**Statuses:**
- `todo` (default) - grey badge
- `in_progress` - amber badge
- `done` - green badge

**UI:**
- Status badge in backlog list row
- Status selector in item drawer
- Bulk status change via action bar

**Tests:**
- Status displays correctly in list
- Status can be changed in drawer
- Bulk status change works
- Status persists and syncs in real-time

---

## Phase 2: Selection & Actions

### 2.1 Multi-Select & Action Bar

Enable selecting multiple items and showing contextual actions.

**Selection Behaviour:**
- Click checkbox to select/deselect single item
- Shift+click for range select
- Select All checkbox in header
- Clicking row (not checkbox) opens drawer, doesn't select

**Action Bar Component:** `src/components/ActionBar.tsx`

Appears when 1+ items selected. Dark background, slides in from top.

**Contents:**
- Left: "X items selected" + "Clear selection" link
- Right: Action buttons

**Action Buttons:**
- **Score** - Opens scoring flow
- **Estimate** - Opens Planning Poker flow
- **Set Status** - Dropdown to change status
- **Assign Period** - Dropdown with period options
- **Delete** - With confirmation

**Tests:**
- Action bar appears when items selected
- Action bar hides when selection cleared
- Shift+click range select works
- All action buttons work
- Keyboard: Escape clears selection

---

### 2.2 Item Drawer

Side panel showing full item details.

**Component:** `src/components/ItemDrawer.tsx`

**Opens:** Click item row (not checkbox), or direct URL `/session/:slug/item/:id`

**Sections:**
1. **Header:** Title (editable) + Status badge
2. **Description:** Editable textarea
3. **Metrics:** Score card + Estimate card (if data exists)
  - Score shows framework name + breakdown (e.g., RICE components)
  - Estimate shows story points
4. **Period:** Dropdown to assign/change roadmap period
5. **Status:** Radio buttons for To Do / In Progress / Done
6. **Footer:** Delete button + Save button

**Behaviour:**
- Slides in from right (420px wide)
- Overlay dims background
- Escape or click overlay to close
- Changes save on blur or explicit Save click
- Real-time sync with other users

**Tests:**
- Drawer opens on item click
- All fields editable
- Changes persist
- Real-time updates from other users
- Escape closes drawer
- Direct URL works

---

### 2.3 Multiple Cutoffs

Allow multiple cutoff lines with custom labels and colours.

**Data Model:**
Each cutoff has: position, label, color

**Default Colours:**
- red (#ef4444)
- amber (#f59e0b)
- blue (#3b82f6)
- green (#22c55e)

**UI:**
- Cutoff line renders between items at specified position
- Draggable to reposition
- Click label to edit (inline)
- Click colour dot to change colour
- "+ Add Cutoff" button in toolbar
- Items below cutoff have reduced opacity (0.6)

**Hook:** `src/hooks/useCutoffs.ts`
- CRUD operations for cutoffs
- Real-time subscription
- Optimistic updates

**Tests:**
- Multiple cutoffs can be added
- Cutoffs can be dragged to reposition
- Label editing works
- Colour changing works
- Cutoffs persist and sync
- Items below cutoffs are dimmed

---

## Phase 3: Dedicated Flows

### 3.1 Scoring Flow

Dedicated URL-based flow for scoring items with a framework.

**URL:** `/session/:slug/score`

**Entry Points:**
1. Select items in backlog → Click "Score" action
2. Direct navigation to URL (joins in-progress session)

**Flow:**
1. **Framework Selection** (if not yet chosen)
  - RICE, ICE, Value vs Effort, MoSCoW, Weighted
  - Once chosen, applies to all selected items

2. **Scoring Interface**
  - Shows one item at a time with title + description
  - Framework-specific input controls
  - Progress indicator: "Item 2 of 5"
  - Next/Previous/Skip buttons

3. **Completion**
  - Summary of scores
  - "Back to Backlog" button

**Collaboration:**
- Unlike Planning Poker, scoring is free-for-all (not voting)
- Anyone can change any score
- Real-time sync shows changes immediately
- No reveal mechanism needed

**Breadcrumb:** `← Backlog / Scoring 5 items`

**Tests:**
- Framework selection works
- Scoring controls work per framework
- Progress indicator accurate
- Scores save and sync
- Breadcrumb navigation works
- Late joiner sees current state

---

### 3.2 Planning Poker Flow (Refactor)

Refactor existing Estimates view into dedicated URL-based flow.

**URL:** `/session/:slug/estimate`

**Entry Points:**
1. Select items in backlog → Click "Estimate" action
2. Direct navigation to URL (joins in-progress session)
3. Copy URL button for sharing with team

**Changes from Current:**
- Move from tab to dedicated route
- Add breadcrumb navigation back to backlog
- Copy URL copies `/session/:slug/estimate`
- If no items in queue, show "Select items from backlog to start"

**Existing Functionality (Keep):**
- Fibonacci card selection
- Hidden votes until reveal
- Consensus detection
- Accept & Next flow
- Queue progress

**Tests:**
- Flow accessible via URL
- Late joiners see current item
- Copy URL works
- Breadcrumb navigation works
- All existing Planning Poker tests pass

---

### 3.3 URL Routing Updates

Update React Router for new URL structure.

**Routes:**
```tsx
/session/:slug           → BacklogView (list mode)
/session/:slug/roadmap   → RoadmapView
/session/:slug/score     → ScoringFlow
/session/:slug/estimate  → EstimationFlow
/session/:slug/item/:id  → BacklogView with drawer open
```

**Implementation:**
- Update `App.tsx` routes
- Session page determines which component to render
- View toggle updates URL (not just state)
- Breadcrumb component for sub-routes

**Tests:**
- All routes render correct components
- Browser back/forward works
- Deep linking works
- Invalid routes handled gracefully

---

## Phase 4: Toolbar & Filtering

### 4.1 Toolbar Component

New toolbar above backlog with search, filters, sort, and view toggle.

**Component:** `src/components/BacklogToolbar.tsx`

**Layout:**
```
[Search...] [Status ▼] [Has Estimate] [On Roadmap] [+ Add Cutoff]  |  [Sort: Manual ▼]  [List|Roadmap]
```

**Elements:**
- **Search:** Filters items by title/description
- **Status Filter:** Dropdown (All, To Do, In Progress, Done)
- **Has Estimate:** Toggle chip
- **On Roadmap:** Toggle chip
- **Add Cutoff:** Button to add new cutoff line
- **Sort:** Dropdown with sort options
- **View Toggle:** List / Roadmap buttons

**Tests:**
- Search filters items
- Status filter works
- Estimate/Roadmap toggles work
- Sort dropdown changes order
- View toggle works

---

### 4.2 Period as Metadata

Roadmap periods become filterable metadata on items.

**Current:** Items have `roadmap_start_quadrant`, `roadmap_end_quadrant` referencing periods

**Enhancement:**
- "Period" column in list view shows period name(s)
- Filter: "Period: [Now ▼]" dropdown
- Item drawer: Period dropdown to assign
- Action bar: "Assign Period" bulk action

**Period Assignment Methods:**
1. Drag in Roadmap view (existing)
2. Select in Item Drawer dropdown
3. Bulk assign via Action Bar

**Tests:**
- Period shows in list view
- Period filter works
- Period assignment from drawer works
- Bulk period assignment works

---

## Phase 5: Mobile Adaptation

### 5.1 Mobile List View

Adapt backlog list for mobile screens.

**Layout:**
- Single-tap row to open drawer
- Long-press to enter selection mode
- Checkboxes appear when in selection mode
- Badges wrap to fit

**Action Bar (Mobile):**
- Fixed at top when items selected
- Horizontal scroll for actions if needed

**Tests:**
- List renders properly on mobile
- Long-press enters selection mode
- Action bar works on mobile
- Drawer opens full-screen on mobile

---

### 5.2 Mobile Toolbar

Simplified toolbar for mobile.

**Layout:**
- Search expands to full width on tap
- Filters collapse into "Filters" button → bottom sheet
- Sort in kebab menu
- View toggle: [List] [Roadmap] tabs at bottom

**Tests:**
- Search expansion works
- Filter bottom sheet works
- Sort accessible from menu
- Bottom tabs work

---

### 5.3 Mobile Scoring Flow

Scoring flow optimised for mobile.

**Layout:**
- Full-screen with back arrow
- Item card at top
- Framework controls fill screen
- Fixed bottom bar: [Previous] [Skip] [Next]

**Tests:**
- Flow works end-to-end on mobile
- Controls are touch-friendly
- Navigation works

---

## Phase 6: Polish & Migration

### 6.1 Remove Legacy Components

Remove old tab-based components no longer needed.

**Remove:**
- `ViewTabs.tsx` (if not used elsewhere)
- Old `ScoringView.tsx` (replaced by ScoringFlow)
- Old routing logic for tabs

**Keep:**
- `EstimatesView.tsx` components (refactored into EstimationFlow)
- `RoadmapView.tsx` (used by view toggle)
- `BacklogView.tsx` components (enhanced, not replaced)

---

### 6.2 Data Migration

Handle existing sessions gracefully.

**Approach:**
- New sessions get new schema automatically
- Existing sessions work with defaults:
  - `status` defaults to 'todo'
  - `view` defaults to 'list'
  - Existing cutoff_position migrates to cutoffs table

**Migration Script:**
```sql
-- Migrate existing single cutoffs to new table
INSERT INTO cutoffs (session_id, position, label, color)
SELECT id, cutoff_position, cutoff_label, 'red'
FROM sessions
WHERE cutoff_position IS NOT NULL;
```

**Tests:**
- New sessions work correctly
- Existing sessions load without errors
- Cutoff migration preserves data

---

### 6.3 E2E Test Updates

Update Playwright tests for new structure.

**Update:**
- Session creation tests
- Scoring tests (new flow)
- Estimation tests (new route)
- Backlog tests (new columns)
- Mobile tests

**New Tests:**
- View toggle E2E
- Item drawer E2E
- Action bar E2E
- Multiple cutoffs E2E
- URL routing E2E

---

## Implementation Order

This PRD is designed for iterative development while keeping the app functional:

1. **Phase 1.1-1.2:** Schema + Remove tabs → App works but simpler
2. **Phase 1.3-1.4:** New list + statuses → Core backlog functional
3. **Phase 2.1-2.3:** Selection + drawer + cutoffs → Full backlog experience
4. **Phase 3.1-3.3:** Dedicated flows → Scoring and estimation refactored
5. **Phase 4.1-4.2:** Toolbar + filters → Power user features
6. **Phase 5.1-5.3:** Mobile → Full mobile experience
7. **Phase 6.1-6.3:** Cleanup → Remove legacy, migrate data

Each phase should be completable and testable independently.

---

## Out of Scope (Future)

The following are explicitly **not** in this PRD:

- Multiple roadmap scenarios (comparing different orderings)
- User accounts and authentication
- Premium/paywall features
- Import from CSV/external tools
- Comments on items
- Keyboard shortcuts
- Dark mode

These may be addressed in future PRDs.

---

## Success Metrics

- Users can understand the workflow without guidance
- All existing functionality preserved (no regression)
- New features (status, multiple cutoffs, sorting) work correctly
- Planning Poker URL is easily shareable
- Mobile experience is fully functional

---

## Appendix: Component Tree

```
SessionPage
├── BacklogToolbar
│   ├── SearchInput
│   ├── FilterChips
│   ├── SortDropdown
│   └── ViewToggle
├── ActionBar (conditional)
│   └── ActionButtons
├── BacklogList (when view=list)
│   ├── ListHeader
│   ├── BacklogItem (×n)
│   └── CutoffLine (×n)
├── RoadmapView (when view=roadmap)
│   └── (existing components)
└── ItemDrawer (conditional)
    ├── DrawerHeader
    ├── DrawerContent
    └── DrawerFooter

ScoringFlow (separate route)
├── Breadcrumb
├── FrameworkSelector
├── ScoringCard
└── ScoringControls

EstimationFlow (separate route)
├── Breadcrumb
├── EstimationQueue
├── CurrentEstimationItem
├── EstimationCards
├── ParticipantVotes
└── EstimationResults
```
