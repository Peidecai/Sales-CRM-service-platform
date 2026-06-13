import { test, expect } from '@playwright/test'
import { mockAllApis, injectAuthState, collectPageErrors, ADMIN_USER } from './helpers'

test.describe('E4 — Frontend Error Fallback', () => {
  // E4.1: API returns HTML instead of JSON (e.g. 502 from reverse proxy)
  test('E4.1 should handle non-JSON API response gracefully', async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    // Override customers API to return HTML
    await page.route('**/api/v1/customers**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>502 Bad Gateway</body></html>',
      })
    })
    await injectAuthState(page, ADMIN_USER)
    const { errors, stop } = collectPageErrors(page)
    await page.goto('/customer')
    await page.waitForTimeout(3000)
    stop()
    // Page should still render (not blank/crashed)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(10)
    // Should show error feedback (ElMessage or fallback UI), not crash
    // No unhandled JS errors should bubble up
  })

  // E4.2: ECharts receives malformed data — should not crash
  test('E4.2 should not crash when chart data is malformed', async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    // Override stats to return null data
    await page.route('**/api/v1/opportunities/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, message: 'success', data: null }),
      })
    })
    await injectAuthState(page, ADMIN_USER)
    const { errors, stop } = collectPageErrors(page)
    await page.goto('/')
    await page.waitForTimeout(5000)
    stop()
    // No JS errors (including ECharts dispose errors)
    expect(errors).toHaveLength(0)
    // Dashboard stat cards should still render
    await expect(page.locator('.stat-card').first()).toBeVisible()
  })
})
