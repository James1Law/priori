# Priori - Product Requirements Document

## Vision
A simple, collaborative prioritisation tool that works like planning poker — share a URL, everyone can contribute, no login required.

## Target Users
- Product Managers
- Engineering leads
- Anyone running prioritisation sessions

## Success Metrics
- Session can be created in < 5 seconds
- Collaborators can join via URL with zero friction
- Supports 5 prioritisation frameworks

---

## Phase 1: Foundation (MVP)

### 1.1 Project Setup ✅
**As a** developer
**I want** the project scaffolded with all dependencies
**So that** I can start building features

**Acceptance Criteria:**
- [x] Vite + React + TypeScript initialised
- [x] Tailwind CSS configured
- [x] Vitest + React Testing Library configured
- [x] ESLint + Prettier configured
- [x] Folder structure matches CLAUDE.md spec
- [x] Dev server runs without errors

---

### 1.2 Session Creation ✅
**As a** user
**I want** to create a new prioritisation session
**So that** I get a unique URL to share

**Acceptance Criteria:**
- [x] Landing page with "Create Session" button
- [x] Clicking creates a new session with unique slug (6 chars, alphanumeric)
- [x] Redirects to `/s/{slug}`
- [x] Session stored in Supabase
- [x] URL is copyable/shareable

**Tests:**
- [x] Slug generation produces unique 6-char strings
- [x] Session is persisted to database
- [x] Navigation works correctly

---

### 1.3 Add Items ✅
**As a** user
**I want** to add items to prioritise
**So that** I can build my backlog

**Acceptance Criteria:**
- [x] Input field to add new item (title required)
- [x] Optional description field (expandable)
- [x] Items appear in a list below
- [x] Items persist to database
- [x] Items load when returning to session URL

**Tests:**
- [x] Can add item with title only
- [x] Can add item with title + description
- [x] Items persist and reload
- [x] Empty title is rejected

---

### 1.4 Edit & Delete Items ✅
**As a** user
**I want** to edit or remove items
**So that** I can manage my backlog

**Acceptance Criteria:**
- [x] Click item to edit inline
- [x] Delete button removes item (with confirmation)
- [x] Changes persist to database

**Tests:**
- [x] Edit updates item in DB
- [x] Delete removes item from DB
- [x] Confirmation prevents accidental deletion

---

## Phase 2: Scoring Frameworks

### 2.1 Framework Selector ✅
**As a** user  
**I want** to choose a prioritisation framework  
**So that** I can score items appropriately

**Acceptance Criteria:**
- [x] Dropdown/tabs to select framework
- [x] Options: RICE, ICE, Value vs Effort, MoSCoW, Weighted Scoring
- [x] Selected framework persists to session
- [x] UI updates to show relevant scoring inputs

**Tests:**
- Framework selection persists
- Correct inputs render for each framework

---

### 2.2 RICE Scoring ✅
**As a** user  
**I want** to score items using RICE  
**So that** I get a quantitative ranking

**Acceptance Criteria:**
- [x] Each item shows: Reach, Impact, Confidence, Effort inputs
- [x] Impact dropdown: Minimal (0.25), Low (0.5), Medium (1), High (2), Massive (3)
- [x] Confidence dropdown: Low (50%), Medium (80%), High (100%)
- [x] Reach and Effort are numeric inputs
- [x] Score auto-calculates: (R × I × C) / E
- [x] Items auto-sort by score (highest first)

**Tests:**
- Formula calculates correctly
- Sorting works
- Edge cases (zero effort) handled

**Bonus UX:**
- [x] Debounced sorting (1.5s delay) prevents jarring movements
- [x] "Updating..." indicator during pending saves

---

### 2.3 ICE Scoring ✅
**As a** user
**I want** to score items using ICE
**So that** I can quickly rank with less complexity

**Acceptance Criteria:**
- [x] Each item shows: Impact, Confidence, Ease sliders (1-10)
- [x] Score = average of three values
- [x] Items auto-sort by score

**Tests:**
- [x] Formula calculates correctly
- [x] Sliders update score in real-time

---

### 2.4 Value vs Effort Matrix ✅
**As a** user  
**I want** to plot items on a 2×2 matrix  
**So that** I can visualise quick wins vs big bets

