<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useCallStateStore } from '@/stores/call-state'

let navigatingToAfterCall = false

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

  // Detect pending call and navigate to after-call page
  const callState = useCallStateStore()
  const userStore = useUserStore()
  if (callState.pending && userStore.token && !navigatingToAfterCall) {
    callState.markReturned()
    navigatingToAfterCall = true
    // Delay slightly to let the app fully resume
    setTimeout(() => {
      const pages = getCurrentPages()
      const currentPath = pages.length > 0 ? pages[pages.length - 1].route : ''
      // Avoid navigating if already on after-call page
      if (currentPath !== 'pages/call/after-call') {
        uni.navigateTo({
          url: '/pages/call/after-call',
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
