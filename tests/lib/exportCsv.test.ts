import { describe, it, expect } from 'vitest'
import { generateCsvContent } from '../../src/lib/exportCsv'
import type { ItemWithScore } from '../../src/types/database'

describe('generateCsvContent', () => {
  const baseItem: ItemWithScore = {
    id: '1',
    session_id: 'session-1',
    title: 'Test Item',
    description: 'Test description',
    position: 0,
    created_by: 'Alice',
    created_at: '2026-01-13T00:00:00Z',
  }

  it('generates CSV for RICE framework', () => {
    const items: ItemWithScore[] = [
      {
        ...baseItem,
        score: {
          id: 's1',
          item_id: '1',
          framework: 'rice',
          criteria: { reach: 1000, impact: 2, confidence: 0.8, effort: 4 },
          calculated_score: 400,
        },
      },
    ]

    const csv = generateCsvContent({ items, framework: 'rice' })
    const lines = csv.split('\n')

    expect(lines[0]).toBe('Rank,Title,Description,Created By,Reach,Impact,Confidence,Effort,RICE Score')
    expect(lines[1]).toBe('1,Test Item,Test description,Alice,1000,2,0.8,4,400.00')
  })

  it('generates CSV for ICE framework', () => {
    const items: ItemWithScore[] = [
      {
        ...baseItem,
        score: {
          id: 's1',
          item_id: '1',
          framework: 'ice',
          criteria: { impact: 8, confidence: 7, ease: 6 },
          calculated_score: 7,
        },
      },
    ]

    const csv = generateCsvContent({ items, framework: 'ice' })
    const lines = csv.split('\n')

    expect(lines[0]).toBe('Rank,Title,Description,Created By,Impact,Confidence,Ease,ICE Score')
    expect(lines[1]).toBe('1,Test Item,Test description,Alice,8,7,6,7.00')
  })

  it('generates CSV for Value vs Effort framework', () => {
    const items: ItemWithScore[] = [
      {
        ...baseItem,
        score: {
          id: 's1',
          item_id: '1',
          framework: 'value_effort',
          criteria: { value: 8, effort: 3 },
          calculated_score: 0,
        },
      },
    ]

    const csv = generateCsvContent({ items, framework: 'value_effort' })
    const lines = csv.split('\n')

    expect(lines[0]).toBe('Rank,Title,Description,Created By,Value,Effort,Quadrant')
    expect(lines[1]).toBe('1,Test Item,Test description,Alice,8,3,Quick Wins')
  })

  it('generates CSV for MoSCoW framework', () => {
    const items: ItemWithScore[] = [
      {
        ...baseItem,
        score: {
          id: 's1',
          item_id: '1',
          framework: 'moscow',
          criteria: { category: 'must' },
          calculated_score: 0,
        },
      },
    ]

    const csv = generateCsvContent({ items, framework: 'moscow' })
    const lines = csv.split('\n')

    expect(lines[0]).toBe('Rank,Title,Description,Created By,Category')
    expect(lines[1]).toBe('1,Test Item,Test description,Alice,Must Have')
  })

  it('generates CSV for Weighted framework', () => {
    const items: ItemWithScore[] = [
      {
        ...baseItem,
        score: {
          id: 's1',
          item_id: '1',
          framework: 'weighted',
          criteria: { scores: { c1: 8, c2: 6 } },
          calculated_score: 7.33,
        },
      },
    ]

    const csv = generateCsvContent({ items, framework: 'weighted' })
    const lines = csv.split('\n')

    expect(lines[0]).toBe('Rank,Title,Description,Created By,Weighted Score')
    expect(lines[1]).toBe('1,Test Item,Test description,Alice,7.33')
  })

  it('escapes commas in content', () => {
    const items: ItemWithScore[] = [
      {
        ...baseItem,
        title: 'Item with, comma',
        description: 'Description, with, commas',
      },
    ]

    const csv = generateCsvContent({ items, framework: 'rice' })
    const lines = csv.split('\n')

    expect(lines[1]).toContain('"Item with, comma"')
    expect(lines[1]).toContain('"Description, with, commas"')
  })

  it('escapes quotes in content', () => {
    const items: ItemWithScore[] = [
      {
        ...baseItem,
        title: 'Item with "quotes"',
      },
    ]

    const csv = generateCsvContent({ items, framework: 'rice' })
    const lines = csv.split('\n')

    expect(lines[1]).toContain('"Item with ""quotes"""')
  })

  it('handles empty items array', () => {
    const csv = generateCsvContent({ items: [], framework: 'rice' })
    const lines = csv.split('\n')

    expect(lines.length).toBe(1) // Header only
    expect(lines[0]).toBe('Rank,Title,Description,Created By,Reach,Impact,Confidence,Effort,RICE Score')
  })

  it('handles items without scores', () => {
    const items: ItemWithScore[] = [baseItem]

    const csv = generateCsvContent({ items, framework: 'rice' })
    const lines = csv.split('\n')

    expect(lines[1]).toBe('1,Test Item,Test description,Alice,0,1,0.8,1,0')
  })
})
