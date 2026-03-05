import { test, expect } from '@playwright/test'
import { mockAllApis, loginAsAdmin } from './helpers'

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page)
  })

  test('should show login page with title and demo hint', async ({ page }) => {
    await page.goto('/login')

    await expect(page.locator('.login-title')).toHaveText('AI 智能 CRM')
    await expect(page.locator('.login-subtitle')).toHaveText('销售管理系统')
    await expect(page.locator('.login-hint')).toContainText('admin / admin123')
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login')

    // Click login without filling fields
    await page.getByRole('button', { name: /登\s*录/ }).click()

    // Validation messages should appear
    await expect(page.getByText('请输入用户名')).toBeVisible()
    await expect(page.getByText('请输入密码')).toBeVisible()
  })

  test('should validate minimum password length', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('123')
    await page.getByPlaceholder('密码').blur()

    await expect(page.getByText('密码至少 6 位')).toBeVisible()
  })

  test('should login successfully and redirect to dashboard', async ({ page }) => {
    await loginAsAdmin(page)

    // Should be on dashboard
    await expect(page).toHaveURL('/')
    await expect(page).toHaveTitle(/工作台/)
  })

  test('should show dashboard content after login', async ({ page }) => {
    await loginAsAdmin(page)

    // Dashboard title
    await expect(page.locator('.dashboard-title')).toHaveText('工作台')
    // Welcome message with user name
    await expect(page.locator('.dashboard-subtitle')).toContainText('Admin User')
  })

  test('should redirect to login when accessing protected page unauthenticated', async ({ page }) => {
    await page.goto('/customer')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect logged-in user from login to dashboard', async ({ page }) => {
    // First login
    await loginAsAdmin(page)
    await expect(page).toHaveURL('/')

    // Navigate to login should redirect back to dashboard
    await page.goto('/login')
    await expect(page).toHaveURL('/')
  })
})
