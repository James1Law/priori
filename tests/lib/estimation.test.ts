import { describe, it, expect } from 'vitest'
import {
  getVoteStats,
  getVoteDisplay,
  SPECIAL_UNCERTAIN,
  SPECIAL_COFFEE,
} from '../../src/lib/estimation'

const vote = (v: number | null) => ({ vote: v })

describe('getVoteStats', () => {
  it('computes average and median of numeric votes', () => {
    const stats = getVoteStats([vote(3), vote(5), vote(8)])
    expect(stats.average).toBeCloseTo(5.3, 1)
    expect(stats.median).toBe(5)
  })

  it('uses the mean of the middle pair for an even count', () => {
    const stats = getVoteStats([vote(3), vote(5), vote(8), vote(13)])
    expect(stats.median).toBe(6.5)
  })

  it('ignores special and null votes', () => {
    const stats = getVoteStats([
      vote(5),
      vote(5),
      vote(SPECIAL_UNCERTAIN),
      vote(SPECIAL_COFFEE),
      vote(null),
    ])
    expect(stats.average).toBe(5)
    expect(stats.median).toBe(5)
    expect(stats.distribution).toEqual([{ value: 5, count: 2 }])
  })

  it('builds a distribution sorted by value', () => {
    const stats = getVoteStats([vote(8), vote(3), vote(8), vote(3), vote(5)])
    expect(stats.distribution).toEqual([
      { value: 3, count: 2 },
      { value: 5, count: 1 },
      { value: 8, count: 2 },
    ])
  })

  it('returns nulls for no numeric votes', () => {
    const stats = getVoteStats([vote(null), vote(SPECIAL_UNCERTAIN)])
    expect(stats.average).toBeNull()
    expect(stats.median).toBeNull()
    expect(stats.distribution).toEqual([])
  })
})

describe('getVoteDisplay', () => {
  it('maps special values to symbols', () => {
    expect(getVoteDisplay(SPECIAL_UNCERTAIN)).toBe('?')
    expect(getVoteDisplay(SPECIAL_COFFEE)).toBe('☕')
    expect(getVoteDisplay(5)).toBe('5')
    expect(getVoteDisplay(null)).toBe('')
  })
})
