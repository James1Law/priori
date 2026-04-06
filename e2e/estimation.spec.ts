import { test, expect, type Page, type BrowserContext } from '@playwright/test'

// Helper to dismiss the name prompt modal
async function enterName(page: Page, name: string) {
  await page.fill('input[placeholder="Your name"]', name)
  await page.click('button:has-text("Join Session")')
}

// Helper to add an item via the header button + drawer
async function addItemViaDrawer(page: Page, title: string) {
  await page.locator('[data-testid="header-add-item-btn"]').click()

  // Wait for the item drawer to appear
  await expect(page.locator('[data-testid="item-drawer"]')).toBeVisible()

  // Fill in the title
  const titleInput = page.locator('[data-testid="item-drawer"] input').first()
  await titleInput.fill(title)

  // Save the new item
  await page.locator('[data-testid="item-drawer"]').locator('button:has-text("Create")').click()

  // Drawer should close or show the created item
  await expect(page.locator('[data-testid="item-drawer"]')).not.toBeVisible({ timeout: 5000 })
}

// Helper to create a fresh session and return the slug
async function createSession(page: Page, hostName: string): Promise<string> {
  await page.goto('/')
  await page.click('button:has-text("Create New Session")')
  await expect(page).toHaveURL(/\/s\/[a-z0-9]+/)
  await enterName(page, hostName)

  const url = page.url()
  const match = url.match(/\/s\/([a-z0-9]+)/)
  return match![1]
}

