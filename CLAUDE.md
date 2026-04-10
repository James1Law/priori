# Priori - Product Prioritisation Tool

Lightweight collaborative product prioritisation web app. Sessions accessed via unique URLs without authentication - anyone with the URL can view and edit.

**Live:** https://priori.work | **Language:** UK English spelling

## Commands

```bash
# Development
npm run dev              # Start local dev server
npm run build            # Production build
npm run lint             # Lint code

# Unit Tests (Vitest)
npm run test             # Watch mode
npm run test:run         # Run once

# E2E Tests (Playwright)
npm run test:e2e         # Headless
npm run test:e2e:headed  # With browser
npm run test:e2e:ui      # Interactive UI
```

### Custom Commands
- **"next feature"** — Read docs/PRD.md, find next incomplete feature, summarise and ask for confirmation
- **"current status"** — List completed, in-progress, and remaining features
- **"test this"** — Run tests for current feature/component
- **"ship check"** — Run `npm run test:run && npm run test:e2e && npm run build`

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Realtime)
- **Testing:** Vitest + React Testing Library + Playwright
- **Hosting:** Vercel (auto-deploys from `main`)

## Project Structure

```
src/
├── components/     # React components (incl. InfoTooltip, BacklogList, CapacityView, etc.)
├── hooks/          # Custom React hooks (useCapacitySettings, useCapacityMetrics, etc.)
├── lib/            # Utilities — Supabase client, hierarchy tree helpers
├── types/          # TypeScript types (database.ts defines all models)
├── frameworks/     # Prioritisation framework configs
└── pages/          # Route components (SessionPage, LandingPage, etc.)
tests/              # Unit tests (mirror src structure)
e2e/                # Playwright E2E tests
docs/               # PRDs, specs, and CHANGELOG
plans/              # Design mockups (.mockup.html)
supabase/           # Database migrations (001–016)
```

## Development Rules

### IMPORTANT: Test-Driven Development
- **YOU MUST** write failing tests FIRST before implementing features
- Each feature needs tests for happy path AND edge cases
- Do not mark a feature complete until tests pass

### Code Quality
- TypeScript strict mode - no `any` types unless documented
- Extract reusable logic into hooks or utilities
- Components should be small and focused
- Avoid over-engineering - only make changes directly requested

### Mobile / Desktop Dual Layout Pattern
Several components (BacklogList, CapacityItemList) use a dual-layout pattern:
- `sm:hidden` block for mobile layout
- `hidden sm:flex` block for desktop layout
- **Testing note:** JSDOM renders both layouts, so use `getAllByText` / `getAllByTestId` instead of `getByText` in tests

