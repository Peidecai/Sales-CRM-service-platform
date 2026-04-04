import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/error-reporter', () => ({
  reportApiError: vi.fn(),
}))

// Dynamic import to get fresh module state per-describe block
let request: typeof import('./request').request
let http: typeof import('./request').http
let reportApiError: ReturnType<typeof vi.fn>

const TOKEN_KEY = 'crm_token'
const REFRESH_TOKEN_KEY = 'crm_refresh_token'

/**
 * Helper: make uni.request call options.success asynchronously
 */
function mockUniRequestSuccess(statusCode: number, data: unknown) {
  vi.mocked(uni.request).mockImplementation((options: Record<string, unknown>) => {
    queueMicrotask(() => {
      (options as { success: (res: { statusCode: number; data: unknown }) => void }).success({
        statusCode,
        data,
      })
    })
  })
}

/**
 * Helper: make uni.request call options.fail asynchronously
 */
function mockUniRequestFail(errMsg: string) {
  vi.mocked(uni.request).mockImplementation((options: Record<string, unknown>) => {
    queueMicrotask(() => {
      (options as { fail: (err: { errMsg: string }) => void }).fail({ errMsg })
    })
  })
}

function okResponse<T>(data: T) {
  return { code: 0, message: 'ok', data }
}

beforeEach(async () => {
  vi.restoreAllMocks()

  // Re-mock after restoreAllMocks
  const reporter = await import('@/utils/error-reporter')
  reportApiError = vi.mocked(reporter.reportApiError)

  // Fresh module import to reset isRefreshing / refreshPromise
  const mod = await import('./request')
  request = mod.request
  http = mod.http
})

// ─── buildQueryString ───────────────────────────────────────────────────

describe('buildQueryString (tested via request params)', () => {
  it('empty params produces no query string', async () => {
    mockUniRequestSuccess(200, okResponse(null))

    await request({ url: '/test', params: {} })

    const calledUrl = (vi.mocked(uni.request).mock.calls[0][0] as { url: string }).url
    expect(calledUrl).not.toContain('?')
  })

  it('filters null and undefined values', async () => {
    mockUniRequestSuccess(200, okResponse(null))

    await request({ url: '/test', params: { a: 1, b: null, c: undefined, d: 'ok' } })

    const calledUrl = (vi.mocked(uni.request).mock.calls[0][0] as { url: string }).url
    expect(calledUrl).toContain('a=1')
    expect(calledUrl).toContain('d=ok')
    expect(calledUrl).not.toContain('b=')
    expect(calledUrl).not.toContain('c=')
  })

  it('encodes special characters', async () => {
    mockUniRequestSuccess(200, okResponse(null))

    await request({ url: '/test', params: { q: 'hello world&foo=bar' } })

    const calledUrl = (vi.mocked(uni.request).mock.calls[0][0] as { url: string }).url
    expect(calledUrl).toContain('q=hello%20world%26foo%3Dbar')
  })

  it('joins multiple params with &', async () => {
    mockUniRequestSuccess(200, okResponse(null))

    await request({ url: '/test', params: { a: '1', b: '2', c: '3' } })

    const calledUrl = (vi.mocked(uni.request).mock.calls[0][0] as { url: string }).url
    expect(calledUrl).toMatch(/\?a=1&b=2&c=3$/)
  })
})

// ─── request (success paths) ────────────────────────────────────────────

