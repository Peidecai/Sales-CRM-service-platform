import { test, expect } from '@playwright/test'
import { mockAllApis, injectAuthState, ADMIN_USER } from './helpers'

test.describe('E3 - Business Error Codes', () => {
  // E3.1: code 40101 — invalid credentials on login
  test('E3.1 should display invalid credentials message for code 40101', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 40101, message: '用户名或密码错误', data: null }),
      })
    })
    await page.goto('/login')
    await page.getByPlaceholder('用户名 / 邮箱').fill('admin')
    await page.getByPlaceholder('密码').fill('wrongpass')
    await page.getByRole('button', { name: /登\s*录/ }).click()
    await expect(page.getByText('用户名或密码错误')).toBeVisible({ timeout: 5_000 })
  })

  // E3.2: code 40301 — permission denied on customer create
  test('E3.2 should display permission denied for code 40301', async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    // Override POST /customers to return 403
    await page.route('**/api/v1/customers', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ code: 40301, message: '没有权限执行此操作', data: null }),
        })
      } else {
        await route.fallback()
      }
    })
    await injectAuthState(page, ADMIN_USER)
    await page.goto('/customer')
    await page.waitForLoadState('networkidle')

    // Click "新建客户" button
    await page.getByRole('button', { name: '新建客户' }).click()
    const dialog = page.locator('.el-dialog:visible').first()
    await expect(dialog).toBeVisible()

    // Fill required fields using placeholder text
    await dialog.getByPlaceholder('请输入姓名').fill('Test')
    await dialog.getByPlaceholder('请输入公司').fill('Corp')
    await dialog.getByPlaceholder('请输入手机号').fill('13900130001')
    await dialog.getByPlaceholder('请输入邮箱').fill('t@t.com')

    // Submit
    await dialog.getByRole('button', { name: '创建' }).click()
    await expect(page.getByText(/没有权限|权限不足/)).toBeVisible({ timeout: 5_000 })
  })

  // E3.3: code 50001 — server error on customer list
  test('E3.3 should display server error for code 50001', async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    // Override GET /customers to return 500
    await page.route('**/api/v1/customers**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ code: 50001, message: '服务器内部错误，请稍后重试', data: null }),
        })
      } else {
        await route.fallback()
      }
    })
    await injectAuthState(page, ADMIN_USER)
    await page.goto('/customer')
    await expect(page.getByText(/服务器内部错误|服务器错误/).first()).toBeVisible({ timeout: 5_000 })
  })
})
