import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCallStateStore } from './call-state'

describe('useCallStateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mockCustomer = { id: 1, name: 'Test Corp', phone: '13800001111', simSlot: 1 }

  it('has correct initial state', () => {
    const store = useCallStateStore()
    expect(store.pendingCall).toBeNull()
    expect(store.isInCall).toBe(false)
    expect(store.pending).toBe(false)
  })

  it('setPendingCall sets pendingCall with correct fields and saves to storage', () => {
    const store = useCallStateStore()
    const before = new Date().toISOString()
    store.setPendingCall(mockCustomer)
    const after = new Date().toISOString()

    expect(store.pendingCall).not.toBeNull()
    expect(store.pendingCall!.clientCallId).toMatch(/^native-\d+-[a-z0-9]+$/)
    expect(store.pendingCall!.customerId).toBe(1)
    expect(store.pendingCall!.customerName).toBe('Test Corp')
    expect(store.pendingCall!.phone).toBe('13800001111')
    expect(store.pendingCall!.simSlot).toBe(1)
    expect(store.pendingCall!.dialTime >= before).toBe(true)
    expect(store.pendingCall!.dialTime <= after).toBe(true)
    expect(store.pendingCall!.returnTime).toBeUndefined()

    expect(uni.setStorageSync).toHaveBeenCalledWith(
      'crm_pending_call',
      expect.any(String),
    )
    const saved = JSON.parse(
      (uni.setStorageSync as ReturnType<typeof vi.fn>).mock.calls.at(-1)![1],
    )
    expect(saved.customerId).toBe(1)
    expect(saved.clientCallId).toBe(store.pendingCall!.clientCallId)
    expect(saved.simSlot).toBe(1)
  })

  it('setPendingCall makes pending computed return true', () => {
    const store = useCallStateStore()
    expect(store.pending).toBe(false)
    store.setPendingCall(mockCustomer)
    expect(store.pending).toBe(true)
  })

  it('markReturned sets returnTime on existing pendingCall and updates storage', () => {
    const store = useCallStateStore()
    store.setPendingCall(mockCustomer)
    vi.clearAllMocks()

    const before = new Date().toISOString()
    store.markReturned()
    const after = new Date().toISOString()

    expect(store.pendingCall!.returnTime).toBeDefined()
    expect(store.pendingCall!.returnTime! >= before).toBe(true)
    expect(store.pendingCall!.returnTime! <= after).toBe(true)
    expect(uni.setStorageSync).toHaveBeenCalledWith(
      'crm_pending_call',
      expect.any(String),
    )
  })

  it('markReturned is no-op when pendingCall is null', () => {
    const store = useCallStateStore()
    store.markReturned()
    expect(store.pendingCall).toBeNull()
    expect(uni.setStorageSync).not.toHaveBeenCalled()
  })

  it('clearPendingCall sets null and removes from storage', () => {
    const store = useCallStateStore()
    store.setPendingCall(mockCustomer)
    vi.clearAllMocks()

    store.clearPendingCall()
    expect(store.pendingCall).toBeNull()
    expect(store.pending).toBe(false)
    expect(uni.removeStorageSync).toHaveBeenCalledWith('crm_pending_call')
  })

  describe('restore from storage', () => {
    it('loads a recent pendingCall from storage', () => {
      const recentCall = {
        customerId: 2,
        customerName: 'Restored Corp',
        phone: '13900002222',
        dialTime: new Date().toISOString(),
      }
      uni.setStorageSync('crm_pending_call', JSON.stringify(recentCall))

      // Create store AFTER storage is populated
      const store = useCallStateStore()
      expect(store.pendingCall).not.toBeNull()
      expect(store.pendingCall!.clientCallId).toMatch(/^native-\d+-[a-z0-9]+$/)
      expect(store.pendingCall!.customerId).toBe(2)
      expect(store.pendingCall!.customerName).toBe('Restored Corp')
      expect(store.pending).toBe(true)
      expect(uni.setStorageSync).toHaveBeenCalledWith('crm_pending_call', expect.any(String))
    })

    it('returns null for expired (25h-old) pendingCall', () => {
      const expiredCall = {
        customerId: 3,
        customerName: 'Expired Corp',
        phone: '13900003333',
        dialTime: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      }
      uni.setStorageSync('crm_pending_call', JSON.stringify(expiredCall))

      const store = useCallStateStore()
      expect(store.pendingCall).toBeNull()
      expect(store.pending).toBe(false)
      // Should also clean up expired entry
      expect(uni.removeStorageSync).toHaveBeenCalledWith('crm_pending_call')
    })
  })
})
