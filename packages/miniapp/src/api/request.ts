/**
 * API request adapter for uni-app
 *
 * Wraps `uni.request` with:
 * - baseURL configuration
 * - JWT token from storage
 * - 401 → redirect to login
 * - Error toast via uni.showToast
 */

import type { ApiResponse } from '@crm/shared'

// Environment-specific base URL
const BASE_URL = 'http://localhost:3000/api/v1'

const TOKEN_KEY = 'crm_token'
const REFRESH_TOKEN_KEY = 'crm_refresh_token'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown> | unknown
  params?: Record<string, unknown>
  header?: Record<string, string>
  showError?: boolean
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
 * Core request function — returns the full uni.request response data
 */
export function request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
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
      success: (res) => {
        const statusCode = res.statusCode
        const data = res.data as ApiResponse<T>

        if (statusCode === 401) {
          // Token expired or invalid — redirect to login
          uni.removeStorageSync(TOKEN_KEY)
          uni.removeStorageSync(REFRESH_TOKEN_KEY)
          uni.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 })
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/login/index' })
          }, 1500)
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
