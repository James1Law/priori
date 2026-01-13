# Priori - Product Prioritisation Tool

## Project Overview
Priori is a lightweight, collaborative product prioritisation web app. It uses a "planning poker" model where sessions are accessed via unique URLs without authentication. Anyone with the URL can view and edit the session.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Realtime)
- **Testing:** Vitest + React Testing Library
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
├── tests/              # Test files (mirror src structure)
├── docs/               # PRD, specs, decisions
└── supabase/           # Database migrations, seed data
```

## Commands

### Development
- `npm run dev` — Start local dev server
- `npm run test` — Run tests in watch mode
- `npm run test:run` — Run tests once
- `npm run lint` — Lint code
- `npm run build` — Production build

### Custom Commands (for Claude)
When I say:
- **"next feature"** — Read docs/PRD.md, find the next incomplete feature, summarise it and ask for confirmation before starting
- **"current status"** — List completed features, current feature in progress, and remaining features
- **"test this"** — Run tests for the current feature/component being worked on
- **"ship check"** — Run full test suite, lint, and build to verify everything passes

## Development Rules

### 1. Test-Driven Development (TDD)
- Write failing tests FIRST before implementing features
- Each feature must have tests covering happy path and edge cases
- Do not mark a feature complete until tests pass

### 2. Production Deployment
- App is live on Vercel (auto-deploys from `main` branch)
- Test locally with `npm run dev` before pushing
- Run `npm run test:run && npm run build` to verify before pushing

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
| created_at | timestamp | Auto |
| updated_at | timestamp | Auto |

### items
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| session_id | uuid | FK to sessions |
| title | text | Required |
| description | text | Optional |
| created_at | timestamp | Auto |
| position | integer | For manual ordering |

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
  - [x] 6.2 Mobile UX Improvements (bottom input bar, swipe-to-delete)
  - [x] 6.3 Custom Confirmation Modals (replaced browser confirm() dialogs)

## Recent Changes (Phase 6)

### Brand Identity
- **Logo**: Triangle/arrow icon representing priorities rising to the top
- **Typography**: Poppins for headings (font-display), Inter for body text (font-body)
- **Colours**: Indigo-based palette (#4f46e5 primary) with full Tailwind scale
- **Design mockups**: Located in `plans/` folder (`.mockup.html` files)

### Mobile UX Improvements
- **Bottom Input Bar**: On mobile, the sidebar is hidden and replaced with a fixed bottom bar containing a compact framework selector and quick-add input
- **Swipe-to-Delete**: Items can be swiped left to reveal a delete button (touch devices only)
- **Safe Area Support**: Proper padding for notched devices (iPhone etc.)
- Desktop layout remains unchanged - these are mobile-only enhancements

### Custom Confirmation Modals
- **ConfirmModal component**: Branded modal replacing native browser `confirm()` dialogs
- **Variants**: danger (red), warning (amber), default (indigo) with appropriate icons
- **Features**: Keyboard support (Escape to close), backdrop click to dismiss, responsive layout
- Used for: Delete item, Clear all items

### Key New Components
- `src/components/MobileBottomBar.tsx` - Fixed bottom input bar for mobile
- `src/components/SwipeableItem.tsx` - Swipe gesture wrapper for items
- `src/components/ConfirmModal.tsx` - Branded confirmation modal
- `src/hooks/useSwipeToDelete.ts` - Touch gesture handling hook

## Production Details
- **GitHub**: https://github.com/James1Law/priori
- **Live Site**: Deployed on Vercel (auto-deploys from main)
- **Tests**: 172 passing
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
- **E2E Tests**: Add Playwright tests for critical user journeys

---
*Last updated: 2026-01-13 - Phase 6 Branding & UX Polish complete*
