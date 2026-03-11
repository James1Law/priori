import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CapacityView from '../../src/components/CapacityView'
import type { Session, Item } from '../../src/types/database'

// Mock Supabase to prevent actual API calls
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  },
}))

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    slug: 'test-slug',
    name: 'Test Session',
    framework: 'rice',
    view: 'list',
    cutoff_position: null,
    cutoff_label: null,
    current_estimation_item_id: null,
    estimation_revealed: false,
    estimation_item_ids: [],
    capacity_team_size: 5,
    capacity_working_days: 65,
    capacity_focus_factor: 0.6,
    capacity_contingency: 0.3,
    capacity_unit: 'days',
    capacity_hours_per_day: 8,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  }
}

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: `item-${Math.random()}`,
    session_id: 'session-1',
    title: 'Test Item',
    description: null,
    position: 0,
    backlog_position: null,
    status: 'todo',
    created_by: null,
    created_at: '2026-01-01',
    roadmap_start_period: null,
    roadmap_end_period: null,
    roadmap_start_quadrant: null,
    roadmap_end_quadrant: null,
    roadmap_row: 0,
    story_points: null,
    effort_estimate: null,
    ...overrides,
  }
}

describe('CapacityView', () => {
  it('renders the capacity settings panel', () => {
    render(<CapacityView session={makeSession()} items={[]} onSessionUpdate={vi.fn()} onItemUpdate={vi.fn()} />)

    expect(screen.getByText('Team Size')).toBeInTheDocument()
    expect(screen.getByText('Working Days')).toBeInTheDocument()
    expect(screen.getByText('Focus Factor')).toBeInTheDocument()
    expect(screen.getByText('Contingency')).toBeInTheDocument()
    expect(screen.getByText('Unit')).toBeInTheDocument()
  })

  it('displays session capacity values', () => {
    render(
      <CapacityView
        session={makeSession({ capacity_team_size: 7, capacity_working_days: 80 })}
        items={[]}
        onSessionUpdate={vi.fn()} onItemUpdate={vi.fn()}
      />
    )

    expect(screen.getByDisplayValue('7')).toBeInTheDocument()
    expect(screen.getByDisplayValue('80')).toBeInTheDocument()
  })

  it('renders summary cards', () => {
    render(<CapacityView session={makeSession()} items={[]} onSessionUpdate={vi.fn()} onItemUpdate={vi.fn()} />)

    expect(screen.getByText('Total Effort')).toBeInTheDocument()
    expect(screen.getByText('Net Capacity')).toBeInTheDocument()
    expect(screen.getByText('Utilisation')).toBeInTheDocument()
    expect(screen.getByText('Coverage')).toBeInTheDocument()
  })

  it('calculates metrics from items', () => {
    const items = [
      makeItem({ effort_estimate: 50 }),
      makeItem({ effort_estimate: 30 }),
      makeItem({ effort_estimate: null }),
    ]
    render(<CapacityView session={makeSession()} items={items} onSessionUpdate={vi.fn()} onItemUpdate={vi.fn()} />)

    // base = 80, with 30% contingency = 104
    expect(screen.getByText('104 days')).toBeInTheDocument()
    // coverage: 2/3 — use getAllByText since rank badges also contain "2"
    expect(screen.getByText('/ 3')).toBeInTheDocument()
    expect(screen.getByText('items estimated')).toBeInTheDocument()
  })

  it('renders unit segmented control with days and hours only', () => {
    render(<CapacityView session={makeSession()} items={[]} onSessionUpdate={vi.fn()} onItemUpdate={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Days' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hours' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Points' })).not.toBeInTheDocument()
  })

  it('shows empty state when no items', () => {
    render(<CapacityView session={makeSession()} items={[]} onSessionUpdate={vi.fn()} onItemUpdate={vi.fn()} />)

    expect(screen.getByText('No items yet')).toBeInTheDocument()
    expect(screen.getByText(/Add items to your backlog/)).toBeInTheDocument()
  })

  it('shows hint when items exist but none estimated', () => {
    const items = [
      makeItem({ effort_estimate: null }),
      makeItem({ effort_estimate: null }),
    ]
    render(<CapacityView session={makeSession()} items={items} onSessionUpdate={vi.fn()} onItemUpdate={vi.fn()} />)

    expect(screen.getByText(/Add estimates to see capacity/)).toBeInTheDocument()
  })

  it('does not show hint when some items are estimated', () => {
    const items = [
      makeItem({ effort_estimate: 10 }),
      makeItem({ effort_estimate: null }),
    ]
    render(<CapacityView session={makeSession()} items={items} onSessionUpdate={vi.fn()} onItemUpdate={vi.fn()} />)

    expect(screen.queryByText(/Add estimates to see capacity/)).not.toBeInTheDocument()
  })

  it('shows export button as disabled when no estimates', () => {
    const items = [makeItem({ effort_estimate: null })]
    render(<CapacityView session={makeSession()} items={items} onSessionUpdate={vi.fn()} onItemUpdate={vi.fn()} />)

    const exportBtn = screen.getByRole('button', { name: /export csv/i })
    expect(exportBtn).toBeDisabled()
  })

  it('shows export button as enabled when estimates exist', () => {
    const items = [makeItem({ effort_estimate: 10 })]
    render(<CapacityView session={makeSession()} items={items} onSessionUpdate={vi.fn()} onItemUpdate={vi.fn()} />)

    const exportBtn = screen.getByRole('button', { name: /export csv/i })
    expect(exportBtn).not.toBeDisabled()
  })
})
