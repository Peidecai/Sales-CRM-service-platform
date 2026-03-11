<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'

onLaunch(() => {
  console.log('[CRM MiniApp] App launched')

  // Navigation guard: check token on launch, redirect to login if absent
  const userStore = useUserStore()
  if (!userStore.token) {
    const pages = getCurrentPages()
    const currentPath = pages.length > 0 ? pages[pages.length - 1].route : ''
    if (currentPath !== 'pages/login/index') {
      uni.reLaunch({ url: '/pages/login/index' })
    }
  }
})

onShow(() => {
  console.log('[CRM MiniApp] App shown')
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
