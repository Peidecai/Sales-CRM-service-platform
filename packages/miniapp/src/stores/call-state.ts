/**
 * Call State Store — 拨号状态跟踪（方案B）
 *
 * 管理从点击拨号到返回小程序期间的通话上下文。
 * 数据持久化到 Storage，超过 24h 自动清除。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'crm_pending_call'
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface PendingCall {
  clientCallId: string
  customerId: number
  customerName: string
  phone: string
  dialTime: string // ISO string
  returnTime?: string // ISO string, set on App.onShow
  simSlot?: number
}

export const useCallStateStore = defineStore('callState', () => {
  // State
  const pendingCall = ref<PendingCall | null>(restoreFromStorage())
  const isInCall = ref(false)

  // Getters
  const pending = computed(() => !!pendingCall.value)

  // Actions

  /**
   * 记录拨号上下文（点击拨号时调用）
   */
  function setPendingCall(customer: { id: number; name: string; phone: string; simSlot?: number }) {
    // clientCallId 在调起系统拨号前生成，返回后提交失败重试也能保持幂等。
    const call: PendingCall = {
      clientCallId: createClientCallId(),
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      dialTime: new Date().toISOString(),
      simSlot: customer.simSlot,
    }
    pendingCall.value = call
    saveToStorage(call)
  }

  /**
   * 用户返回小程序时更新 returnTime
   */
  function markReturned() {
    if (pendingCall.value) {
      pendingCall.value.returnTime = new Date().toISOString()
      saveToStorage(pendingCall.value)
    }
  }

  /**
   * 清除拨号状态（提交或跳过后调用）
   */
  function clearPendingCall() {
    pendingCall.value = null
    uni.removeStorageSync(STORAGE_KEY)
  }

  // Internal helpers

  function saveToStorage(call: PendingCall) {
    try {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(call))
    } catch {
      // Storage full or not available
    }
  }

  function restoreFromStorage(): PendingCall | null {
    try {
      const raw = uni.getStorageSync(STORAGE_KEY) as string
      if (!raw) return null
      const call = JSON.parse(raw) as PendingCall
      // Auto-expire after 24h
      const age = Date.now() - new Date(call.dialTime).getTime()
      if (age > MAX_AGE_MS) {
        uni.removeStorageSync(STORAGE_KEY)
        return null
      }
      // 兼容旧版本已缓存但没有幂等 ID 的拨号上下文。
      if (!call.clientCallId) {
        call.clientCallId = createClientCallId()
        saveToStorage(call)
      }
      return call
    } catch {
      return null
    }
  }

  function createClientCallId(): string {
    return `native-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  return {
    pendingCall,
    pending,
    isInCall,
    setPendingCall,
    markReturned,
    clearPendingCall,
  }
})
