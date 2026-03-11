import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCapacitySettings } from '../../src/hooks/useCapacitySettings'
import type { Session } from '../../src/types/database'

// Mock Supabase
const mockUpdate = vi.fn()
const mockEq = vi.fn()

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: mockUpdate,
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

describe('useCapacitySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockEq.mockResolvedValue({ error: null })
  })

  it('returns current session capacity settings', () => {
    const session = makeSession({ capacity_team_size: 7, capacity_working_days: 80 })
    const { result } = renderHook(() => useCapacitySettings(session, vi.fn()))

    expect(result.current.teamSize).toBe(7)
    expect(result.current.workingDays).toBe(80)
    expect(result.current.focusFactor).toBe(0.6)
    expect(result.current.contingency).toBe(0.3)
    expect(result.current.unit).toBe('days')
  })

  it('returns defaults when session is null', () => {
    const { result } = renderHook(() => useCapacitySettings(null, vi.fn()))

    expect(result.current.teamSize).toBe(5)
    expect(result.current.workingDays).toBe(65)
    expect(result.current.focusFactor).toBe(0.6)
    expect(result.current.contingency).toBe(0.3)
    expect(result.current.unit).toBe('days')
    expect(result.current.hoursPerDay).toBe(8)
  })

  it('calls onOptimisticUpdate and persists when updating team size', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setTeamSize(10)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_team_size: 10 })
    )
  })

  it('calls onOptimisticUpdate and persists when updating working days', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setWorkingDays(100)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_working_days: 100 })
    )
  })

  it('calls onOptimisticUpdate and persists when updating focus factor', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setFocusFactor(0.8)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_focus_factor: 0.8 })
    )
  })

  it('calls onOptimisticUpdate and persists when updating contingency', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setContingency(0.5)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_contingency: 0.5 })
    )
  })

  it('calls onOptimisticUpdate and persists when updating unit', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setUnit('hours')
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_unit: 'hours' })
    )
  })

  it('clamps team size to min 1', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setTeamSize(0)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_team_size: 1 })
    )
  })

  it('clamps team size to max 100', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setTeamSize(150)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_team_size: 100 })
    )
  })

  it('clamps working days to min 1', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setWorkingDays(0)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_working_days: 1 })
    )
  })

  it('clamps working days to max 365', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setWorkingDays(500)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_working_days: 365 })
    )
  })

  it('clamps focus factor to min 0.1', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setFocusFactor(0)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_focus_factor: 0.1 })
    )
  })

  it('clamps focus factor to max 1.0', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setFocusFactor(1.5)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_focus_factor: 1 })
    )
  })

  it('clamps contingency to min 0', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setContingency(-0.1)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_contingency: 0 })
    )
  })

  it('clamps contingency to max 2.0', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setContingency(3)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_contingency: 2 })
    )
  })

  it('calls onOptimisticUpdate when updating hours per day', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setHoursPerDay(6)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_hours_per_day: 6 })
    )
  })

  it('clamps hours per day to min 1', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setHoursPerDay(0)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_hours_per_day: 1 })
    )
  })

  it('clamps hours per day to max 24', async () => {
    const onOptimisticUpdate = vi.fn()
    const session = makeSession()
    const { result } = renderHook(() => useCapacitySettings(session, onOptimisticUpdate))

    await act(async () => {
      result.current.setHoursPerDay(30)
    })

    expect(onOptimisticUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity_hours_per_day: 24 })
    )
  })

  it('does not persist when session is null', async () => {
    const { result } = renderHook(() => useCapacitySettings(null, vi.fn()))

    await act(async () => {
      result.current.setTeamSize(10)
    })

    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
