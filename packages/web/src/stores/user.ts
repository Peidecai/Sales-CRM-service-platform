import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import type { LoginDto } from '@/api/auth'

interface UserInfo {
  id: number
  username: string
  name: string
  role: string
}

export const useUserStore = defineStore(
  'user',
  () => {
    const token = ref<string | null>(null)
    const refreshToken = ref<string | null>(null)
    const userInfo = ref<UserInfo | null>(null)

    const isLoggedIn = computed(() => !!token.value)
    const userRole = computed(() => userInfo.value?.role ?? '')

    async function login(credentials: LoginDto) {
      const res = await authApi.login(credentials)
      if (res.data) {
        token.value = res.data.accessToken
        refreshToken.value = res.data.refreshToken
        userInfo.value = res.data.user
      }
      return res
    }

    function logout() {
      // Fire-and-forget: 通知服务器将 token 加入黑名单
      authApi.logout().catch(() => {})
      token.value = null
      refreshToken.value = null
      userInfo.value = null
    }

    async function refreshAccessToken() {
      if (!refreshToken.value) {
        logout()
        return null
      }
      try {
        const res = await authApi.refreshToken(refreshToken.value)
        if (res.data) {
          token.value = res.data.accessToken
          refreshToken.value = res.data.refreshToken
          return res.data.accessToken
        }
        logout()
        return null
      } catch {
        logout()
        return null
      }
    }

    return {
      token,
      refreshToken,
      userInfo,
      isLoggedIn,
      userRole,
      login,
      logout,
      refreshAccessToken,
    }
  },
  {
    persist: {
      key: 'crm-user',
      storage: localStorage,
      paths: ['token', 'refreshToken', 'userInfo'],
    },
  },
)
