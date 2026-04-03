import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock data
const mockSession = {
  id: 'session-1', slug: 'test-session', name: 'Test Session',
  framework: 'rice', view: 'list', weighted_criteria: [],
  current_estimation_item_id: null, estimation_revealed: false,
  estimation_item_ids: [], estimation_host: null, estimation_session_id: null,
  capacity_team_size: 5, capacity_working_days: 65, capacity_focus_factor: 0.6,
  capacity_contingency: 0.3, capacity_unit: 'days', capacity_hours_per_day: 8,
  created_at: '2024-01-01', updated_at: '2024-01-01',
}

const mockItems = [
  {
    id: 'item-1', session_id: 'session-1', title: 'Auth system',
    description: null, position: 0, backlog_position: null,
    status: 'in_progress', created_by: 'James', created_at: '2024-01-01',
    roadmap_start_period: null, roadmap_end_period: null,
    roadmap_start_quadrant: null, roadmap_end_quadrant: null, roadmap_row: 0,
    story_points: 8, effort_estimate: null, parent_item_id: null, item_level: 0,
  },
  {
    id: 'item-2', session_id: 'session-1', title: 'Dashboard widget',
    description: null, position: 1, backlog_position: null,
    status: 'todo', created_by: 'Sarah', created_at: '2024-01-01',
    roadmap_start_period: null, roadmap_end_period: null,
    roadmap_start_quadrant: null, roadmap_end_quadrant: null, roadmap_row: 0,
    story_points: null, effort_estimate: null, parent_item_id: null, item_level: 0,
  },
]

const mockScores = [
  {
    id: 'score-1', item_id: 'item-1', framework: 'rice',
    criteria: { reach: 3, impact: 4, confidence: 3, effort: 2 },
    calculated_score: 18,
  },
]

// Mock supabase — all terminal methods return resolved promises
vi.mock('../../src/lib/supabase', () => {
  const res = (data: unknown) => Promise.resolve({ data, error: null })

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => res(mockSession)),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => res(null)),
            })),
          }
        }
        if (table === 'items') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => res(mockItems)),
              })),
            })),
          }
        }
        if (table === 'scores') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => res(mockScores)),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => res(null)),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => res(null)),
              })),
            })),
          }
        }
        // fallback
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => res(null)), order: vi.fn(() => res([])) })), in: vi.fn(() => ({ eq: vi.fn(() => res([])) })) })),
        }
      }),
      channel: vi.fn(() => {
        const ch = {
          on: vi.fn(() => ch),
          subscribe: vi.fn(() => ch),
          unsubscribe: vi.fn(),
        }
        return ch
      }),
      removeChannel: vi.fn(),
    },
  }
})

// Mock hooks
vi.mock('../../src/hooks/useParticipantName', () => ({
  useParticipantName: () => ({
    name: 'James',
    setName: vi.fn(),
    needsName: false,
  }),
}))

vi.mock('../../src/hooks/usePresence', () => ({
  usePresence: () => ({ participantCount: 2, participants: [] }),
}))

vi.mock('../../src/hooks/useMessages', () => ({
  useMessages: () => ({ messages: [], loading: false, sendMessage: vi.fn() }),
}))

vi.mock('../../src/hooks/useUnreadCount', () => ({
  useUnreadCount: () => ({ unreadCount: 0 }),
}))

import PrioritisationPage from '../../src/pages/PrioritisationPage'

// Need to provide the route with slug param
import { Routes, Route } from 'react-router-dom'

const renderPage = (route = '/s/test-session/prioritise') => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/s/:slug/prioritise" element={<PrioritisationPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PrioritisationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page with prioritisation content', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('prioritisation-page')).toBeInTheDocument()
    })
  })

  it('renders framework selector with all frameworks', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('framework-selector')).toBeInTheDocument()
    })
    expect(screen.getByTestId('framework-tab-rice')).toBeInTheDocument()
    expect(screen.getByTestId('framework-tab-ice')).toBeInTheDocument()
    expect(screen.getByTestId('framework-tab-moscow')).toBeInTheDocument()
    expect(screen.getByTestId('framework-tab-weighted')).toBeInTheDocument()
  })

  it('renders the scoring table', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('scoring-table')).toBeInTheDocument()
    })
  })

  it('renders item titles in the table', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Auth system')).toBeInTheDocument()
      expect(screen.getByText('Dashboard widget')).toBeInTheDocument()
    })
  })

  it('renders RICE column headers', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('RICE Score ▼')).toBeInTheDocument()
      expect(screen.getByText('Reach')).toBeInTheDocument()
      expect(screen.getByText('Impact')).toBeInTheDocument()
      expect(screen.getByText('Confidence')).toBeInTheDocument()
      expect(screen.getByText('Effort')).toBeInTheDocument()
    })
  })

  it('shows item count and scored count', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('2 items · 1 scored')).toBeInTheDocument()
    })
  })

  it('renders score badge with value for scored items', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('18')).toBeInTheDocument()
    })
  })

  it('renders dash for unscored items', async () => {
    renderPage()
    await waitFor(() => {
      // The unscored item should show "—"
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBeGreaterThan(0)
    })
  })

  it('renders rank badges', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('shows status badges', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('To Do')).toBeInTheDocument()
    })
  })

  it('shows creator names', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('by James')).toBeInTheDocument()
      expect(screen.getByText('by Sarah')).toBeInTheDocument()
    })
  })

})
