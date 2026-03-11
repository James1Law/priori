# Priori Changelog

Detailed history of features implemented across all phases.

---

## Phase 14 - Desktop Add Item UX (Complete)

### Features
- **Centered Modal on Desktop**: BottomSheet renders as a centered modal with proper padding on `lg+` screens, bottom sheet on mobile
- **Desktop Add Item Button**: "Add Item" button in content area, visible across all views (List, Roadmap, Capacity) on desktop
- **FAB Hidden on Desktop**: Floating action button now only shows on mobile (`lg:hidden`)
- **Drag Handle Hidden on Desktop**: Bottom sheet drag handle only visible on mobile

---

## Phase 13 - Capacity Planning (Complete)

### Overview
New Capacity Planning view that lets teams compare backlog effort against team capacity with real-time utilisation metrics.

### Features
- **Capacity View**: Third view tab alongside List and Roadmap
- **Summary Cards**: 4-card dashboard — Total Effort (indigo accent), Net Capacity, Utilisation (SVG circular gauge), Coverage (progress bar)
- **Settings Panel**: Stepper controls for Team Size, Working Days, Focus Factor, Contingency, with segmented Days/Hours unit toggle
- **Hours/Day Setting**: Configurable hours per day (default 8), shown only when Hours unit selected
- **Editable Steppers**: Click inside any stepper value to type directly (desktop UX improvement)
- **Item List**: Ranked items with inline effort estimate inputs, status badges, summary row
- **Utilisation Bar**: Colour-coded horizontal bar showing effort vs capacity with legend
- **CSV Export**: Structured export with settings, summary metrics, and item table
- **Empty States**: Helpful messages for no items and no estimates
- **Mobile Optimised**: 44px touch targets, responsive grids, numeric keyboard inputs

### Formulas
- **Net Capacity**: `teamSize × workingDays × focusFactor` (× `hoursPerDay` when unit is hours)
- **Total Effort**: `sum(estimates) × (1 + contingency)`
- **Utilisation**: `totalEffort / netCapacity × 100` — green (<80%), amber (80–99%), red (≥100%)

### New Components
- `src/components/CapacityView.tsx` — Main orchestrator
- `src/components/CapacitySummaryCards.tsx` — 4 metric cards with gauge
- `src/components/CapacitySettings.tsx` — Settings panel with steppers and unit toggle
- `src/components/CapacityItemList.tsx` — Item table with inline estimate inputs
- `src/components/UtilisationBar.tsx` — Colour-coded progress bar

### New Hooks
- `src/hooks/useCapacitySettings.ts` — Read/write capacity settings with debounced persistence
- `src/hooks/useCapacityMetrics.ts` — Derived capacity calculations via useMemo

### Database Changes
- `supabase/014_add_capacity_planning.sql` — Capacity columns on sessions + effort_estimate on items
- `supabase/015_capacity_hours_per_day.sql` — Hours per day column, remove points unit

### Design Reference
- PRD: `docs/CAPACITY-PLANNING-PRD.md`
- Mockup: `plans/capacity-planning-view.mockup.html`

### Status
- ✅ All unit tests passing (646 tests)
- ✅ Build passing

---

## Phase 12 - Backlog-Centric Redesign (Complete)

### Overview
Fundamental UX redesign shifting from a 4-tab model (Scoring, Estimates, Backlog, Roadmap) to a **backlog-centric model** where the backlog is the home view and all other features are actions applied to items.

### Completed Features
- **Backlog as Home View**: List view is now the default, showing all items with columns for rank, title, status, score, estimate, and period
- **View Toggle**: Simple List/Roadmap toggle replaces the 4-tab navigation
- **Item Selection & Actions**: Checkbox multi-select with ActionBar for bulk operations (Score, Estimate, Set Status, Assign Period, Delete)
- **Item Drawer**: Side panel for viewing/editing item details, opened by clicking a row
- **Multiple Cutoffs**: Support for multiple cutoff lines with custom labels and colours
- **Toolbar & Filtering**: Search, status filter, estimate/roadmap toggles, period filter
- **Dedicated Scoring Flow**: `/s/:slug/score` route with breadcrumb navigation
- **Dedicated Estimation Flow**: `/s/:slug/estimate` route for Planning Poker
- **URL Routing**: Clean URLs for all views (`/s/:slug`, `/s/:slug/roadmap`, `/s/:slug/item/:id`)
- **Mobile Adaptation**: Responsive toolbar, filter bottom sheet, touch-friendly interactions

