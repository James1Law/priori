# Priori

> **Live in Production** | [GitHub](https://github.com/James1Law/priori) | Deployed on Vercel

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

### Export & Sharing
- **CSV Export**: Download prioritised items as spreadsheet
- **Copy URL**: Quick sharing with one click
- **Session Naming**: Give sessions meaningful names

### Mobile Experience
- **Responsive Design**: Works on all screen sizes
- **Bottom Input Bar**: Quick item entry on mobile
- **Swipe-to-Delete**: Native gesture support on touch devices

### Polish
- **Custom Brand**: Indigo colour scheme, Poppins/Inter typography
- **Branded Modals**: Custom confirmation dialogs (no browser alerts)
- **Error Handling**: Graceful error states throughout

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL + Realtime)
- **Testing**: Vitest + React Testing Library (172 tests)
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
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
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