**Acceptance Criteria:**
- [x] Each item has Value (1-10) and Effort (1-10) inputs
- [x] 2×2 grid visualisation shows items as dots/cards
- [x] Quadrants labelled: Quick Wins (high value, low effort), Big Bets (high value, high effort), Fill-ins (low value, low effort), Avoid (low value, high effort)
- [x] Clicking item in matrix highlights it in list

**Tests:**
- Items plot in correct quadrant
- Interaction between matrix and list works

---

### 2.5 MoSCoW Categorisation ✅
**As a** user  
**I want** to categorise items as Must/Should/Could/Won't  
**So that** I can scope releases

**Acceptance Criteria:**
- [x] Each item has category dropdown
- [x] Items grouped by category in display
- [ ] Drag-and-drop between categories (stretch - deferred)

**Tests:**
- Category assignment persists
- Grouping displays correctly

---

### 2.6 Weighted Scoring ✅
**As a** user
**I want** to define custom criteria and weights
**So that** I can prioritise by my own factors

**Acceptance Criteria:**
- [x] Add/remove custom criteria (name + weight 1-10)
- [x] Each item scored against each criterion (1-10)
- [x] Weighted average calculated
- [x] Items sorted by weighted score

**Tests:**
- [x] Custom criteria CRUD works
- [x] Weighted formula correct
- [x] Zero weights handled

---

## Phase 3: Collaboration

### 3.1 Real-time Sync ✅
**As a** collaborator
**I want** to see changes from others in real-time
**So that** we can work together

**Acceptance Criteria:**
- [x] Supabase Realtime subscribed to session changes
- [x] Item additions appear without refresh
- [x] Score changes appear without refresh
- [x] Optimistic updates for responsiveness

**Tests:**
- [x] Changes from one client appear on another
- [x] No data loss on concurrent edits

---

### 3.2 Participant Names ✅
**As a** collaborator
**I want** to set my name
**So that** others know who added/edited items

**Acceptance Criteria:**
- [x] Prompt for name on first visit (stored in localStorage)
- [x] Name shown next to items/edits
- [x] "X participants" indicator

**Tests:**
- [x] Name persists in localStorage
- [x] Name displays correctly

---

## Phase 4: Polish & Export

### 4.1 Export to CSV ✅
**As a** user  
**I want** to export my prioritised list  
**So that** I can use it elsewhere

**Acceptance Criteria:**
- [x] Export button downloads CSV
- [x] Includes: title, description, scores, rank

**Tests:**
- CSV format is valid
- All data included

---

### 4.2 New Session / Clear ✅
**As a** user  
**I want** to start fresh  
**So that** I can run a new prioritisation

**Acceptance Criteria:**
- [x] "New Session" creates fresh URL
- [x] "Clear Items" removes all items (with confirmation)

**Tests:**
- New session gets new slug
- Clear removes items but keeps session

---

### 4.3 Session Naming ✅
**As a** user
**I want** to name my session
**So that** I can identify it later

**Acceptance Criteria:**
- [x] Editable session title
- [x] Shows in browser tab

---

### 4.4 Mobile Responsive ✅
**As a** user
**I want** to use Priori on mobile
**So that** I can participate from anywhere

**Acceptance Criteria:**
- [x] All features work on mobile viewport
- [x] Touch-friendly inputs

---

## Phase 5: Production Readiness

### 5.1 Error Handling ✅
- [x] Graceful handling of network errors
- [x] Invalid session slugs show 404
- [x] Loading states throughout

### 5.2 Performance ✅
- [x] Lazy load frameworks not in use
- [x] Debounce score inputs (already implemented)
- [x] Lighthouse optimisation (meta tags, semantic HTML)

### 5.3 Analytics ❌ (Won't Do)
- Decided to skip analytics tracking

---

## Backlog / Future Ideas
- Team voting on scores (average multiple inputs)
- Session history / versioning
- Embed mode for Notion/Confluence
- Import from Jira/Linear
- AI-assisted scoring suggestions
- Dark mode

---

## ✅ Production Status

