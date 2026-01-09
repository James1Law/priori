# Priori

> **🚀 Live in Production**: [View on GitHub](https://github.com/James1Law/priori) | Deployed on Vercel

A lightweight, collaborative product prioritisation web app. No authentication required - just share a URL and start prioritising together.

## Features

- **Session-based**: Create a session, get a unique URL to share
- **No Login Required**: Anyone with the URL can view and edit
- **Item Management**: Add, edit, and delete backlog items
- **Real-time Sync**: All changes persist to Supabase
- **Beautiful UI**: Clean, responsive design with Tailwind CSS

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL + Realtime)
- **Testing**: Vitest + React Testing Library
- **Hosting**: Vercel

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Setup

1. Clone the repository
```bash
git clone <your-repo-url>
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

## Deployment

✅ **Currently deployed to Vercel in production**

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

The app is configured for Vercel with `vercel.json` for proper SPA routing, ensuring all routes work correctly including direct access and page refreshes.

## Project Structure

```
priori/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Supabase client, utilities
│   ├── types/          # TypeScript types
│   ├── frameworks/     # Prioritisation frameworks (future)
│   └── pages/          # Route components
├── tests/              # Test files
├── docs/               # PRD and documentation
└── supabase/           # Database migrations
```

## Current Status

**Phase 1 (MVP) - Complete ✅**
- Project setup
- Session creation with unique URLs
- Add items to sessions
- Edit and delete items

**Phase 2 (Scoring Frameworks) - Coming Soon**
- RICE scoring
- ICE scoring
- MoSCoW categorisation
- Value vs Effort matrix
- Weighted scoring

## Contributing

This project follows Test-Driven Development (TDD):
1. Write tests first
2. Implement features
3. Ensure all tests pass
4. Commit with conventional commits (`feat:`, `fix:`, `test:`, etc.)

## License

MIT
