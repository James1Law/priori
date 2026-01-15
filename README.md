# Priori

> **Live at **[**priory.work**](https://priory.work) | [GitHub](https://github.com/James1Law/priori) | Deployed on Vercel

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
- **View Switching**: Toggle between Scoring view and Backlog view

### Export & Sharing
- **CSV Export**: Download prioritised items as spreadsheet
- **Copy URL**: Quick sharing with one click
- **Session Naming**: Give sessions meaningful names

### Mobile Experience
- **Responsive Design**: Works on all screen sizes
- **Bottom Input Bar**: Quick item entry on mobile
- **Touch-friendly Delete**: Tap trash icon to remove items

### Polish
- **Custom Brand**: Indigo colour scheme, Poppins/Inter typography
- **Branded Modals**: Custom confirmation dialogs (no browser alerts)
- **Error Handling**: Graceful error states throughout

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL + Realtime)
- **Unit Testing**: Vitest + React Testing Library (200+ tests)
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

Run the SQL scripts in order:
- `supabase/001_initial_schema.sql`
- `supabase/002_enable_rls.sql`

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