**Phase 1 (MVP) - COMPLETE**
- Deployed to Vercel
- https://github.com/James1Law/prioriGitHub: https://github.com/James1Law/priori
- All core features working in production
- Database: Supabase with RLS configured

**Phase 2 (Scoring Frameworks) - COMPLETE**
- [x] 2.1 Framework Selector (complete)
- [x] 2.2 RICE Scoring (complete)
- [x] 2.3 ICE Scoring (complete)
- [x] 2.4 Value vs Effort Matrix (complete)
- [x] 2.5 MoSCoW Categorisation (complete)
- [x] 2.6 Weighted Scoring (complete)

**Phase 3 (Collaboration) - COMPLETE**
- [x] 3.1 Real-time Sync (complete)
- [x] 3.2 Participant Names (complete)

**Phase 4 (Polish & Export) - COMPLETE**
- [x] 4.1 Export to CSV (complete)
- [x] 4.2 New Session / Clear (complete)
- [x] 4.3 Session Naming (complete)
- [x] 4.4 Mobile Responsive (complete)

**Phase 5 (Production Readiness) - COMPLETE**
- [x] 5.1 Error Handling (complete)
- [x] 5.2 Performance (complete)
- 5.3 Analytics (won't do)

**Phase 6 (Branding & UX Polish) - COMPLETE**
- [x] 6.1 Brand Identity (logo, Poppins/Inter typography, indigo colour scheme)
- [x] 6.2 Mobile UX Improvements (bottom input bar, touch-friendly delete)
- [x] 6.3 Custom Confirmation Modals (replaced browser confirm() dialogs)

**Phase 7 (Backlog View) - COMPLETE**
- [x] 7.1 Backlog View with cutoff line
- [x] Drag-and-drop reordering
- [x] Manual vs Score ordering toggle
- [x] Editable cutoff label

**Phase 8 (Roadmap View) - COMPLETE**
- [x] 7.5 Roadmap View with custom time periods
- [x] Drag-and-drop item scheduling
- [x] Item bar resizing across periods
- [x] 4-quadrant grid system for finer positioning
- [x] Ghost preview when dragging items onto roadmap
- [x] Orphaned item handling when periods deleted
- [x] Mobile placeholder (desktop-only feature)

**Current Status:**
- Live at https://priori.work
- 232 unit tests passing
- All 5 prioritisation frameworks complete
- Real-time collaboration enabled via Supabase Realtime
- Participant presence tracking with names
- Mobile responsive UI with touch-friendly inputs
- CSV export with session naming
- Error boundary and 404 page
- Lazy loading for framework-specific components
- Custom branding (logo, typography, colour scheme)
- Backlog view with cutoff line
- Roadmap view with quadrant-based positioning
- UK English spelling throughout

---

*Document version: 3.0*
*Last updated: 2026-01-16 - Phase 8 (Roadmap View with quadrant system) complete*

---

## Phase 2 PRD: Backlog & Planning Features

### Vision
Extend Priori beyond scoring/evaluation into **planning and communication**. Inspired by tools like Aha!, add a Backlog View that helps teams visualise priorities, define scope boundaries, and communicate what's in/out.

---

### 7.1 Backlog View ✅
**As a** product manager
**I want** to view my items as a ranked backlog with a cutoff line
**So that** I can communicate what's in scope for a release/sprint

**Acceptance Criteria:**
- [x] New "Backlog" tab in view selector (alongside Scoring)
- [x] Items displayed as a numbered ranked list (1, 2, 3...)
- [x] Drag-and-drop to reorder items manually
- [x] Draggable horizontal "cutoff line" that can be positioned between any two items
- [x] Items above the line styled differently (in scope) vs below (out of scope)
- [x] Line position persists to session
- [x] Optional: Label for the line (e.g., "Sprint 1", "MVP", "Phase 1")

**UX Considerations:**
- View tabs: Scoring | Backlog | Roadmap (future)
- Backlog shows ranked list; Scoring shows framework inputs
- Should work alongside existing frameworks (use framework scores to inform initial order)

**Tests:**
- Drag-and-drop updates item positions
- Cutoff line position persists
- Items above/below line have correct styling

---

### 7.2 Custom Columns (Stretch)
**As a** user
**I want** to see additional columns in my item list
**So that** I can view relevant data at a glance

**Acceptance Criteria:**
- [ ] Column selector to show/hide columns
- [ ] Available columns: Title, Description, Score (from current framework), Created date
- [ ] Column preferences persist per session

**Notes:**
- Lower priority than core Backlog View
- Could start with just Score + Title, expand later

---

### 7.3 Weighted Criteria Editor (Mobile)
**As a** mobile user
**I want** to add and edit weighted scoring criteria
**So that** I can configure custom scoring on any device

**Acceptance Criteria:**
- [ ] Criteria editor accessible on mobile (currently desktop-only in sidebar)
- [ ] Modal or expandable panel for editing criteria
- [ ] Same functionality as desktop: add, remove, rename criteria, adjust weights

**Notes:**
- Lower priority enhancement
- Current workaround: set up criteria on desktop first

---

### 7.4 Phase 6 Polish Items
**As a** user
**I want** various UX refinements
**So that** the app feels polished

**Acceptance Criteria:**
- [ ] Dark mode (system-preference-aware)
- [ ] Keyboard shortcuts for power users
- [x] Import from CSV (bulk item creation) — Import/Export module with Jira export auto-detection, duplicate flagging, and preview

---

### 7.5 Roadmap View ✅
**As a** product manager
**I want** to visualise items on a timeline
**So that** I can plan and communicate delivery schedules

**Acceptance Criteria:**
- [x] Horizontal timeline with custom time periods (Now/Next/Later or user-defined)
- [x] Items displayed as horizontal bars showing start → end
- [x] Drag items horizontally to change timing
- [x] Drag bar edges to adjust duration
- [x] Items sorted by start position in sidebar
- [x] 4-quadrant grid system for finer positioning within periods
- [x] Ghost preview when dragging items onto roadmap

**Data Model:**
- Add `start_date` and `end_date` (or `duration_days`) to items table
- Timeline position derived from dates

**UX Considerations:**
- This is a more complex feature than Backlog View
- Could be Phase 3 or a "Pro" feature
- Mobile: likely read-only or simplified (swipe to scroll timeline)
- Desktop: full drag-and-drop editing

**Tests:**
- Dragging updates dates correctly
- Timeline renders items at correct positions
- Overlapping items display clearly

---

## Phase 2 Prioritisation

**P1 - Core Value (Phase 2a):**
1. 7.1 Backlog View - ranked list with cutoff line

**P2 - Nice to Have (Phase 2b):**
2. 7.3 Weighted Criteria Editor (Mobile)
3. 7.4a Dark Mode

**P3 - Future (Phase 3):**
4. 7.5 Roadmap View (Gantt-style timeline) - significant complexity
5. 7.2 Custom Columns
6. 7.4b Keyboard Shortcuts
7. 7.4c Import from CSV

---

## 7.1 Backlog View - Implementation Plan

### Naming Convention
- **Scoring** = Current view with framework selector and scoring inputs
- **Backlog** = New ranked list view with cutoff line (this feature)
- **Roadmap** = Future timeline/Gantt view

### Iterative Build Steps

#### Step 1: View Switcher UI
Add view tabs to the session page header.
- [ ] Add `view` state to session (values: 'scoring' | 'backlog')
- [ ] Create ViewTabs component with Scoring/Backlog tabs
- [ ] Desktop: Tabs below header, above content
- [ ] Mobile: Pill toggle in place of framework selector when on Backlog view
- [ ] Persist view preference to session (Supabase)

**Tests:**
- View tabs render correctly
- Clicking tab switches view
- View persists on page reload

#### Step 2: Basic Backlog List
Render items as a simple ranked list without scoring inputs.
- [ ] Create BacklogList component
- [ ] Show items with: rank number, title, description, score badge
- [ ] Initial order: sorted by calculated_score descending
- [ ] Score badge shows framework score (e.g., "RICE: 142")
- [ ] Style: Clean card-style rows

**Tests:**
- Items render in score order
- Score badge displays correct value
- Empty state handled

#### Step 3: Drag-and-Drop Reordering ✅
Allow manual reordering of items.
- [x] Integrate drag-and-drop library (@dnd-kit/core)
- [x] Add drag handles to items
- [x] Add `backlog_position` field to items table (nullable integer)
- [x] When dragged: save new position, switch to manual order mode
- [x] Add "Order: Manual" indicator (amber badge)
- [x] Add "Reset to Score" button

**Order Logic:**
- `backlog_position = null` → Use score order
- `backlog_position = integer` → Use manual order
- "Reset to Score" sets all `backlog_position` to null

**Tests:**
- [x] Drag updates item positions
- [x] Manual indicator appears after drag
- [x] Reset button clears positions and re-sorts

#### Step 3b: View-Independent Sorting ✅
Ensure each view has its own sorting behaviour.
- [x] Scoring view always sorts by calculated score (ignores backlog_position)
- [x] Backlog view sorts by backlog_position when set, otherwise by score
- [x] Switching views does not affect item order in the other view

**Rationale:**
- Scoring view purpose: see items ranked by framework calculation
- Backlog view purpose: manually prioritise, factoring in things scores don't capture

**Tests:**
- [x] Scoring view always shows score order regardless of backlog_position
- [x] Reordering in Backlog does not affect Scoring view
- [x] Switching between views maintains independent sort orders

#### Step 4: Cutoff Line (Basic) ✅
Add a draggable line to separate in-scope from out-of-scope items.
- [x] Add `cutoff_position` field to sessions table (nullable integer, default null)
- [x] Render horizontal line between items at position
- [x] Items below line: greyed out (opacity 0.5)
- [x] Line shows label (default: "Cutoff")

**Tests:**
- Line renders at correct position
- Items below line are styled differently
- Line position persists

#### Step 5: Cutoff Line (Interactive) ✅
Make the cutoff line draggable and editable.
- [x] Move line up/down with buttons
- [x] Click line label to edit text
- [x] Add `cutoff_label` field to sessions table (default: "Cutoff")
- [x] Mobile-friendly: buttons always visible on mobile

**Tests:**
- Dragging updates position
- Label editing works
- Changes sync to other users

#### Step 6: Mobile Optimisation ✅
Ensure Backlog view works well on mobile.
- [x] Compact card layout (rank, title, score) - already implemented
- [x] Drag handles visible and touch-friendly
- [x] Cutoff line buttons always visible on mobile
- [x] Roadmap tab not shown (not yet implemented)

**Tests:**
- Layout is touch-friendly
- Drag works on touch devices
- Modal works for line editing

### Data Model Changes

**sessions table:**
```sql
ALTER TABLE sessions ADD COLUMN view text DEFAULT 'scoring';
ALTER TABLE sessions ADD COLUMN cutoff_position integer;
ALTER TABLE sessions ADD COLUMN cutoff_label text DEFAULT 'Cutoff';
```

**items table:**
```sql
ALTER TABLE items ADD COLUMN backlog_position integer;
```

### Design Mockups
- Backlog view: `plans/backlog-view.mockup.html`
- Roadmap view: `plans/roadmap-view.mockup.html`

---

## 7.5 Roadmap View - Implementation Plan

### Overview
A timeline view with **custom time buckets** (not calendar dates). Users define their own time periods (e.g., "Q1", "Sprint 1", "v1.0", "Now/Next/Later") and place items within them. This approach is more flexible than date-based Gantt charts and doesn't require date pickers.

### Key Concepts

**Custom Time Buckets:**
- Users define named time periods (columns)
- Default buckets: "Now", "Next", "Later"
- Buckets have a width (1-4 units) representing relative duration
- Buckets can be renamed, resized, added, and deleted

**Item Placement:**
- Items are represented as horizontal bars
- Bars snap to bucket boundaries
- Bars can span multiple buckets
- Items not yet placed are "unscheduled"
- Moving items horizontally changes their timeline position

**No Dates Required:**
- Buckets represent relative time, not calendar dates
- More flexible for different planning styles (sprints, quarters, releases, etc.)
- Simpler UX without date pickers

### Design Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Time model | Custom buckets, not dates | Flexibility, no date pickers needed |
| Default buckets | "Now", "Next", "Later" | Universal, clearly editable |
| Bucket width | 1-4 units (default 4) | Relative sizing for different period lengths |
| Initial item state | Unscheduled (no bar) | User explicitly places items |
| Bar sizing | Default to bucket width | Simplest mental model |
| Bar snapping | Snap to bucket boundaries | Cleaner UX, easier to align |
| Mobile support | Deferred (placeholder message) | Drag interactions too complex for touch |
| CSV export | Disabled in roadmap view | Complexity deferred |
| Real-time sync | Yes | Consistent with other views |

### Data Model Changes

**New table: \****`roadmap_periods`**
```sql
CREATE TABLE roadmap_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  width integer NOT NULL DEFAULT 4 CHECK (width >= 1 AND width <= 4),
  position integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_roadmap_periods_session ON roadmap_periods(session_id);
```

**items table additions:**
```sql
ALTER TABLE items ADD COLUMN roadmap_start_period uuid REFERENCES roadmap_periods(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN roadmap_end_period uuid REFERENCES roadmap_periods(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN roadmap_row integer;
```

### Iterative Build Steps

#### Step 1: Database Schema & View Tab
Set up the data model and enable navigation to the Roadmap view.

- [x] Create migration for `roadmap_periods` table
- [x] Add `roadmap_start_period`, `roadmap_end_period`, `roadmap_row` columns to items
- [x] Add "Roadmap" option to view enum/tabs
- [x] Add Roadmap tab to ViewTabs component (desktop only)
- [x] Hide Roadmap tab on mobile, show placeholder message instead

**Tests:**
- Migration runs successfully
- Roadmap tab visible on desktop
- Roadmap tab hidden on mobile

#### Step 2: Default Bucket Initialisation
When user first opens Roadmap view, create default buckets.

- [x] Create `useRoadmapPeriods` hook to fetch/manage periods
- [x] On first Roadmap view open: create "Now", "Next", "Later" buckets if none exist
- [x] Display periods as column headers
- [x] Show "+ Add Period" button at the end

**Tests:**
- Default buckets created on first view
- Buckets display in correct order
- Existing buckets loaded correctly

#### Step 3: Bucket Header Editing
Allow users to rename and delete buckets.

- [x] Click bucket header to enter edit mode (inline input)
- [x] Press Enter or blur to save
- [x] Hover bucket header to reveal delete button (×)
- [x] Confirm before deleting (custom modal)
- [x] Deletion shifts remaining buckets left
- [x] Items in deleted bucket become "outside period" (greyed, warning state)

**Tests:**
- Rename persists to database
- Delete removes bucket and shifts others
- Items in deleted bucket show warning state

#### Step 4: Bucket Resizing
Allow users to change bucket width.

- [x] Add ⋮⋮ drag handle on right edge of bucket header
- [x] Drag left/right to resize (snaps to 1, 2, 3, or 4 units)
- [x] Width persists to database
- [x] Visual width proportional to unit value

**Tests:**
- Drag changes width
- Width snaps to valid values (1-4)
- Width persists and displays correctly

#### Step 5: Adding New Buckets
Allow users to add more time periods.

- [x] Click "+ Add Period" button
- [x] New bucket created with name "Period N" (sequential)
- [x] Default width: 4
- [x] Inserted at end
- [x] Immediately enter edit mode for name

**Tests:**
- New bucket created with correct defaults
- Position is at end
- Name is editable immediately

#### Step 6: Timeline Grid Layout
Render the timeline grid with rows for each item.

- [x] Create `RoadmapTimeline` component
- [x] Sidebar: list of items with priority number and period assignment
- [x] Grid: bucket columns with item rows
- [x] Row height: ~48px per item
- [x] Grid lines between buckets

**Tests:**
- Layout renders correctly
- Items appear in sidebar
- Bucket columns have correct proportional widths

#### Step 7: Placing Items (Hover to Drop)
Allow users to place unscheduled items onto the timeline.

- [x] Unscheduled items: empty row with hover interaction
- [x] On hover over row within a bucket: show ghost bar (greyed, dashed border)
- [x] On click: place item there with default width (1 bucket)
- [x] Update `roadmap_start_period` and `roadmap_end_period` to same bucket
- [x] Sidebar updates to show period assignment

**Tests:**
- Hover shows ghost bar
- Click places item
- Database updated correctly
- Sidebar reflects placement

#### Step 8: Moving Item Bars
Allow users to drag bars horizontally to different buckets.

- [x] Bars are draggable horizontally
- [x] Snaps to bucket boundaries on drop
- [x] Updates `roadmap_start_period` and `roadmap_end_period`
- [x] Sidebar reorders based on timeline position (left-to-right = top-to-bottom)

**Tests:**
- Drag moves bar
- Snaps to bucket boundaries
- Database updated
- Sidebar reorders

#### Step 9: Resizing Item Bars
Allow users to extend bars across multiple buckets.

- [x] Left and right resize handles on bars
- [x] Drag handle to extend/shrink bar
- [x] Minimum size: 1 bucket
- [x] Snaps to bucket boundaries
- [x] Updates `roadmap_start_period` (left) and `roadmap_end_period` (right)

**Tests:**
- Resize handles visible on hover
- Drag extends/shrinks bar
- Minimum size enforced
- Snaps correctly

#### Step 10: Outside Period Handling
Handle items that become orphaned when buckets are deleted.

- [x] Items with invalid period references shown in "overflow" area
- [x] Greyed bar with ⚠️ indicator
- [x] Warning message: "X items outside of defined periods"
- [x] User can re-place by clicking in timeline

**Tests:**
- Orphaned items display in overflow
- Warning indicator visible
- Re-placement works

#### Step 11: Real-time Sync
Ensure all roadmap changes sync across collaborators.

- [x] Subscribe to `roadmap_periods` table changes
- [x] Subscribe to item `roadmap_*` field changes
- [x] Optimistic updates for responsive UX
- [x] Handle concurrent edits gracefully

**Tests:**
- Period changes sync to other users
- Item placement syncs to other users
- No conflicts on concurrent edits

#### Step 12: Mobile Placeholder
Show a helpful placeholder on mobile explaining roadmap is desktop-only.

- [x] Hide Roadmap tab in mobile nav
- [x] If user somehow reaches roadmap on mobile (e.g., URL), show placeholder
- [x] Placeholder message: "Roadmap view is available on desktop"
- [x] Show icon/illustration indicating desktop feature
- [x] Include "Open on desktop" CTA or QR code (stretch)

**Tests:**
- Roadmap tab not visible on mobile
- Placeholder renders on mobile
- Message is clear and helpful

#### Step 13: Disable CSV Export in Roadmap View
Keep CSV export simple by disabling in roadmap view.

- [x] In Roadmap view: Export CSV button is disabled/hidden
- [x] Tooltip: "Switch to Scoring or Backlog view to export"
- [x] Export still works normally in Scoring and Backlog views

**Tests:**
- Export disabled in Roadmap view
- Export works in other views
- Tooltip explains why

### Component Structure

```
src/
├── components/
│   ├── RoadmapView.tsx           # Main container
│   ├── RoadmapTimeline.tsx       # Grid layout
│   ├── RoadmapSidebar.tsx        # Item list sidebar
│   ├── RoadmapPeriodHeader.tsx   # Bucket header (editable)
│   ├── RoadmapItemBar.tsx        # Draggable/resizable bar
│   ├── RoadmapGhostBar.tsx       # Hover placeholder for placing items
│   └── RoadmapMobilePlaceholder.tsx # Mobile fallback message
├── hooks/
│   ├── useRoadmapPeriods.ts      # CRUD for periods
│   └── useRoadmapPlacement.ts    # Item placement logic
└── lib/
    └── roadmap.ts                # Helper functions
```

### UX Flow Summary

1. **First open**: User sees 3 default buckets ("Now", "Next", "Later") with empty rows for each item
2. **Place item**: Hover over empty row → ghost bar appears → click to place
3. **Move item**: Drag bar left/right → snaps to new bucket
4. **Resize item**: Drag bar edges → extends across buckets
5. **Edit bucket**: Click header to rename, drag edge to resize, hover for delete
6. **Add bucket**: Click "+" to add new period
7. **Delete bucket**: Items in bucket become "outside period", user must re-place

### Out of Scope (Future)
- Calendar date integration
- Milestone markers
- Dependencies between items
- Colour customisation for bars
- Mobile editing (read-only or fully deferred)
- CSV export of roadmap data