### Git Workflow
- Main branch: `main` (auto-deploys to Vercel)
- Commit prefixes: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`
- Run `npm run test:run && npm run test:e2e && npm run build` before pushing
- Keep commits atomic and well-described

## Database Schema

### sessions
| Column | Type | Purpose |
| --- | --- | --- |
| id | uuid | PK |
| slug | text | Unique URL identifier |
| name | text | Optional session name |
| framework | text | e.g., "rice", "ice", "moscow" |
| view | text | "list", "roadmap", or "capacity" (local only) |
| weighted_criteria | jsonb | Custom criteria for weighted scoring |
| current_estimation_item_id | uuid | Planning Poker current item |
| estimation_revealed | boolean | Votes revealed state |
| estimation_item_ids | uuid[] | Items in estimation queue |
| estimation_host | text | Participant name of estimation host |
| estimation_session_id | uuid | Unique ID per estimation round |
| capacity_team_size | integer | Team size (default 5) |
| capacity_working_days | integer | Working days in period (default 65) |
| capacity_focus_factor | real | Focus factor 0.1–1.0 (default 0.6) |
| capacity_contingency | real | Contingency 0–2.0 (default 0.3) |
| capacity_unit | text | "days" or "hours" |
| capacity_hours_per_day | integer | Hours per working day (default 8) |

### items
| Column | Type | Purpose |
| --- | --- | --- |
| id | uuid | PK |
| session_id | uuid | FK to sessions |
| title | text | Required |
| description | text | Optional |
| status | text | "todo", "in_progress", "done" |
| position | integer | Scoring view order |
| backlog_position | integer | Backlog view order |
| story_points | integer | Planning Poker estimate |
| roadmap_start_quadrant | integer | Roadmap start (0-based) |
| roadmap_end_quadrant | integer | Roadmap end (inclusive) |
| effort_estimate | real | Capacity planning estimate |
| parent_item_id | uuid | FK to items (nullable = top-level) |
| item_level | integer | 0=Goal, 1=Initiative, 2=Epic, 3=Story, 4=Subtask |
| created_by | text | Participant name |

### cutoffs
| Column | Type | Purpose |
| --- | --- | --- |
| id | uuid | PK |
| session_id | uuid | FK to sessions |
| position | integer | Position in backlog list |
| label | text | Cutoff line label |
| color | text | red, amber, blue, green |

### Other tables
- **scores** — Framework-specific scores per item
- **roadmap\_periods** — Custom time periods (Now, Next, Later)
- **estimation\_votes** — Planning Poker votes
- **messages** — Team Chat messages

## Hierarchy System

Items support a 5-level hierarchy: **Goal → Initiative → Epic → Story → Subtask** (levels 0–4).

### Key Concepts
- **Flat by default** — Items with no parent remain at level 0 and behave exactly as before
- **Leaf-based roll-up** — Effort estimates roll up from leaf items (no children) to avoid double-counting
- **Status cascading** — Parent status auto-updates: all children done → done, any active → in progress, all todo → todo
- **Max depth** — Level 4 (Subtask) cannot have children; reparenting checks prevent exceeding max depth

### Key Files
- `src/types/database.ts` — `ItemLevel`, `ITEM_LEVEL_LABELS`, `ItemWithChildren`
- `src/lib/hierarchy.ts` — `buildTree`, `flattenTree`, `getRolledUpEstimate`, `getCascadedStatusUpdates`, `getDescendants`, `canReparent`, `canAddChild`
- `src/lib/roadmap-dates.ts` — `getViewRange`, `getTimelineMonths`, `getRoadmapDateTree`, `getDefaultChildDates`, `formatDisplayDate`, `canResizeDateChild`, `canResizeDateParent`
- `src/lib/device.ts` — `isTouchDevice()` for touch device detection
- `src/components/RoadmapMobileView.tsx` — View-only mobile Gantt (pinned labels, bars, zoom, today marker)
- `src/components/InfoTooltip.tsx` — Portal-based tooltip (escapes overflow-hidden containers)

## Prioritisation Frameworks

| Framework | Formula/Logic |
| --- | --- |
| RICE | (Reach × Impact × Confidence) / Effort |
| ICE | (Impact + Confidence + Ease) / 3 |
| Value vs Effort | Quadrants: Quick Wins, Big Bets, Fill-ins, Avoid |
| MoSCoW | Categorical: Must, Should, Could, Won't |
| Weighted | Σ(score × weight) / Σ(weights) |

## Key Features

- **Backlog View** — Home view with all items, multi-select, bulk actions, multiple cutoff lines, hierarchy expand/collapse
- **Item Hierarchy** — 5-level nesting (Goal → Initiative → Epic → Story → Subtask) with effort roll-up and status cascading
- **Item Drawer** — Side panel for viewing/editing item details, parent selector, ancestry breadcrumb
- **Scoring Flow** — Dedicated `/s/:slug/score` route for scoring selected items
- **Estimation Flow** — Dedicated `/s/:slug/estimate` route for Planning Poker. Lobby for item selection → "Start as Host" → two-step queue selection → voting → reveal → accept. Host controls (Reveal/Accept/Skip/End Session), participant presence with 5s polling, session sync, in-estimation chat, and Add Item support
- **Roadmap View** — Date-based Gantt chart at `/s/:slug/roadmap` with drag-to-position, resize, and zoom controls. Mobile: view-only pannable Gantt (no drag/resize), tap bars to edit dates via ItemDrawer
- **Capacity Planning** — Compare backlog effort vs team capacity with utilisation metrics, info tooltips, click-to-edit items
- **Team Chat** — Real-time messaging with typing indicators
- **Mobile Support** — Sidebar visible at 640px+ (auto-collapses to icon rail at medium widths), mobile bottom bar with all 5 modules below 640px, dual-layout responsive design with clamped hierarchy indentation, colour accent bars, compact controls. Touch devices always get view-only Gantt via `isTouchDevice()` check.

## URL Structure

```
/s/:slug              → Backlog list view (default)
/s/:slug/roadmap      → Roadmap Gantt chart view
/s/:slug/prioritise   → Prioritisation scoring module
/s/:slug/score        → Scoring flow for selected items
/s/:slug/estimate     → Planning Poker estimation flow (lobby → session)
/s/:slug/capacity     → Capacity planning view
/s/:slug/item/:id     → Backlog with item drawer open
```

## Environment Variables

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
```

## Reference Documents

- **PRD:** `docs/PRD.md`
- **Change history:** `docs/CHANGELOG.md`
- **Design mockups:** `plans/*.mockup.html`
- **Database migrations:** `supabase/*.sql`
