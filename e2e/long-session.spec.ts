import { test, expect } from '@playwright/test'
import { mockAllApis, injectAuthState, simulateTokenExpireOnNthRequest, collectPageErrors, ADMIN_USER } from './helpers'

test.describe('S3 — Long Session Stability', () => {
  // S3.1: Token silent refresh during long session
  test('S3.1 should silently refresh token during long session', async ({ page }) => {
    await injectAuthState(page, ADMIN_USER)
    await mockAllApis(page, ADMIN_USER)
    // On the 4th API request, return 401 to trigger token refresh
    await simulateTokenExpireOnNthRequest(page, 4, ADMIN_USER)

    await page.goto('/')
    await page.waitForTimeout(3000)
    // Navigate to another page after token refresh
    await page.goto('/customer')
    await page.waitForTimeout(2000)
    // Should NOT be redirected to /login
    expect(page.url()).not.toContain('/login')
  })

  // S3.2: No JS errors after 20 page navigations
  test('S3.2 should not produce JS errors after 20 page navigations', async ({ page }) => {
    await mockAllApis(page, ADMIN_USER)
    await injectAuthState(page, ADMIN_USER)
    const { errors, stop } = collectPageErrors(page)

    const routes = ['/', '/customer', '/opportunity', '/call-record', '/knowledge']
    // 4 rounds x 5 routes = 20 navigations
    for (let round = 0; round < 4; round++) {
      for (const route of routes) {
        await page.goto(route)
        await page.waitForTimeout(500)
      }
    }
    stop()

    // No JS errors should have occurred
    expect(errors).toHaveLength(0)
    // Page should still have meaningful content
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(10)
  })

  // S3.3: WebSocket auto-reconnect (requires real backend)
  test.skip('S3.3 WebSocket auto-reconnect requires real backend', async ({ page }) => {
    // This test requires a real WebSocket server to properly test disconnect/reconnect.
    // Semi-auto steps:
    // 1. Start real backend: pnpm dev:server
    // 2. Login as admin
    // 3. Kill Redis/backend briefly — verify notification socket reconnects
    // 4. Verify notifications still arrive after reconnect
    //
    // For CI: mock socket.io handshake and verify reconnect attempt
    // await page.route('**/socket.io/**', ...)
  })
})
