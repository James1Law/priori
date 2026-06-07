import { test, expect } from '@playwright/test'

// Helper to dismiss the name prompt modal
async function dismissNameModal(page: import('@playwright/test').Page) {
  // Wait for and fill the name modal
  await page.fill('input[placeholder="Your name"]', 'Test User')
  await page.click('button:has-text("Join Session")')
}

// Helper to add an item via the desktop header button + ItemDrawer
async function addItem(page: import('@playwright/test').Page, title: string, description?: string) {
  await page.locator('[data-testid="header-add-item-btn"]').click()

  // Wait for the item drawer to open
  await expect(page.locator('[data-testid="item-drawer"]')).toBeVisible()

  // Fill in the form
  await page.fill('#drawer-title-input', title)
  if (description) {
    await page.fill('#drawer-description', description)
  }

  // Create the item
  await page.locator('[data-testid="item-drawer"]').locator('button:has-text("Create")').click()

  // Drawer closes once the item is created
  await expect(page.locator('[data-testid="item-drawer"]')).not.toBeVisible({ timeout: 5000 })

  // Wait for item to appear in the list
  await expect(page.locator(`text=${title}`).first()).toBeVisible()
}

test.describe('Session Creation and Basic Functionality', () => {
  test('creates a new session from landing page', async ({ page }) => {
    await page.goto('/')

    // Click create session button
    await page.click('button:has-text("Create New Session")')

    // Should redirect to session page
    await expect(page).toHaveURL(/\/s\/[a-z0-9]+/)

    // Dismiss name modal
    await dismissNameModal(page)

    // Should show session page elements
    await expect(page.locator('text=Untitled Session').first()).toBeVisible()
    // Should have the bottom bar with view toggle
    await expect(page.locator('.fixed.bottom-0 button:has-text("List")')).toBeVisible()
  })

  test('adds items to a session', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Add first item
    await addItem(page, 'First feature')
    await expect(page.locator('[data-testid="backlog-item-row"]')).toHaveCount(1)

    // Add second item
    await addItem(page, 'Second feature')
    await expect(page.locator('[data-testid="backlog-item-row"]')).toHaveCount(2)
  })

  test('opens item drawer when clicking an item', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Add an item
    await addItem(page, 'Test item')

    // Click on the item row (not checkbox) to open drawer
    await page.locator('[data-testid="backlog-item-row"]').first().click()

    // Should open the item drawer
    await expect(page.locator('[data-testid="item-drawer"]')).toBeVisible()
    await expect(page.locator('input[value="Test item"]')).toBeVisible()
  })

  test('edits session name', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Click on the session name to edit (use first() since it appears in both headers)
    await page.locator('text=Untitled Session').first().click()

    // Type new name
    await page.fill('input[placeholder="Session name"]', 'My Prioritisation Session')
    await page.click('button:has-text("Save")')

    // Should show new name (use first() since it appears in both headers)
    await expect(page.locator('text=My Prioritisation Session').first()).toBeVisible()
  })

  test('deletes an item via drawer', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Add an item
    await addItem(page, 'Item to delete')

    // Click on item to open drawer
    await page.locator('[data-testid="backlog-item-row"]').first().click()

    // Click delete button in the drawer
    await page.locator('[data-testid="item-drawer"]').locator('button:has-text("Delete")').click()

    // Wait for and confirm deletion in the modal
    await expect(page.locator('role=dialog')).toBeVisible()
    await page.locator('role=dialog').locator('button:has-text("Delete")').click()

    // Item should be gone
    await expect(page.locator('text=Item to delete')).not.toBeVisible()
  })

  test('copies session URL', async ({ page, context }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    // Open kebab menu and click Copy URL
    await page.locator('button[aria-label="Open menu"]').click()
    await page.getByRole('menuitem', { name: 'Copy URL' }).click()

    // Should show confirmation modal
    await expect(page.locator('text=URL Copied')).toBeVisible()
  })
})
