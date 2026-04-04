import { test, expect } from '@playwright/test'
import { injectAuthState, mockExpiredSession, ADMIN_USER } from './helpers'

test.describe('O2.1 — Server Token Revocation → Auto Logout', () => {
  test('should auto-logout when server revokes all tokens', async ({ page }) => {
    await injectAuthState(page, ADMIN_USER)
    await mockExpiredSession(page)
    await page.goto('/customer')
    // All APIs return 401 + refresh fails → auto-redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
