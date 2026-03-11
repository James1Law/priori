# Capacity Planning — PRD & Implementation Plan

## Vision

Extend Priori with a **Capacity Planning** view that lets teams answer: *"Can we deliver this backlog with the team we have?"* Users define team capacity (size, working days, focus factor) and assign effort estimates to items. The view calculates utilisation, highlights risk, and exports to CSV for stakeholder communication.

Inspired by real-world capacity planning spreadsheets — this feature brings that workflow into a collaborative, real-time tool.

---

## User Story

**As a** product manager or engineering lead
**I want** to see how my backlog's estimated effort compares to my team's available capacity
**So that** I can make informed decisions about scope, team size, and timelines

---

## Key Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Data level | Feature-level only | Each item has a single estimate. No subtasks. Keeps it simple and consistent with existing item model. |
| Navigation | New view tab | Third tab in bottom bar alongside List and Roadmap. Accessed via `localView = 'capacity'`. |
| Settings scope | Session-level (shared) | All participants see the same capacity settings. Synced via Supabase. |
| Estimate unit | Configurable per session | Days, hours, or points. Stored on session. |
| Settings visibility | Always visible | No collapsible toggle — settings are adjusted frequently as items are added. |
| Estimate field | New `effort_estimate` on items | Separate from `story_points` (Planning Poker). Capacity estimates are entered directly, not via group estimation. |
| CSV export | Supported | Includes items with estimates + capacity summary header rows. |

---

## Design Mockup

`plans/capacity-planning-view.mockup.html`

---

## Data Model Changes

### sessions table

```sql
ALTER TABLE sessions ADD COLUMN capacity_team_size integer DEFAULT 5;
ALTER TABLE sessions ADD COLUMN capacity_working_days integer DEFAULT 65;
ALTER TABLE sessions ADD COLUMN capacity_focus_factor real DEFAULT 0.6;
ALTER TABLE sessions ADD COLUMN capacity_contingency real DEFAULT 0.3;
ALTER TABLE sessions ADD COLUMN capacity_unit text DEFAULT 'days' CHECK (capacity_unit IN ('days', 'hours'));
ALTER TABLE sessions ADD COLUMN capacity_hours_per_day integer DEFAULT 8;
```

### items table

```sql
ALTER TABLE items ADD COLUMN effort_estimate real;
```

### TypeScript types

```typescript
// Add to Session interface
capacity_team_size: number
capacity_working_days: number
capacity_focus_factor: number
capacity_contingency: number
capacity_unit: 'days' | 'hours'
capacity_hours_per_day: number

// Add to ViewMode
export type ViewMode = 'list' | 'roadmap' | 'capacity'

// Add to Item interface
effort_estimate: number | null
```

---

## Formulas

| Metric | Formula |
| --- | --- |
| **Net Capacity** | `team_size × working_days × focus_factor` |
| **Total Effort** | `sum(effort_estimate) × (1 + contingency)` |
| **Utilisation %** | `total_effort / net_capacity × 100` |
| **Coverage** | `items_with_estimate / total_items` |
| **Remaining** | `net_capacity - total_effort` |

### Utilisation thresholds

