<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useCallStateStore } from '@/stores/call-state'
import { autoCheckUpdate } from '@/utils/update-checker'
import { reportError } from '@/utils/error-reporter'

let navigatingToAfterCall = false

// Global error capture
uni.onError((error: string) => {
  reportError(error)
})

onLaunch(() => {
  const userStore = useUserStore()
  const appStore = useAppStore()

  // Navigation guard: check token on launch, redirect to login if absent
  if (!userStore.token) {
    const pages = getCurrentPages()
    const currentPath = pages.length > 0 ? pages[pages.length - 1].route : ''
    if (currentPath !== 'pages/login/index') {
      uni.reLaunch({ url: '/pages/login/index' })
    }
  } else {
    // Restore user profile from server
    userStore.fetchProfile()
  }

  // Check for app updates (APP-PLUS only)
  autoCheckUpdate()

  // Monitor network status changes
  uni.onNetworkStatusChange((res) => {
    appStore.setOnlineStatus(res.isConnected)
  })
})

onShow(() => {
  // Silently check network on foreground
  uni.getNetworkType({
    success: (res) => {
      const appStore = useAppStore()
      appStore.setOnlineStatus(res.networkType !== 'none')
    },
  })

  // 用户从系统拨号返回小程序时，用 pendingCall 恢复到通话结果补录页。
  const callState = useCallStateStore()
  const userStore = useUserStore()
  if (callState.pending && userStore.token && !navigatingToAfterCall) {
    callState.markReturned()
    navigatingToAfterCall = true
    // 延迟半秒等页面栈恢复，避免 onShow 中立即 navigateTo 被系统恢复流程吞掉。
    setTimeout(() => {
      const pages = getCurrentPages()
      const currentPath = pages.length > 0 ? pages[pages.length - 1].route : ''
      // Avoid navigating if already on after-call page
      if (currentPath !== 'pages-sub/call/after-call') {
        uni.navigateTo({
          url: '/pages-sub/call/after-call',
          complete: () => { navigatingToAfterCall = false },
        })
      } else {
        navigatingToAfterCall = false
      }
    }, 500)
  }
})
</script>

<style>
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  font-size: 28rpx;
  color: #333333;
}

.container {
  padding: 24rpx;
}
</style>
