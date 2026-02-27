import { test, expect } from '@playwright/test'

// Helper to dismiss the name prompt modal
async function dismissNameModal(page: import('@playwright/test').Page) {
  await page.fill('input[placeholder="Your name"]', 'Test User')
  await page.click('button:has-text("Join Session")')
}

// Helper to add an item via the FAB + BottomSheet
async function addItem(page: import('@playwright/test').Page, title: string) {
  await page.locator('button[aria-label="Add item"]').click()
  await expect(page.locator('input[placeholder="Item title (required)"]')).toBeVisible()
  await page.fill('input[placeholder="Item title (required)"]', title)
  await page.click('[data-testid="submit-item-button"]')
  // Wait for item to appear in the list
  await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 10000 })
}

test.describe('Cutoff Line', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Add 4 items one at a time with waiting
    for (const name of ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4']) {
      await addItem(page, name)
    }

    await expect(page.locator('[data-testid="backlog-item-row"]')).toHaveCount(4, { timeout: 10000 })
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
    await expect(page.locator('button[aria-label="Edit cutoff label"]:has-text("Cutoff")')).toBeVisible()
    // Remove button should be present
    await expect(page.locator('button[aria-label="Remove cutoff line"]')).toBeVisible()
  })

  test('removes cutoff line when X button clicked', async ({ page }) => {
    // Add cutoff
    await page.locator('button[aria-label="Add cutoff line here"]').first().click()
    await expect(page.locator('button[aria-label="Edit cutoff label"]')).toBeVisible()

    // Remove cutoff
    await page.click('button[aria-label="Remove cutoff line"]')

    // Cutoff should be gone
    await expect(page.locator('button[aria-label="Remove cutoff line"]')).not.toBeVisible()

    // Add buttons should reappear (3 gaps between 4 items)
    const addButtons = page.locator('button[aria-label="Add cutoff line here"]')
    expect(await addButtons.count()).toBe(3)
  })

  test('moves cutoff line up', async ({ page }) => {
    // Add cutoff after second item (position 2)
    await page.locator('button[aria-label="Add cutoff line here"]').nth(1).click()

    // Move up
    await page.click('button[aria-label="Move cutoff up"]')

    // Should still show cutoff
    await expect(page.locator('button[aria-label="Edit cutoff label"]')).toBeVisible()
  })

  test('moves cutoff line down', async ({ page }) => {
    // Add cutoff after first item (position 1)
    await page.locator('button[aria-label="Add cutoff line here"]').first().click()

    // Move down
    await page.click('button[aria-label="Move cutoff down"]')

    // Cutoff should still be visible
    await expect(page.locator('button[aria-label="Edit cutoff label"]')).toBeVisible()
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
    // Add cutoff
    await page.locator('button[aria-label="Add cutoff line here"]').first().click()

    // Wait for the cutoff to be visible
    await expect(page.locator('button[aria-label="Edit cutoff label"]')).toBeVisible()

    // Wait for database save
    await page.waitForTimeout(1500)

    // Reload page
    await page.reload()

    // Name modal shouldn't appear again (localStorage preserves name)
    // Cutoff should still be there (list is the default view now)
    await expect(page.locator('button[aria-label="Edit cutoff label"]')).toBeVisible()
  })

  test('can add multiple cutoffs', async ({ page }) => {
    // Add first cutoff between items 1 and 2
    await page.locator('button[aria-label="Add cutoff line here"]').first().click()
    await expect(page.locator('button[aria-label="Edit cutoff label"]').first()).toBeVisible()

    // Add another cutoff using remaining inline button
    await page.locator('button[aria-label="Add cutoff line here"]').first().click()

    // Should now have two cutoffs
    const cutoffLabels = page.locator('button[aria-label="Edit cutoff label"]')
    expect(await cutoffLabels.count()).toBe(2)
  })
})
