import { test, expect } from '@playwright/test'
import { mockAllApis, injectAuthState, ADMIN_USER, SALES_USER } from './helpers'

test.describe('Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    await injectAuthState(page, ADMIN_USER)
  })

  test('should display sidebar menu items', async ({ page }) => {
    await page.goto('/')

    const sidebar = page.locator('.sidebar-menu')
    await expect(page.getByText('CRM 销售系统')).toBeVisible()
    await expect(sidebar.getByText('工作台')).toBeVisible()
    await expect(sidebar.getByText('客户管理')).toBeVisible()
    await expect(sidebar.getByText('商机管理')).toBeVisible()
    await expect(sidebar.getByText('通话记录')).toBeVisible()
    await expect(sidebar.getByText('知识库')).toBeVisible()
  })

  test('should show admin-only menu items for admin user', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('审计日志')).toBeVisible()
    await expect(page.getByText('用户管理')).toBeVisible()
  })

  test('should hide admin-only menu items for sales user', async ({ page }) => {
    await mockAllApis(page, SALES_USER)
    await injectAuthState(page, SALES_USER)

    await page.goto('/')

    // Wait for page to load
    await expect(page.locator('.dashboard-title')).toHaveText('工作台')

    // Admin-only items should not be visible
    await expect(page.locator('.sidebar-menu').getByText('审计日志')).toBeHidden()
    await expect(page.locator('.sidebar-menu').getByText('用户管理')).toBeHidden()
  })

  test('should navigate to each section via sidebar', async ({ page }) => {
    await page.goto('/')

    // Customer — "客户管理" is a sub-menu; expand it then click "客户列表"
    await page.locator('.sidebar-menu').getByText('客户管理').click()
    await page.locator('.sidebar-menu').getByText('客户列表').click()
    await expect(page).toHaveURL('/customer')

    // Opportunity
    await page.locator('.sidebar-menu').getByText('商机管理').click()
    await expect(page).toHaveURL('/opportunity')

    // Call Record
    await page.locator('.sidebar-menu').getByText('通话记录').click()
    await expect(page).toHaveURL('/call-record')

    // Knowledge
    await page.locator('.sidebar-menu').getByText('知识库').click()
    await expect(page).toHaveURL('/knowledge')
  })

  test('should display breadcrumbs for each page', async ({ page }) => {
    await page.goto('/customer')

    // Breadcrumb should show: 首页 / 客户管理
    await expect(page.getByText('首页')).toBeVisible()
    await expect(page.locator('.header-breadcrumb').getByText('客户管理')).toBeVisible()
  })

  test('should update page title on navigation', async ({ page }) => {
    await page.goto('/customer')
    await expect(page).toHaveTitle(/客户管理/)

    await page.locator('.sidebar-menu').getByText('商机管理').click()
    await expect(page).toHaveTitle(/商机管理/)
  })

  test('should show user info in header', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('.user-name')).toHaveText('Admin User')
  })

  test('should toggle sidebar collapse', async ({ page }) => {
    await page.goto('/')

    const aside = page.locator('.layout-aside')
    // Initial width should be 220px
    await expect(aside).toHaveCSS('width', '220px')

    // Click fold/collapse button
    await page.locator('.header-left button').first().click()

    // Should collapse to 64px
    await expect(aside).toHaveCSS('width', '64px')
  })

  test('should display user dropdown menu', async ({ page }) => {
    await page.goto('/')

    // Click user info area to open dropdown
    await page.locator('.user-info').click()

    await expect(page.getByText('个人中心')).toBeVisible()
    await expect(page.getByText('退出登录')).toBeVisible()
  })

  test('should show 404 page for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page')

    await expect(page.getByText('404')).toBeVisible()
  })
})

test.describe('Route Guards', () => {
  test('should redirect to login with redirect query when accessing protected page', async ({ page }) => {
    await mockAllApis(page)

    await page.goto('/customer')

    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  test('should redirect sales user away from admin page', async ({ page }) => {
    await mockAllApis(page, SALES_USER)
    await injectAuthState(page, SALES_USER)

    await page.goto('/audit-log')

    // Should be redirected to dashboard (role guard)
    await expect(page).toHaveURL('/')
  })
})
