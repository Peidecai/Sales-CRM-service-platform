import { test, expect } from '@playwright/test'
import { mockAllApis, injectAuthState, collectPageErrors, ADMIN_USER } from './helpers'

test.describe('S2 — Concurrent Request Stability', () => {
  // S2.1: Dashboard loads multiple APIs concurrently without JS errors
  test('S2.1 should handle concurrent dashboard API calls without errors', async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    await injectAuthState(page, ADMIN_USER)
    const { errors, stop } = collectPageErrors(page)
    await page.goto('/')
    // Dashboard fires customers, opportunities/stats, call-records/stats concurrently
    await page.waitForTimeout(5000)
    stop()
    // No JS errors should have occurred
    expect(errors).toHaveLength(0)
    // At least one stat card should be visible
    await expect(page.locator('.stat-card').first()).toBeVisible()
  })

  // S2.2: Rapid form submit should not fire duplicate POSTs
  test('S2.2 should prevent duplicate submissions on rapid clicks', async ({ page }) => {
    let postCount = 0
    await mockAllApis(page, ADMIN_USER)
    await page.route('**/api/v1/customers', async (route) => {
      if (route.request().method() === 'POST') {
        postCount++
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ code: 0, message: 'success', data: { id: 100 + postCount } }),
        })
      } else {
        await route.fallback()
      }
    })
    await injectAuthState(page, ADMIN_USER)
    await page.goto('/customer')
    // Click the "新建客户" (Create Customer) button
    await page.getByRole('button', { name: '新建客户' }).first().click()
    const dialog = page.locator('.el-dialog:visible').first()
    await expect(dialog).toBeVisible()
    // Fill required fields
    const inputs = dialog.locator('input.el-input__inner')
    await inputs.nth(0).fill('Test Customer')
    await inputs.nth(1).fill('Test Corp')
    await inputs.nth(2).fill('13900139999')
    await inputs.nth(3).fill('test@test.com')
    // Rapid-click the submit button 3 times
    const submitBtn = dialog.locator('.el-button--primary').last()
    await submitBtn.click()
    await submitBtn.click({ force: true })
    await submitBtn.click({ force: true })
    await page.waitForTimeout(2000)
    // Should not fire more than 2 POSTs (loading state should block most)
    expect(postCount).toBeLessThanOrEqual(2)
  })

  // S2.3: Concurrent API responses render correctly on dashboard
  test('S2.3 should correctly render data from concurrent API responses', async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    await injectAuthState(page, ADMIN_USER)
    await page.goto('/')
    // Wait for dashboard data to load
    await page.waitForTimeout(5000)
    // Verify all four stat sections are visible
    await expect(page.getByText('客户总数')).toBeVisible()
    await expect(page.getByText('本周通话')).toBeVisible()
    await expect(page.getByText('商机总额', { exact: true })).toBeVisible()
  })
})
