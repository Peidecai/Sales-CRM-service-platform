/**
 * Auth API — WeChat login and token management
 */
import { http } from './request'

export interface WxLoginParams {
  code: string
}

export interface BindPhoneParams {
  code: string
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: {
    id: number
    username: string
    role: string
    name: string
  }
}

export const authApi = {
  /**
   * WeChat login — exchange wx.login code for JWT
   */
  wxLogin(data: WxLoginParams) {
    return http.post<LoginResult>('/auth/wx-login', data as unknown as Record<string, unknown>)
  },

  /**
   * Bind phone number via WeChat getPhoneNumber
   */
  bindPhone(data: BindPhoneParams) {
    return http.post<{ phone: string }>('/auth/bind-phone', data as unknown as Record<string, unknown>)
  },

  /**
   * Standard username/password login (fallback for dev)
   */
  login(data: { username: string; password: string; deviceType?: string }) {
    return http.post<LoginResult>('/auth/login', data as unknown as Record<string, unknown>)
  },

  /**
   * Refresh access token
   */
  refresh(refreshToken: string) {
    return http.post<LoginResult>('/auth/refresh', { refreshToken } as unknown as Record<string, unknown>)
  },

  /**
   * Get current user profile
   */
  getProfile() {
    return http.get<LoginResult['user']>('/auth/profile')
  },

  /**
   * Logout
   */
  logout() {
    return http.post('/auth/logout')
  },
}
