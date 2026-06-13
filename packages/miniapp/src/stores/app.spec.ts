import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from './app'

describe('useAppStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has correct initial state', () => {
    const store = useAppStore()
    expect(store.unreadCount).toBe(0)
    expect(store.isOnline).toBe(true)
  })

  it('setUnreadCount(5) updates value and calls setTabBarBadge', () => {
    const store = useAppStore()
    store.setUnreadCount(5)
    expect(store.unreadCount).toBe(5)
    expect(uni.setTabBarBadge).toHaveBeenCalledWith({ index: 3, text: '5' })
  })

  it('setUnreadCount(100) caps badge text at 99+', () => {
    const store = useAppStore()
    store.setUnreadCount(100)
    expect(store.unreadCount).toBe(100)
    expect(uni.setTabBarBadge).toHaveBeenCalledWith({ index: 3, text: '99+' })
  })

  it('setUnreadCount(0) calls removeTabBarBadge', () => {
    const store = useAppStore()
    store.setUnreadCount(0)
    expect(store.unreadCount).toBe(0)
    expect(uni.removeTabBarBadge).toHaveBeenCalledWith({ index: 3 })
  })

  it('incrementUnreadCount increments from 0 and sets badge', () => {
    const store = useAppStore()
    store.incrementUnreadCount()
    expect(store.unreadCount).toBe(1)
    expect(uni.setTabBarBadge).toHaveBeenCalledWith({ index: 3, text: '1' })
  })

  it('setOnlineStatus(false) updates isOnline', () => {
    const store = useAppStore()
    store.setOnlineStatus(false)
    expect(store.isOnline).toBe(false)
  })

  it('setOnlineStatus(true) restores isOnline', () => {
    const store = useAppStore()
    store.setOnlineStatus(false)
    store.setOnlineStatus(true)
    expect(store.isOnline).toBe(true)
  })
})
