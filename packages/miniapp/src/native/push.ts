/**
 * Push notification registration and handling
 *
 * APP-PLUS: registers device token via plus.push, listens for click/receive events
 * Non-APP: no-op stubs
 */

import { http } from '../api/request'
import { useAppStore } from '../stores/app'

export interface PushRegistrationResult {
  deviceToken: string
  platform: string
}

export interface PushMessage {
  type: string
  targetId?: string
  title?: string
  content?: string
}

/**
 * Register device for push notifications and set up click + receive handlers.
 * Returns device token info on success, null on failure or non-APP platform.
 */
export async function registerPush(): Promise<PushRegistrationResult | null> {
  // #ifdef APP-PLUS
  try {
    const info = plus.push.getClientInfo()
    const platform = uni.getSystemInfoSync().platform // 'android' | 'ios'

    // 注册先上报服务端，再绑定本地事件，避免无 token 的点击事件进入业务路由。
    await http.post('/push/register', {
      deviceToken: info.clientid,
      platform,
    })

    // Listen for push notification clicks (background → tap)
    plus.push.addEventListener('click', (msg: unknown) => {
      try {
        const raw = msg as { payload: string | Record<string, unknown> }
        // 厂商推送 payload 可能是字符串或对象，两种格式都按同一结构归一化。
        const payload: PushMessage =
          typeof raw.payload === 'string' ? JSON.parse(raw.payload) as PushMessage : raw.payload as unknown as PushMessage
        handlePushNavigation(payload)
      } catch (e) {
        console.warn('[Push] Failed to parse click payload:', e)
      }
    })

    // Listen for foreground push receive
    plus.push.addEventListener('receive', (msg: unknown) => {
      try {
        const raw = msg as { payload: string | Record<string, unknown>; title?: string; content?: string }
        // 前台收到通知只更新未读数和轻提示，不直接跳转打断当前操作。
        const payload: PushMessage =
          typeof raw.payload === 'string' ? JSON.parse(raw.payload) as PushMessage : raw.payload as unknown as PushMessage

        // Update badge count
        incrementUnreadCount()

        // Show in-app notification toast
        const title = raw.title || payload.title || '新消息'
        const content = raw.content || payload.content || ''
        uni.showToast({
          title: content ? `${title}: ${content}` : title,
          icon: 'none',
          duration: 3000,
        })
      } catch (e) {
        console.warn('[Push] Failed to handle receive event:', e)
      }
    })

    return { deviceToken: info.clientid as string, platform }
  } catch (e) {
    console.warn('[Push] Registration failed:', e)
    return null
  }
  // #endif

  // #ifndef APP-PLUS
  return null
  // #endif
}

/**
 * Unregister device from push notifications
 */
export async function unregisterPush(): Promise<boolean> {
  // #ifdef APP-PLUS
  try {
    const info = plus.push.getClientInfo()
    await http.post('/push/unregister', {
      deviceToken: info.clientid,
    })
    return true
  } catch (e) {
    console.warn('[Push] Unregister failed:', e)
    return false
  }
  // #endif

  // #ifndef APP-PLUS
  return false
  // #endif
}

/**
 * Navigate to the appropriate page based on push message type
 */
function handlePushNavigation(payload: PushMessage): void {
  const { type, targetId } = payload
  // 未识别类型统一进入消息中心，避免推送点击无响应。
  switch (type) {
    case 'follow_up':
      if (targetId) {
        uni.navigateTo({ url: `/pages-sub/customer/detail?id=${targetId}` })
      }
      break
    case 'opportunity':
      if (targetId) {
        uni.navigateTo({ url: `/pages-sub/opportunity/detail?id=${targetId}` })
      }
      break
    case 'call_record':
      if (targetId) {
        uni.navigateTo({ url: `/pages-sub/call/detail?id=${targetId}` })
      }
      break
    case 'system':
      uni.navigateTo({ url: '/pages-sub/other/message/index' })
      break
    case 'check_in':
      uni.navigateTo({ url: '/pages-sub/other/check-in/index' })
      break
    case 'approval':
      uni.navigateTo({ url: '/pages-sub/other/message/index' })
      break
    default:
      uni.navigateTo({ url: '/pages-sub/other/message/index' })
      break
  }
}

/**
 * Increment the unread count in the app store and update native badge
 */
function incrementUnreadCount(): void {
  try {
    const appStore = useAppStore()
    appStore.setUnreadCount(appStore.unreadCount + 1)
  } catch (e) {
    console.warn('[Push] Failed to update unread count:', e)
  }

  // #ifdef APP-PLUS
  try {
    plus.runtime.setBadgeNumber(plus.push.getClientInfo().appid ? 1 : 0)
  } catch {
    // Badge API may not be available
  }
  // #endif
}
