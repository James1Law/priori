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

**Current Status:**
- https://priori.workLive at https://priori.work
- 172 tests passing
- All 5 prioritisation frameworks complete
- Real-time collaboration enabled via Supabase Realtime
- Participant presence tracking with names
- Mobile responsive UI with touch-friendly inputs
- CSV export with session naming
- Error boundary and 404 page
- Lazy loading for framework-specific components
- Custom branding (logo, typography, colour scheme)
- UK English spelling throughout

---

*Document version: 2.0*
*Last updated: 2026-01-15 - Phase 6 complete, Phase 2 PRD added*

---

## Phase 2 PRD: Backlog & Planning Features

### Vision
Extend Priori beyond scoring/evaluation into **planning and communication**. Inspired by tools like Aha!, add a Backlog View that helps teams visualise priorities, define scope boundaries, and communicate what's in/out.

---

### 7.1 Backlog View
**As a** product manager
**I want** to view my items as a ranked backlog with a cutoff line
**So that** I can communicate what's in scope for a release/sprint

**Acceptance Criteria:**
- [ ] New "Backlog" tab in view selector (alongside Scoring)
- [ ] Items displayed as a numbered ranked list (1, 2, 3...)
- [ ] Drag-and-drop to reorder items manually
- [ ] Draggable horizontal "cutoff line" that can be positioned between any two items
- [ ] Items above the line styled differently (in scope) vs below (out of scope)
- [ ] Line position persists to session
- [ ] Optional: Label for the line (e.g., "Sprint 1", "MVP", "Phase 1")

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
- [ ] Import from CSV (bulk item creation)

---

### 7.5 Roadmap View (Gantt-style)
**As a** product manager
**I want** to visualise items on a timeline
**So that** I can plan and communicate delivery schedules

**Acceptance Criteria:**
- [ ] Horizontal timeline with configurable date range (weeks/months/quarters)
- [ ] Items displayed as horizontal bars showing start → end
- [ ] Drag items horizontally to change timing
- [ ] Drag bar edges to adjust duration
- [ ] Items can overlap (parallel work) or be sequential
- [ ] Visual "today" marker line
- [ ] Zoom controls (week/month/quarter views)

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
