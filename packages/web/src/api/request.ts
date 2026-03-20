import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import router from '@/router/index'

export const BASE_URL = '/api/v1'

/** Base URL for API (use with fetch when not using axios request). */
export function getApiBase(): string {
  return BASE_URL
}

const request: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

// --- Error message mapping by HTTP status ---
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: '请求参数有误',
  403: '没有权限执行此操作',
  404: '请求的资源不存在',
  405: '请求方式不被允许',
  408: '请求超时，请稍后重试',
  409: '数据冲突，请检查后重试',
  422: '提交的数据格式不正确',
  429: '请求过于频繁，请稍后再试',
  500: '服务器内部错误，请稍后重试',
  502: '网关错误，请稍后重试',
  503: '服务暂时不可用，请稍后重试',
  504: '网关超时，请稍后重试',
}

/**
 * Extract a user-friendly error message from an error response.
 * Prioritises the backend `message` field, then validation errors,
 * then falls back to a status-specific default.
 */
function resolveErrorMessage(error: { response?: AxiosResponse; message?: string }): string {
  const status = error.response?.status
  const data = error.response?.data as
    | { message?: string; validationErrors?: Array<{ constraints?: Record<string, string> }> }
    | undefined

  // If backend returned validation errors, concatenate the first few
  if (data?.validationErrors && Array.isArray(data.validationErrors)) {
    const msgs: string[] = []
    for (const err of data.validationErrors) {
      if (err.constraints) {
        msgs.push(...Object.values(err.constraints))
      }
    }
    if (msgs.length > 0) {
      return msgs.slice(0, 3).join('；')
    }
  }

  // Backend message
  if (data?.message && typeof data.message === 'string') {
    return data.message
  }

  // Status-based fallback
  if (status && HTTP_ERROR_MESSAGES[status]) {
    return HTTP_ERROR_MESSAGES[status]
  }

  // Network / timeout
  if (error.message?.includes('timeout')) {
    return '请求超时，请检查网络后重试'
  }
  if (error.message?.includes('Network Error')) {
    return '网络连接失败，请检查网络设置'
  }

  return '请求失败，请稍后重试'
}

// Request interceptor — attach Bearer token
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

let isRefreshing = false
let pendingQueue: Array<(token: string) => void> = []

/** Set to true during intentional logout to suppress 401 error toasts */
let isLoggingOut = false

export function setLoggingOut(value: boolean): void {
  isLoggingOut = value
}

// Response interceptor — handle 401 with token refresh
request.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // During intentional logout, silently reject all 401s
    if (isLoggingOut) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingQueue.push((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`
            }
            resolve(request(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const userStore = useUserStore()
      const newToken = await userStore.refreshAccessToken()

      if (newToken) {
        pendingQueue.forEach((cb) => cb(newToken))
        pendingQueue = []
        isRefreshing = false
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`
        }
        return request(originalRequest)
      } else {
        pendingQueue = []
        isRefreshing = false
        ElMessage.error('登录已过期，请重新登录')
        router.push({ name: 'Login' })
        return Promise.reject(error)
      }
    }

    // For 403 — also redirect non-admin trying to access admin API
    if (error.response?.status === 403) {
      ElMessage.warning(resolveErrorMessage(error))
      return Promise.reject(error)
    }

    // General error handling
    ElMessage.error(resolveErrorMessage(error))
    return Promise.reject(error)
  },
)

export default request