### New Components
- `src/components/BacklogToolbar.tsx` - Search, filters, and view toggle
- `src/components/ActionBar.tsx` - Bulk action bar for selected items
- `src/components/ItemDrawer.tsx` - Side drawer for item details
- `src/components/Breadcrumb.tsx` - Navigation breadcrumb for flows
- `src/pages/ScoringFlowPage.tsx` - Dedicated scoring flow
- `src/pages/EstimationFlowPage.tsx` - Dedicated estimation flow

### New Hooks
- `src/hooks/useCutoffs.ts` - CRUD operations for multiple cutoffs

### Database Changes
- `supabase/012_backlog_centric_redesign.sql` - Schema updates for redesign
- `supabase/013_add_estimation_item_ids.sql` - Track items in estimation queue

### Design Reference
- PRD: `docs/PRD-backlog-centric-redesign.md`
- Mockup: `plans/backlog-centric-redesign.mockup.html`

### Status
- ✅ All unit tests passing (535 tests)
- ✅ Build passing
- ⚠️ E2E tests need updating for new UI structure

---

## Phase 11 - Mobile Roadmap View (Complete)

### Features
- **Vertical Timeline**: Stacked period cards replacing horizontal desktop layout
- **Item Bars**: Gradient-coloured bars showing scheduled items with quadrant positioning
- **Item Selection**: Tap to select, shows resize handles on selected item
- **Drag-to-Resize**: Touch-friendly handles to extend/shrink items across quadrants and periods
- **Unscheduled Items**: Bottom section lists items not yet scheduled with tap-to-assign flow
- **Period Management**: Tap period header to rename/delete, Add Period button at bottom
- **Empty State**: Friendly "No periods yet" message with Add Period CTA
- **Accessibility**: Full ARIA labels, keyboard support, motion-reduce preference

### New Components
- `src/components/MobileRoadmapView.tsx` - Main mobile roadmap with period cards and item bars
- `src/components/UnscheduledItemsPicker.tsx` - Bottom sheet for selecting items to schedule
- `src/components/PeriodSelector.tsx` - Period selection modal for scheduling flow
- `src/components/PeriodEditModal.tsx` - Modal for renaming/deleting periods

### Design Reference
- PRD: `docs/PRD-mobile-roadmap.md`
- Mockup: `plans/mobile-roadmap-ux.mockup.html`

---

## Phase 10 - Landing Page Redesign (Complete)

### Features
- **Updated Hero**: New subtitle "Score, estimate, plan and ship together in real-time"
- **Features Grid**: 6 feature cards showcasing Scoring Frameworks, Planning Poker, Backlog Management, Visual Roadmap, Team Chat, Real-Time Collaboration
- **Frameworks Bar**: Badge pills for RICE, ICE, Value vs Effort, MoSCoW, Weighted Scoring
- **How It Works**: 4-step guide with numbered circles and connecting line
- **Final CTA**: Bottom section with "Ready to Prioritise Smarter?" and second Create New Session button
- **Spacing Refinements**: Balanced gaps above/below Get Started card

### New Components
- `src/components/FeatureCard.tsx` - Reusable feature card with icon, title, description

### Design Reference
- PRD: `docs/PRD-landing-page-redesign.md`
- Desktop mockup: `plans/landing-page-redesign.mockup.html`
- Mobile mockup: `plans/landing-page-redesign-mobile.mockup.html`

---

## Phase 9 - Planning Poker & Team Chat (Complete)

### Planning Poker Features
- **Estimation Queue**: Displays items in queue with pending, in_progress, completed states
- **Card Selection**: Fibonacci cards (0, 1, 2, 3, 5, 8, 13, 21) plus ? and ☕
- **Current Item Display**: Shows item being estimated with previous estimate badge
- **Participant Votes**: Card states for waiting, voted (face-down), revealed
- **Reveal Mechanism**: Real-time sync of reveal state across participants
- **Consensus Detection**: Shows "Consensus!", "Close - discuss briefly", or "No consensus"
- **Accept & Next Flow**: Accept suggested value, auto-advance to next item
- **Queue Progress**: Checkmarks, progress bar, completion message

