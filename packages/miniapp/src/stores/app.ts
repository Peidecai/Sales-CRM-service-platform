/**
 * App Store — global app state (unread badge, network status, etc.)
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const unreadCount = ref(0)
  const isOnline = ref(true)

  function setUnreadCount(count: number) {
    unreadCount.value = count
    if (count > 0) {
      uni.setTabBarBadge({ index: 3, text: count > 99 ? '99+' : String(count) })
    } else {
      uni.removeTabBarBadge({ index: 3 })
    }
  }

  function setOnlineStatus(online: boolean) {
    isOnline.value = online
  }

  return {
    unreadCount,
    isOnline,
    setUnreadCount,
    setOnlineStatus,
  }
})
