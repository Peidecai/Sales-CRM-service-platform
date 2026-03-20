<template>
  <view class="user-page">
    <TabBar :selected="4" />

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

    <!-- Performance Overview -->
    <view class="performance-section">
      <view class="section-title">
        <text class="section-title-text">业绩概览</text>
      </view>
      <view class="stats-row">
        <StatsCard label="本月" :value="perfData.month" prefix="¥" />
        <StatsCard label="本季" :value="perfData.quarter" prefix="¥" />
        <StatsCard label="本年" :value="perfData.year" prefix="¥" />
      </view>
    </view>

    <!-- Menu List -->
    <view class="menu-section">
      <view class="menu-group">
        <ListItem
          title="消息中心"
          icon="&#x1F4E9;"
          :extra="unreadText"
          @click="navigateTo('/pages-sub/other/message/index')"
        />
        <ListItem
          title="通知设置"
          icon="&#x1F514;"
          @click="navigateTo('/pages-sub/user/notification-settings')"
        />
        <!-- #ifdef APP-PLUS -->
        <ListItem
          v-if="simResult.supported"
          title="双卡设置"
          icon="&#x1F4F1;"
          :extra="simExtra"
          @click="showSimPicker"
        />
        <!-- #endif -->
        <ListItem
          title="外呼模式选择"
          icon="&#x1F4DE;"
          :extra="callModeLabel"
          @click="showCallModePicker"
        />
        <!-- #ifdef APP-PLUS -->
        <ListItem
          title="版本更新"
          icon="&#x1F504;"
          :extra="currentVersion"
          @click="checkUpdate"
        />
        <!-- #endif -->
        <ListItem
          title="隐私协议"
          icon="&#x1F512;"
          @click="navigateTo('/pages-sub/user/privacy')"
        />
        <ListItem
          title="关于我们"
          icon="&#x2139;"
          :show-arrow="false"
          extra="v1.0.0"
          @click="handleAbout"
        />
      </view>
    </view>

    <!-- Logout Button -->
    <view class="logout-section">
      <button class="btn-logout" @click="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TabBar from '@/components/TabBar.vue'
import StatsCard from '@/components/StatsCard.vue'
import ListItem from '@/components/ListItem.vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useCallStateStore, type CallMode } from '@/stores/call-state'
import { salesTargetApi, type OverviewItem } from '@/api/sales-target'
import { TargetMetricType } from '@crm/shared'
// #ifdef APP-PLUS
import { getSimCards, getPreferredSimSlot, setPreferredSimSlot, type SimDetectionResult } from '@/native/sim-card'
// #endif

const userStore = useUserStore()
const appStore = useAppStore()
const callStateStore = useCallStateStore()

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

const unreadText = computed(() => {
  if (appStore.unreadCount <= 0) return ''
  return appStore.unreadCount > 99 ? '99+' : String(appStore.unreadCount)
})

// --- Performance Overview ---
const perfData = ref({ month: 0, quarter: 0, year: 0 })

async function loadPerformance(): Promise<void> {
  try {
    const now = new Date()
    const year = now.getFullYear()
    const res = await salesTargetApi.getOverview(year)
    if (res.code === 0 && res.data) {
      const revenueItem = res.data.find(
        (item: OverviewItem) => item.metricType === TargetMetricType.REVENUE,
      )
      if (revenueItem) {
        perfData.value = {
          month: revenueItem.achievedValue,
          quarter: revenueItem.targetValue,
          year: revenueItem.targetValue,
        }
      }
    }
  } catch {
    // Silently fail
  }
}

// --- SIM Card (APP-PLUS only) ---
// #ifdef APP-PLUS
const simResult = ref<SimDetectionResult>(getSimCards())
const preferredSlot = ref<number | null>(getPreferredSimSlot())

