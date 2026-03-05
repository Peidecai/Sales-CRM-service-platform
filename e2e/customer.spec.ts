import { test, expect } from '@playwright/test'
import { mockAllApis, injectAuthState, ADMIN_USER, MOCK_CUSTOMERS } from './helpers'

test.describe('Customer Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    await injectAuthState(page, ADMIN_USER)
  })

  test('should display customer list table', async ({ page }) => {
    await page.goto('/customer')

    // Wait for table to load
    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Bob Li')).toBeVisible()
    await expect(page.getByText('Carol Zhang')).toBeVisible()

    // Check table has correct column headers
    const thead = page.locator('thead')
    await expect(thead.getByText('姓名')).toBeVisible()
    await expect(thead.getByText('公司')).toBeVisible()
    await expect(thead.getByText('手机')).toBeVisible()
    await expect(thead.getByText('状态')).toBeVisible()
  })

  test('should have search form with keyword and status filter', async ({ page }) => {
    await page.goto('/customer')

    await expect(page.getByPlaceholder('姓名/公司/手机/邮箱')).toBeVisible()
    await expect(page.getByText('搜索')).toBeVisible()
    await expect(page.getByText('重置')).toBeVisible()
  })

  test('should show admin toolbar buttons (export, import, create)', async ({ page }) => {
    await page.goto('/customer')

    await expect(page.getByText('导出')).toBeVisible()
    await expect(page.getByText('导入')).toBeVisible()
    await expect(page.locator('.toolbar-right').getByText('新建客户')).toBeVisible()
  })

  test('should open create customer dialog', async ({ page }) => {
    await page.goto('/customer')

    await page.locator('.toolbar-right').getByText('新建客户').click()

    // Dialog should be visible
    const dialog = page.locator('.el-dialog')
    await expect(dialog.getByText('新建客户')).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: '姓名' })).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: '公司' })).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: '手机' })).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: '邮箱' })).toBeVisible()
  })

  test('should create a new customer', async ({ page }) => {
    await page.goto('/customer')

    // Open create dialog
    await page.locator('.toolbar-right').getByText('新建客户').click()

    // Fill form using dialog-scoped selectors
    const dialog = page.locator('.el-dialog')
    await dialog.getByRole('textbox', { name: '姓名' }).fill('New Customer')
    await dialog.getByRole('textbox', { name: '公司' }).fill('New Corp')
    await dialog.getByRole('textbox', { name: '手机' }).fill('13900139001')
    await dialog.getByRole('textbox', { name: '邮箱' }).fill('new@corp.com')

    // Submit
    await page.getByRole('button', { name: '创建', exact: true }).click()

    // Wait for success message
    await expect(page.getByText('客户创建成功')).toBeVisible({ timeout: 5000 })
  })

  test('should validate required name field in create dialog', async ({ page }) => {
    await page.goto('/customer')

    await page.locator('.toolbar-right').getByText('新建客户').click()

    // Try submitting empty form
    await page.getByRole('button', { name: '创建', exact: true }).click()

    // Validation message
    await expect(page.getByText('请输入客户姓名')).toBeVisible()
  })

  test('should navigate to customer detail page', async ({ page }) => {
    await page.goto('/customer')

    // Wait for table data
    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })

    // Click on customer name link
    await page.getByRole('button', { name: 'Alice Wang' }).click()

    // Should navigate to detail page
    await expect(page).toHaveURL('/customer/1')
  })

  test('should open edit dialog with pre-filled data', async ({ page }) => {
    await page.goto('/customer')

    // Wait for table
    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })

    // Click edit button on first row
    await page.getByRole('button', { name: '编辑' }).first().click()

    // Dialog should show "编辑客户"
    const dialog = page.locator('.el-dialog')
    await expect(dialog.getByText('编辑客户')).toBeVisible()
    // Form should be pre-filled
    await expect(dialog.getByRole('textbox', { name: '姓名' })).toHaveValue('Alice Wang')
  })

  test('should show pagination when data exists', async ({ page }) => {
    await page.goto('/customer')

    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })

    // Pagination should show total
    await expect(page.locator('.pagination-wrap')).toBeVisible()
  })

  test('should display status tags correctly', async ({ page }) => {
    await page.goto('/customer')

    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })

    // Should show status tags (Chinese labels)
    await expect(page.getByText('潜在客户').first()).toBeVisible()
  })

  test('should show delete button for admin users', async ({ page }) => {
    await page.goto('/customer')

    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })

    // Delete button should be visible for admin
    await expect(page.getByRole('button', { name: '删除' }).first()).toBeVisible()
  })
})
