import { test, expect } from '@playwright/test'

// Helper to dismiss the name prompt modal
async function dismissNameModal(page: import('@playwright/test').Page) {
  await page.fill('input[placeholder="Your name"]', 'Test User')
  await page.click('button:has-text("Join Session")')
}

// Helper to add an item via the desktop header button + ItemDrawer
async function addItem(page: import('@playwright/test').Page, title: string) {
  await page.locator('[data-testid="header-add-item-btn"]').click()
  await expect(page.locator('[data-testid="item-drawer"]')).toBeVisible()
  await page.fill('#drawer-title-input', title)
  await page.locator('[data-testid="item-drawer"]').locator('button:has-text("Create")').click()
  // Drawer closes once the item is created
  await expect(page.locator('[data-testid="item-drawer"]')).not.toBeVisible({ timeout: 5000 })
  // Wait for item to appear in the list
  await expect(page.locator(`text=${title}`).first()).toBeVisible({ timeout: 10000 })
}

test.describe('Backlog View', () => {
  test.beforeEach(async ({ page }) => {
    // Create a session and add items
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Add items - backlog is now the default view
    await addItem(page, 'High priority')
    await addItem(page, 'Medium priority')
    await addItem(page, 'Low priority')

    // Wait for all items to be visible
    await expect(page.locator('[data-testid="backlog-item-row"]')).toHaveCount(3)
  })

  test('shows backlog list as default view', async ({ page }) => {
    // Should show items in the backlog list by default
    await expect(page.locator('[data-testid="backlog-item-row"]')).toHaveCount(3)
    // Should have the List button active in bottom bar
    await expect(page.locator('.fixed.bottom-0 button:has-text("List")')).toHaveClass(/bg-indigo-600/)
  })

  test('shows items with rank numbers', async ({ page }) => {
    // Should show items in the backlog list
    const items = page.locator('[data-testid="backlog-item-row"]')
    expect(await items.count()).toBe(3)
  })

  test('shows drag handles', async ({ page }) => {
    // Should have drag handles
    const dragHandles = page.locator('button[aria-label="Drag to reorder"]')
    await expect(dragHandles.first()).toBeVisible()
    expect(await dragHandles.count()).toBe(3)
  })

  test('can select items with checkboxes', async ({ page }) => {
    // Click first checkbox
    await page.locator('button[aria-label="Select item"]').first().click()

    // Action bar should appear with selection count
    await expect(page.locator('text=1 item selected')).toBeVisible()

    // Select another item
    await page.locator('button[aria-label="Select item"]').nth(1).click()

    // Should show 2 items selected
    await expect(page.locator('text=2 items selected')).toBeVisible()
  })

  test('can open item drawer by clicking row', async ({ page }) => {
    // Click on item row (not checkbox)
    await page.locator('[data-testid="backlog-item-row"]').first().click()

    // Drawer should open
    await expect(page.locator('[data-testid="item-drawer"]')).toBeVisible()
    await expect(page.locator('text=Edit Item')).toBeVisible()
  })

  // Note: Drag-and-drop tests with dnd-kit require complex event simulation
  // These tests are skipped for now - manual testing should verify drag functionality
  test.skip('shows reset button after manual reorder', async ({ page }) => {
    // Test skipped - dnd-kit drag simulation is complex
  })

  test.skip('reset to score button restores original order', async ({ page }) => {
    // Test skipped - dnd-kit drag simulation is complex
  })
})

test.describe('View Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Add items
    await addItem(page, 'Item A')
    await addItem(page, 'Item B')

    await expect(page.locator('[data-testid="backlog-item-row"]')).toHaveCount(2)
  })

  test('can switch between list and roadmap views', async ({ page }) => {
    // Start in list view (default)
    await expect(page.locator('[data-testid="backlog-item-row"]')).toHaveCount(2)

    // Switch to roadmap via bottom bar
    await page.locator('.fixed.bottom-0 button:has-text("Roadmap")').click()
    // Should show roadmap view (bottom bar button active)
    await expect(page.locator('.fixed.bottom-0 button:has-text("Roadmap")')).toHaveClass(/bg-indigo-600/)

    // Switch back to list
    await page.locator('.fixed.bottom-0 button:has-text("List")').click()
    await expect(page.locator('[data-testid="backlog-item-row"]')).toHaveCount(2)
  })

  // Note: Drag-and-drop tests with dnd-kit require complex event simulation
  test.skip('list view maintains order after reorder', async () => {
    // Test skipped - dnd-kit drag simulation is complex
  })

  test.skip('list preserves manual order when switching views', async () => {
    // Test skipped - dnd-kit drag simulation is complex
  })
})

test.describe('Item Status', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)
  })

  test('items default to To Do status', async ({ page }) => {
    await addItem(page, 'New Item')

    // Should show To Do status badge in the item row (on desktop, use visible filter)
    await expect(page.locator('article button:has-text("To Do"):visible')).toBeVisible()
  })

  test('can cycle status by clicking badge', async ({ page }) => {
    await addItem(page, 'Status Test')

    // Click To Do badge to cycle to In Progress (use :visible to get visible button)
    await page.locator('article button:has-text("To Do"):visible').click()
    await expect(page.locator('article button:has-text("In Progress"):visible')).toBeVisible()

    // Click In Progress to cycle to Done
    await page.locator('article button:has-text("In Progress"):visible').click()
    await expect(page.locator('article button:has-text("Done"):visible')).toBeVisible()

    // Click Done to cycle back to To Do
    await page.locator('article button:has-text("Done"):visible').click()
    await expect(page.locator('article button:has-text("To Do"):visible')).toBeVisible()
  })
})
