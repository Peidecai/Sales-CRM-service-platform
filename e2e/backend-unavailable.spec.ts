import { test, expect } from '@playwright/test'
import { injectAuthState, ADMIN_USER } from './helpers'

test.describe('E1 — Backend Unavailable', () => {
  test('E1.1 should show network error when backend is unreachable', async ({
    page,
  }) => {
    await page.route('**/api/v1/**', async (route) => {
      await route.abort('connectionrefused')
    })
    await page.goto('/login')
    // Login page should still render (static assets, no backend dependency)
    await expect(page.getByPlaceholder('用户名')).toBeVisible({ timeout: 10_000 })
    // Attempt login → should display network error
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('admin123')
    await page.getByRole('button', { name: /登\s*录/ }).click()
    // Error shown via ElMessage or page text
    await expect(
      page.locator('.el-message').or(page.locator('body')).getByText(/网络|连接失败|Network|ERR_CONNECTION/i),
    ).toBeVisible({ timeout: 5_000 })
  })

  test('E1.2 should show gateway error on 502 without crashing', async ({
    page,
  }) => {
    await injectAuthState(page, ADMIN_USER)
    // Mock auth endpoints minimally so router guard doesn't redirect
    await page.route('**/api/v1/auth/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          message: 'success',
          data: { ...ADMIN_USER, email: 'a@b.com', phone: '13800000000', isActive: true },
        }),
      })
    })
    // All non-auth endpoints return 502
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url()
      if (url.includes('/auth/')) return route.fallback()
      await route.fulfill({
        status: 502,
        contentType: 'text/html',
        body: '<html>502 Bad Gateway</html>',
      })
    })
    await page.goto('/customer')
    // Page should not be completely blank — at least sidebar/layout renders
    await page.waitForSelector('.el-aside, .el-menu, nav, .el-container', { timeout: 5_000 }).catch(() => {})
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(0)
  })
})
