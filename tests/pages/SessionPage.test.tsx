import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

// Track every realtime channel topic opened by the page
const channelTopics: string[] = []

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: () => {
      const chain: Record<string, unknown> = {}
      const self = () => chain
      chain.select = vi.fn(self)
      chain.eq = vi.fn(self)
      chain.in = vi.fn(self)
      chain.single = vi.fn(() => ({ data: null, error: null }))
      chain.order = vi.fn(() => ({ data: [], error: null }))
      chain.insert = vi.fn(self)
      chain.update = vi.fn(self)
      chain.delete = vi.fn(self)
      chain.then = (fn: (v: { data: null; error: null }) => void) => {
        fn({ data: null, error: null })
        return Promise.resolve()
      }
      return chain
    },
    channel: (topic: string) => {
      channelTopics.push(topic)
      return {
        on: function () { return this },
        subscribe: () => ({}),
        track: vi.fn(),
        presenceState: () => ({}),
      }
    },
    removeChannel: vi.fn(),
  },
}))

// Shared session context — the single presence channel lives in SessionLayout,
// so SessionPage must consume participant data from here
const defaultContextValue = {
  session: mockSession,
  items: [],
  setItems: vi.fn(),
  setSession: vi.fn(),
  participantName: 'James',
  participantCount: 3,
  participants: [
    { name: 'James', joinedAt: '2024-01-01' },
    { name: 'Sarah', joinedAt: '2024-01-01' },
    { name: 'Alex', joinedAt: '2024-01-01' },
  ],
  refetchData: vi.fn(),
  editingItem: null,
  setEditingItem: vi.fn(),
  isNewItem: false,
  addItemAndEdit: vi.fn(),
}

let mockContextValue = { ...defaultContextValue }

vi.mock('../../src/contexts/SessionContext', () => ({
  useSessionContext: () => mockContextValue,
}))

vi.mock('../../src/hooks/useParticipantName', () => ({
  useParticipantName: () => ({ name: 'James', setName: vi.fn(), needsName: false }),
}))

vi.mock('../../src/hooks/useCutoffs', () => ({
  useCutoffs: () => ({
    cutoffs: [], loading: false, error: null,
    addCutoff: vi.fn(), updateCutoff: vi.fn(), deleteCutoff: vi.fn(),
  }),
}))

vi.mock('../../src/hooks/useMessages', () => ({
  useMessages: () => ({ messages: [], loading: false, sendMessage: vi.fn() }),
}))

vi.mock('../../src/hooks/useUnreadCount', () => ({
  useUnreadCount: () => ({ unreadCount: 0 }),
}))

// Stub heavy child components — not under test here
vi.mock('../../src/components/BacklogList', () => ({ default: () => <div data-testid="backlog-list" /> }))
vi.mock('../../src/components/CapacityView', () => ({ default: () => null }))
vi.mock('../../src/components/RoadmapView', () => ({ default: () => null }))
vi.mock('../../src/components/RoadmapMobileView', () => ({ default: () => null }))
vi.mock('../../src/components/ItemDrawer', () => ({ default: () => null }))
vi.mock('../../src/components/MobileChatModal', () => ({ default: () => null }))
vi.mock('../../src/components/MobileMenu', () => ({ default: () => null }))
vi.mock('../../src/components/BottomSheet', () => ({ default: () => null }))
vi.mock('../../src/components/ConfirmModal', () => ({ default: () => null }))
vi.mock('../../src/components/NamePromptModal', () => ({ default: () => null }))
vi.mock('../../src/components/FAB', () => ({ default: () => null }))

import SessionPage from '../../src/pages/SessionPage'

beforeEach(() => {
  channelTopics.length = 0
  mockContextValue = { ...defaultContextValue }
})

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/s/test-session']}>
      <Routes>
        <Route path="/s/:slug" element={<SessionPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SessionPage presence', () => {
  it('does not open its own presence channel (shared channel lives in SessionLayout)', () => {
    renderWithRouter()
    // A second channel on the same presence topic kills the layout's
    // subscription server-side when this page unmounts, freezing the
    // participant list for everyone until a full page refresh
    const presenceTopics = channelTopics.filter(t => t.startsWith('presence:'))
    expect(presenceTopics).toEqual([])
  })

  it('shows the participant count from the shared session context', () => {
    renderWithRouter()
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
  })
})
