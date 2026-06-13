import { test, expect } from '@playwright/test'
import { mockAllApis, injectAuthState, ADMIN_USER } from './helpers'

test.describe('Opportunity Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    await injectAuthState(page, ADMIN_USER)
  })

  test('should display opportunity list', async ({ page }) => {
    await page.goto('/opportunity')

    await expect(page.getByText('ERP System Upgrade')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Cloud Migration')).toBeVisible()
  })

  test('should show stage tags', async ({ page }) => {
    await page.goto('/opportunity')

    await expect(page.getByText('ERP System Upgrade')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.el-table .el-tag').first()).toBeVisible()
  })

  test('should navigate to opportunity detail', async ({ page }) => {
    await page.goto('/opportunity')

    await expect(page.getByText('ERP System Upgrade')).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'ERP System Upgrade' }).click()

    await expect(page).toHaveURL('/opportunity/1')
  })

  test('should keep app title and route', async ({ page }) => {
    await page.goto('/opportunity')

    await expect(page).toHaveTitle(/CRM/)
    await expect(page).toHaveURL('/opportunity')
  })
})

test.describe('Call Record', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    await injectAuthState(page, ADMIN_USER)
  })

  test('should display call record list', async ({ page }) => {
    await page.goto('/call-record')

    await expect(page.getByText('Discussed ERP requirements')).toBeVisible({ timeout: 10_000 })
  })

  test('should keep app title and route', async ({ page }) => {
    await page.goto('/call-record')

    await expect(page).toHaveTitle(/CRM/)
    await expect(page).toHaveURL('/call-record')
  })
})

test.describe('Knowledge Base', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    await injectAuthState(page, ADMIN_USER)
  })

  test('should display knowledge article list', async ({ page }) => {
    await page.goto('/knowledge')

    await expect(page.getByText('Sales Best Practices')).toBeVisible({ timeout: 10_000 })
  })

  test('should navigate to article detail', async ({ page }) => {
    await page.goto('/knowledge')

    await expect(page.getByText('Sales Best Practices')).toBeVisible({ timeout: 10_000 })
    await page.getByText('Sales Best Practices').click()

    await expect(page).toHaveURL('/knowledge/1')
  })

  test('should keep app title and route', async ({ page }) => {
    await page.goto('/knowledge')

    await expect(page).toHaveTitle(/CRM/)
    await expect(page).toHaveURL('/knowledge')
  })
})
