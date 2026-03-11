/**
 * User Store — Pinia store for auth state management
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type LoginResult } from '@/api/auth'
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/api/request'

export const useUserStore = defineStore('user', () => {
  // State
  const token = ref(uni.getStorageSync(TOKEN_KEY) as string || '')
  const refreshTokenValue = ref(uni.getStorageSync(REFRESH_TOKEN_KEY) as string || '')
  const userInfo = ref<LoginResult['user'] | null>(null)

  // Getters
  const isLoggedIn = computed(() => !!token.value)
  const userId = computed(() => userInfo.value?.id ?? 0)
  const username = computed(() => userInfo.value?.username ?? '')
  const role = computed(() => userInfo.value?.role ?? '')
  const displayName = computed(() => userInfo.value?.name ?? username.value)

  // Actions

  /**
   * WeChat login flow
   */
  async function wxLogin(): Promise<boolean> {
    try {
      const loginResult = await new Promise<UniApp.LoginRes>((resolve, reject) => {
        uni.login({
          provider: 'weixin',
          success: resolve,
          fail: reject,
        })
      })

      if (!loginResult.code) {
        uni.showToast({ title: '微信登录失败', icon: 'none' })
        return false
      }

      const res = await authApi.wxLogin({ code: loginResult.code })
      if (res.code === 0 && res.data) {
        setTokens(res.data.accessToken, res.data.refreshToken)
        userInfo.value = res.data.user
        return true
      }

      uni.showToast({ title: res.message || '登录失败', icon: 'none' })
      return false
    } catch (err) {
      console.error('[UserStore] wxLogin failed:', err)
      return false
    }
  }

  /**
   * Username/password login (dev fallback)
   */
  async function passwordLogin(username: string, password: string): Promise<boolean> {
    try {
      const res = await authApi.login({ username, password, deviceType: 'miniapp' })
      if (res.code === 0 && res.data) {
        setTokens(res.data.accessToken, res.data.refreshToken)
        userInfo.value = res.data.user
        return true
      }
      uni.showToast({ title: res.message || '登录失败', icon: 'none' })
      return false
    } catch {
      return false
    }
  }

  /**
   * Fetch user profile
   */
  async function fetchProfile(): Promise<void> {
    try {
      const res = await authApi.getProfile()
      if (res.code === 0 && res.data) {
        userInfo.value = res.data
      }
    } catch {
      // Silently fail
    }
  }

  /**
   * Logout
   */
  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } catch {
      // Continue logout even if API fails
    }
    clearTokens()
    userInfo.value = null
    uni.reLaunch({ url: '/pages/login/index' })
  }

  /**
   * Refresh access token
   */
  async function refreshAccessToken(): Promise<string | null> {
    if (!refreshTokenValue.value) return null
    try {
      const res = await authApi.refresh(refreshTokenValue.value)
      if (res.code === 0 && res.data) {
        setTokens(res.data.accessToken, res.data.refreshToken)
        userInfo.value = res.data.user
        return res.data.accessToken
      }
    } catch {
      // Refresh failed
    }
    clearTokens()
    return null
  }

  // Internal helpers
  function setTokens(accessToken: string, refreshToken: string): void {
    token.value = accessToken
    refreshTokenValue.value = refreshToken
    uni.setStorageSync(TOKEN_KEY, accessToken)
    uni.setStorageSync(REFRESH_TOKEN_KEY, refreshToken)
  }

  function clearTokens(): void {
    token.value = ''
    refreshTokenValue.value = ''
    uni.removeStorageSync(TOKEN_KEY)
    uni.removeStorageSync(REFRESH_TOKEN_KEY)
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    userId,
    username,
    role,
    displayName,
    wxLogin,
    passwordLogin,
    fetchProfile,
    logout,
    refreshAccessToken,
  }
})
