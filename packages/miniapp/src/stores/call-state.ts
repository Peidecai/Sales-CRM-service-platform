/**
 * Call State Store — 拨号状态跟踪（方案B）
 *
 * 管理从点击拨号到返回小程序期间的通话上下文。
 * 数据持久化到 Storage，超过 24h 自动清除。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'crm_pending_call'
const CALL_MODE_KEY = 'crm_call_mode'
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

export type CallMode = 'native' | 'cloud'

export interface PendingCall {
  customerId: number
  customerName: string
  phone: string
  dialTime: string // ISO string
  returnTime?: string // ISO string, set on App.onShow
}

export const useCallStateStore = defineStore('callState', () => {
  // State
  const pendingCall = ref<PendingCall | null>(restoreFromStorage())
  const callMode = ref<CallMode>(restoreCallMode())
  const isInCall = ref(false)

  // Getters
  const pending = computed(() => !!pendingCall.value)
  const hasRememberedMode = computed(() => !!uni.getStorageSync(CALL_MODE_KEY))

  // Actions

  /**
   * 记录拨号上下文（点击拨号时调用）
   */
  function setPendingCall(customer: { id: number; name: string; phone: string }) {
    const call: PendingCall = {
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      dialTime: new Date().toISOString(),
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
   * 设置通话模式（可选持久化）
   */
  function setCallMode(mode: CallMode, remember: boolean) {
    callMode.value = mode
    if (remember) {
      uni.setStorageSync(CALL_MODE_KEY, mode)
    }
  }

  /**
   * 清除记住的通话模式
   */
  function clearRememberedMode() {
    uni.removeStorageSync(CALL_MODE_KEY)
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
      return call
    } catch {
      return null
    }
  }

  function restoreCallMode(): CallMode {
    try {
      const saved = uni.getStorageSync(CALL_MODE_KEY) as string
      if (saved === 'native' || saved === 'cloud') return saved
    } catch {
      // ignore
    }
    return 'native'
  }

  return {
    pendingCall,
    pending,
    callMode,
    isInCall,
    hasRememberedMode,
    setPendingCall,
    markReturned,
    setCallMode,
    clearRememberedMode,
    clearPendingCall,
  }
})
