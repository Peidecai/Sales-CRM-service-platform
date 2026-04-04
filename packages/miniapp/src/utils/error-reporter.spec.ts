import { describe, it, expect, vi, beforeEach } from 'vitest'

// Helper to create a valid JWT with a given payload
function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fakesignature`
}

describe('error-reporter', () => {
  let reportError: typeof import('./error-reporter').reportError
  let reportApiError: typeof import('./error-reporter').reportApiError

  beforeEach(async () => {
    vi.restoreAllMocks()
    // Fresh import each test to reset module-level constants
    const mod = await import('./error-reporter')
    reportError = mod.reportError
    reportApiError = mod.reportApiError
  })

  // --- DEV mode tests (import.meta.env.DEV = true by default in vitest) ---

  it('reportError with string in DEV mode logs to console.error and does NOT call uni.request', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    reportError('something went wrong')

    expect(spy).toHaveBeenCalledOnce()
    expect(spy).toHaveBeenCalledWith('[ErrorReporter]', expect.objectContaining({
      message: 'something went wrong',
      stack: undefined,
    }))
    expect(uni.request).not.toHaveBeenCalled()
  })

  it('reportError with Error object in DEV mode logs stack trace', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('test error')

    reportError(error)

    expect(spy).toHaveBeenCalledOnce()
    expect(spy).toHaveBeenCalledWith('[ErrorReporter]', expect.objectContaining({
      message: 'test error',
      stack: expect.stringContaining('test error'),
    }))
  })

  it('reportError constructs correct ErrorReport structure', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const now = Date.now()

    reportError('check structure')

    const report = spy.mock.calls[0][1] as Record<string, unknown>
    expect(report).toMatchObject({
      message: 'check structure',
      stack: undefined,
      page: expect.any(String),
      timestamp: expect.any(Number),
      deviceInfo: expect.any(Object),
      appVersion: expect.any(String),
    })
    expect(report.timestamp).toBeGreaterThanOrEqual(now)
  })

  it('getUserId: extracts userId from valid JWT in storage', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    uni.setStorageSync('crm_token', makeJwt({ sub: 'user-42' }))

    reportError('with token')

    const report = spy.mock.calls[0][1] as Record<string, unknown>
    expect(report.userId).toBe('user-42')
  })

  it('getUserId: returns undefined when no token in storage', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Storage is cleared in beforeEach — no token

    reportError('no token')

    const report = spy.mock.calls[0][1] as Record<string, unknown>
    expect(report.userId).toBeUndefined()
  })

  it('getUserId: returns undefined for malformed JWT without crashing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    uni.setStorageSync('crm_token', 'not-a-jwt')

    reportError('bad token')

    const report = spy.mock.calls[0][1] as Record<string, unknown>
    expect(report.userId).toBeUndefined()
  })

  it('getDeviceInfo: returns info from uni.getSystemInfoSync', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    reportError('device check')

    const report = spy.mock.calls[0][1] as Record<string, unknown>
    const deviceInfo = report.deviceInfo as Record<string, unknown>
    expect(deviceInfo).toMatchObject({
      model: 'iPhone 12',
      platform: 'devtools',
      system: 'iOS 15.0',
      SDKVersion: '2.30.0',
      screenWidth: 375,
      screenHeight: 812,
    })
  })

  it('getAppVersion: returns version from uni.getAccountInfoSync', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    reportError('version check')

    const report = spy.mock.calls[0][1] as Record<string, unknown>
    expect(report.appVersion).toBe('1.0.0')
  })

  it('getCurrentPagePath: uses last page route from getCurrentPages', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getCurrentPages).mockReturnValue([
      { route: 'pages/index/index' },
      { route: 'pages/customer/detail' },
    ] as unknown as ReturnType<typeof getCurrentPages>)

    reportError('page check')

    const report = spy.mock.calls[0][1] as Record<string, unknown>
    expect(report.page).toBe('pages/customer/detail')
  })

  it('reportApiError: constructs Error with "[statusCode] url: message" format', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    reportApiError('/api/v1/customers', 500, 'Internal Server Error')

    const report = spy.mock.calls[0][1] as Record<string, unknown>
    expect(report.message).toBe('API Error [500] /api/v1/customers: Internal Server Error')
    expect(report.stack).toEqual(expect.stringContaining('API Error [500]'))
  })
})
