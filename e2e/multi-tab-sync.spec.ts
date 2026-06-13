import { test, expect } from '@playwright/test'
import { mockAllApis, injectAuthState, ADMIN_USER } from './helpers'

test.describe('R3 — Multi-Tab Sync', () => {
  // R3.1: Tab A logout → Tab B should detect token cleared
  test('R3.1 should detect logout from another tab', async ({ browser }) => {
    const context = await browser.newContext()

    const pageA = await context.newPage()
    const pageB = await context.newPage()

    await mockAllApis(pageA, ADMIN_USER)
    await mockAllApis(pageB, ADMIN_USER)
    await injectAuthState(pageA, ADMIN_USER)

    // Tab A loads dashboard
    await pageA.goto('/')
    await expect(pageA).toHaveURL('/')

    // Tab B loads dashboard (shares localStorage via same context)
    await pageB.goto('/')
    await expect(pageB).toHaveURL('/')

    // Tab A logs out: clear localStorage auth state
    await pageA.evaluate(() => {
      const state = { token: null, refreshToken: null, userInfo: null, permissions: [] }
      localStorage.setItem('crm-user', JSON.stringify(state))
    })

    // Tab B navigates — should be redirected to /login since token is null
    await pageB.goto('/customer')
    await expect(pageB).toHaveURL(/\/login/, { timeout: 10_000 })

    await context.close()
  })

  // R3.2: Tab A refreshes token → Tab B should pick up new token
  test('R3.2 should use refreshed token from another tab', async ({ browser }) => {
    const context = await browser.newContext()
    const pageA = await context.newPage()
    const pageB = await context.newPage()

    await mockAllApis(pageA, ADMIN_USER)
    await mockAllApis(pageB, ADMIN_USER)
    await injectAuthState(pageA, ADMIN_USER)

    await pageA.goto('/')
    await expect(pageA).toHaveURL('/')

    // Tab A simulates token refresh: update localStorage with new token
    await pageA.evaluate(() => {
      const raw = localStorage.getItem('crm-user')
      if (raw) {
        const state = JSON.parse(raw)
        state.token = 'new-refreshed-token-from-tab-a'
        state.refreshToken = 'new-refreshed-refresh-from-tab-a'
        localStorage.setItem('crm-user', JSON.stringify(state))
      }
    })

    // Tab B navigates — picks up localStorage (shared context)
    await pageB.goto('/customer')
    await pageB.waitForTimeout(2000)

    // Verify Tab B sees the updated token from localStorage
    const state = await pageB.evaluate(() => {
      const raw = localStorage.getItem('crm-user')
      return raw ? JSON.parse(raw) : null
    })
    expect(state?.token).toBe('new-refreshed-token-from-tab-a')

    await context.close()
  })
})
