<template>
  <view class="custom-tab-bar">
    <view
      v-for="(item, index) in tabList"
      :key="item.pagePath"
      class="tab-item"
      :class="{ active: selected === index }"
      @click="handleTabClick(index)"
    >
      <!-- Center "+" button -->
      <view v-if="item.isCenter" class="center-btn">
        <text class="center-icon">+</text>
      </view>
      <template v-else>
        <image
          class="tab-icon"
          :src="selected === index ? item.selectedIconPath : item.iconPath"
          mode="aspectFit"
        />
        <text class="tab-text">{{ item.text }}</text>
        <view v-if="item.badge && item.badge > 0" class="badge">
          {{ item.badge > 99 ? '99+' : item.badge }}
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'

interface TabItem {
  pagePath: string
  text: string
  iconPath: string
  selectedIconPath: string
  isCenter?: boolean
  badge?: number
}

const props = defineProps<{
  selected: number
}>()

const appStore = useAppStore()

const tabList = ref<TabItem[]>([
  {
    pagePath: '/pages/index/index',
    text: '工作台',
    iconPath: '/static/tabbar/home.png',
    selectedIconPath: '/static/tabbar/home-active.png',
  },
  {
    pagePath: '/pages/customer/list',
    text: '客户',
    iconPath: '/static/tabbar/customer.png',
    selectedIconPath: '/static/tabbar/customer-active.png',
  },
  {
    pagePath: '',
    text: '',
    iconPath: '',
    selectedIconPath: '',
    isCenter: true,
  },
  {
    pagePath: '/pages/performance/index',
    text: '业绩',
    iconPath: '/static/tabbar/performance.png',
    selectedIconPath: '/static/tabbar/performance-active.png',
  },
  {
    pagePath: '/pages/user/index',
    text: '我的',
    iconPath: '/static/tabbar/user.png',
    selectedIconPath: '/static/tabbar/user-active.png',
    badge: 0,
  },
])

// Sync unread badge count
watch(
  () => appStore.unreadCount,
  (count) => {
    tabList.value[4].badge = count
  },
  { immediate: true },
)

function handleTabClick(index: number) {
  const item = tabList.value[index]

  // Center "+" button → show action sheet
  if (item.isCenter) {
    showQuickActions()
    return
  }

  if (item.pagePath) {
    uni.switchTab({ url: item.pagePath })
  }
}

function showQuickActions() {
  uni.showActionSheet({
    itemList: ['新建跟进', '外勤打卡', '语音记录', '路线规划'],
    success: (res) => {
      const routes = [
        '/pages-sub/follow-up/create',
        '/pages-sub/other/check-in/index',
        '/pages-sub/other/voice/record',
        '/pages-sub/other/route/plan',
      ]
      uni.navigateTo({ url: routes[res.tapIndex] })
    },
  })
}
</script>

<style scoped>
.custom-tab-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 110rpx;
  background: #ffffff;
  border-top: 1rpx solid #eeeeee;
  padding-bottom: env(safe-area-inset-bottom);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 110rpx;
  position: relative;
}

.tab-item.active .tab-text {
  color: #409eff;
}

.tab-icon {
  width: 48rpx;
  height: 48rpx;
  margin-bottom: 4rpx;
}

.tab-text {
  font-size: 20rpx;
  color: #999999;
}

.center-btn {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(64, 158, 255, 0.4);
}

.center-icon {
  color: #ffffff;
  font-size: 52rpx;
  font-weight: 300;
  line-height: 1;
}

.badge {
  position: absolute;
  top: 8rpx;
  right: 16rpx;
  min-width: 32rpx;
  height: 32rpx;
  line-height: 32rpx;
  padding: 0 8rpx;
  background: #ff4d4f;
  color: #ffffff;
  font-size: 18rpx;
  border-radius: 16rpx;
  text-align: center;
}
</style>
