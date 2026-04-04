import { test, expect } from '@playwright/test'
import { mockAllApis, loginAsAdmin, injectAuthState, ADMIN_USER, MOCK_TOKEN } from './helpers'

test.describe('X1 — Cross-Module Data Chain', () => {
  // X1.1: login후 all API requests carry Bearer token
  test('X1.1 should send Bearer token in all API requests after login', async ({ page }) => {
    const authHeaders: string[] = []
    await mockAllApis(page, ADMIN_USER)
    // capture Authorization header on all API requests
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/') && !req.url().includes('/auth/login')) {
        const auth = req.headers()['authorization']
        if (auth) authHeaders.push(auth)
      }
    })
    await loginAsAdmin(page)
    await expect(page).toHaveURL('/')
    await page.waitForTimeout(3000)
    // all captured requests should have Bearer token
    expect(authHeaders.length).toBeGreaterThan(0)
    for (const header of authHeaders) {
      expect(header).toMatch(/^Bearer /)
    }
  })

  // X1.3: customer list refreshes after creating a customer
  test('X1.3 should refresh customer list after creating a customer', async ({ page }) => {
    let getCustomersCount = 0
    await mockAllApis(page, ADMIN_USER)
    await page.route('**/api/v1/customers**', async (route) => {
      if (route.request().method() === 'GET') {
        getCustomersCount++
      }
      await route.fallback()
    })
    await injectAuthState(page, ADMIN_USER)
    await page.goto('/customer')
    await page.waitForTimeout(2000)
    const initialCount = getCustomersCount

    // open create dialog
    await page.locator('.toolbar-right .el-button').last().click()
    const dialog = page.locator('.el-dialog:visible').first()
    await expect(dialog).toBeVisible()
    const inputs = dialog.locator('input.el-input__inner')
    await inputs.nth(0).fill('New Customer')
    await inputs.nth(1).fill('New Corp')
    await inputs.nth(2).fill('13900130000')
    await inputs.nth(3).fill('new@example.com')
    await dialog.locator('.el-button--primary').last().click()
    await page.waitForTimeout(2000)

    // after creation, GET customers should be called again to refresh
    expect(getCustomersCount).toBeGreaterThan(initialCount)
  })
})
