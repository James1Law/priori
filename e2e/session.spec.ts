import { test, expect } from '@playwright/test'

// Helper to dismiss the name prompt modal
async function dismissNameModal(page: import('@playwright/test').Page) {
  // Wait for and fill the name modal
  await page.fill('input[placeholder="Your name"]', 'Test User')
  await page.click('button:has-text("Join Session")')
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
    await expect(page.locator('text=Untitled Session')).toBeVisible()
    await expect(page.locator('text=Items (0)')).toBeVisible()
  })

  test('adds items to a session', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Add first item
    await page.fill('input[placeholder="Item title (required)"]', 'First feature')
    await page.click('button:has-text("Add Item")')

    // Item should appear
    await expect(page.locator('text=First feature')).toBeVisible()
    await expect(page.locator('text=Items (1)')).toBeVisible()

    // Add second item
    await page.fill('input[placeholder="Item title (required)"]', 'Second feature')
    await page.click('button:has-text("Add Item")')

    await expect(page.locator('text=Second feature')).toBeVisible()
    await expect(page.locator('text=Items (2)')).toBeVisible()
  })

  test('scores items using ICE framework', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Change to ICE framework
    await page.selectOption('select', 'ice')

    // Add an item
    await page.fill('input[placeholder="Item title (required)"]', 'Test item')
    await page.click('button:has-text("Add Item")')

    // Wait for item to appear
    await expect(page.locator('text=Test item')).toBeVisible()

    // Should show ICE scoring sliders inside the article (not the select option)
    await expect(page.locator('article').locator('label:has-text("Impact")')).toBeVisible()
    await expect(page.locator('article').locator('label:has-text("Confidence")')).toBeVisible()
    await expect(page.locator('article').locator('label:has-text("Ease")')).toBeVisible()
  })

  test('edits session name', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Click on the session name to edit
    await page.click('text=Untitled Session')

    // Type new name
    await page.fill('input[placeholder="Session name"]', 'My Prioritisation Session')
    await page.click('button:has-text("Save")')

    // Should show new name
    await expect(page.locator('text=My Prioritisation Session')).toBeVisible()
  })

  test('deletes an item', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Add an item
    await page.fill('input[placeholder="Item title (required)"]', 'Item to delete')
    await page.click('button:has-text("Add Item")')

    await expect(page.locator('text=Item to delete')).toBeVisible()

    // Click delete button on the item card (desktop text button)
    await page.locator('article').locator('button:has-text("Delete")').click()

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

    // Click copy URL button
    await page.click('button:has-text("Copy")')

    // Should show confirmation modal
    await expect(page.locator('text=URL Copied')).toBeVisible()
  })
})
