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
├── components/     # React components
├── hooks/          # Custom React hooks
├── lib/            # Utilities, Supabase client
├── types/          # TypeScript types
├── frameworks/     # Prioritisation framework configs
└── pages/          # Route components
tests/              # Unit tests (mirror src structure)
e2e/                # Playwright E2E tests
docs/               # PRDs and specs
plans/              # Design mockups (.mockup.html)
supabase/           # Database migrations
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
| view | text | "list" or "roadmap" (local only) |
| weighted_criteria | jsonb | Custom criteria for weighted scoring |
| current_estimation_item_id | uuid | Planning Poker current item |
| estimation_revealed | boolean | Votes revealed state |
| estimation_item_ids | uuid[] | Items in estimation queue |

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

## Prioritisation Frameworks

| Framework | Formula/Logic |
| --- | --- |
| RICE | (Reach × Impact × Confidence) / Effort |
| ICE | (Impact + Confidence + Ease) / 3 |
| Value vs Effort | Quadrants: Quick Wins, Big Bets, Fill-ins, Avoid |
| MoSCoW | Categorical: Must, Should, Could, Won't |
| Weighted | Σ(score × weight) / Σ(weights) |

## Key Features

- **Backlog View** — Home view with all items, multi-select, bulk actions, multiple cutoff lines
- **Item Drawer** — Side panel for viewing/editing item details
- **Scoring Flow** — Dedicated `/s/:slug/score` route for scoring selected items
- **Estimation Flow** — Dedicated `/s/:slug/estimate` route for Planning Poker
- **Roadmap View** — Visual timeline with periods and quadrant positioning
- **Team Chat** — Real-time messaging with typing indicators
- **Mobile Support** — Responsive design with touch-friendly interactions

## URL Structure

```
/s/:slug              → Backlog list view (default)
/s/:slug/roadmap      → Roadmap timeline view
/s/:slug/score        → Scoring flow for selected items
/s/:slug/estimate     → Planning Poker estimation flow
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
