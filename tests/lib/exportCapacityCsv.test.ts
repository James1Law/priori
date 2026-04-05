import { describe, it, expect } from 'vitest'
import { generateCapacityCsvContent, generateCapacityFilename } from '../../src/lib/exportCsv'
import type { Item } from '../../src/types/database'

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
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
    roadmap_row: 0, start_date: null, end_date: null,
    story_points: null,
    effort_estimate: null,
    ...overrides,
  }
}

describe('generateCapacityCsvContent', () => {
  const defaultOptions = {
    items: [
      makeItem({ id: '1', title: 'Feature A', effort_estimate: 10, status: 'todo' as const }),
      makeItem({ id: '2', title: 'Feature B', effort_estimate: 20, status: 'in_progress' as const }),
      makeItem({ id: '3', title: 'Feature C', effort_estimate: null, status: 'done' as const }),
    ],
    sessionName: 'Test Session',
    teamSize: 7,
    workingDays: 65,
    focusFactor: 0.6,
    contingency: 0.3,
    unit: 'days' as const,
    netCapacity: 273,
    totalEffort: 39,
    baseEffort: 30,
    utilisation: 14.29,
    estimatedCount: 2,
    totalCount: 3,
  }

  it('includes session name header', () => {
    const csv = generateCapacityCsvContent(defaultOptions)
    const lines = csv.split('\n')

    expect(lines[0]).toContain('Test Session')
  })

  it('includes export date header', () => {
    const csv = generateCapacityCsvContent(defaultOptions)
    const lines = csv.split('\n')

    expect(lines[1]).toContain('Exported')
  })

  it('includes capacity settings', () => {
    const csv = generateCapacityCsvContent(defaultOptions)

    expect(csv).toContain('Team Size,7')
    expect(csv).toContain('Working Days,65')
    expect(csv).toContain('Focus Factor,0.6')
    expect(csv).toContain('Contingency,30%')
    expect(csv).toContain('Unit,days')
  })

  it('includes summary metrics', () => {
    const csv = generateCapacityCsvContent(defaultOptions)

    expect(csv).toContain('Net Capacity,273')
    expect(csv).toContain('Total Effort,39')
    expect(csv).toContain('Utilisation,14%')
    expect(csv).toContain('Coverage,2 of 3')
  })

  it('includes item table headers', () => {
    const csv = generateCapacityCsvContent(defaultOptions)

    expect(csv).toContain('Rank,Title,Status,Estimate')
  })

  it('includes all items with correct data', () => {
    const csv = generateCapacityCsvContent(defaultOptions)

    expect(csv).toContain('1,Feature A,To Do,10')
    expect(csv).toContain('2,Feature B,In Progress,20')
    expect(csv).toContain('3,Feature C,Done,')
  })

  it('shows empty estimate for items without estimates', () => {
    const csv = generateCapacityCsvContent(defaultOptions)
    const lines = csv.split('\n')

    // Feature C has null estimate — last data column should be empty
    const featureCLine = lines.find(l => l.includes('Feature C'))
    expect(featureCLine).toBe('3,Feature C,Done,')
  })

  it('includes total row', () => {
    const csv = generateCapacityCsvContent(defaultOptions)

    expect(csv).toContain('Total,,,30')
  })

  it('includes hours per day when unit is hours', () => {
    const csv = generateCapacityCsvContent({ ...defaultOptions, unit: 'hours', hoursPerDay: 6 })

    expect(csv).toContain('Hours/Day,6')
  })

  it('does not include hours per day when unit is days', () => {
    const csv = generateCapacityCsvContent({ ...defaultOptions, unit: 'days', hoursPerDay: 8 })

    expect(csv).not.toContain('Hours/Day')
  })

  it('generates correct filename', () => {
    const filename = generateCapacityFilename('My Session')

    expect(filename).toMatch(/^My Session-capacity-\d{4}-\d{2}-\d{2}\.csv$/)
  })
})