### Team Chat Features
- **Chat Panel**: 320px sidebar on desktop, full-screen modal on mobile
- **Message Types**: User messages and system messages (join/leave)
- **Real-time Sync**: Messages sync via Supabase Realtime
- **Unread Badge**: Red badge shows unread count
- **Typing Indicators**: Shows "X is typing..." using Presence

### New Components
- `src/components/EstimatesView.tsx` - Planning Poker view
- `src/components/EstimationQueue.tsx` - Item queue with status
- `src/components/EstimationCards.tsx` - Fibonacci card selection
- `src/components/CurrentEstimationItem.tsx` - Current item display
- `src/components/ParticipantVotes.tsx` - Voting status display
- `src/components/EstimationResults.tsx` - Reveal and consensus
- `src/components/ChatPanel.tsx` - Desktop chat sidebar
- `src/components/ChatMessage.tsx` - Message display
- `src/components/MobileChatModal.tsx` - Mobile chat

### New Hooks
- `src/hooks/useEstimationVotes.ts` - Vote CRUD with real-time sync
- `src/hooks/useMessages.ts` - Message CRUD with subscription
- `src/hooks/useUnreadCount.ts` - Unread badge logic
- `src/hooks/useTypingIndicator.ts` - Typing state via Presence

### Database Changes
- `supabase/008_add_planning_poker_support.sql` - Estimation tables
- `supabase/011_add_chat_support.sql` - Messages table

---

## Phase 8 - Roadmap View (Complete)

### Features
- **Custom Time Periods**: Users define named periods (default: Now, Next, Later)
- **4-Quadrant Grid System**: Each period divided into 4 quadrants
- **Drag-and-Drop Scheduling**: Drag items onto timeline
- **Item Bar Resizing**: Drag edges to extend/shrink across periods
- **Ghost Preview**: Shows drop zone when dragging items
- **Orphaned Item Handling**: Items cleared when period deleted
- **Mobile Placeholder**: Desktop-only feature message

### Key Components
- `src/components/RoadmapView.tsx` - Main timeline with quadrant grid
- `src/components/RoadmapMobilePlaceholder.tsx` - Mobile fallback
- `src/hooks/useRoadmapPeriods.ts` - CRUD for periods

### Database Changes
- `supabase/006_add_roadmap_support.sql` - Periods table
- `supabase/007_add_quadrant_columns.sql` - Quadrant positioning

---

## Phase 7 - Backlog View (Complete)

### Features
- Backlog View with cutoff line
- Drag-and-drop reordering
- Manual vs Score ordering toggle

---

## Phase 6 - Branding & UX Polish (Complete)

### Features
- Brand Identity (logo, Poppins/Inter typography, indigo colour scheme)
- Mobile UX Improvements (bottom input bar, touch-friendly delete)
- Custom Confirmation Modals (replaced browser confirm() dialogs)

### Desktop UI Redesign
- **Consolidated Header**: Logo, session name, participant count, Copy/Export/New buttons
- **ViewTabs Integration**: Framework selector and "+ Add Item" button in tab bar
- **Slide-in Panel**: Add item form in 320px right panel
- **Keyboard Shortcut**: Press "N" to open add item panel

### Mobile UI Redesign
- **FAB**: Floating action button to add items
- **Bottom Sheet**: Item form slides up from bottom
- **Mobile Menu**: Kebab (⋮) menu for framework and session actions
- **Framework Badge**: Shows current framework below header

### New Components
- `src/components/SlideInPanel.tsx` - Desktop slide-in panel
- `src/components/BottomSheet.tsx` - Mobile bottom sheet
- `src/components/FAB.tsx` - Floating action button
- `src/components/MobileMenu.tsx` - Kebab dropdown menu

---

## Phase 5 - Production Readiness (Complete)

- Error Handling
- Performance optimisations

---

## Phase 4 - Polish & Export (Complete)

- Export to CSV
- New Session / Clear Items
- Session Naming
- Mobile Responsive design

---

## Phase 3 - Collaboration (Complete)

- Real-time Sync (Supabase Realtime)
- Participant Names (localStorage + Presence)

---

## Phase 2 - Scoring Frameworks (Complete)

- Framework Selector
- RICE Scoring (with debounced sorting)
- ICE Scoring
- Value vs Effort Matrix
- MoSCoW Categorisation
- Weighted Scoring

---

## Phase 1 - MVP (Complete)

- Project Setup
- Session Creation
- Add Items
- Edit & Delete Items

---

*Last updated: 2026-03-11 - Phase 14 complete (646 unit tests passing)*
