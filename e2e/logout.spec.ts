import { test, expect } from '@playwright/test'
import { mockAllApis, loginAsAdmin, injectAuthState, ADMIN_USER } from './helpers'

test.describe('O1 — Active Logout', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
  })

  // O1.1 — click logout should send POST /auth/logout
  test('O1.1 should send POST /auth/v1/auth/logout on logout click', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL('/')

    // Capture the logout request
    const logoutPromise = page.waitForRequest(
      (req) => req.url().includes('/api/v1/auth/logout') && req.method() === 'POST',
    )

    // Open user dropdown and click logout
    await page.locator('.el-dropdown').last().click()
    await page.getByText('退出登录').click()

    // Confirm the dialog
    await page.getByRole('button', { name: '确定' }).click()

    const req = await logoutPromise
    expect(req.method()).toBe('POST')
  })

  // O1.2 — localStorage crm-user should be cleared after logout
  test('O1.2 should clear localStorage crm-user after logout', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL('/')

    // Verify token exists before logout
    const stateBefore = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('crm-user') ?? '{}'),
    )
    expect(stateBefore.token).toBeTruthy()
    expect(stateBefore.userInfo).toBeTruthy()

    // Perform logout
    await page.locator('.el-dropdown').last().click()
    await page.getByText('退出登录').click()
    await page.getByRole('button', { name: '确定' }).click()

    // Wait for navigation to login
    await expect(page).toHaveURL(/\/login/)

    // Verify state is cleared
    const stateAfter = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('crm-user') ?? '{}'),
    )
    expect(stateAfter.token).toBeNull()
    expect(stateAfter.refreshToken).toBeNull()
    expect(stateAfter.userInfo).toBeNull()
  })

  // O1.3 — should redirect to /login after logout
  test('O1.3 should redirect to /login after logout', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL('/')

    await page.locator('.el-dropdown').last().click()
    await page.getByText('退出登录').click()
    await page.getByRole('button', { name: '确定' }).click()

    await expect(page).toHaveURL(/\/login/)
  })

  // O1.4 — accessing protected page after logout should redirect to /login?redirect=
  test('O1.4 should redirect to /login?redirect= when accessing protected page after logout', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL('/')

    // Logout
    await page.locator('.el-dropdown').last().click()
    await page.getByText('退出登录').click()
    await page.getByRole('button', { name: '确定' }).click()
    await expect(page).toHaveURL(/\/login/)

    // Try to access a protected page
    await page.goto('/customer')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  // O1.5 — mock API returning 401 should show error toast (not during intentional logout)
  test('O1.5 should show error toast when API returns 401 unexpectedly', async ({ page }) => {
    // Inject auth state to skip login UI
    await injectAuthState(page, ADMIN_USER)

    // Override customer list to return 401 and refresh to also fail
    await page.route('**/api/v1/auth/refresh', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 40101, message: '刷新令牌已过期', data: null }),
      })
    })

    let customerCallCount = 0
    await page.route('**/api/v1/customers**', async (route) => {
      customerCallCount++
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 40100, message: '未授权', data: null }),
      })
    })

    // Navigate to customer page which triggers the 401
    await page.goto('/customer')

    // Should show error message toast
    await expect(page.locator('.el-message--error').first()).toBeVisible({ timeout: 10_000 })

    // Should eventually redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
