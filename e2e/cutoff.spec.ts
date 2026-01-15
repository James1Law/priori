import { test, expect } from '@playwright/test'

// Helper to dismiss the name prompt modal
async function dismissNameModal(page: import('@playwright/test').Page) {
  await page.fill('input[placeholder="Your name"]', 'Test User')
  await page.click('button:has-text("Join Session")')
}

test.describe('Cutoff Line', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)
    await page.selectOption('select', 'ice')

    // Add 4 items one at a time with waiting
    for (const name of ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4']) {
      await page.fill('input[placeholder="Item title (required)"]', name)
      await page.click('button:has-text("Add Item")')
      await expect(page.locator(`text=${name}`)).toBeVisible()
    }

    await expect(page.locator('text=Items (4)')).toBeVisible()

    // Switch to backlog view
    await page.click('button:has-text("Backlog")')
  })

  test('shows add cutoff buttons between items', async ({ page }) => {
    // Should have add cutoff buttons (3 gaps between 4 items)
    const addButtons = page.locator('button[aria-label="Add cutoff line here"]')
    expect(await addButtons.count()).toBe(3)
  })

  test('adds cutoff line when button clicked', async ({ page }) => {
    // Click first add cutoff button
    await page.locator('button[aria-label="Add cutoff line here"]').first().click()

    // Should show cutoff line with default label
    await expect(page.locator('text=Cutoff')).toBeVisible()

    // Add buttons should disappear when cutoff is set
    const addButtons = page.locator('button[aria-label="Add cutoff line here"]')
    expect(await addButtons.count()).toBe(0)
  })

  test('items below cutoff line are greyed out', async ({ page }) => {
    // Add cutoff after first item
    await page.locator('button[aria-label="Add cutoff line here"]').first().click()

    // Items below should have opacity class
    const articles = page.locator('article')
    const firstArticle = articles.first()
    const secondArticle = articles.nth(1)

    // First item should not be greyed
    await expect(firstArticle).not.toHaveClass(/opacity-50/)

    // Items after cutoff should be greyed
    await expect(secondArticle).toHaveClass(/opacity-50/)
  })

  test('removes cutoff line when X button clicked', async ({ page }) => {
    // Add cutoff
    await page.locator('button[aria-label="Add cutoff line here"]').first().click()
    await expect(page.locator('text=Cutoff')).toBeVisible()

    // Remove cutoff
    await page.click('button[aria-label="Remove cutoff line"]')

    // Cutoff should be gone
    await expect(page.locator('button[aria-label="Remove cutoff line"]')).not.toBeVisible()

    // Add buttons should reappear
    const addButtons = page.locator('button[aria-label="Add cutoff line here"]')
    expect(await addButtons.count()).toBe(3)
  })

  test('moves cutoff line up', async ({ page }) => {
    // Add cutoff after second item (position 2)
    await page.locator('button[aria-label="Add cutoff line here"]').nth(1).click()

    // Move up
    await page.click('button[aria-label="Move cutoff up"]')

    // Should still show cutoff
    await expect(page.locator('text=Cutoff')).toBeVisible()

    // Now first item should be in scope, rest greyed out
    const articles = page.locator('article')
    await expect(articles.first()).not.toHaveClass(/opacity-50/)
    await expect(articles.nth(1)).toHaveClass(/opacity-50/)
  })

  test('moves cutoff line down', async ({ page }) => {
    // Add cutoff after first item (position 1)
    await page.locator('button[aria-label="Add cutoff line here"]').first().click()

    // Move down
    await page.click('button[aria-label="Move cutoff down"]')

    // First two items should be in scope
    const articles = page.locator('article')
    await expect(articles.first()).not.toHaveClass(/opacity-50/)
    await expect(articles.nth(1)).not.toHaveClass(/opacity-50/)
    await expect(articles.nth(2)).toHaveClass(/opacity-50/)
  })

  test('edits cutoff label', async ({ page }) => {
    // Add cutoff
    await page.locator('button[aria-label="Add cutoff line here"]').first().click()

    // Click to edit label
    await page.click('button[aria-label="Edit cutoff label"]')

    // Type new label
    await page.fill('input[aria-label="Cutoff label"]', 'Sprint 1')
    await page.press('input[aria-label="Cutoff label"]', 'Enter')

    // Should show new label
    await expect(page.locator('button[aria-label="Edit cutoff label"]')).toContainText('Sprint 1')
  })

  test('cutoff persists after page reload', async ({ page }) => {
    // Add cutoff with custom label
    await page.locator('button[aria-label="Add cutoff line here"]').first().click()
    await page.click('button[aria-label="Edit cutoff label"]')
    await page.fill('input[aria-label="Cutoff label"]', 'MVP')
    await page.press('input[aria-label="Cutoff label"]', 'Enter')

    // Wait for the label to be saved and displayed
    await expect(page.locator('button[aria-label="Edit cutoff label"]')).toContainText('MVP')

    // Wait for database save (debounced)
    await page.waitForTimeout(1000)

    // Reload page
    await page.reload()

    // Name modal shouldn't appear again (localStorage preserves name)
    // Switch to backlog (view may reset to scoring on reload)
    await page.click('button:has-text("Backlog")')

    // Cutoff should still be there with label
    await expect(page.locator('text=MVP')).toBeVisible()
  })
})