| Range | Colour | Label |
| --- | --- | --- |
| 0–79% | Green (#10b981) | Healthy |
| 80–99% | Amber (#f59e0b) | At Risk |
| 100%+ | Red (#ef4444) | Over Capacity |

---

## Implementation Plan — Iterative Steps

### Step 1: Database Schema & Types

Add capacity fields to the database and update TypeScript types.

- [x] Create Supabase migration: add `capacity_*` columns to `sessions` table
- [x] Create Supabase migration: add `effort_estimate` column to `items` table
- [x] Update `Session` interface in `src/types/database.ts` with capacity fields
- [x] Update `Item` interface with `effort_estimate: number | null`
- [x] Update `ViewMode` type to include `'capacity'`
- [x] Update Supabase RLS policies if needed

**Tests:**
- Migration runs successfully
- Types compile without errors
- Existing functionality unaffected

---

### Step 2: View Tab & Navigation

Add the Capacity tab to the bottom navigation bar.

- [x] Add `'capacity'` option to `MobileBottomBar` VIEWS array
- [x] Add bar chart icon for Capacity tab
- [x] Update `localView` localStorage handling to support `'capacity'`
- [x] Add empty placeholder component `CapacityView` that renders "Capacity Planning — coming soon"
- [x] Wire up `SessionPage` to render `CapacityView` when `localView === 'capacity'`

**Tests:**
- Capacity tab renders in bottom bar
- Clicking tab switches to capacity view
- View persists in localStorage across page reloads
- Other views still work correctly

---

### Step 3: Capacity Settings Panel

Build the settings controls that configure team capacity.

- [x] Create `CapacitySettings` component with stepper inputs for: team size, working days, focus factor, contingency
- [x] Add segmented control for unit (days / hours / points)
- [x] Create `useCapacitySettings` hook to read/write capacity fields on the session
- [x] Settings update the session in Supabase (debounced, optimistic)
- [x] Settings sync in real-time across participants (via existing session subscription)
- [x] Default values: team size 5, working days 65, focus factor 0.6, contingency 30%, unit days

**Tests:**
- Stepper increments/decrements correctly (with min/max bounds)
- Focus factor: min 0.1, max 1.0, step 0.1
- Contingency: min 0%, max 200%, step 5%
- Team size: min 1, max 100
- Working days: min 1, max 365
- Settings persist to database
- Settings sync to other participants in real-time

---

### Step 4: Summary Dashboard Cards

Build the four summary metric cards at the top of the view.

- [x] Create `CapacitySummaryCards` component
- [x] Card 1 — **Total Effort**: sum of estimates + contingency, indigo accent background
- [x] Card 2 — **Net Capacity**: team size × working days × focus factor, white card
- [x] Card 3 — **Utilisation**: circular gauge with percentage, colour-coded by threshold
- [x] Card 4 — **Coverage**: X of Y items estimated, with progress bar
- [x] All cards recalculate live when settings or estimates change
- [x] Create `useCapacityMetrics` hook that derives all metrics from items + settings
- [x] Responsive: 4 columns on desktop, 2×2 grid on mobile

**Tests:**
- Net capacity formula correct: `teamSize × workingDays × focusFactor`
- Total effort formula correct: `sumEstimates × (1 + contingency)`
- Utilisation formula correct: `totalEffort / netCapacity`
- Coverage counts only items with non-null effort_estimate
- Gauge colour changes at thresholds (green < 80%, amber 80–99%, red ≥ 100%)
- Cards update when settings change
- Cards update when estimates change
- Edge cases: zero items, all items unestimated, zero team size

---

### Step 5: Item List with Estimate Inputs

Render the item list with inline effort estimate fields.

- [x] Create `CapacityItemList` component showing all session items
- [x] Each row: rank number, title, status badge, inline estimate input with unit suffix
- [x] Items without estimates: dashed border input with "—" placeholder
- [x] Estimate input: numeric, saves to `effort_estimate` field on blur or Enter
- [x] Debounced save (300ms) with optimistic update
- [x] Summary row at bottom: "Total (X of Y items)" with total estimate
- [x] Column headers: #, Item, Status, Estimate (hidden on mobile)
- [x] Reuse existing item data from `SessionPage` — no separate fetch

**Tests:**
- All items render with correct rank
- Estimate input saves to database
- Estimate input shows current value or placeholder
- Summary row shows correct total and count
- Status badges render correctly (To Do, In Progress, Done)
- Items without estimates don't affect total

---

### Step 6: Utilisation Bar

Add the visual utilisation bar below the item list.

- [x] Create `UtilisationBar` component
- [x] Horizontal bar showing effort as proportion of capacity
- [x] Colour-coded: green (healthy), amber (at risk), red (over capacity)
- [x] Label: "195 / 273 days (71%)"
- [x] Legend: "Effort (incl. contingency)" and "Remaining capacity"
- [x] Bar animates smoothly when values change

**Tests:**
- Bar width proportional to utilisation percentage
- Capped at 100% width (even if over capacity)
- Colour matches utilisation threshold
- Label shows correct values

---

### Step 7: Real-time Sync

Ensure capacity changes sync across collaborators.

- [x] Capacity settings sync via existing session subscription (already handles UPDATE events)
- [x] Effort estimates sync via existing items subscription (already handles UPDATE events)
- [x] Verify that changing an estimate on one client updates the dashboard on another
- [x] Verify that changing a setting on one client updates the view on another
- [x] No additional Supabase channels needed — leverage existing subscriptions

**Tests:**
- Estimate change on client A updates dashboard on client B
- Setting change on client A updates view on client B
- No duplicate updates or flickering

---

### Step 8: CSV Export

Add capacity-specific CSV export.

- [x] Create `exportCapacityCsv` function in `src/lib/exportCsv.ts`
- [x] CSV structure:
  - Header rows: session name, date exported
  - Capacity settings rows: team size, working days, focus factor, contingency, unit
  - Summary rows: net capacity, total effort, utilisation %, coverage
  - Blank row separator
  - Item table: Rank, Title, Status, Estimate (with unit)
  - Footer row: Total
- [x] Add Export CSV button to `CapacitySettings` panel (right-aligned)
- [x] Filename: `{sessionName}-capacity-{date}.csv`

**Tests:**
- CSV contains correct header information
- CSV contains all items with estimates
- Items without estimates show empty estimate cell
- Total row sums correctly
- Capacity settings and summary included above item table
- File downloads with correct filename

---

### Step 9: Mobile Optimisation

Ensure the capacity view works well on mobile.

- [x] Summary cards: 2×2 grid layout
- [x] Settings panel: wraps to multiple rows, full-width controls
- [x] Item list: simplified card layout (rank, title, estimate — status hidden or below)
- [x] Estimate input: tap to focus, numeric keyboard on mobile
- [x] Export button: full-width on mobile, below settings
- [x] Gauge ring: slightly smaller on mobile (52px vs 64px)
- [x] Test on iOS Safari and Android Chrome

**Tests:**
- Layout doesn't overflow on 320px viewport
- Estimate inputs are easy to tap (min 44px touch target)
- Numeric keyboard appears for estimate inputs
- All features accessible on mobile

---

### Step 10: Edge Cases & Polish

Handle edge cases and add finishing touches.

- [x] Empty state: no items yet — show helpful message
- [x] All items unestimated: show 0 total, 0% utilisation, "Add estimates to see capacity"
- [x] Zero capacity (e.g., 0 team size): show "Configure capacity settings" prompt, avoid division by zero
- [x] Unit label updates everywhere when unit setting changes
- [x] Net Capacity card subtitle updates dynamically: "7 devs × 65 days × 0.6 focus"
- [x] Total Effort card subtitle updates: "150 base + 45 contingency (30%)"
- [x] Disable Export CSV button when no items have estimates

**Tests:**
- No divide-by-zero errors
- Empty state renders correctly
- Unit labels update everywhere when changed
- Export button disabled state works

---

## Component Structure

```
src/
├── components/
│   ├── CapacityView.tsx              # Main container (orchestrates sub-components)
│   ├── CapacitySummaryCards.tsx       # 4 metric cards
│   ├── CapacitySettings.tsx          # Settings panel with steppers + unit toggle
│   ├── CapacityItemList.tsx          # Item table with estimate inputs
│   └── UtilisationBar.tsx            # Colour-coded progress bar
├── hooks/
│   └── useCapacityMetrics.ts         # Derived capacity calculations
└── lib/
    └── exportCsv.ts                  # Add exportCapacityCsv (extend existing file)
```

---

## URL Structure

No new routes needed. Capacity is a view mode within the existing session page:

```
/s/:slug  (with localView = 'capacity')
```

---

## Out of Scope (Future)

- Subtask breakdown within items
- Multiple teams / roles with different capacities
- Sprint-based planning (multiple periods with separate capacities)
- Burndown / burnup charts
- Integration with Jira / Linear effort fields
- Per-participant "what if" scenario modelling

---

*Document version: 1.1 — All steps complete*
*Last updated: 2026-03-11*
*Design mockup: plans/capacity-planning-view.mockup.html*