describe('request — success', () => {
  it('constructs correct full URL with BASE_URL', async () => {
    mockUniRequestSuccess(200, okResponse({ id: 1 }))

    await request({ url: '/users/1' })

    const opts = vi.mocked(uni.request).mock.calls[0][0] as { url: string }
    // BASE_URL comes from import.meta.env.VITE_API_BASE_URL (undefined in test → "undefined")
    expect(opts.url).toContain('/users/1')
  })

  it('attaches Authorization header when token exists', async () => {
    uni.setStorageSync(TOKEN_KEY, 'my-jwt-token')
    mockUniRequestSuccess(200, okResponse(null))

    await request({ url: '/test' })

    const opts = vi.mocked(uni.request).mock.calls[0][0] as { header: Record<string, string> }
    expect(opts.header['Authorization']).toBe('Bearer my-jwt-token')
  })

  it('no Authorization header when no token', async () => {
    mockUniRequestSuccess(200, okResponse(null))

    await request({ url: '/test' })

    const opts = vi.mocked(uni.request).mock.calls[0][0] as { header: Record<string, string> }
    expect(opts.header['Authorization']).toBeUndefined()
  })

  it('passes params as query string', async () => {
    mockUniRequestSuccess(200, okResponse(null))

    await request({ url: '/search', params: { keyword: 'test' } })

    const opts = vi.mocked(uni.request).mock.calls[0][0] as { url: string }
    expect(opts.url).toContain('?keyword=test')
  })

  it('returns response data on success', async () => {
    const payload = { id: 42, name: 'Alice' }
    mockUniRequestSuccess(200, okResponse(payload))

    const result = await request<{ id: number; name: string }>({ url: '/users/42' })

    expect(result).toEqual({ code: 0, message: 'ok', data: payload })
  })
})

// ─── request (error paths) ─────────────────────────────────────────────

describe('request — errors', () => {
  it('status >= 400: shows toast, calls reportApiError, rejects', async () => {
    mockUniRequestSuccess(500, { code: 50000, message: '服务器错误', data: null })

    await expect(request({ url: '/fail' })).rejects.toThrow('服务器错误')

    expect(uni.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: '服务器错误' }),
    )
    expect(reportApiError).toHaveBeenCalledWith('/fail', 500, '服务器错误')
  })

  it('showError=false: suppresses toast but still rejects', async () => {
    mockUniRequestSuccess(403, { code: 40300, message: '禁止访问', data: null })

    await expect(request({ url: '/forbidden', showError: false })).rejects.toThrow('禁止访问')

    expect(uni.showToast).not.toHaveBeenCalled()
    expect(reportApiError).toHaveBeenCalledWith('/forbidden', 403, '禁止访问')
  })

  it('network failure (fail callback): shows toast, rejects', async () => {
    mockUniRequestFail('request:fail timeout')

    await expect(request({ url: '/timeout' })).rejects.toThrow('request:fail timeout')

    expect(uni.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: '网络连接失败' }),
    )
    expect(reportApiError).toHaveBeenCalledWith('/timeout', 0, 'request:fail timeout')
  })
})

// ─── request (401 / token refresh flow) ─────────────────────────────────

