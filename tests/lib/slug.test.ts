import { describe, it, expect } from 'vitest'
import { generateSlug } from '../../src/lib/slug'

describe('generateSlug', () => {
  it('generates a 6 character alphanumeric string', () => {
    const slug = generateSlug()
    expect(slug).toHaveLength(6)
    expect(slug).toMatch(/^[a-z0-9]+$/)
  })

  it('generates unique slugs', () => {
    const slug1 = generateSlug()
    const slug2 = generateSlug()
    const slug3 = generateSlug()

    expect(slug1).not.toBe(slug2)
    expect(slug2).not.toBe(slug3)
    expect(slug1).not.toBe(slug3)
  })

  it('only uses lowercase letters and numbers', () => {
    // Generate multiple slugs to test randomness
    for (let i = 0; i < 20; i++) {
      const slug = generateSlug()
      expect(slug).toMatch(/^[a-z0-9]{6}$/)
    }
  })
})
