import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// Mock data
const mockSession = {
  id: 'session-1', slug: 'test-session', name: 'Test Session',
  framework: 'rice', view: 'list', weighted_criteria: [],
  current_estimation_item_id: null, estimation_revealed: false,
  estimation_item_ids: [], estimation_host: null, estimation_session_id: null,
  capacity_team_size: 5, capacity_working_days: 65, capacity_focus_factor: 0.6,
  capacity_contingency: 0.3, capacity_unit: 'days', capacity_hours_per_day: 8,
  roadmap_zoom: 'fit' as const, roadmap_start_date: null, roadmap_end_date: null,
  created_at: '2024-01-01', updated_at: '2024-01-01',
}

const mockItems = [
  {
    id: 'item-1', session_id: 'session-1', title: 'First item',
    description: null, position: 0, backlog_position: null,
    status: 'todo' as const, created_by: 'James', created_at: '2024-01-01',
    roadmap_start_period: null, roadmap_end_period: null,
    roadmap_start_quadrant: null, roadmap_end_quadrant: null, roadmap_row: 0,
    start_date: null, end_date: null, story_points: null,
    effort_estimate: null, parent_item_id: null, item_level: 0, score: undefined,
  },
  {
    id: 'item-2', session_id: 'session-1', title: 'Second item',
    description: null, position: 1, backlog_position: null,
    status: 'todo' as const, created_by: 'James', created_at: '2024-01-01',
    roadmap_start_period: null, roadmap_end_period: null,
    roadmap_start_quadrant: null, roadmap_end_quadrant: null, roadmap_row: 0,
    start_date: null, end_date: null, story_points: null,
    effort_estimate: null, parent_item_id: null, item_level: 0, score: undefined,
  },
]

const mockDraftItem = {
  id: 'draft-123', session_id: 'session-1', title: '', description: null,
  position: 0, backlog_position: null, status: 'todo' as const,
  created_by: 'James', created_at: '2024-01-01',
  roadmap_start_period: null, roadmap_end_period: null,
  roadmap_start_quadrant: null, roadmap_end_quadrant: null, roadmap_row: 0,
  start_date: null, end_date: null, story_points: null,
  effort_estimate: null, parent_item_id: null, item_level: 0, score: undefined,
}

// Mock supabase - chain builder with thenable support
const successResult = { data: null, error: null }
const thenableSuccess = {
  ...successResult,
  then: (fn: (v: typeof successResult) => void) => { fn(successResult); return Promise.resolve() },
}

function createMockChain() {
  const chain: Record<string, unknown> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(() => ({ ...chain, ...thenableSuccess }))
  chain.in = vi.fn(self)
  chain.single = vi.fn()
  chain.order = vi.fn(() => ({ data: [], error: null }))
  chain.insert = vi.fn(self)
  chain.update = vi.fn(self)
  chain.delete = vi.fn(self)
  return chain
}

const mockChain = createMockChain()

let singleCallCount = 0
let mockSessionOverride: typeof mockSession | null = null
;(mockChain.single as ReturnType<typeof vi.fn>).mockImplementation(() => {
  singleCallCount++
  if (singleCallCount === 1) return { data: mockSessionOverride || mockSession, error: null }
  return { data: null, error: null }
})

// Return items from order() call
;(mockChain.order as ReturnType<typeof vi.fn>).mockImplementation(() => ({ data: mockItems, error: null }))

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: () => mockChain,
    channel: () => ({
      on: function() { return this },
      subscribe: () => ({}),
    }),
    removeChannel: vi.fn(),
  },
}))

// Default context value — overridden per test
const defaultContextValue = {
  session: mockSession,
  items: [] as typeof mockItems,
  setItems: vi.fn(),
  setSession: vi.fn(),
  participantName: 'James',
  participantCount: 1,
  participants: [{ name: 'James', joinedAt: '2024-01-01' }],
  refetchData: vi.fn(),
  editingItem: null as typeof mockDraftItem | null,
  setEditingItem: vi.fn(),
  isNewItem: false,
  addItemAndEdit: vi.fn(),
}

let mockContextValue = { ...defaultContextValue }

vi.mock('../../src/contexts/SessionContext', () => ({
  useSessionContext: () => mockContextValue,
}))

const { mockSubmitVote, mockClearVotes, mockVotes } = vi.hoisted(() => ({
  mockSubmitVote: vi.fn(),
  mockClearVotes: vi.fn(),
  mockVotes: [] as { id: string; item_id: string; session_id: string; participant_name: string; vote: number | null; created_at: string }[],
}))

vi.mock('../../src/hooks/useEstimationVotes', () => ({
  useEstimationVotes: () => ({ votes: mockVotes, submitVote: mockSubmitVote, clearVotes: mockClearVotes }),
}))

vi.mock('../../src/components/ItemDrawer', () => ({
  default: ({ isOpen, isNew }: { isOpen: boolean; isNew?: boolean }) =>
    isOpen ? <div data-testid="item-drawer" data-is-new={isNew}>Item Drawer</div> : null,
}))

