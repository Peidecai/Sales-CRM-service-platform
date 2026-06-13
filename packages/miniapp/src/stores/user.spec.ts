import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/auth', () => ({
  authApi: {
    wxLogin: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    getProfile: vi.fn(),
    logout: vi.fn(),
  },
}))
vi.mock('@/api/request', () => ({
  TOKEN_KEY: 'crm_token',
  REFRESH_TOKEN_KEY: 'crm_refresh_token',
}))

import { useUserStore } from './user'
import { authApi } from '@/api/auth'

const mockUser = { id: 1, username: 'testuser', role: 'sales', name: 'Test User' }

function makeLoginResult(user = mockUser) {
  return {
    code: 0,
    message: 'success',
    data: { accessToken: 'access-123', refreshToken: 'refresh-456', user },
  }
}

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('has correct initial state', () => {
    const store = useUserStore()
    expect(store.token).toBe('')
    expect(store.userInfo).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })

  it('isLoggedIn returns true when token exists in storage', () => {
    uni.setStorageSync('crm_token', 'pre-existing-token')
    const store = useUserStore()
    expect(store.isLoggedIn).toBe(true)
    expect(store.token).toBe('pre-existing-token')
  })

  it('computed getters derive from userInfo', () => {
    const store = useUserStore()
    store.userInfo = mockUser
    expect(store.userId).toBe(1)
    expect(store.username).toBe('testuser')
    expect(store.role).toBe('sales')
    expect(store.displayName).toBe('Test User')
  })

  it('displayName falls back to username when name is undefined', () => {
    const store = useUserStore()
    store.userInfo = { ...mockUser, name: undefined as unknown as string }
    expect(store.displayName).toBe('testuser')
  })

  it('passwordLogin success stores tokens and sets userInfo', async () => {
    vi.mocked(authApi.login).mockResolvedValue(makeLoginResult())
    const store = useUserStore()

    const result = await store.passwordLogin('testuser', 'pass123')

    expect(result).toBe(true)
    expect(store.token).toBe('access-123')
    expect(store.userInfo).toEqual(mockUser)
    expect(uni.setStorageSync).toHaveBeenCalledWith('crm_token', 'access-123')
    expect(uni.setStorageSync).toHaveBeenCalledWith('crm_refresh_token', 'refresh-456')
  })

  it('passwordLogin failure returns false and shows toast', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ code: 40101, message: 'Bad credentials', data: null })
    const store = useUserStore()

    const result = await store.passwordLogin('bad', 'wrong')

    expect(result).toBe(false)
    expect(store.userInfo).toBeNull()
    expect(uni.showToast).toHaveBeenCalledWith({ title: 'Bad credentials', icon: 'none' })
  })

  it('wxLogin success calls uni.login then authApi.wxLogin and stores tokens', async () => {
    vi.mocked(uni.login).mockImplementation((opts: Record<string, unknown>) => {
      const success = opts.success as (res: { code: string }) => void
      success({ code: 'wx-code-abc' })
    })
    vi.mocked(authApi.wxLogin).mockResolvedValue(makeLoginResult())
    const store = useUserStore()

    const result = await store.wxLogin()

    expect(result).toBe(true)
    expect(uni.login).toHaveBeenCalledWith(expect.objectContaining({ provider: 'weixin' }))
    expect(authApi.wxLogin).toHaveBeenCalledWith({ code: 'wx-code-abc' })
    expect(store.token).toBe('access-123')
    expect(store.userInfo).toEqual(mockUser)
  })

  it('wxLogin failure when no code shows toast and returns false', async () => {
    vi.mocked(uni.login).mockImplementation((opts: Record<string, unknown>) => {
      const success = opts.success as (res: { code: string }) => void
      success({ code: '' })
    })
    const store = useUserStore()

    const result = await store.wxLogin()

    expect(result).toBe(false)
    expect(uni.showToast).toHaveBeenCalledWith({ title: '微信登录失败', icon: 'none' })
    expect(authApi.wxLogin).not.toHaveBeenCalled()
  })

  it('logout clears tokens, nulls userInfo, and calls reLaunch', async () => {
    vi.mocked(authApi.logout).mockRejectedValue(new Error('network'))
    vi.mocked(authApi.login).mockResolvedValue(makeLoginResult())
    const store = useUserStore()
    await store.passwordLogin('u', 'p')

    await store.logout()

    expect(store.token).toBe('')
    expect(store.userInfo).toBeNull()
    expect(store.isLoggedIn).toBe(false)
    expect(uni.removeStorageSync).toHaveBeenCalledWith('crm_token')
    expect(uni.removeStorageSync).toHaveBeenCalledWith('crm_refresh_token')
    expect(uni.reLaunch).toHaveBeenCalledWith({ url: '/pages/login/index' })
  })

  it('refreshAccessToken success updates tokens and returns new token', async () => {
    uni.setStorageSync('crm_refresh_token', 'old-refresh')
    vi.mocked(authApi.refresh).mockResolvedValue(makeLoginResult())
    const store = useUserStore()

    const newToken = await store.refreshAccessToken()

    expect(newToken).toBe('access-123')
    expect(store.token).toBe('access-123')
    expect(store.userInfo).toEqual(mockUser)
    expect(authApi.refresh).toHaveBeenCalledWith('old-refresh')
  })

  it('refreshAccessToken failure clears tokens and returns null', async () => {
    uni.setStorageSync('crm_refresh_token', 'old-refresh')
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('expired'))
    const store = useUserStore()

    const result = await store.refreshAccessToken()

    expect(result).toBeNull()
    expect(store.token).toBe('')
  })

  it('refreshAccessToken with no refreshToken returns null immediately', async () => {
    const store = useUserStore()

    const result = await store.refreshAccessToken()

    expect(result).toBeNull()
    expect(authApi.refresh).not.toHaveBeenCalled()
  })
})
