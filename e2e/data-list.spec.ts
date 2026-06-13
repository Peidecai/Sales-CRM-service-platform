import { test, expect } from '@playwright/test'
import { mockAllApis, mockEmptyList, injectAuthState, ADMIN_USER } from './helpers'

test.describe('D4 — Data List Page Rendering', () => {
  // D4.2: empty state when no data
  test('D4.2 should display empty state when no data', async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    await mockEmptyList(page, 'customers')
    await injectAuthState(page, ADMIN_USER)
    await page.goto('/customer')

    await expect(
      page.locator('.el-table__empty-text, .el-empty').first()
    ).toBeVisible({ timeout: 10_000 })

    const emptyText = await page
      .locator('.el-table__empty-text, .el-empty__description')
      .first()
      .innerText()
    expect(emptyText).toMatch(/暂无|没有|No data|no data/i)
  })

  // D4.4: search resets to page 1
  test('D4.4 should reset to page 1 on search', async ({ page }) => {
    let lastQueryParams = ''
    await mockAllApis(page, ADMIN_USER)

    // Override customers route to capture query params
    await page.route('**/api/v1/customers**', async (route) => {
      const url = new URL(route.request().url())
      lastQueryParams = url.search
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          message: 'success',
          data: { list: [], total: 0, page: 1, pageSize: 20 },
        }),
      })
    })

    await injectAuthState(page, ADMIN_USER)
    await page.goto('/customer')
    await page.waitForTimeout(2000)

    // Fill the keyword input and click search
    await page.locator('.search-form .el-input input').first().fill('test keyword')
    await page.locator('.search-form .el-button').first().click()
    // Wait for the 300ms debounce + network
    await page.waitForTimeout(1000)

    expect(lastQueryParams).toContain('keyword')
    expect(lastQueryParams).toMatch(/page=1|pageNum=1/)
  })
})