describe('request — 401 token refresh', () => {
  it('first 401 triggers refresh, retries original request on success', async () => {
    uni.setStorageSync(REFRESH_TOKEN_KEY, 'old-refresh')

    let callCount = 0
    vi.mocked(uni.request).mockImplementation((options: Record<string, unknown>) => {
      callCount++
      const opts = options as {
        url: string
        success: (res: { statusCode: number; data: unknown }) => void
        fail: (err: { errMsg: string }) => void
        complete?: () => void
      }
      queueMicrotask(() => {
        if (opts.url.includes('/auth/refresh')) {
          // Refresh succeeds
          opts.success({
            statusCode: 200,
            data: okResponse({ accessToken: 'new-token', refreshToken: 'new-refresh' }),
          })
          opts.complete?.()
        } else if (callCount === 1) {
          // First call → 401
          opts.success({ statusCode: 401, data: { code: 40100, message: 'Unauthorized', data: null } })
        } else {
          // Retry → 200
          opts.success({ statusCode: 200, data: okResponse({ result: 'ok' }) })
        }
      })
    })

    const result = await request<{ result: string }>({ url: '/protected' })

    expect(result.data).toEqual({ result: 'ok' })
    expect(uni.getStorageSync(TOKEN_KEY)).toBe('new-token')
  })

  it('refresh fails: redirects to login', async () => {
    uni.setStorageSync(REFRESH_TOKEN_KEY, 'old-refresh')

    let callCount = 0
    vi.mocked(uni.request).mockImplementation((options: Record<string, unknown>) => {
      callCount++
      const opts = options as {
        url: string
        success: (res: { statusCode: number; data: unknown }) => void
        fail: (err: { errMsg: string }) => void
        complete?: () => void
      }
      queueMicrotask(() => {
        if (opts.url.includes('/auth/refresh')) {
          // Refresh fails with 401
          opts.success({ statusCode: 401, data: { code: 40100, message: 'Invalid refresh', data: null } })
          opts.complete?.()
        } else {
          // Original → 401
          opts.success({ statusCode: 401, data: { code: 40100, message: 'Unauthorized', data: null } })
        }
      })
    })

    await expect(request({ url: '/protected' })).rejects.toThrow('Unauthorized')

    expect(uni.removeStorageSync).toHaveBeenCalledWith(TOKEN_KEY)
    expect(uni.removeStorageSync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY)
  })

  it('retry 401 (_isRetry=true): redirects to login directly', async () => {
    mockUniRequestSuccess(401, { code: 40100, message: 'Unauthorized', data: null })

    await expect(request({ url: '/protected', _isRetry: true })).rejects.toThrow('Unauthorized')

    expect(uni.removeStorageSync).toHaveBeenCalledWith(TOKEN_KEY)
    // Should NOT attempt refresh (only 1 uni.request call — the original)
    expect(uni.request).toHaveBeenCalledTimes(1)
  })

  it('concurrent 401s share single refresh promise', async () => {
    uni.setStorageSync(REFRESH_TOKEN_KEY, 'old-refresh')

    let refreshCallCount = 0
    vi.mocked(uni.request).mockImplementation((options: Record<string, unknown>) => {
      const opts = options as {
        url: string
        header?: Record<string, string>
        success: (res: { statusCode: number; data: unknown }) => void
        complete?: () => void
      }
      queueMicrotask(() => {
        if (opts.url.includes('/auth/refresh')) {
          refreshCallCount++
          opts.success({
            statusCode: 200,
            data: okResponse({ accessToken: 'new-token', refreshToken: 'new-refresh' }),
          })
          opts.complete?.()
        } else if (opts.header?.['Authorization'] === 'Bearer new-token') {
          // Retry calls carry the refreshed token → success
          opts.success({ statusCode: 200, data: okResponse({ ok: true }) })
        } else {
          // Original calls → 401
          opts.success({ statusCode: 401, data: { code: 40100, message: 'Unauthorized', data: null } })
        }
      })
    })

    // Fire 3 concurrent requests that all get 401
    const promises = [
      request({ url: '/a' }),
      request({ url: '/b' }),
      request({ url: '/c' }),
    ]

    await Promise.all(promises)

    // Only 1 refresh call despite 3 concurrent 401s
    expect(refreshCallCount).toBe(1)
  })
})

// ─── http convenience methods ───────────────────────────────────────────

describe('http convenience methods', () => {
  it('http.get delegates with GET method', async () => {
    mockUniRequestSuccess(200, okResponse([1, 2, 3]))

    const result = await http.get<number[]>('/items', { page: 1 })

    const opts = vi.mocked(uni.request).mock.calls[0][0] as { method: string; url: string }
    expect(opts.method).toBe('GET')
    expect(opts.url).toContain('/items')
    expect(opts.url).toContain('page=1')
    expect(result.data).toEqual([1, 2, 3])
  })

  it('http.post delegates with POST method', async () => {
    mockUniRequestSuccess(201, okResponse({ id: 1 }))

    const result = await http.post<{ id: number }>('/items', { name: 'test' })

    const opts = vi.mocked(uni.request).mock.calls[0][0] as { method: string; data: unknown }
    expect(opts.method).toBe('POST')
    expect(opts.data).toEqual({ name: 'test' })
    expect(result.data).toEqual({ id: 1 })
  })
})