import EstimationFlowPage from '../../src/pages/EstimationFlowPage'

beforeEach(() => {
  singleCallCount = 0
  mockSessionOverride = null
  mockContextValue = { ...defaultContextValue }
  mockSubmitVote.mockClear()
  mockClearVotes.mockClear()
  mockVotes.length = 0
})

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/s/test-session/estimate']}>
      <Routes>
        <Route path="/s/:slug/estimate" element={<EstimationFlowPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('EstimationFlowPage', () => {
  describe('ItemDrawer', () => {
    it('does not render ItemDrawer when no editing item', () => {
      renderWithRouter()
      expect(screen.queryByTestId('item-drawer')).not.toBeInTheDocument()
    })

    it('renders ItemDrawer when editing item is set in context', async () => {
      mockContextValue.editingItem = mockDraftItem
      mockContextValue.isNewItem = true
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByTestId('item-drawer')).toBeInTheDocument()
      })
      expect(screen.getByTestId('item-drawer')).toHaveAttribute('data-is-new', 'true')
    })
  })

  describe('Lobby (no active host)', () => {
    it('shows lobby when entering from sidebar with no active host', async () => {
      mockContextValue.items = mockItems
      // session has no estimation_host — lobby should show
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByText('Poker Planner')).toBeInTheDocument()
      })
      expect(screen.getByText(/Select items to estimate/)).toBeInTheDocument()
      expect(screen.getByText(/Start as Host/)).toBeInTheDocument()
    })

    it('shows items with checkboxes in lobby', async () => {
      mockContextValue.items = mockItems
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByText('First item')).toBeInTheDocument()
      })
      expect(screen.getByText('Second item')).toBeInTheDocument()
    })

    it('Start as Host button is disabled when no items selected', async () => {
      mockContextValue.items = mockItems
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByText(/Start as Host/)).toBeInTheDocument()
      })
      expect(screen.getByText(/Start as Host/).closest('button')).toBeDisabled()
    })

    it('enables Start as Host after selecting items', async () => {
      mockContextValue.items = mockItems
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByText('First item')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('First item'))
      expect(screen.getByText(/Start as Host/).closest('button')).not.toBeDisabled()
    })
  })

  describe('Voting round behaviour', () => {
    const activeVotingSession = {
      ...mockSession,
      estimation_host: 'James',
      estimation_item_ids: ['item-1', 'item-2'],
      estimation_session_id: 'sess-1',
      current_estimation_item_id: 'item-1',
    }

    it('locks the voting cards once votes are revealed', async () => {
      mockSessionOverride = { ...activeVotingSession, estimation_revealed: true }
      mockContextValue.items = mockItems
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '5 story points' })).toBeInTheDocument()
      })
      expect(screen.getByRole('button', { name: '5 story points' })).toBeDisabled()
    })

    it('keeps voting cards enabled before reveal', async () => {
      mockSessionOverride = { ...activeVotingSession, estimation_revealed: false }
      mockContextValue.items = mockItems
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '5 story points' })).toBeInTheDocument()
      })
      expect(screen.getByRole('button', { name: '5 story points' })).not.toBeDisabled()
    })

    it('clears votes when the host skips an item', async () => {
      mockSessionOverride = { ...activeVotingSession, estimation_revealed: true }
      mockContextValue.items = mockItems
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByText('Skip')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('Skip'))
      await waitFor(() => {
        expect(mockClearVotes).toHaveBeenCalled()
      })
    })
  })

  describe('Keyboard shortcuts', () => {
    const activeVotingSession = {
      ...mockSession,
      estimation_host: 'James',
      estimation_item_ids: ['item-1', 'item-2'],
      estimation_session_id: 'sess-1',
      current_estimation_item_id: 'item-1',
    }

    it('votes with number keys mapped to the deck', async () => {
      mockSessionOverride = { ...activeVotingSession }
      mockContextValue.items = mockItems
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '5 story points' })).toBeInTheDocument()
      })
      // Key 5 → fifth card in the deck [0,1,2,3,5,8,13,21] = 5 points
      fireEvent.keyDown(document, { key: '5' })
      expect(mockSubmitVote).toHaveBeenCalledWith(5)
      // Key 8 → eighth card = 21 points
      fireEvent.keyDown(document, { key: '8' })
      expect(mockSubmitVote).toHaveBeenCalledWith(21)
    })

    it('does not vote from keys while typing in an input', async () => {
      mockSessionOverride = { ...activeVotingSession }
      mockContextValue.items = mockItems
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '5 story points' })).toBeInTheDocument()
      })
      const input = document.createElement('input')
      document.body.appendChild(input)
      fireEvent.keyDown(input, { key: '5' })
      expect(mockSubmitVote).not.toHaveBeenCalled()
      input.remove()
    })

    it('does not vote from keys after reveal', async () => {
      mockSessionOverride = { ...activeVotingSession, estimation_revealed: true }
      mockContextValue.items = mockItems
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '5 story points' })).toBeInTheDocument()
      })
      fireEvent.keyDown(document, { key: '5' })
      expect(mockSubmitVote).not.toHaveBeenCalled()
    })

    it('reveals votes with the R key for the host', async () => {
      mockSessionOverride = { ...activeVotingSession }
      mockContextValue.items = mockItems
      mockVotes.push({
        id: 'v1', item_id: 'item-1', session_id: 'session-1',
        participant_name: 'Sarah', vote: 5, created_at: '2024-01-01',
      })
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '5 story points' })).toBeInTheDocument()
      })
      fireEvent.keyDown(document, { key: 'r' })
      await waitFor(() => {
        expect(mockChain.update).toHaveBeenCalledWith(
          expect.objectContaining({ estimation_revealed: true })
        )
      })
    })
  })

  describe('Participant indicators', () => {
    it('shows participants in the sidebar when session is active', async () => {
      // Session has an active host — should show the main estimation view
      mockSessionOverride = {
        ...mockSession,
        estimation_host: 'James',
        estimation_item_ids: ['item-1'],
        estimation_session_id: 'sess-1',
      }
      mockContextValue.items = mockItems
      mockContextValue.participants = [
        { name: 'James', joinedAt: '2024-01-01' },
        { name: 'Sarah', joinedAt: '2024-01-01' },
      ]
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByText(/James \(you\)/)).toBeInTheDocument()
      })
      expect(screen.getByText('Sarah')).toBeInTheDocument()
    })

    it('only shows participants who are on the estimation page', async () => {
      mockSessionOverride = {
        ...mockSession,
        estimation_host: 'James',
        estimation_item_ids: ['item-1'],
        estimation_session_id: 'sess-1',
      }
      mockContextValue.items = mockItems
      mockContextValue.participants = [
        { name: 'James', joinedAt: '2024-01-01', page: '/s/test-session/estimate' },
        // Sarah is in the session but sitting on the backlog page —
        // she is not in the poker room and must not count as a non-voter
        { name: 'Sarah', joinedAt: '2024-01-01', page: '/s/test-session' },
      ]
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByText(/James \(you\)/)).toBeInTheDocument()
      })
      expect(screen.queryByText('Sarah')).not.toBeInTheDocument()
    })

    it('still shows participants whose presence has no page info', async () => {
      // Older clients (pre-deploy) track presence without a page — treat
      // them as present rather than hiding them
      mockSessionOverride = {
        ...mockSession,
        estimation_host: 'James',
        estimation_item_ids: ['item-1'],
        estimation_session_id: 'sess-1',
      }
      mockContextValue.items = mockItems
      mockContextValue.participants = [
        { name: 'James', joinedAt: '2024-01-01', page: '/s/test-session/estimate' },
        { name: 'Sarah', joinedAt: '2024-01-01' },
      ]
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByText(/James \(you\)/)).toBeInTheDocument()
      })
      expect(screen.getByText('Sarah')).toBeInTheDocument()
    })
  })

  describe('Claim host', () => {
    it('offers takeover when the host is no longer present', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      try {
        mockSessionOverride = {
          ...mockSession,
          estimation_host: 'Sarah',
          estimation_item_ids: ['item-1'],
          estimation_session_id: 'sess-1',
        }
        mockContextValue.items = mockItems
        // Sarah (the host) is absent from presence
        mockContextValue.participants = [{ name: 'James', joinedAt: '2024-01-01' }]
        renderWithRouter()
        await waitFor(() => {
          expect(screen.getAllByText(/Waiting for/i).length).toBeGreaterThan(0)
        })
        expect(screen.queryByText(/Take over as host/i)).not.toBeInTheDocument()

        // Grace period passes with the host still absent
        await vi.advanceTimersByTimeAsync(11000)
        expect(screen.getByText(/Take over as host/i)).toBeInTheDocument()

        fireEvent.click(screen.getByText(/Take over as host/i))
        await waitFor(() => {
          expect(mockChain.update).toHaveBeenCalledWith(
            expect.objectContaining({ estimation_host: 'James' })
          )
        })
      } finally {
        vi.useRealTimers()
      }
    })

    it('does not offer takeover while the host is present', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      try {
        mockSessionOverride = {
          ...mockSession,
          estimation_host: 'Sarah',
          estimation_item_ids: ['item-1'],
          estimation_session_id: 'sess-1',
        }
        mockContextValue.items = mockItems
        mockContextValue.participants = [
          { name: 'James', joinedAt: '2024-01-01' },
          { name: 'Sarah', joinedAt: '2024-01-01' },
        ]
        renderWithRouter()
        await waitFor(() => {
          expect(screen.getAllByText(/Waiting for/i).length).toBeGreaterThan(0)
        })
        await vi.advanceTimersByTimeAsync(11000)
        expect(screen.queryByText(/Take over as host/i)).not.toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('Invite link', () => {
    it('lobby offers a copy invite link button', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      mockContextValue.items = mockItems
      renderWithRouter()
      await waitFor(() => {
        expect(screen.getByText(/Copy invite link/i)).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText(/Copy invite link/i))
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(
          expect.stringContaining('/s/test-session/estimate')
        )
      })
    })
  })
})
