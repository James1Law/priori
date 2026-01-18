# Priori - Product Prioritisation Tool

## Project Overview
Priori is a lightweight, collaborative product prioritisation web app. It uses a "planning poker" model where sessions are accessed via unique URLs without authentication. Anyone with the URL can view and edit the session.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Realtime)
- **Unit Testing:** Vitest + React Testing Library
- **E2E Testing:** Playwright
- **Hosting:** Vercel (live in production)

## Project Structure
```
priori/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities, Supabase client, helpers
│   ├── types/          # TypeScript types/interfaces
│   ├── frameworks/     # Prioritisation framework configs & logic
│   └── pages/          # Route components
├── tests/              # Unit test files (mirror src structure)
├── e2e/                # Playwright E2E tests
├── docs/               # PRD, specs, decisions
├── plans/              # Design mockups (.mockup.html files)
└── supabase/           # Database migrations, seed data
```

## Commands

### Development
- `npm run dev` — Start local dev server
- `npm run build` — Production build
- `npm run lint` — Lint code

### Unit Tests (Vitest)
- `npm run test` — Run unit tests in watch mode
- `npm run test:run` — Run unit tests once

### E2E Tests (Playwright)
- `npm run test:e2e` — Run all E2E tests (headless)
- `npm run test:e2e:headed` — Run E2E tests with visible browser
- `npm run test:e2e:ui` — Open Playwright UI for interactive debugging
- Tests are in `e2e/` folder, config in `playwright.config.ts`
- Covers: session creation, scoring, backlog view, cutoff line, mobile

### Custom Commands (for Claude)
When I say:
- **"next feature"** — Read docs/PRD.md, find the next incomplete feature, summarise it and ask for confirmation before starting
- **"current status"** — List completed features, current feature in progress, and remaining features
- **"test this"** — Run tests for the current feature/component being worked on
- **"ship check"** — Run full test suite (unit + E2E), lint, and build to verify everything passes

## Development Rules

### 1. Test-Driven Development (TDD)
- Write failing tests FIRST before implementing features
- Each feature must have tests covering happy path and edge cases
- Do not mark a feature complete until tests pass

### 2. Production Deployment
- App is live on Vercel (auto-deploys from `main` branch)
- Test locally with `npm run dev` before pushing
- Run `npm run test:run && npm run test:e2e && npm run build` to verify before pushing

### 3. Incremental Development
- Build one feature at a time from the PRD
- Commit after each completed feature
- Keep commits atomic and well-described

### 4. Code Quality
- Use TypeScript strict mode
- No `any` types unless absolutely necessary (document why)
- Extract reusable logic into hooks or utilities
- Components should be small and focused

