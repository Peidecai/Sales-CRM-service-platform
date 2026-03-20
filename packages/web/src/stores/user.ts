import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import { setLoggingOut } from '@/api/request'
import type { LoginDto } from '@/api/auth'
import { UserRole } from '@crm/shared'

interface UserInfo {
  id: number
  username: string
  name: string
  role: UserRole
}

export const useUserStore = defineStore(
  'user',
  () => {
    const token = ref<string | null>(null)
    const refreshToken = ref<string | null>(null)
    const userInfo = ref<UserInfo | null>(null)
    const permissions = ref<string[]>([])

    const isLoggedIn = computed(() => !!token.value)
    const userRole = computed(() => userInfo.value?.role ?? '')

    function hasPermission(code: string): boolean {
      return permissions.value.includes(code)
    }

    async function login(credentials: LoginDto) {
      const res = await authApi.login(credentials)
      if (res.data) {
        token.value = res.data.accessToken
        refreshToken.value = res.data.refreshToken
        userInfo.value = res.data.user as unknown as UserInfo
        permissions.value = res.data.permissions ?? []
      }
      return res
    }

    function logout() {
      // Suppress 401 error toasts during intentional logout
      setLoggingOut(true)

      // Fire-and-forget: notify server to blacklist current token.
      authApi.logout().catch(() => {})

      // Disconnect notification websocket without introducing static circular imports.
      import('@/composables/useNotification')
        .then(({ disconnectNotificationSocket }) => {
          disconnectNotificationSocket()
        })
        .catch(() => {})

      token.value = null
      refreshToken.value = null
      userInfo.value = null
      permissions.value = []

      // Re-enable error handling after a short delay
      setTimeout(() => setLoggingOut(false), 2000)
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
      permissions,
      isLoggedIn,
      userRole,
      hasPermission,
      login,
      logout,
      refreshAccessToken,
    }
  },
  {
    persist: {
      key: 'crm-user',
      storage: localStorage,
      paths: ['token', 'refreshToken', 'userInfo', 'permissions'],
    },
  },
)
