import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { UserRole } from '@crm/shared'
import { useUserStore } from './user'

// Mock authApi
vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue({}),
    refreshToken: vi.fn(),
  },
}))

// Import mocked module
import { authApi } from '@/api/auth'

const mockUser = { id: 1, username: 'admin', name: 'Admin', role: UserRole.ADMIN }

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have null token and userInfo', () => {
      const store = useUserStore()
      expect(store.token).toBeNull()
      expect(store.refreshToken).toBeNull()
      expect(store.userInfo).toBeNull()
    })

    it('should not be logged in initially', () => {
      const store = useUserStore()
      expect(store.isLoggedIn).toBe(false)
    })

    it('should have empty userRole when no user info', () => {
      const store = useUserStore()
      expect(store.userRole).toBe('')
    })
  })

  describe('login', () => {
    it('should store tokens and user info on successful login', async () => {
      const loginResponse = {
        data: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          user: mockUser,
        },
      }
      vi.mocked(authApi.login).mockResolvedValue(loginResponse as never)

      const store = useUserStore()
      await store.login({ username: 'admin', password: 'pass123' })

      expect(store.token).toBe('access-token-123')
      expect(store.refreshToken).toBe('refresh-token-456')
      expect(store.userInfo).toEqual(mockUser)
      expect(store.isLoggedIn).toBe(true)
      expect(store.userRole).toBe('admin')
    })

    it('should not update state when login response has no data', async () => {
      vi.mocked(authApi.login).mockResolvedValue({ data: null } as never)

      const store = useUserStore()
      await store.login({ username: 'admin', password: 'wrong' })

      expect(store.token).toBeNull()
      expect(store.isLoggedIn).toBe(false)
    })
  })

  describe('logout', () => {
    it('should clear all auth state', async () => {
      const store = useUserStore()
      // Set up logged-in state
      store.token = 'access-token'
      store.refreshToken = 'refresh-token'
      store.userInfo = mockUser

      store.logout()

      expect(store.token).toBeNull()
      expect(store.refreshToken).toBeNull()
      expect(store.userInfo).toBeNull()
      expect(store.isLoggedIn).toBe(false)
    })

    it('should call authApi.logout (fire-and-forget)', () => {
      const store = useUserStore()
      store.token = 'some-token'

      store.logout()

      expect(authApi.logout).toHaveBeenCalled()
    })
  })

  describe('refreshAccessToken', () => {
    it('should update tokens on successful refresh', async () => {
      const refreshResponse = {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          user: mockUser,
        },
      }
      vi.mocked(authApi.refreshToken).mockResolvedValue(refreshResponse as never)

      const store = useUserStore()
      store.refreshToken = 'old-refresh-token'

      const result = await store.refreshAccessToken()

      expect(result).toBe('new-access-token')
      expect(store.token).toBe('new-access-token')
      expect(store.refreshToken).toBe('new-refresh-token')
    })

    it('should logout if no refresh token', async () => {
      const store = useUserStore()
      store.refreshToken = null

      const result = await store.refreshAccessToken()

      expect(result).toBeNull()
      expect(store.isLoggedIn).toBe(false)
    })

    it('should logout on refresh failure', async () => {
      vi.mocked(authApi.refreshToken).mockRejectedValue(new Error('expired'))

      const store = useUserStore()
      store.token = 'old-access'
      store.refreshToken = 'old-refresh'
      store.userInfo = mockUser

      const result = await store.refreshAccessToken()

      expect(result).toBeNull()
      expect(store.token).toBeNull()
      expect(store.refreshToken).toBeNull()
      expect(store.userInfo).toBeNull()
    })

    it('should logout when refresh response has no data', async () => {
      vi.mocked(authApi.refreshToken).mockResolvedValue({ data: null } as never)

      const store = useUserStore()
      store.refreshToken = 'some-refresh'

      const result = await store.refreshAccessToken()

      expect(result).toBeNull()
      expect(store.token).toBeNull()
    })
  })

  describe('computed properties', () => {
    it('isLoggedIn should be true when token exists', () => {
      const store = useUserStore()
      store.token = 'some-token'
      expect(store.isLoggedIn).toBe(true)
    })

    it('userRole should return role from userInfo', () => {
      const store = useUserStore()
      store.userInfo = { ...mockUser, role: UserRole.MANAGER }
      expect(store.userRole).toBe('manager')
    })
  })
})