test.describe('Poker Planner Flow', () => {
  test('host can navigate to poker planner via sidebar and see lobby', async ({ page }) => {
    const slug = await createSession(page, 'Host')

    // Add items from backlog
    await addItemViaDrawer(page, 'Feature Alpha')
    await addItemViaDrawer(page, 'Feature Beta')

    // Navigate to poker planner via sidebar
    await page.locator('[data-testid="sidebar-nav-estimate"]').click()
    await expect(page).toHaveURL(`/s/${slug}/estimate`)

    // Should see the lobby (no active session yet)
    await expect(page.locator('text=Poker Planner')).toBeVisible()
    await expect(page.locator('text=Select items to estimate')).toBeVisible()

    // Should see both items in the lobby
    await expect(page.locator('text=Feature Alpha')).toBeVisible()
    await expect(page.locator('text=Feature Beta')).toBeVisible()
  })

  test('host selects items in lobby and starts as host', async ({ page }) => {
    const slug = await createSession(page, 'Host')

    await addItemViaDrawer(page, 'Story One')
    await addItemViaDrawer(page, 'Story Two')

    // Navigate to poker planner
    await page.locator('[data-testid="sidebar-nav-estimate"]').click()
    await expect(page).toHaveURL(`/s/${slug}/estimate`)

    // Wait for items to load in lobby, then select
    await expect(page.locator('text=Story One')).toBeVisible({ timeout: 10000 })
    await page.locator('text=Story One').click()
    await page.locator('text=Story Two').click()

    // Start as host
    await page.locator('button:has-text("Start as Host")').click()

    // Should see the estimation queue
    await expect(page.locator('text=Estimation Queue')).toBeVisible()
    await expect(page.locator('text=Story One')).toBeVisible()
    await expect(page.locator('text=Story Two')).toBeVisible()

    // Should show Start Estimation button
    await expect(page.locator('button:has-text("Start Estimation")')).toBeVisible()
  })

  test('host starts estimation: two-step item selection', async ({ page }) => {
    const slug = await createSession(page, 'Host')
    await addItemViaDrawer(page, 'Item to estimate')

    // Navigate and start as host
    await page.locator('[data-testid="sidebar-nav-estimate"]').click()
    await page.locator('text=Item to estimate').click()
    await page.locator('button:has-text("Start as Host")').click()

    // Wait for estimation queue to load, then click Start Estimation
    await expect(page.locator('button:has-text("Start Estimation")')).toBeVisible({ timeout: 5000 })
    await page.locator('button:has-text("Start Estimation")').click()

    // Should see the estimation cards and "Now estimating" badge
    await expect(page.locator('text=Now estimating')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Select your estimate')).toBeVisible()
  })

  test('share button copies current page URL including /estimate path', async ({ page, context }) => {
    const slug = await createSession(page, 'Host')
    await addItemViaDrawer(page, 'Test item')

    // Navigate to poker planner and start
    await page.locator('[data-testid="sidebar-nav-estimate"]').click()
    await page.locator('text=Test item').click()
    await page.locator('button:has-text("Start as Host")').click()

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    // Click share button
    await page.locator('[data-testid="header-copy-url-btn"]').click()
    await expect(page.locator('text=Copied!')).toBeVisible()

    // Read clipboard and verify it contains /estimate
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toContain(`/s/${slug}/estimate`)
  })

  test('host can vote on an item', async ({ page }) => {
    const slug = await createSession(page, 'Host')
    await addItemViaDrawer(page, 'Voteable item')

    await page.locator('[data-testid="sidebar-nav-estimate"]').click()
    await page.locator('text=Voteable item').click()
    await page.locator('button:has-text("Start as Host")').click()
    await page.locator('button:has-text("Start Estimation")').click()

    // Wait for cards to appear
    await expect(page.locator('text=Select your estimate')).toBeVisible()

    // Click the "5" estimation card (inside the card grid, not any sidebar element)
    const cardGrid = page.locator('text=Select your estimate').locator('..')
    await cardGrid.locator('button', { hasText: /^5$/ }).click()

    // Should show the selection confirmation
    await expect(page.locator('text=You selected 5 story points')).toBeVisible()
  })

  test('two participants: full estimation round', async ({ page, browser }) => {
    // ── Host creates session and adds items ──
    const slug = await createSession(page, 'Alice')
    await addItemViaDrawer(page, 'User authentication')

    // Navigate to poker planner and start as host
    await page.locator('[data-testid="sidebar-nav-estimate"]').click()
    await page.locator('text=User authentication').click()
    await page.locator('button:has-text("Start as Host")').click()

    // Start estimation
    await page.locator('button:has-text("Start Estimation")').click()
    await expect(page.locator('text=Now estimating')).toBeVisible()

    // ── Participant joins via URL ──
    const participantContext = await browser.newContext()
    const participantPage = await participantContext.newPage()
    await participantPage.goto(`http://localhost:5173/s/${slug}/estimate`)
    await enterName(participantPage, 'Bob')

    // Participant should see the active estimation (not the lobby)
    await expect(participantPage.locator('text=Estimation Queue')).toBeVisible({ timeout: 10000 })
    await expect(participantPage.getByRole('heading', { name: 'User authentication' })).toBeVisible()
    await expect(participantPage.locator('text=Now estimating')).toBeVisible()
    await expect(participantPage.locator('text=Select your estimate')).toBeVisible()

    // ── Both vote ──
    // Host votes 5 (use card grid to target the right button)
    const hostCards = page.locator('text=Select your estimate').locator('..')
    await hostCards.locator('button', { hasText: /^5$/ }).click()
    await expect(page.locator('text=You selected 5 story points')).toBeVisible()

    // Participant votes 8
    const participantCards = participantPage.locator('text=Select your estimate').locator('..')
    await participantCards.locator('button', { hasText: /^8$/ }).click()
    await expect(participantPage.locator('text=You selected 8 story points')).toBeVisible()

    // Wait for the Reveal Votes button to become enabled (meaning host can see enough votes)
    // Presence sync timing varies, so we wait for the button to be actionable
    await expect(page.locator('button:has-text("Reveal Votes"):not([disabled])')).toBeVisible({ timeout: 20000 })

    // ── Host reveals votes ──
    await page.locator('button:has-text("Reveal Votes")').click()

    // ── Host accepts estimate ──
    await expect(page.locator('button:has-text("Accept")')).toBeVisible({ timeout: 10000 })

    // Host accepts
    await page.locator('button:has-text("Accept")').click()

    // Should show estimation complete (only 1 item)
    await expect(page.locator('text=Estimation Complete')).toBeVisible({ timeout: 10000 })

    // Clean up
    await participantContext.close()
  })

  test('participant joining mid-session sees current state', async ({ page, browser }) => {
    // Host creates session, adds item, starts estimation, and votes
    const slug = await createSession(page, 'Host')
    await addItemViaDrawer(page, 'Already in progress')

    await page.locator('[data-testid="sidebar-nav-estimate"]').click()
    await page.locator('text=Already in progress').click()
    await page.locator('button:has-text("Start as Host")').click()
    await page.locator('button:has-text("Start Estimation")').click()

    // Host votes
    const hostCards = page.locator('text=Select your estimate').locator('..')
    await hostCards.locator('button', { hasText: /^3$/ }).click()
    await expect(page.locator('text=You selected 3 story points')).toBeVisible()

    // NOW participant joins — should see the active session immediately
    const ctx = await browser.newContext()
    const p2 = await ctx.newPage()
    await p2.goto(`http://localhost:5173/s/${slug}/estimate`)
    await enterName(p2, 'Late Joiner')

    // Should see estimation in progress, not the lobby
    await expect(p2.locator('text=Now estimating')).toBeVisible({ timeout: 10000 })
    await expect(p2.getByRole('heading', { name: 'Already in progress' })).toBeVisible()
    await expect(p2.locator('text=Select your estimate')).toBeVisible()

    await ctx.close()
  })

  test('queue item click highlights but does not start estimation', async ({ page }) => {
    const slug = await createSession(page, 'Host')
    await addItemViaDrawer(page, 'Item A')
    await addItemViaDrawer(page, 'Item B')

    await page.locator('[data-testid="sidebar-nav-estimate"]').click()

    // Select all and start as host
    await page.locator('text=Select all').click()
    await page.locator('button:has-text("Start as Host")').click()

    // Click Item A in queue — should highlight, NOT start estimation
    await page.locator('[role="button"]').filter({ hasText: 'Item A' }).click()

    // Should see "Estimate This" button (two-step confirmation)
    await expect(page.locator('button:has-text("Estimate This")')).toBeVisible()

    // Should NOT see "Now estimating" yet
    await expect(page.locator('text=Now estimating')).not.toBeVisible()

    // Confirm to start estimation
    await page.locator('button:has-text("Estimate This")').click()
    await expect(page.locator('text=Now estimating')).toBeVisible()
  })
})
