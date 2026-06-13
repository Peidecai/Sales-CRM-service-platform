import { test, expect } from '@playwright/test'
import { mockAllApis, injectAuthState, ADMIN_USER } from './helpers'

test.describe('Customer Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    await injectAuthState(page, ADMIN_USER)
  })

  test('should display customer list table', async ({ page }) => {
    await page.goto('/customer')

    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Bob Li')).toBeVisible()
    await expect(page.getByText('Carol Zhang')).toBeVisible()

    const headerCount = await page.locator('thead th').count()
    expect(headerCount).toBeGreaterThanOrEqual(8)
  })

  test('should have search form with keyword and status filter', async ({ page }) => {
    await page.goto('/customer')

    await expect(page.locator('.search-form .el-input').first()).toBeVisible()
    await expect(page.locator('.search-form .el-select').first()).toBeVisible()
    await expect(page.locator('.search-form .el-button')).toHaveCount(2)
  })

  test('should show admin toolbar buttons (export, import, create)', async ({ page }) => {
    await page.goto('/customer')

    await expect(page.locator('.toolbar-right .el-button')).toHaveCount(3)
  })

  test('should open create customer dialog', async ({ page }) => {
    await page.goto('/customer')

    await page.locator('.toolbar-right .el-button').last().click()
    const dialog = page.locator('.el-dialog:visible').first()

    await expect(dialog).toBeVisible()
    await expect(dialog.locator('input.el-input__inner').nth(0)).toBeVisible()
    await expect(dialog.locator('input.el-input__inner').nth(1)).toBeVisible()
    await expect(dialog.locator('input.el-input__inner').nth(2)).toBeVisible()
    await expect(dialog.locator('input.el-input__inner').nth(3)).toBeVisible()
  })

  test('should create a new customer', async ({ page }) => {
    await page.goto('/customer')

    await page.locator('.toolbar-right .el-button').last().click()
    const dialog = page.locator('.el-dialog:visible').first()
    await expect(dialog).toBeVisible()

    const inputs = dialog.locator('input.el-input__inner')
    await inputs.nth(0).fill('New Customer')
    await inputs.nth(1).fill('New Corp')
    await inputs.nth(2).fill('13900139001')
    await inputs.nth(3).fill('new@corp.com')

    await dialog.locator('.el-dialog__footer .el-button--primary').click()

    await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })
  })

  test('should validate required name field in create dialog', async ({ page }) => {
    await page.goto('/customer')

    await page.locator('.toolbar-right .el-button').last().click()
    const dialog = page.locator('.el-dialog:visible').first()
    await expect(dialog).toBeVisible()

    await dialog.locator('.el-dialog__footer .el-button--primary').click()

    await expect(dialog.locator('.el-form-item__error').first()).toBeVisible()
  })

  test('should navigate to customer detail page', async ({ page }) => {
    await page.goto('/customer')

    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Alice Wang' }).first().click()

    await expect(page).toHaveURL(/\/customer\/\d+$/, { timeout: 10_000 })
  })

  test('should open edit dialog with pre-filled data', async ({ page }) => {
    await page.goto('/customer')

    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })

    const actionCell = page.locator('.el-table__body tbody tr').first().locator('td').last()
    await actionCell.locator('.el-button').nth(1).click()

    const dialog = page.locator('.el-dialog:visible').first()
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('input.el-input__inner').nth(0)).toHaveValue('Alice Wang')
  })

  test('should show pagination when data exists', async ({ page }) => {
    await page.goto('/customer')

    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.pagination-wrap')).toBeVisible()
  })

  test('should display status tags correctly', async ({ page }) => {
    await page.goto('/customer')

    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.el-tag').first()).toBeVisible()
  })

  test('should show delete button for admin users', async ({ page }) => {
    await page.goto('/customer')

    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.el-button--danger.is-link').first()).toBeVisible()
  })
})
