/**
 * Generates a random 6-character alphanumeric slug for session URLs
 * Uses lowercase letters and numbers only (a-z, 0-9)
 * Example: "abc123", "x9k2l4"
 */
export function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let slug = ''

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    slug += chars[randomIndex]
  }

  return slug
}
