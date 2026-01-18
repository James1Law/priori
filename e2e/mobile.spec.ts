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

// Helper to add an item via the FAB + BottomSheet (mobile)
async function addItemMobile(page: import('@playwright/test').Page, title: string, description?: string) {
  // Click the FAB (floating action button)
  await page.locator('button[aria-label="Add item"]').click()

  // Wait for bottom sheet to open
  await expect(page.locator('input[placeholder="Item title (required)"]')).toBeVisible()

  // Fill in the form
  await page.fill('input[placeholder="Item title (required)"]', title)
  if (description) {
    await page.fill('textarea[placeholder="Description (optional)"]', description)
  }

  // Submit using the specific form submit button
  await page.click('[data-testid="submit-item-button"]')

  // Wait for item to appear in the list
  await expect(page.locator(`text=${title}`)).toBeVisible()
}

// Helper to change framework via MobileMenu (kebab menu)
async function changeFrameworkMobile(page: import('@playwright/test').Page, frameworkLabel: string) {
  // Open kebab menu
  await page.locator('button[aria-label="Open menu"]').click()

  // Click framework option in menu (use getByRole to be specific)
  await page.getByRole('menuitem', { name: frameworkLabel, exact: true }).click()
}

test.describe('Mobile Experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Add items using mobile FAB + BottomSheet
    await addItemMobile(page, 'Mobile item 1')
    await addItemMobile(page, 'Mobile item 2')
    await addItemMobile(page, 'Mobile item 3')
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

  test('framework selector works in mobile menu', async ({ page }) => {
    // Change to ICE framework via mobile menu
    await changeFrameworkMobile(page, 'ICE')

    // Should show ICE scoring on items
    await expect(page.locator('article').locator('label:has-text("Impact")').first()).toBeVisible()
  })

  test('FAB is visible on all views', async ({ page }) => {
    // FAB should be visible on scoring view
    await expect(page.locator('button[aria-label="Add item"]')).toBeVisible()

    // Switch to backlog
    await page.locator('.fixed.bottom-0 button:has-text("Backlog")').click()
    await expect(page.locator('button[aria-label="Add item"]')).toBeVisible()

    // Switch to estimates
    await page.locator('.fixed.bottom-0 button:has-text("Estimates")').click()
    await expect(page.locator('button[aria-label="Add item"]')).toBeVisible()
  })

  test('can add item with description on mobile', async ({ page }) => {
    // Add item with description
    await addItemMobile(page, 'Feature with description', 'This is a detailed description')

    // Item should appear
    await expect(page.locator('text=Feature with description')).toBeVisible()
  })

  test('mobile menu has all session actions', async ({ page }) => {
    // Open kebab menu
    await page.locator('button[aria-label="Open menu"]').click()

    // Should show all session actions as menu items
    await expect(page.getByRole('menuitem', { name: 'Copy URL' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Export CSV' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Clear Items' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'New Session' })).toBeVisible()
  })

  test('framework badge shows current framework on scoring view', async ({ page }) => {
    // Mobile framework badge is below header and shows current framework
    // The badge is a button that opens the mobile menu
    const frameworkBadge = page.locator('button:has-text("RICE")').filter({ has: page.locator('svg') })
    await expect(frameworkBadge.first()).toBeVisible()

    // Change to ICE via mobile menu
    await changeFrameworkMobile(page, 'ICE')

    // Badge should update to show ICE
    const iceBadge = page.locator('button:has-text("ICE")').filter({ has: page.locator('svg') })
    await expect(iceBadge.first()).toBeVisible()
  })
})
