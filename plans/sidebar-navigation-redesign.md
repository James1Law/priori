---
planStatus:
  planId: plan-sidebar-navigation-redesign
  title: "Platform Redesign: Sidebar Navigation + Module Views"
  status: ready-for-development
  planType: feature
  priority: high
  owner: jameslaw
  tags:
    - navigation
    - ux
    - desktop
    - scalability
    - prioritisation
    - poker-planner
  created: "2026-04-02"
  updated: "2026-04-02T13:17:13.000Z"
  progress: 0
---

# Platform Redesign: Sidebar Navigation + Module Views

## Goals

- Replace bottom-tab navigation with a persistent left sidebar on desktop
- Create a scalable navigation shell that grows from 5 modules to 10+
- Build a new **Prioritisation module** — inline table scoring (like Craft.io) replaces the current select-and-score flow
- Refactor **Poker Planner** as a standalone module showing all items, not just a pre-selected subset
- Simplify the **Backlog** — remove Score/Estimate action buttons; add sort-by-score and sort-by-story-points options
- Rename modules: Scoring → Prioritisation, Estimate → Poker Planner
- Add "Coming Soon" placeholders for future modules
- Keep current mobile layout unchanged for v1
- Stay on-brand: Indigo/gray palette, Inter body, Poppins headings

## Overview

The current UI has three bottom tabs and a select-then-navigate flow for scoring and estimation. This doesn't scale and creates friction. The redesign introduces:

1. **Sidebar navigation** — persistent left drawer, collapsible to icons
2. **Same data, different lenses** — Backlog, Prioritisation, Poker Planner, Roadmap, and Capacity Planning all view the same items but with different UX optimised for each task
3. **Inline scoring** — Prioritisation module shows a table with framework-specific columns; you score items directly in the table and watch them reorder live
4. **Standalone Poker Planner** — shows all items, work through them top-to-bottom, re-estimate any time

## Design Decisions

### What lives where

| Location | Content |
|----------|---------|
| **Top header bar** | Priori logo + wordmark, participant count + chat button, kebab menu |
| **Sidebar top** | Hamburger toggle, session name, session URL |
| **Sidebar main** | Module nav: Backlog, Roadmap, Capacity Planning, Prioritisation, Poker Planner |
| **Sidebar "Coming Soon"** | Greyed-out: Sprints, Analytics, Integrations, Import/Export, Dashboards |
| **Sidebar footer** | Settings |
| **Content area** | Module-specific header, toolbar, and content |

### Module Architecture

| Module | Route | Description |
|--------|-------|-------------|
| **Backlog** | `/s/:slug` | Item list with search, filters, drag reorder, status management. Sort by manual, priority score, story points. No Score/Estimate buttons — those are separate modules now. |
| **Roadmap** | `/s/:slug/roadmap` | Timeline view (existing) |
| **Capacity Planning** | `/s/:slug/capacity` | Effort vs capacity (existing) |
| **Prioritisation** | `/s/:slug/prioritise` | **NEW** — Table with framework selector (RICE/ICE/MoSCoW/Weighted). Columns change per framework. Inline scoring via pip controls. Items auto-reorder by calculated score. |
| **Poker Planner** | `/s/:slug/estimate` | **REFACTORED** — Shows all items (not pre-selected). Host control flow as today. Green ticks on estimated items. Can re-estimate any item. |

### Prioritisation Module Design

Inspired by Craft.io's scoring table:

