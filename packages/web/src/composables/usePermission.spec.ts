import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '@/stores/user'
import { usePermission } from './usePermission'

describe('usePermission', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should identify admin role', () => {
    const userStore = useUserStore()
    userStore.userInfo = { id: 1, username: 'admin', name: 'Admin', role: 'admin' }

    const { isAdmin, isManager, isSales, isAdminOrManager } = usePermission()

    expect(isAdmin.value).toBe(true)
    expect(isManager.value).toBe(false)
    expect(isSales.value).toBe(false)
    expect(isAdminOrManager.value).toBe(true)
  })

  it('should identify manager role', () => {
    const userStore = useUserStore()
    userStore.userInfo = { id: 2, username: 'mgr', name: 'Manager', role: 'manager' }

    const { isAdmin, isManager, isSales, isAdminOrManager } = usePermission()

    expect(isAdmin.value).toBe(false)
    expect(isManager.value).toBe(true)
    expect(isSales.value).toBe(false)
    expect(isAdminOrManager.value).toBe(true)
  })

  it('should identify sales role', () => {
    const userStore = useUserStore()
    userStore.userInfo = { id: 3, username: 'sales', name: 'Sales', role: 'sales' }

    const { isAdmin, isManager, isSales, isAdminOrManager } = usePermission()

    expect(isAdmin.value).toBe(false)
    expect(isManager.value).toBe(false)
    expect(isSales.value).toBe(true)
    expect(isAdminOrManager.value).toBe(false)
  })

  it('should return false for all roles when no user info', () => {
    const { isAdmin, isManager, isSales, isAdminOrManager } = usePermission()

    expect(isAdmin.value).toBe(false)
    expect(isManager.value).toBe(false)
    expect(isSales.value).toBe(false)
    expect(isAdminOrManager.value).toBe(false)
  })

  describe('hasRole', () => {
    it('should return true when user has one of the specified roles', () => {
      const userStore = useUserStore()
      userStore.userInfo = { id: 1, username: 'admin', name: 'Admin', role: 'admin' }

      const { hasRole } = usePermission()

      expect(hasRole('admin', 'manager')).toBe(true)
    })

    it('should return false when user does not have the specified role', () => {
      const userStore = useUserStore()
      userStore.userInfo = { id: 3, username: 'sales', name: 'Sales', role: 'sales' }

      const { hasRole } = usePermission()

      expect(hasRole('admin', 'manager')).toBe(false)
    })

    it('should return false when no user info', () => {
      const { hasRole } = usePermission()

      expect(hasRole('admin')).toBe(false)
    })
  })
})
