import { test, expect } from '@playwright/test'

// Helper to dismiss the name prompt modal
async function dismissNameModal(page: import('@playwright/test').Page) {
  // Wait for and fill the name modal
  await page.fill('input[placeholder="Your name"]', 'Test User')
  await page.click('button:has-text("Join Session")')
}

// Helper to add an item via the slide-in panel (desktop)
async function addItem(page: import('@playwright/test').Page, title: string, description?: string) {
  // Click "Add Item" button in the ViewTabs
  await page.click('[data-testid="add-item-button"]')

  // Wait for panel to open
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

// Helper to change framework via ViewTabs dropdown (desktop)
async function changeFramework(page: import('@playwright/test').Page, framework: string) {
  await page.selectOption('[data-testid="framework-selector"]', framework)
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

    // Should show session page elements (use first() since it appears in both desktop and mobile headers)
    await expect(page.locator('text=Untitled Session').first()).toBeVisible()
    await expect(page.locator('text=Items (0)')).toBeVisible()
  })

  test('adds items to a session', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Add first item
    await addItem(page, 'First feature')
    await expect(page.locator('text=Items (1)')).toBeVisible()

    // Add second item
    await addItem(page, 'Second feature')
    await expect(page.locator('text=Items (2)')).toBeVisible()
  })

  test('scores items using ICE framework', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Change to ICE framework
    await changeFramework(page, 'ice')

    // Add an item
    await addItem(page, 'Test item')

    // Should show ICE scoring sliders inside the article (not the select option)
    await expect(page.locator('article').locator('label:has-text("Impact")')).toBeVisible()
    await expect(page.locator('article').locator('label:has-text("Confidence")')).toBeVisible()
    await expect(page.locator('article').locator('label:has-text("Ease")')).toBeVisible()
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

  test('deletes an item', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Add an item
    await addItem(page, 'Item to delete')

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
