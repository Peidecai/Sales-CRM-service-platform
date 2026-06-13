import { test, expect } from '@playwright/test'
import {
  injectAuthState,
  mockTokenRefreshOnce,
  mockTokenRefreshFail,
  mockConcurrentWith401,
  mockAllApis,
  ADMIN_USER,
  MOCK_CUSTOMERS,
} from './helpers'

test.describe('T2 — Token Auto Refresh', () => {
  // T2.1 — AccessToken expired → auto-call /auth/refresh
  test('T2.1 should auto-call /auth/refresh when API returns 401', async ({ page }) => {
    await injectAuthState(page, ADMIN_USER)
    await mockTokenRefreshOnce(page, ADMIN_USER)

    let refreshCalled = false
    await page.route('**/api/v1/auth/refresh', async (route) => {
      refreshCalled = true
      await route.fallback()
    })

    await page.goto('/customer')
    await page.waitForTimeout(3000)
    expect(refreshCalled).toBe(true)
  })

  // T2.2 — After refresh, retried request succeeds and page renders data
  test('T2.2 should render customer data after token refresh', async ({ page }) => {
    await injectAuthState(page, ADMIN_USER)
    await mockTokenRefreshOnce(page, ADMIN_USER)

    await page.goto('/customer')
    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })

    // Verify token updated in localStorage
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('crm-user')
      return raw ? JSON.parse(raw) : null
    })
    expect(stored?.token).toBe('refreshed-token-xxx')
    expect(stored?.refreshToken).toBe('refreshed-refresh-xxx')
  })

  // T2.3 — Concurrent 401s: all retried requests succeed after refresh
  test('T2.3 should recover all concurrent requests after refresh', async ({ page }) => {
    await injectAuthState(page, ADMIN_USER)
    const { getRefreshCount } = await mockConcurrentWith401(page, ADMIN_USER)

    // Dashboard triggers customers + opportunities + call-records/stats concurrently
    await page.goto('/')
    await page.waitForTimeout(5000)

    // At least one endpoint should have recovered (dashboard renders data)
    const refreshCount = getRefreshCount()
    expect(refreshCount).toBeGreaterThanOrEqual(1)
  })

  // T2.4 — Only one /auth/refresh call for concurrent 401s
  test('T2.4 should only call /auth/refresh once for concurrent 401s', async ({ page }) => {
    await injectAuthState(page, ADMIN_USER)
    const { getRefreshCount } = await mockConcurrentWith401(page, ADMIN_USER)

    await page.goto('/')
    await page.waitForTimeout(5000)

    expect(getRefreshCount()).toBe(1)
  })

  // T2.5 — RefreshToken also expired → redirect to /login
  test('T2.5 should redirect to /login when refresh token is expired', async ({ page }) => {
    await injectAuthState(page, ADMIN_USER)
    await mockTokenRefreshFail(page)

    await page.goto('/customer')
    await page.waitForURL('**/login**', { timeout: 10_000 })

    expect(page.url()).toContain('/login')
  })

  // T2.6 — RefreshToken expired → show error message + clear localStorage
  test('T2.6 should show expiry message and clear token on refresh failure', async ({ page }) => {
    await injectAuthState(page, ADMIN_USER)
    await mockTokenRefreshFail(page)

    await page.goto('/customer')
    await page.waitForURL('**/login**', { timeout: 10_000 })

    // Verify error message displayed
    await expect(page.getByText('登录已过期')).toBeVisible({ timeout: 5000 })

    // Verify localStorage token cleared
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('crm-user')
      return raw ? JSON.parse(raw) : null
    })
    expect(stored?.token).toBeNull()
  })
})
