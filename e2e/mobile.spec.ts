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
    // Should show mobile bottom bar with List and Roadmap buttons
    await expect(page.locator('.fixed.bottom-0 button:has-text("List")')).toBeVisible()
    await expect(page.locator('.fixed.bottom-0 button:has-text("Roadmap")')).toBeVisible()
  })

  test('switches views using mobile toggle', async ({ page }) => {
    // Click roadmap in mobile bar
    await page.locator('.fixed.bottom-0 button:has-text("Roadmap")').click()

    // Should show roadmap view (periods or empty state)
    // The view is shown but might have different content
    await expect(page.locator('.fixed.bottom-0 button:has-text("Roadmap")')).toHaveClass(/bg-indigo-600/)

    // Switch back to list
    await page.locator('.fixed.bottom-0 button:has-text("List")').click()
    await expect(page.locator('.fixed.bottom-0 button:has-text("List")')).toHaveClass(/bg-indigo-600/)
  })

  test('add cutoff button visible on mobile without hover', async ({ page }) => {
    // Add cutoff buttons should be visible (no hover needed on mobile)
    const addButtons = page.locator('button[aria-label="Add cutoff line here"]')
    await expect(addButtons.first()).toBeVisible()
  })

  test('remove cutoff button visible on mobile without hover', async ({ page }) => {
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

  test('FAB is visible on all views', async ({ page }) => {
    // FAB should be visible on list view (default)
    await expect(page.locator('button[aria-label="Add item"]')).toBeVisible()

    // Switch to roadmap
    await page.locator('.fixed.bottom-0 button:has-text("Roadmap")').click()
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

  test('can open filter bottom sheet on mobile', async ({ page }) => {
    // The Filters button opens a bottom sheet with filter options
    const filtersButton = page.locator('button:has-text("Filters")')
    await expect(filtersButton).toBeVisible()
    await filtersButton.click()

    // Should show filter options in bottom sheet
    await expect(page.locator('.fixed.bottom-0 >> text=Status')).toBeVisible()
  })

  test('can change item status on mobile', async ({ page }) => {
    // Status badge should be visible (use first() for mobile version)
    const statusBadge = page.locator('article button:has-text("To Do")').first()
    await expect(statusBadge).toBeVisible()

    // Click to cycle status
    await statusBadge.click()
    await expect(page.locator('article button:has-text("In Progress")').first()).toBeVisible()
  })
})
