import { test, expect } from '@playwright/test'
import { mockAllApis, injectAuthState, ADMIN_USER } from './helpers'

test.describe('HTTP Error Code Handling', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    await injectAuthState(page, ADMIN_USER)
  })

  // E2.1: 400 — validation error message displayed
  test('E2.1 should display validation error on 400', async ({ page }) => {
    // Override POST /customers to return 400 with validationErrors
    await page.route('**/api/v1/customers', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 40000,
            message: '请求参数有误',
            validationErrors: [
              { constraints: { isNotEmpty: '客户名必填' } },
            ],
          }),
        })
      } else {
        await route.fallback()
      }
    })

    await page.goto('/customer')
    await page.waitForLoadState('networkidle')

    // Click create button to open dialog
    await page.getByRole('button', { name: '新建客户' }).first().click()
    const dialog = page.locator('.el-dialog:visible').first()
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Fill required field (name) to bypass client-side validation, then submit
    await dialog.locator('input').first().fill('Test Customer')
    await dialog.getByRole('button', { name: /确|提交|保存|创建/ }).click()

    // ElMessage should show the validation constraint text via alert role
    await expect(
      page.getByRole('alert').filter({ hasText: /客户名必填|参数有误/ }),
    ).toBeVisible({ timeout: 5_000 })
  })

  // E2.4: 404 — resource not found
  test('E2.4 should display not found error on 404', async ({ page }) => {
    await page.route('**/api/v1/customers/999', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 40400,
          message: '请求的资源不存在',
          data: null,
        }),
      })
    })

    await page.goto('/customer/999')
    await page.waitForTimeout(2_000)

    const errorVisible = await page
      .getByText(/资源不存在|not found|404/)
      .count()
    expect(errorVisible).toBeGreaterThan(0)
  })

  // E2.5: 429 — rate limit error
  test('E2.5 should display rate limit error on 429', async ({ page }) => {
    await page.route('**/api/v1/customers**', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 42900,
          message: '请求过于频繁，请稍后再试',
          data: null,
        }),
      })
    })

    await page.goto('/customer')
    await page.waitForTimeout(2_000)

    await expect(
      page.getByRole('alert').filter({ hasText: /频繁/ }),
    ).toBeVisible({ timeout: 5_000 })
  })

  // E2.6: 500 — server internal error
  test('E2.6 should display server error on 500', async ({ page }) => {
    await page.route('**/api/v1/customers**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 50000,
          message: '服务器内部错误，请稍后重试',
          data: null,
        }),
      })
    })

    await page.goto('/customer')
    await page.waitForTimeout(2_000)

    await expect(
      page.getByRole('alert').filter({ hasText: /服务器内部错误/ }).first(),
    ).toBeVisible({ timeout: 5_000 })
  })

  // E2.7: 502 — gateway error
  test('E2.7 should display gateway error on 502', async ({ page }) => {
    await page.route('**/api/v1/customers**', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 50200,
          message: '网关错误，请稍后重试',
          data: null,
        }),
      })
    })

    await page.goto('/customer')
    await page.waitForTimeout(2_000)

    await expect(
      page.getByRole('alert').filter({ hasText: /网关错误/ }),
    ).toBeVisible({ timeout: 5_000 })
  })
})
