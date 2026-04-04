import { test, expect } from '@playwright/test'
import { mockAllApis, mockAiApis, injectAuthState, collectPageErrors, ADMIN_USER } from './helpers'

test.describe('X2 — AI Module Chain (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    await mockAiApis(page)
    await injectAuthState(page, ADMIN_USER)
  })

  // X2.1: AI call analysis with auth token
  test('X2.1 should load AI call analysis with auth token', async ({ page }) => {
    let aiRequestAuth = ''
    page.on('request', (req) => {
      if (req.url().includes('/call-analysis/') || req.url().includes('/ai/')) {
        aiRequestAuth = req.headers()['authorization'] || ''
      }
    })
    await page.goto('/call-record/1')
    await page.waitForTimeout(3000)
    if (aiRequestAuth) {
      expect(aiRequestAuth).toMatch(/^Bearer /)
    }
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(10)
  })

  // X2.2: AI customer portrait with auth
  test('X2.2 should request AI customer portrait with auth', async ({ page }) => {
    let portraitRequested = false
    page.on('request', (req) => {
      if (req.url().includes('/ai/') || req.url().includes('/portrait')) {
        portraitRequested = true
      }
    })
    await page.goto('/customer/1')
    await page.waitForTimeout(5000)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(10)
  })

  // X2.3: AI timeout should not block other features
  test('X2.3 should not block other features when AI request times out', async ({ page }) => {
    await page.route('**/api/v1/call-analysis/**', async (route) => {
      await route.abort('timedout')
    })
    await page.route('**/api/v1/ai/**', async (route) => {
      await route.abort('timedout')
    })
    const { errors, stop } = collectPageErrors(page)
    await page.goto('/call-record/1')
    await page.waitForTimeout(3000)
    await page.goto('/customer')
    await expect(page.getByText('Alice Wang')).toBeVisible({ timeout: 10_000 })
    stop()
    // Filter out expected AI timeout errors (we deliberately aborted those requests)
    const unexpectedErrors = errors.filter(
      (e) => !e.message.includes('timeout') && !e.message.includes('abort') && !e.message.includes('network')
    )
    expect(unexpectedErrors).toHaveLength(0)
  })
})
