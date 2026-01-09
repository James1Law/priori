# Priori - Product Prioritisation Tool

## Project Overview
Priori is a lightweight, collaborative product prioritisation web app. It uses a "planning poker" model where sessions are accessed via unique URLs without authentication. Anyone with the URL can view and edit the session.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Realtime)
- **Testing:** Vitest + React Testing Library
- **Hosting:** Vercel (when ready for production)

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

### 2. No Production Deployment
- Do NOT deploy to Vercel or any production environment
- Only run locally with `npm run dev`
- I will explicitly say "deploy to production" when ready

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
|--------|------|-------|
| id | uuid | PK, auto-generated |
| slug | text | Unique URL identifier (e.g., "abc123") |
| name | text | Optional session name |
| created_at | timestamp | Auto |
| updated_at | timestamp | Auto |

### items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| session_id | uuid | FK to sessions |
| title | text | Required |
| description | text | Optional |
| created_at | timestamp | Auto |
| position | integer | For manual ordering |

### scores
| Column | Type | Notes |
|--------|------|-------|
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
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Current Status
- [x] Project setup complete
- [ ] Feature development started

---
*Last updated: 2026-01-09 - Project setup completed*
