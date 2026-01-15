import { test, expect } from '@playwright/test'

// Configure mobile viewport at file level (required by Playwright)
test.use({
  viewport: { width: 390, height: 844 }, // iPhone 12 dimensions
})

// Helper to dismiss the name prompt modal
async function dismissNameModal(page: import('@playwright/test').Page) {
  await page.fill('input[placeholder="Your name"]', 'Test User')
  await page.click('button:has-text("Join Session")')
}

test.describe('Mobile Experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // On mobile, we use the bottom bar input
    // Wait for the mobile bottom bar to be visible
    await expect(page.locator('.fixed.bottom-0')).toBeVisible()

    // Add items using mobile bottom bar
    await page.fill('.fixed.bottom-0 input[placeholder="Add new item..."]', 'Mobile item 1')
    await page.click('.fixed.bottom-0 button:has-text("Add")')
    await expect(page.locator('text=Mobile item 1')).toBeVisible()

    await page.fill('.fixed.bottom-0 input[placeholder="Add new item..."]', 'Mobile item 2')
    await page.click('.fixed.bottom-0 button:has-text("Add")')
    await expect(page.locator('text=Mobile item 2')).toBeVisible()

    await page.fill('.fixed.bottom-0 input[placeholder="Add new item..."]', 'Mobile item 3')
    await page.click('.fixed.bottom-0 button:has-text("Add")')
    await expect(page.locator('text=Mobile item 3')).toBeVisible()
  })

  test('shows mobile bottom bar with view toggle', async ({ page }) => {
    // Should show mobile bottom bar with view buttons
    await expect(page.locator('.fixed.bottom-0 button:has-text("Scoring")')).toBeVisible()
    await expect(page.locator('.fixed.bottom-0 button:has-text("Backlog")')).toBeVisible()
  })

  test('switches views using mobile toggle', async ({ page }) => {
    // Click backlog in mobile bar
    await page.locator('.fixed.bottom-0 button:has-text("Backlog")').click()

    // Should show backlog view
    await expect(page.locator('text=Prioritised Backlog')).toBeVisible()
  })

  test('add cutoff button visible on mobile without hover', async ({ page }) => {
    // Switch to backlog
    await page.locator('.fixed.bottom-0 button:has-text("Backlog")').click()

    // Add cutoff buttons should be visible (no hover needed on mobile)
    const addButtons = page.locator('button[aria-label="Add cutoff line here"]')
    await expect(addButtons.first()).toBeVisible()
  })

  test('remove cutoff button visible on mobile without hover', async ({ page }) => {
    // Switch to backlog
    await page.locator('.fixed.bottom-0 button:has-text("Backlog")').click()

    // Add cutoff
    await page.locator('button[aria-label="Add cutoff line here"]').first().click()

    // Remove button should be visible without hover
    await expect(page.locator('button[aria-label="Remove cutoff line"]')).toBeVisible()
  })

  test('can delete items on mobile', async ({ page }) => {
    // Items should be visible
    await expect(page.locator('text=Mobile item 1')).toBeVisible()

    // Click trash icon to delete (mobile uses icon, not text button)
    await page.locator('button[aria-label="Delete item"]').first().click()

    // Wait for and confirm deletion in modal
    await expect(page.locator('role=dialog')).toBeVisible()
    await page.locator('role=dialog').locator('button:has-text("Delete")').click()

    // Item should be gone
    await expect(page.locator('text=Mobile item 1')).not.toBeVisible()
  })

  test('framework selector works in mobile bottom bar', async ({ page }) => {
    // Click the framework selector in bottom bar
    await page.selectOption('.fixed.bottom-0 select', 'ice')

    // Should show ICE scoring on items
    await expect(page.locator('article').locator('label:has-text("Impact")').first()).toBeVisible()
  })
})
