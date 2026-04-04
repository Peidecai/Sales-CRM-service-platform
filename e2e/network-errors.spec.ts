import { test, expect } from '@playwright/test'
import { mockAllApis, injectAuthState, collectPageErrors, ADMIN_USER } from './helpers'

test.describe('S1 — Network Error Handling', () => {
  // S1.1: Offline — page shows network error toast, does not crash
  test('S1.1 should show network error and not crash when offline', async ({ page }) => {
    await injectAuthState(page, ADMIN_USER)
    // Abort all API requests to simulate offline
    await page.route('**/api/v1/**', async (route) => {
      await route.abort('connectionrefused')
    })
    const { errors, stop } = collectPageErrors(page)
    await page.goto('/')
    await page.waitForTimeout(3000)
    stop()
    // Page body should still render (no white screen)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(10)
    // No uncaught JS errors
    expect(errors).toHaveLength(0)
    // ElMessage toast should show network/error message
    const hasNetworkMsg = await page.locator('.el-message').count()
    expect(hasNetworkMsg).toBeGreaterThan(0)
  })

  // S1.2: Network recovery — after reconnection, page loads data
  test('S1.2 should recover after network is restored', async ({ page }) => {
    await injectAuthState(page, ADMIN_USER)
    // Simulate offline
    await page.route('**/api/v1/**', async (route) => {
      await route.abort('connectionrefused')
    })
    await page.goto('/')
    await page.waitForTimeout(2000)
    // Restore: remove offline route and set up proper mocks
    await page.unroute('**/api/v1/**')
    await mockAllApis(page, ADMIN_USER)
    // Navigate to customer list — should load data successfully
    await page.goto('/customer')
    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })
  })

  // S1.3: Timeout — request shows timeout error toast
  test('S1.3 should show timeout error for slow requests', async ({ page }) => {
    await injectAuthState(page, ADMIN_USER)
    await mockAllApis(page, ADMIN_USER)
    // Override customers endpoint to simulate timeout
    await page.route('**/api/v1/customers**', async (route) => {
      await route.abort('timedout')
    })
    await page.goto('/customer')
    await page.waitForTimeout(3000)
    // ElMessage toast should appear with error
    const hasErrorMsg = await page.locator('.el-message').count()
    expect(hasErrorMsg).toBeGreaterThan(0)
  })

  // S1.4: 502 Gateway Error — shows error toast, no JS crash
  test('S1.4 should show gateway error on 502 without crash', async ({ page }) => {
    await injectAuthState(page, ADMIN_USER)
    await mockAllApis(page, ADMIN_USER)
    // Override customers endpoint to return 502
    await page.route('**/api/v1/customers**', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ code: 50200, message: '网关错误，请稍后重试', data: null }),
      })
    })
    const { errors, stop } = collectPageErrors(page)
    await page.goto('/customer')
    await page.waitForTimeout(3000)
    stop()
    // No uncaught JS errors
    expect(errors).toHaveLength(0)
    // Page still rendered
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(10)
    // Error toast shown
    const hasErrorMsg = await page.locator('.el-message').count()
    expect(hasErrorMsg).toBeGreaterThan(0)
  })
})
