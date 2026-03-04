import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import router from '@/router/index'

const BASE_URL = '/api/v1'

const request: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

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

// Response interceptor — handle 401 with token refresh
request.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

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

    const message = error.response?.data?.message || error.message || '请求失败'
    ElMessage.error(message)
    return Promise.reject(error)
  },
)

export default request
