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
      token.value = res.accessToken
      refreshToken.value = res.refreshToken
      userInfo.value = res.user
      return res
    }

    function logout() {
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
        token.value = res.accessToken
        refreshToken.value = res.refreshToken
        return res.accessToken
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
      pick: ['token', 'refreshToken', 'userInfo'],
    },
  },
)
