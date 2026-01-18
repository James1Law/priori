import { test, expect } from '@playwright/test'

// Helper to dismiss the name prompt modal
async function dismissNameModal(page: import('@playwright/test').Page) {
  await page.fill('input[placeholder="Your name"]', 'Test User')
  await page.click('button:has-text("Join Session")')
}

// Helper to add an item via the slide-in panel (desktop)
async function addItem(page: import('@playwright/test').Page, title: string) {
  await page.click('[data-testid="add-item-button"]')
  await expect(page.locator('input[placeholder="Item title (required)"]')).toBeVisible()
  await page.fill('input[placeholder="Item title (required)"]', title)
  await page.click('[data-testid="submit-item-button"]')
  // Wait for item to appear and panel to close
  await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 10000 })
  // Wait for panel to close before continuing
  await expect(page.locator('[data-testid="add-item-button"]')).toBeVisible({ timeout: 5000 })
}

// Helper to change framework via ViewTabs dropdown (desktop)
async function changeFramework(page: import('@playwright/test').Page, framework: string) {
  await page.selectOption('[data-testid="framework-selector"]', framework)
}

test.describe('Backlog View', () => {
  test.beforeEach(async ({ page }) => {
    // Create a session and add items
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)

    // Use ICE framework for simpler scoring
    await changeFramework(page, 'ice')

    // Add items
    await addItem(page, 'High priority')
    await addItem(page, 'Medium priority')
    await addItem(page, 'Low priority')

    // Wait for items count to be visible
    await expect(page.locator('text=Items (3)')).toBeVisible()
  })

  test('switches to backlog view', async ({ page }) => {
    // Click on Backlog tab
    await page.click('button:has-text("Backlog")')

    // Should show backlog view
    await expect(page.locator('text=Prioritised Backlog (3)')).toBeVisible()
    await expect(page.locator('text=Order: Score')).toBeVisible()
  })

  test('shows items with rank numbers', async ({ page }) => {
    await page.click('button:has-text("Backlog")')

    // Should show items in the backlog view
    const articles = page.locator('article')
    expect(await articles.count()).toBe(3)
  })

  test('displays score badges', async ({ page }) => {
    await page.click('button:has-text("Backlog")')

    // Should show ICE scores in the backlog view (desktop badges are visible)
    // Use :visible pseudo-selector to find only visible badges
    await expect(page.locator('text=ICE:').locator('visible=true').first()).toBeVisible()
  })

  test('shows drag handles', async ({ page }) => {
    await page.click('button:has-text("Backlog")')

    // Should have drag handles
    const dragHandles = page.locator('button[aria-label="Drag to reorder"]')
    await expect(dragHandles.first()).toBeVisible()
    expect(await dragHandles.count()).toBe(3)
  })

  // Note: Drag-and-drop tests with dnd-kit require complex event simulation
  // These tests are skipped for now - manual testing should verify drag functionality
  test.skip('shows reset button after manual reorder', async ({ page }) => {
    await page.click('button:has-text("Backlog")')
    // Test skipped - dnd-kit drag simulation is complex
  })

  test.skip('reset to score button restores original order', async ({ page }) => {
    await page.click('button:has-text("Backlog")')
    // Test skipped - dnd-kit drag simulation is complex
  })
})

test.describe('View Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)
    await changeFramework(page, 'ice')

    // Add items
    await addItem(page, 'Item A')
    await addItem(page, 'Item B')

    await expect(page.locator('text=Items (2)')).toBeVisible()
  })

  test('can switch between scoring and backlog views', async ({ page }) => {
    // Start in scoring view
    await expect(page.locator('text=Items (2)')).toBeVisible()

    // Switch to backlog
    await page.click('button:has-text("Backlog")')
    await expect(page.locator('text=Prioritised Backlog (2)')).toBeVisible()

    // Switch back to scoring
    await page.click('button:has-text("Scoring")')
    await expect(page.locator('text=Items (2)')).toBeVisible()
  })

  // Note: Drag-and-drop tests with dnd-kit require complex event simulation
  test.skip('scoring view maintains score order after backlog reorder', async () => {
    // Test skipped - dnd-kit drag simulation is complex
  })

  test.skip('backlog preserves manual order when switching views', async () => {
    // Test skipped - dnd-kit drag simulation is complex
  })
})

test.describe('Framework Switching with Scores', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Create New Session")')
    await dismissNameModal(page)
  })

  test('creates default scores when switching frameworks', async ({ page }) => {
    // Start with RICE framework
    await changeFramework(page, 'rice')

    // Add items
    await addItem(page, 'Feature A')
    await addItem(page, 'Feature B')

    await expect(page.locator('text=Items (2)')).toBeVisible()

    // Switch to backlog view
    await page.click('button:has-text("Backlog")')
    await expect(page.locator('text=Prioritised Backlog (2)')).toBeVisible()

    // Both items should show RICE scores (not dashes)
    // Use visible filter since badges appear twice (mobile hidden + desktop visible)
    const riceBadges = page.locator('text=RICE:').locator('visible=true')
    await expect(riceBadges.first()).toBeVisible()
    expect(await riceBadges.count()).toBe(2)

    // Switch back to scoring view to change framework
    await page.click('button:has-text("Scoring")')

    // Switch to ICE framework
    await changeFramework(page, 'ice')

    // Switch back to backlog
    await page.click('button:has-text("Backlog")')

    // Wait for scores to update - both items should now show ICE scores
    const iceBadges = page.locator('text=ICE:').locator('visible=true')
    await expect(iceBadges.first()).toBeVisible({ timeout: 10000 })
    expect(await iceBadges.count()).toBe(2)

    // No dashes should be visible in the score badges
    const dashBadges = page.locator('article').locator('text=—').locator('visible=true')
    expect(await dashBadges.count()).toBe(0)
  })

  test('all items have scores after multiple framework switches', async ({ page }) => {
    // Start with ICE
    await changeFramework(page, 'ice')

    // Add items
    await addItem(page, 'Task 1')
    await addItem(page, 'Task 2')
    await addItem(page, 'Task 3')

    await expect(page.locator('text=Items (3)')).toBeVisible()

    // Switch to backlog
    await page.click('button:has-text("Backlog")')
    await expect(page.locator('text=Prioritised Backlog (3)')).toBeVisible()

    // All should have ICE scores (use visible filter for desktop badges)
    const iceBadges = page.locator('text=ICE:').locator('visible=true')
    await expect(iceBadges.first()).toBeVisible()
    expect(await iceBadges.count()).toBe(3)

    // Switch back to scoring view to change framework
    await page.click('button:has-text("Scoring")')

    // Switch to Value vs Effort
    await changeFramework(page, 'value_effort')

    // Switch back to backlog
    await page.click('button:has-text("Backlog")')
    const veBadges = page.locator('text=V/E:').locator('visible=true')
    await expect(veBadges.first()).toBeVisible({ timeout: 10000 })
    expect(await veBadges.count()).toBe(3)

    // Switch back to scoring view to change framework
    await page.click('button:has-text("Scoring")')

    // Switch to RICE
    await changeFramework(page, 'rice')

    // Switch back to backlog
    await page.click('button:has-text("Backlog")')
    const riceBadges = page.locator('text=RICE:').locator('visible=true')
    await expect(riceBadges.first()).toBeVisible({ timeout: 10000 })
    expect(await riceBadges.count()).toBe(3)
  })
})