- **Framework selector** — pill tabs at the top (RICE, ICE, MoSCoW, Weighted). Changing the framework changes the table columns.
- **Table columns** — Rank, Item (title + meta + status), Calculated Score, then one column per criterion
- **Inline scoring** — Each criterion cell shows coloured pip indicators. Click pips to set the value (1–5 scale). Toggle: clicking the same value again clears it.
- **Colour-coded pips** — Each criterion has a distinct colour (Reach=green, Impact=blue, Confidence=purple, Effort=red for RICE)
- **Live reordering** — When you score an item, the table re-sorts by calculated score. Rank badges update (gold/silver/bronze for top 3).
- **Score badges** — Colour-coded: green (high), amber (mid), red (low), gray (unscored)
- **MoSCoW** — Uses a dropdown selector instead of pips (Must/Should/Could/Won't)
- **"+ New Item" row** at the bottom of the table
- **No more "select items then enter scoring flow"** — everything happens in one view

### Poker Planner Changes

- Navigated to from sidebar (not from backlog selection)
- Shows ALL items in the estimation queue, sorted by backlog position
- Already-estimated items show green tick + story points, but can be re-estimated
- Host control flow unchanged (host reveals, accepts, etc.)
- No pre-selection needed — just start working through items

### Backlog Design (approved mockup)

- **Checkboxes** for multi-select → action bar shows "Set Status" and "Delete" only (no Score/Estimate)
- **Hierarchy** fully supported: colour-coded left accent bars (pink=Goal, blue=Initiative, purple=Epic, amber=Story, slate=Subtask), level badges, expand/collapse chevrons, indentation (1.5rem per level), child count badges on collapsed parents, rolled-up story points on parents
- **Flat items** remain unchanged — no accent bar, no chevron, same row layout
- **Sort options**: Manual, Priority Score, Story Points, Status, Recently Added
- **Cutoff lines** preserved (red/amber/blue/green dividers)
- **Search + filters** in content area below module title
- **"+ New Item"** row at bottom of list

### Sidebar Behaviour

- **Expanded (default):** 260px wide, icons + labels + "Soon" badges
- **Collapsed:** 64px wide, icons only with hover tooltips
- **Toggle:** Hamburger button in sidebar header
- **Persistence:** Collapse state saved to localStorage (global, not per-session)
- **Active state:** Indigo background (`bg-indigo-50`, `text-indigo-600`)
- **Disabled items:** 40% opacity, non-interactive, "Soon" badge

### Mobile Strategy (v1)

- **No changes to mobile.** Existing `MobileBottomBar` with 3 tabs stays.
- Sidebar only renders at `lg:` breakpoint and above (1024px+).
- Prioritisation and Poker Planner accessible on mobile via existing flows for now.

## Mockups (all approved)

- **Sidebar (expanded + collapsed):** `plans/sidebar-nav-desktop.mockup.html`
  - Interactive: toggle expanded/collapsed, click nav items for active state
- **Prioritisation module:** `plans/prioritisation-module.mockup.html`
  - Interactive: switch between RICE/ICE/MoSCoW/Weighted frameworks, click pips to score inline, watch scores recalculate and items reorder
- **Backlog with hierarchy:** `plans/backlog-hierarchy.mockup.html`
  - Interactive: expand/collapse hierarchy, multi-select checkboxes for status changes only, cutoff lines, sort options including Priority Score and Story Points

## Implementation Plan

### Phase 1: App Shell + Sidebar

**Goal:** New navigation shell wrapping existing content. No module changes yet.

1. Create `src/components/AppShell.tsx` — sidebar + header + content slot
2. Create `src/components/Sidebar.tsx` — nav items, icons, collapse toggle, "Coming Soon" items
3. Update `src/pages/SessionPage.tsx` — wrap in AppShell, remove ViewTabs on desktop
4. Add routes in `App.tsx` for `/s/:slug/roadmap`, `/s/:slug/capacity`, `/s/:slug/prioritise`
5. Replace `localView` localStorage state with route-based navigation
6. `MobileBottomBar` unchanged for `< lg`
7. Tests for AppShell, Sidebar, route-based navigation

### Phase 2: Poker Planner Refactor

**Goal:** Standalone module showing all items, navigated to from sidebar.

1. Update `EstimationFlowPage.tsx` — remove dependency on `location.state.selectedItemIds`
2. When no items are pre-selected, load all session items into the estimation queue
3. Already-estimated items show green tick + SP badge, clickable to re-estimate
4. Remove "Estimate" button from Backlog action bar
5. Sidebar highlights "Poker Planner" when on `/s/:slug/estimate`
6. Update existing estimation tests

### Phase 3: Prioritisation Module

**Goal:** New inline scoring table view, replaces the old scoring flow.

1. Create `src/pages/PrioritisationPage.tsx` — framework selector + scoring table
2. Build inline scoring controls:
   - Pip indicators for RICE, ICE, Weighted (click to score, colour per criterion)
   - Dropdown for MoSCoW categories
3. Live score calculation and auto-reorder on score change
4. Score badge with colour coding (high/mid/low/unscored)
5. Rank badges (gold/silver/bronze for top 3)
6. "+ New Item" row at bottom
7. Remove "Score" button from Backlog action bar
8. Route: `/s/:slug/prioritise`
9. Comprehensive tests for all frameworks

### Phase 4: Backlog Cleanup + Renaming

**Goal:** Simplify Backlog per approved mockup, apply new terminology everywhere.

1. Remove Score/Estimate buttons from Backlog action bar (keep Set Status + Delete)
2. Add sort options: Priority Score, Story Points, Status, Recently Added
3. Ensure hierarchy rendering matches approved mockup (accent bars, level badges, child counts, rolled-up SP)
4. Rename across UI: Scoring → Prioritisation, Estimate → Poker Planner
5. Update breadcrumbs, page titles, sidebar labels
6. Update all tests and documentation

## Acceptance Criteria

### Phase 1
- [ ] Sidebar renders on desktop (`lg:+`) with all module nav items
- [ ] Sidebar collapses to icon-only with tooltips, state persisted globally
- [ ] Session name shown in sidebar header
- [ ] Active module highlighted based on current route
- [ ] "Coming Soon" items greyed out (Sprints, Analytics, Integrations, Import/Export, Dashboards)
- [ ] Top header: Priori logo, participant count + chat, kebab menu
- [ ] Mobile layout completely unchanged
- [ ] Route-based navigation working for all modules

### Phase 2
- [ ] Poker Planner shows all items when navigated to from sidebar
- [ ] Estimated items show green tick, re-estimable
- [ ] Host control flow unchanged
- [ ] "Estimate" button removed from Backlog action bar

### Phase 3
- [ ] Prioritisation page renders with framework selector
- [ ] RICE, ICE, MoSCoW, Weighted frameworks all work with correct columns
- [ ] Inline pip scoring updates scores in real-time
- [ ] Table auto-reorders by calculated score
- [ ] Scores persist to database
- [ ] "Score" button removed from Backlog action bar

### Phase 4
- [ ] Backlog sort options include Priority Score and Story Points
- [ ] All terminology updated: Prioritisation, Poker Planner
- [ ] All tests passing, documentation updated

## Open Questions

- Should the sidebar collapse state be global or per-session?  **Decision: Global.**
- Keyboard shortcuts for switching modules? (Deferred — nice-to-have for later)
- Should Prioritisation support "Group by" like Craft.io? (Deferred — v2)
