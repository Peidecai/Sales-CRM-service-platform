import { test, expect } from '@playwright/test'
import {
  mockAllApis,
  ADMIN_USER,
  MOCK_TOKEN,
  MOCK_REFRESH_TOKEN,
} from './helpers'

test.describe('L1 — Login Data Chain Verification', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
  })

  test('L1.1 should send POST /auth/login with username and password', async ({ page }) => {
    let loginBody: Record<string, unknown> | null = null
    await page.route('**/api/v1/auth/login', async (route) => {
      loginBody = route.request().postDataJSON()
      await route.fallback()
    })

    await page.goto('/login')
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('admin123')
    await page.getByRole('button', { name: /登\s*录/ }).click()
    await page.waitForURL('/', { timeout: 10_000 })

    expect(loginBody).toBeTruthy()
    expect(loginBody!.username).toBe('admin')
    expect(loginBody!.password).toBe('admin123')
  })

  test('L1.2 should receive accessToken, refreshToken and user in login response', async ({ page }) => {
    // Capture the response body from the page context
    const responsePromise = page.waitForResponse('**/api/v1/auth/login')

    await page.goto('/login')
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('admin123')
    await page.getByRole('button', { name: /登\s*录/ }).click()

    const response = await responsePromise
    const body = await response.json()
    await page.waitForURL('/', { timeout: 10_000 })

    expect(body.code).toBe(0)
    expect(body.data.accessToken).toBe(MOCK_TOKEN)
    expect(body.data.refreshToken).toBe(MOCK_REFRESH_TOKEN)
    expect(body.data.user).toMatchObject({ id: ADMIN_USER.id, username: ADMIN_USER.username })
  })

  test('L1.3 should persist token and userInfo in localStorage', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('admin123')
    await page.getByRole('button', { name: /登\s*录/ }).click()
    await page.waitForURL('/', { timeout: 10_000 })

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('crm-user')
      return raw ? JSON.parse(raw) : null
    })

    expect(stored).toBeTruthy()
    expect(stored.token).toBe(MOCK_TOKEN)
    expect(stored.refreshToken).toBe(MOCK_REFRESH_TOKEN)
    expect(stored.userInfo).toMatchObject({
      id: ADMIN_USER.id,
      username: ADMIN_USER.username,
      name: ADMIN_USER.name,
    })
  })

  test('L1.4 should send Authorization Bearer token on subsequent API requests', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('admin123')

    // Collect authorization headers from requests after login
    const authHeaders: { url: string; authorization: string | null }[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/api/v1/') && !url.includes('/auth/login')) {
        const headers = request.headers()
        authHeaders.push({ url, authorization: headers['authorization'] ?? null })
      }
    })

    await page.getByRole('button', { name: /登\s*录/ }).click()
    await page.waitForURL('/', { timeout: 10_000 })

    // Wait for dashboard API calls to fire
    await page.waitForTimeout(1000)

    // Find requests with authorization headers
    const authedRequests = authHeaders.filter((r) => r.authorization)

    expect(authedRequests.length).toBeGreaterThan(0)
    for (const req of authedRequests) {
      expect(req.authorization).toBe(`Bearer ${MOCK_TOKEN}`)
    }
  })

  test('L1.5 should redirect to target URL after login with redirect param', async ({ page }) => {
    await page.goto('/login?redirect=/opportunity')
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('admin123')
    await page.getByRole('button', { name: /登\s*录/ }).click()

    await page.waitForURL('**/opportunity', { timeout: 10_000 })
    expect(page.url()).toContain('/opportunity')
  })

  test('L1.6 should display user name in layout after login', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('用户名').fill('admin')
    await page.getByPlaceholder('密码').fill('admin123')
    await page.getByRole('button', { name: /登\s*录/ }).click()
    await page.waitForURL('/', { timeout: 10_000 })

    await expect(page.locator('.user-name')).toContainText('Admin User')
  })
})
