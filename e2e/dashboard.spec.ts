import { test, expect } from '@playwright/test'
import { mockAllApis, injectAuthState, ADMIN_USER } from './helpers'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    await injectAuthState(page, ADMIN_USER)
  })

  test('should display stats cards', async ({ page }) => {
    await page.goto('/')

    // Wait for stats to load
    await expect(page.locator('.stat-card')).toHaveCount(4)

    // Customer total
    await expect(page.locator('.stat-card-customer .stat-label')).toHaveText('客户总数')
    // Week call count
    await expect(page.locator('.stat-card-call .stat-label')).toHaveText('本周通话')
    // Opportunity amount
    await expect(page.locator('.stat-card-amount .stat-label')).toHaveText('商机总额')
    // Opportunity count
    await expect(page.locator('.stat-card-opp .stat-label')).toHaveText('商机总数')
  })

  test('should display chart sections', async ({ page }) => {
    await page.goto('/')

    // Chart headers
    await expect(page.getByText('商机管道漏斗')).toBeVisible()
    await expect(page.getByText('客户状态分布')).toBeVisible()
    await expect(page.getByText('商机阶段金额分布')).toBeVisible()
  })

  test('should display recent records sections', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('最近客户')).toBeVisible()
    await expect(page.getByText('最近商机')).toBeVisible()
    await expect(page.getByText('最近通话')).toBeVisible()
  })

  test('should display quick action buttons', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('新建客户')).toBeVisible()
    await expect(page.getByText('新建商机')).toBeVisible()
    await expect(page.getByText('记录通话')).toBeVisible()
    await expect(page.getByText('知识库问答')).toBeVisible()
  })

  test('should show recent customer data from API', async ({ page }) => {
    await page.goto('/')

    // Wait for recent customers section to load - data appears in the "最近客户" card
    const recentCard = page.locator('.recent-card').first()
    await expect(recentCard.getByText('Alice Wang')).toBeVisible({ timeout: 15_000 })
    await expect(recentCard.getByText('Bob Li')).toBeVisible()
  })

  test('should navigate to customer page via quick action', async ({ page }) => {
    await page.goto('/')

    // Click the quick action button for customers
    await page.locator('.quick-actions').getByText('新建客户').click()
    await expect(page).toHaveURL('/customer')
  })

  test('should navigate to customer page via stats card click', async ({ page }) => {
    await page.goto('/')

    await page.locator('.stat-card-customer').click()
    await expect(page).toHaveURL('/customer')
  })
})
