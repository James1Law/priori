# Priori

> **Live at **[**priori.work**](https://priori.work) | [GitHub](https://github.com/James1Law/priori) | Deployed on Vercel

A lightweight, collaborative product prioritisation web app. No authentication required - just share a URL and start prioritising together.

## Features

### Core Functionality
- **Session-based**: Create a session, get a unique URL to share
- **No Login Required**: Anyone with the URL can view and edit
- **Real-time Collaboration**: Changes sync instantly across all participants
- **Participant Presence**: See who's viewing the session

### Prioritisation Frameworks
- **RICE**: Reach, Impact, Confidence, Effort scoring
- **ICE**: Impact, Confidence, Ease scoring
- **Value vs Effort**: Visual 2x2 matrix with quadrants
- **MoSCoW**: Must, Should, Could, Won't categorisation
- **Weighted Scoring**: Custom criteria with configurable weights

### Backlog View
- **Prioritised Backlog**: View items ranked by score in a clean list
- **Manual Reordering**: Drag-and-drop to override score-based order
- **Cutoff Line**: Visual separator to define scope (what's in vs out)
- **Editable Cutoff Label**: Customise the cutoff label (e.g., "MVP", "Sprint 1")

### Roadmap View
- **Custom Time Periods**: Define your own timeline periods (default: Now, Next, Later)
- **Drag-and-Drop Scheduling**: Place items onto the timeline by dragging
- **Item Bar Resizing**: Extend items across multiple periods by dragging edges
- **4-Quadrant Grid**: Each period is divided into 4 quadrants for finer positioning
- **Items Sorted by Position**: Sidebar shows items in timeline order

### Planning Poker (Estimation)
- **Estimates View**: Dedicated tab for collaborative story point estimation
- **Fibonacci Cards**: 0, 1, 2, 3, 5, 8, 13, 21 plus ? (uncertain) and ☕ (coffee break)
- **Hidden Voting**: Votes are hidden until the facilitator reveals them
- **Real-time Sync**: All participants see the same current item being estimated
- **Consensus Indicator**: Visual feedback when team votes align or differ
- **Accept & Re-vote**: Accept estimates or trigger a re-vote for discussion
- **Queue Management**: Track progress through estimation queue with completion state
- **Story Points in Backlog**: Estimated items display their SP in the backlog view

### Export & Sharing
- **CSV Export**: Download prioritised items as spreadsheet
- **Copy URL**: Quick sharing with one click
- **Session Naming**: Give sessions meaningful names

### Desktop UI
- **Slide-in Panel**: Add items via a clean slide-in panel from the right
- **Integrated Tabs**: Framework selector and "+ Add Item" button in view tabs
- **Keyboard Shortcut**: Press "N" to quickly open add item panel
- **Full-width Content**: No sidebar, maximising workspace

### Mobile Experience
- **Responsive Design**: Works on all screen sizes
- **FAB (Floating Action Button)**: Quick item entry with bottom-right button
- **Bottom Sheet**: Full item form slides up from bottom
- **Kebab Menu**: Framework selection and session actions in dropdown menu
- **Touch-friendly Controls**: Tap-friendly interactions throughout
- **Roadmap Placeholder**: Desktop-only feature with helpful mobile message

### Polish
- **Custom Brand**: Indigo colour scheme, Poppins/Inter typography
- **Branded Modals**: Custom confirmation dialogs (no browser alerts)
- **Error Handling**: Graceful error states throughout

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL + Realtime)
- **Unit Testing**: Vitest + React Testing Library (350 tests)
- **E2E Testing**: Playwright
- **Hosting**: Vercel (auto-deploys from main)

## Development

### Prerequisites

- Node.js 18+
- npm
- Supabase account

### Setup

1. Clone the repository
```bash
git clone https://github.com/James1Law/priori.git
cd priori
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

4. Set up Supabase database

Run the SQL migration scripts in order:
- `supabase/001_initial_schema.sql` - Core tables
- `supabase/002_enable_rls.sql` - Row Level Security
- `supabase/003_add_framework_column.sql` - Framework support
- `supabase/004_add_view_and_cutoff_columns.sql` - Backlog view
- `supabase/005_add_backlog_position.sql` - Manual ordering
- `supabase/006_add_roadmap_support.sql` - Roadmap periods
- `supabase/007_add_quadrant_columns.sql` - Quadrant positioning
- `supabase/008_add_planning_poker_support.sql` - Planning Poker tables
- `supabase/009_enable_realtime_for_core_tables.sql` - Realtime subscriptions
- `supabase/010_add_backlog_position.sql` - Backlog position column

See `supabase/README.md` for detailed instructions.

5. Start the development server
```bash
npm run dev
```

Visit `http://localhost:5173`

### Available Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run unit tests in watch mode
npm run test:run     # Run unit tests once
npm run test:e2e     # Run E2E tests (Playwright)
npm run test:e2e:ui  # Run E2E tests with Playwright UI
npm run lint         # Lint code
```

## Project Structure

```
priori/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Supabase client, utilities
│   ├── types/          # TypeScript types
│   └── pages/          # Route components
├── tests/              # Test files (mirror src structure)
├── plans/              # Design mockups (.mockup.html files)
├── docs/               # PRD and documentation
└── supabase/           # Database migrations
```

## Deployment

The app is deployed to Vercel with automatic deploys from the `main` branch.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Contributing

This project follows Test-Driven Development (TDD):
1. Write tests first
2. Implement features
3. Ensure all tests pass
4. Commit with conventional commits (`feat:`, `fix:`, `test:`, etc.)

## License

MIT
