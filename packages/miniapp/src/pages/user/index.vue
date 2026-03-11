<template>
  <view class="user-page">
    <TabBar :selected="3" />

    <!-- User Header -->
    <view class="user-header">
      <view class="avatar-section">
        <view class="avatar">
          <text class="avatar-text">{{ displayInitial }}</text>
        </view>
        <view class="user-info">
          <text class="user-name">{{ userStore.displayName }}</text>
          <text class="user-role">{{ roleLabel }}</text>
        </view>
      </view>
    </view>

    <!-- Menu List -->
    <view class="menu-section">
      <view class="menu-group">
        <view class="menu-item" @click="navigateTo('/pages/message/index')">
          <text class="menu-icon">&#x1F4E9;</text>
          <text class="menu-label">消息中心</text>
          <view v-if="appStore.unreadCount > 0" class="menu-badge">
            {{ appStore.unreadCount > 99 ? '99+' : appStore.unreadCount }}
          </view>
          <text class="menu-arrow">&gt;</text>
        </view>
        <view class="menu-item" @click="navigateTo('/pages/check-in/index')">
          <text class="menu-icon">&#x1F4CD;</text>
          <text class="menu-label">外勤打卡</text>
          <text class="menu-arrow">&gt;</text>
        </view>
        <view class="menu-item" @click="navigateTo('/pages/voice/record')">
          <text class="menu-icon">&#x1F3A4;</text>
          <text class="menu-label">语音记录</text>
          <text class="menu-arrow">&gt;</text>
        </view>
        <view class="menu-item" @click="navigateTo('/pages/route/plan')">
          <text class="menu-icon">&#x1F5FA;</text>
          <text class="menu-label">路线规划</text>
          <text class="menu-arrow">&gt;</text>
        </view>
      </view>

      <view class="menu-group">
        <view class="menu-item" @click="handleAbout">
          <text class="menu-icon">&#x2139;</text>
          <text class="menu-label">关于</text>
          <text class="menu-arrow">&gt;</text>
        </view>
      </view>
    </view>

    <!-- Logout Button -->
    <view class="logout-section">
      <button class="btn-logout" @click="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TabBar from '@/components/TabBar.vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'

const userStore = useUserStore()
const appStore = useAppStore()

const displayInitial = computed(() => {
  const name = userStore.displayName
  return name ? name.charAt(0).toUpperCase() : 'U'
})

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    admin: '管理员',
    manager: '经理',
    sales: '销售',
  }
  return map[userStore.role] || userStore.role
})

function navigateTo(url: string) {
  uni.navigateTo({ url })
}

function handleAbout() {
  uni.showModal({
    title: '关于',
    content: 'AI 智能 CRM 销售管理系统 v1.0.0',
    showCancel: false,
  })
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定退出登录？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
      }
    },
  })
}
</script>

<style scoped>
.user-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 140rpx;
}

.user-header {
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  padding: 80rpx 40rpx 60rpx;
}

.avatar-section {
  display: flex;
  align-items: center;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 28rpx;
}

.avatar-text {
  font-size: 48rpx;
  color: #ffffff;
  font-weight: bold;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 36rpx;
  color: #ffffff;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.user-role {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.2);
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  display: inline-block;
}

.menu-section {
  padding: 24rpx;
}

.menu-group {
  background: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  position: relative;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
  width: 44rpx;
  text-align: center;
}

.menu-label {
  flex: 1;
  font-size: 30rpx;
  color: #333333;
}

.menu-arrow {
  font-size: 28rpx;
  color: #cccccc;
}

.menu-badge {
  min-width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  padding: 0 10rpx;
  background: #ff4d4f;
  color: #ffffff;
  font-size: 20rpx;
  border-radius: 18rpx;
  text-align: center;
  margin-right: 16rpx;
}

.logout-section {
  padding: 40rpx 24rpx;
}

.btn-logout {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #ffffff;
  color: #ff4d4f;
  font-size: 30rpx;
  border-radius: 16rpx;
  border: none;
}

.btn-logout::after {
  border: none;
}
</style>