const simExtra = computed(() => {
  if (preferredSlot.value !== null) {
    const card = simResult.value.cards.find((c) => c.slot === preferredSlot.value)
    return card ? `SIM${card.slot + 1} ${card.carrier}` : `SIM${preferredSlot.value + 1}`
  }
  return '未设置'
})

function showSimPicker(): void {
  const items = simResult.value.cards.map(
    (c) => `SIM${c.slot + 1} - ${c.carrier}`,
  )
  items.push('取消设置')
  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      if (res.tapIndex < simResult.value.cards.length) {
        const slot = simResult.value.cards[res.tapIndex].slot
        setPreferredSimSlot(slot)
        preferredSlot.value = slot
      } else {
        setPreferredSimSlot(null)
        preferredSlot.value = null
      }
    },
  })
}
// #endif

// #ifndef APP-PLUS
const simResult = ref({ supported: false, cards: [] as Array<{ slot: number; carrier: string }> })
// #endif

// --- Call Mode ---
const callModeLabels: Record<string, string> = {
  native: '原生拨号',
  cloud: '云呼录音',
  ask: '每次询问',
}

const callModeLabel = computed(() => callModeLabels[callStateStore.callMode] || '原生拨号')

function showCallModePicker(): void {
  const modes: Array<{ value: CallMode | 'ask'; label: string }> = [
    { value: 'native', label: '原生拨号' },
    { value: 'cloud', label: '云呼录音' },
  ]
  uni.showActionSheet({
    itemList: modes.map((m) => m.label),
    success: (res) => {
      const selected = modes[res.tapIndex]
      if (selected) {
        callStateStore.setCallMode(selected.value as CallMode, true)
      }
    },
  })
}

// --- Version Update (APP-PLUS only) ---
const currentVersion = ref('v1.0.0')

// #ifdef APP-PLUS
onMounted(() => {
  try {
    currentVersion.value = 'v' + (plus.runtime.version || '1.0.0')
  } catch {
    // ignore
  }
})
// #endif

function checkUpdate(): void {
  // #ifdef APP-PLUS
  uni.showLoading({ title: '检查更新...' })
  uni.request({
    url: `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/app/version`,
    success: (res) => {
      uni.hideLoading()
      const data = res.data as { code: number; data?: { version: string; downloadUrl?: string; description?: string } }
      if (data.code === 0 && data.data) {
        const latest = data.data.version
        const current = plus.runtime.version || '1.0.0'
        if (latest > current) {
          uni.showModal({
            title: `发现新版本 v${latest}`,
            content: data.data.description || '有新版本可用，是否更新？',
            confirmText: '立即更新',
            success: (modalRes) => {
              if (modalRes.confirm && data.data?.downloadUrl) {
                plus.runtime.openURL(data.data.downloadUrl)
              }
            },
          })
        } else {
          uni.showToast({ title: '已是最新版本', icon: 'none' })
        }
      } else {
        uni.showToast({ title: '检查失败', icon: 'none' })
      }
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '网络错误', icon: 'none' })
    },
  })
  // #endif

  // #ifndef APP-PLUS
  uni.showToast({ title: '仅 APP 端支持更新检测', icon: 'none' })
  // #endif
}

// --- Navigation ---
function navigateTo(url: string): void {
  uni.navigateTo({ url })
}

function handleAbout(): void {
  uni.showModal({
    title: '关于我们',
    content: 'AI 智能 CRM 销售管理系统 v1.0.0',
    showCancel: false,
  })
}

function handleLogout(): void {
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

onMounted(() => {
  loadPerformance()
})
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

.performance-section {
  margin: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.section-title {
  margin-bottom: 20rpx;
}

.section-title-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #303133;
}

.stats-row {
  display: flex;
  gap: 16rpx;
}

.menu-section {
  padding: 0 24rpx;
}

.menu-group {
  background: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}

.menu-group :deep(.list-item) {
  border-bottom: 1rpx solid #f0f0f0;
}

.menu-group :deep(.list-item:last-child) {
  border-bottom: none;
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