### 5. Git Workflow
- Main branch is `main`
- Commit messages: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`
- Example: `feat: add RICE scoring calculation`

## Database Schema (Supabase)

### sessions
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK, auto-generated |
| slug | text | Unique URL identifier (e.g., "abc123") |
| name | text | Optional session name |
| framework | text | e.g., "rice", "ice", "moscow" |
| view | text | Current view: "scoring" or "backlog" |
| weighted_criteria | jsonb | Custom criteria for weighted scoring |
| cutoff_position | integer | Position of cutoff line in backlog view |
| cutoff_label | text | Label for cutoff line (default: "Cutoff") |
| created_at | timestamp | Auto |
| updated_at | timestamp | Auto |

### items
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| session_id | uuid | FK to sessions |
| title | text | Required |
| description | text | Optional |
| position | integer | For ordering in scoring view |
| backlog_position | integer | For manual ordering in backlog view |
| roadmap_start_period | uuid | FK to roadmap_periods (legacy) |
| roadmap_end_period | uuid | FK to roadmap_periods (legacy) |
| roadmap_start_quadrant | integer | Absolute quadrant index (0-based) |
| roadmap_end_quadrant | integer | Inclusive end quadrant |
| roadmap_row | integer | For future swimlane support |
| created_by | text | Participant who created the item |
| created_at | timestamp | Auto |

### roadmap_periods
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| session_id | uuid | FK to sessions |
| name | text | Period name (e.g., "Now", "Next", "Later") |
| width | integer | Visual width 1-4 (legacy, now fixed at 4) |
| position | integer | Order in timeline |
| created_at | timestamp | Auto |

### scores
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| item_id | uuid | FK to items |
| framework | text | e.g., "rice", "ice", "moscow" |
| criteria | jsonb | Framework-specific scores |
| calculated_score | numeric | Computed final score |

## Prioritisation Frameworks

### RICE
- **Reach:** Number of users affected (per quarter)
- **Impact:** 0.25 (minimal), 0.5 (low), 1 (medium), 2 (high), 3 (massive)
- **Confidence:** 50%, 80%, 100%
- **Effort:** Person-months
- **Formula:** (Reach × Impact × Confidence) / Effort

### ICE
- **Impact:** 1-10
- **Confidence:** 1-10
- **Ease:** 1-10
- **Formula:** (Impact + Confidence + Ease) / 3

### Value vs Effort
- **Value:** 1-10
- **Effort:** 1-10
- **Quadrants:** Quick Wins, Big Bets, Fill-ins, Avoid

### MoSCoW
- **Categories:** Must, Should, Could, Won't
- No scoring — categorical sorting

### Weighted Scoring
- User defines criteria and weights
- Each criterion scored 1-10
- **Formula:** Σ(score × weight) / Σ(weights)

## Environment Variables
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

**Note:** Use the new Supabase publishable key (not the legacy anon key). Get these from Supabase Dashboard → Settings → API Keys.

## Current Status
- [x] Phase 1 (MVP) - COMPLETE
  - [x] 1.1 Project Setup
  - [x] 1.2 Session Creation
  - [x] 1.3 Add Items
  - [x] 1.4 Edit & Delete Items
- [x] Deployed to Production (Vercel)
- [x] Phase 2 (Scoring Frameworks) - COMPLETE
  - [x] 2.1 Framework Selector
  - [x] 2.2 RICE Scoring (with debounced sorting)
  - [x] 2.3 ICE Scoring
  - [x] 2.4 Value vs Effort Matrix
  - [x] 2.5 MoSCoW Categorisation
  - [x] 2.6 Weighted Scoring
- [x] Phase 3 (Collaboration) - COMPLETE
  - [x] 3.1 Real-time Sync (Supabase Realtime)
  - [x] 3.2 Participant Names (localStorage + Presence)
- [x] Phase 4 (Polish & Export) - COMPLETE
  - [x] 4.1 Export to CSV
  - [x] 4.2 New Session / Clear Items
  - [x] 4.3 Session Naming
  - [x] 4.4 Mobile Responsive
- [x] Phase 5 (Production Readiness) - COMPLETE
  - [x] 5.1 Error Handling
  - [x] 5.2 Performance
- [x] Phase 6 (Branding & UX Polish) - COMPLETE
  - [x] 6.1 Brand Identity (logo, Poppins/Inter typography, indigo colour scheme)
  - [x] 6.2 Mobile UX Improvements (bottom input bar, touch-friendly delete)
  - [x] 6.3 Custom Confirmation Modals (replaced browser confirm() dialogs)
- [x] Phase 7 (Backlog View) - COMPLETE
  - [x] 7.1 Backlog View with cutoff line
  - [x] Drag-and-drop reordering
  - [x] Manual vs Score ordering toggle
- [x] Phase 8 (Roadmap View) - COMPLETE
  - [x] 7.5 Roadmap View with custom time periods
  - [x] Drag-and-drop item scheduling
  - [x] Item bar resizing across periods
  - [x] 4-quadrant grid system for finer positioning
  - [x] Ghost preview when dragging items onto roadmap
  - [x] Orphaned item handling when periods deleted
  - [x] Mobile placeholder (desktop-only feature)
- [ ] Phase 9 (Planning Poker & Team Chat) - IN PROGRESS
  - [x] 9.1a Database Schema & View Tab (Step 1)
  - [x] 9.1b Estimation Queue (Step 2)
  - [x] 9.1c Card Selection UI (Step 3)
  - [x] 9.1d Current Item Display (Step 4)
  - [x] 9.1e Participant Votes Display (Step 5)
  - [x] 9.1f Reveal Mechanism (Step 6)
  - [x] 9.1g Accept & Next Flow (Step 7)
  - [x] 9.1h Queue Progress & Completion (Step 8)
  - [x] 9.1i Backlog Integration (Step 9)
  - [x] 9.1j Mobile Optimisation (Step 10)
  - [x] 9.1k Real-time Edge Cases (Step 11)
  - [ ] 9.2 Team Chat (Steps 1-10)

## Recent Changes (UX Enhancement PRD)

### Desktop UI Redesign
- **Consolidated Header**: Logo, session name, participant count, Copy/Export/New buttons in single row
- **ViewTabs Integration**: Framework selector and "+ Add Item" button moved to tab bar
- **Slide-in Panel**: Add item form now opens in 320px right panel instead of sidebar
- **Sidebar Removed**: Main content area now full-width for more workspace
- **Keyboard Shortcut**: Press "N" to quickly open add item panel

### Mobile UI Redesign
- **FAB (Floating Action Button)**: Fixed bottom-right button to add items
- **Bottom Sheet**: Full item form (title + description) slides up from bottom
- **Mobile Menu**: Kebab (⋮) menu for framework selection and session actions
- **Framework Badge**: Shows current framework below header (Scoring view only)
- **Simplified Bottom Bar**: Now only contains view tabs (Scoring, Estimates, Backlog, Roadmap)
- **Logo Restored**: Priori logo visible in mobile header

### New Components
- `src/components/SlideInPanel.tsx` - Desktop slide-in panel with focus trap
- `src/components/BottomSheet.tsx` - Mobile bottom sheet modal
- `src/components/FAB.tsx` - Floating action button for mobile
- `src/components/MobileMenu.tsx` - Kebab dropdown menu

### Accessibility
- `motion-reduce:transition-none` on all animations
- Focus trap in modals/panels
- Escape key closes panels
- Proper ARIA labels on interactive elements

### Design Spec
- Full PRD at `docs/PRD-ux-enhancement.md`
- All 5 phases implemented and verified

## Previous Changes (Phase 9 - Planning Poker & Chat)

### Planning Poker Foundation (Step 1 - Complete)
- **Database Schema**: Added `estimation_votes` table, `story_points` column on items, estimation state columns on sessions
- **View Navigation**: Added "Estimates" tab between Scoring and Backlog
- **Mobile Support**: Estimates tab added to mobile bottom bar
- **Placeholder View**: EstimatesView component with placeholder UI

### Estimation Queue (Step 2 - Complete)
- **EstimationQueue Component**: Displays items in a queue for estimation
- **Status Indicators**: Shows pending, in_progress, and completed states
- **Story Points Badge**: Shows SP badge for completed items
- **Start Estimation Button**: Initiates estimation session
- **Progress Tracking**: Shows "X of Y estimated" counter with progress bar
- **Queue Navigation**: Click items to select for estimation
- **Completion Message**: Shows when all items are estimated

### Card Selection UI (Step 3 - Complete)
- **EstimationCards Component**: Fibonacci card selection grid
- **Fibonacci Sequence**: Cards for 0, 1, 2, 3, 5, 8, 13, 21
- **Special Cards**: ? (uncertain) and ☕ (coffee break)
- **Selection Highlight**: Selected card shows indigo background with checkmark
- **Selection Feedback**: Text feedback showing selected value
- **Mobile Layout**: 4x3 grid on mobile, 5x2 on larger screens
- **Accessibility**: aria-pressed and aria-label for screen readers

### Current Item Display (Step 4 - Complete)
- **CurrentEstimationItem Component**: Shows the item being estimated
- **Now Estimating Badge**: Visual indicator of current item
- **Item Details**: Title and description displayed prominently
- **Previous Estimate Badge**: Shows "X SP (previously estimated)" when re-estimating
- **Real-time Sync**: Current item synced across all participants via Supabase Realtime

### Participant Votes Display (Step 5 - Complete)
- **ParticipantVotes Component**: Shows voting status for all participants
- **Card States**: Waiting (dashed), voted (face-down), revealed (value shown)
- **Vote Counter**: "X of Y voted" indicator
- **useEstimationVotes Hook**: Real-time subscription to votes with optimistic updates
- **User Highlight**: Current user's card shows ring indicator
- **Vote Submission**: Cards save votes to database with real-time sync

### Reveal Mechanism (Step 6 - Complete)
- **EstimationResults Component**: Handles reveal button and consensus display
- **Reveal Votes Button**: Enabled when at least 1 vote, triggers reveal for all participants
- **Real-time Sync**: Reveal state synced via `estimation_revealed` on session
- **Consensus Indicator**: Shows "Consensus!", "Close - discuss briefly", or "No consensus - discuss"
- **Outlier Detection**: Highlights participants whose votes differ significantly from majority
- **Consensus Logic**: >50% same vote = consensus, votes within 1 Fibonacci step = close

### Accept & Next Flow (Step 7 - Complete)
- **Accept Button**: Shows "Accept X SP" with suggested value from consensus
- **Save Story Points**: Saves to item.story_points on accept
- **Auto-advance**: Moves to next unestimated item after accept
- **Re-vote Button**: Clears votes and resets revealed state for new round
- **Skip Button**: Move to next item without saving estimate
- **Vote Cleanup**: Clears votes for current item on accept/revote

### Queue Progress & Completion (Step 8 - Complete)
- **Checkmark Status**: Completed items show green checkmark badge
- **Progress Counter**: Shows "X of Y estimated" with visual progress bar
- **Completion Message**: "All items estimated!" when queue is done
- **Re-estimation**: Click any completed item to re-estimate it

### Backlog Integration (Step 9 - Complete)
- **Story Points Badge**: BacklogList displays "X SP" badge for items with estimates
- **Emerald Styling**: Distinct green badge differentiates from indigo score badge

### Mobile Optimisation (Step 10 - Complete)
- **Estimates Tab**: MobileBottomBar includes Estimates tab
- **Card Grid**: 4-column on mobile, 5-column on larger screens
- **Participant Votes**: Responsive 2-column grid on mobile
- **Action Buttons**: flex-wrap for proper mobile stacking
- **Touch Targets**: Cards use aspect-[3/4] for touch-friendly sizing

### Real-time Edge Cases (Step 11 - Complete)
- **Late Joiner**: Session state (current_estimation_item_id, estimation_revealed) synced via realtime
- **Participant Leaving**: Vote persists in database, card disappears from view
- **Simultaneous Reveals**: Database handles idempotent update, all clients sync
- **Optimistic Updates**: Implemented in useEstimationVotes for responsive UX

### Database Changes (Phase 9)
- `supabase/008_add_planning_poker_support.sql` - Planning Poker tables and columns

### Key Components (Phase 9)
- `src/components/EstimatesView.tsx` - Planning Poker view with queue and item display
- `src/components/EstimationQueue.tsx` - Item queue with status and progress
- `src/components/EstimationCards.tsx` - Fibonacci card selection with special cards
- `src/components/CurrentEstimationItem.tsx` - Current item being estimated
- `src/components/ParticipantVotes.tsx` - Participant voting status display
- `src/components/EstimationResults.tsx` - Reveal button and consensus indicator
- `src/hooks/useEstimationVotes.ts` - Vote CRUD with real-time sync

## Previous Changes (Phase 8 - Roadmap View)

### Roadmap View
- **Custom Time Periods**: Users define named periods (default: Now, Next, Later)
- **4-Quadrant Grid System**: Each period divided into 4 quadrants for finer item positioning
- **Drag-and-Drop Scheduling**: Drag items from sidebar onto timeline
- **Item Bar Resizing**: Drag bar edges to extend/shrink across periods
- **Ghost Preview**: Shows full 4-quadrant drop zone when dragging items in
- **Orphaned Item Handling**: Items cleared when their period is deleted
- **Mobile Placeholder**: Roadmap is desktop-only, mobile shows helpful message

### Key Components (Phase 8)
- `src/components/RoadmapView.tsx` - Main roadmap timeline with quadrant grid
- `src/components/RoadmapMobilePlaceholder.tsx` - Mobile fallback message
- `src/hooks/useRoadmapPeriods.ts` - CRUD for roadmap periods

### Database Changes
- `supabase/006_add_roadmap_support.sql` - Roadmap periods table and item columns
- `supabase/007_add_quadrant_columns.sql` - Quadrant-based positioning columns

## Production Details
- **Live Site**: https://priori.work
- **GitHub**: https://github.com/James1Law/priori
- **Hosting**: Vercel (auto-deploys from main)
- **Unit Tests**: 350 passing (Vitest)
- **E2E Tests**: 31 passing (Playwright - session, backlog, cutoff, mobile)
- **Database**: Supabase (configured with RLS + Realtime)
- **Language**: UK English spelling

## Future Feature Ideas

### High Priority (Based on User Feedback)
- Further mobile UX refinements based on user testing feedback
- Weighted criteria editor for mobile (currently desktop-only)

### Potential Enhancements
- **Import from CSV**: Allow bulk importing items from spreadsheets
- **Session Templates**: Pre-configured sessions with common item sets
- **Voting/Polling Mode**: Multiple participants vote independently before revealing scores
- **History/Undo**: Track changes and allow reverting to previous states
- **Comments on Items**: Allow participants to add notes/discussion to items
- **Sorting Options**: Manual drag-and-drop reordering, sort by different criteria
- **Session Expiry**: Auto-delete old sessions after configurable period
- **Embed Mode**: Embeddable widget version for use in other tools
- **Keyboard Shortcuts**: Power-user shortcuts for common actions
- **Dark Mode**: System-preference-aware dark theme
- **PDF Export**: Export prioritised list as formatted PDF report
- **Comparison View**: Side-by-side comparison of two items

### Technical Improvements
- **PWA Support**: Offline capability with service workers
- **Performance Monitoring**: Add analytics for load times and interactions

---
*Last updated: 2026-01-18 - UX Enhancement PRD complete - Desktop/Mobile UI redesign*
