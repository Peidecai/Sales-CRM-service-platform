/**
 * API request adapter for uni-app
 *
 * Wraps `uni.request` with:
 * - baseURL configuration
 * - JWT token from storage
 * - 401 → attempt token refresh, then redirect to login if still fails
 * - Error toast via uni.showToast
 */

import type { ApiResponse } from '@crm/shared'

// Environment-specific base URL — set VITE_API_BASE_URL in .env.*
const BASE_URL = import.meta.env.VITE_API_BASE_URL

const TOKEN_KEY = 'crm_token'
const REFRESH_TOKEN_KEY = 'crm_refresh_token'

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown> | unknown
  params?: Record<string, unknown>
  header?: Record<string, string>
  showError?: boolean
  _isRetry?: boolean
}

/**
 * Build query string from params object
 */
function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

/**
 * Attempt to refresh the access token using the stored refresh token
 */
function tryRefreshToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  const refreshToken = uni.getStorageSync(REFRESH_TOKEN_KEY) as string

  if (!refreshToken) {
    isRefreshing = false
    return Promise.resolve(null)
  }

  refreshPromise = new Promise<string | null>((resolve) => {
    uni.request({
      url: `${BASE_URL}/auth/refresh`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { refreshToken },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const body = res.data as ApiResponse<{ accessToken: string; refreshToken: string }>
          if (body.code === 0 && body.data) {
            uni.setStorageSync(TOKEN_KEY, body.data.accessToken)
            uni.setStorageSync(REFRESH_TOKEN_KEY, body.data.refreshToken)
            resolve(body.data.accessToken)
            return
          }
        }
        resolve(null)
      },
      fail: () => resolve(null),
      complete: () => {
        isRefreshing = false
        refreshPromise = null
      },
    })
  })

  return refreshPromise
}

function redirectToLogin(): void {
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(REFRESH_TOKEN_KEY)
  uni.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 })
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/login/index' })
  }, 1500)
}

/**
 * Core request function — returns the full uni.request response data
 */
export async function request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
  const token = uni.getStorageSync(TOKEN_KEY) as string

  let fullUrl = `${BASE_URL}${options.url}`
  if (options.params) {
    fullUrl += buildQueryString(options.params)
  }

  const header: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.header,
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.data as UniApp.RequestOptions['data'],
      header,
      success: async (res) => {
        const statusCode = res.statusCode
        const data = res.data as ApiResponse<T>

        if (statusCode === 401 && !options._isRetry) {
          // Attempt token refresh before giving up
          const newToken = await tryRefreshToken()
          if (newToken) {
            try {
              const retryResult = await request<T>({ ...options, _isRetry: true })
              resolve(retryResult)
            } catch (retryErr) {
              reject(retryErr)
            }
            return
          }
          // Refresh failed — redirect to login
          redirectToLogin()
          reject(new Error('Unauthorized'))
          return
        }

        if (statusCode === 401) {
          redirectToLogin()
          reject(new Error('Unauthorized'))
          return
        }

        if (statusCode >= 400) {
          const msg = data?.message || `请求失败 (${statusCode})`
          if (options.showError !== false) {
            uni.showToast({ title: msg, icon: 'none', duration: 2000 })
          }
          reject(new Error(msg))
          return
        }

        resolve(data)
      },
      fail: (err) => {
        if (options.showError !== false) {
          uni.showToast({ title: '网络连接失败', icon: 'none', duration: 2000 })
        }
        reject(new Error(err.errMsg || '网络错误'))
      },
    })
  })
}

// Helper methods for convenience
export const http = {
  get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return request<T>({ url, method: 'GET', params })
  },

  post<T>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return request<T>({ url, method: 'POST', data })
  },

  put<T>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return request<T>({ url, method: 'PUT', data })
  },

  del<T>(url: string, data?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return request<T>({ url, method: 'DELETE', data })
  },
}

export { TOKEN_KEY, REFRESH_TOKEN_KEY, BASE_URL }
