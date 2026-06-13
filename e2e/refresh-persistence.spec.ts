import { test, expect } from '@playwright/test'
import { mockAllApis, injectAuthState, ADMIN_USER, MOCK_CUSTOMERS } from './helpers'

test.describe('R1 — Page Refresh Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    await injectAuthState(page, ADMIN_USER)
  })

  // R1.1 — reload should not redirect to /login
  test('R1.1 should stay logged in after page reload', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await page.reload()
    await expect(page).toHaveURL('/')
    expect(page.url()).not.toContain('/login')
  })

  // R1.2 — localStorage persists userInfo and token after reload
  test('R1.2 should preserve userInfo and token in localStorage after reload', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await page.reload()

    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('crm-user') ?? 'null'),
    )

    expect(stored).not.toBeNull()
    expect(stored.userInfo.username).toBe('admin')
    expect(stored.token).toBeTruthy()
  })

  // R1.3 — navigating to a data page after reload still fetches data
  test('R1.3 should load customer data after reload on /customer', async ({ page }) => {
    await page.goto('/customer')
    await expect(page).toHaveURL('/customer')

    const customerRequest = page.waitForRequest((req) =>
      req.url().includes('/api/v1/customers') && req.method() === 'GET',
    )

    await page.reload()
    await customerRequest

    await expect(page.getByText('Alice Wang').first()).toBeVisible()
  })

  // R1.4 — no intermediate navigation to /login during reload
  test('R1.4 should not flash /login during reload', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')

    const urls: string[] = []
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        urls.push(frame.url())
      }
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    const hasLoginRedirect = urls.some((url) => url.includes('/login'))
    expect(hasLoginRedirect).toBe(false)
  })
})
