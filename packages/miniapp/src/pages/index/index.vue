<template>
  <view class="workbench-page">
    <TabBar :selected="0" />

    <!-- Scroll content with pull-to-refresh -->
    <scroll-view
      scroll-y
      class="scroll-content"
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- Welcome Section -->
      <view class="welcome-section">
        <view class="welcome-row">
          <view>
            <text class="welcome-text">{{ greeting }}，{{ userStore.displayName }}</text>
            <text class="date-text">{{ todayStr }}</text>
          </view>
        </view>
      </view>

      <!-- Todo Summary Card -->
      <view class="card todo-card" @click="navigateTo('/pages/follow-up/create')">
        <view class="card-header">
          <text class="card-title">今日待办</text>
          <text class="card-action">查看全部 &gt;</text>
        </view>
        <view class="todo-stats">
          <view class="todo-stat-item">
            <text class="stat-number">{{ todoCount }}</text>
            <text class="stat-label">待跟进客户</text>
          </view>
          <view class="todo-stat-item">
            <text class="stat-number">{{ overdueCount }}</text>
            <text class="stat-label">已逾期</text>
          </view>
        </view>
      </view>

      <!-- Performance Card -->
      <view class="card performance-card">
        <view class="card-header">
          <text class="card-title">本月业绩</text>
          <text class="card-action" @click="switchToPerformance">详情 &gt;</text>
        </view>
        <view class="performance-items">
          <view
            v-for="item in overviewItems"
            :key="item.metricType"
            class="perf-item"
          >
            <text class="perf-value">{{ formatValue(item.achievedValue) }}</text>
            <view class="perf-progress">
              <view
                class="perf-progress-bar"
                :style="{ width: Math.min(item.achievementRate, 100) + '%' }"
              />
            </view>
            <text class="perf-label">{{ metricLabel(item.metricType) }}</text>
            <text class="perf-target">目标 {{ formatValue(item.targetValue) }}</text>
          </view>
        </view>
      </view>

      <!-- Quick Entry Buttons -->
      <view class="quick-entry">
        <view class="entry-item" @click="switchToCustomer">
          <view class="entry-icon" style="background: #409eff">
            <text class="entry-icon-text">&#x1F465;</text>
          </view>
          <text class="entry-label">客户列表</text>
        </view>
        <view class="entry-item" @click="navigateTo('/pages/follow-up/create')">
          <view class="entry-icon" style="background: #67c23a">
            <text class="entry-icon-text">&#x1F4DD;</text>
          </view>
          <text class="entry-label">新建跟进</text>
        </view>
        <view class="entry-item" @click="navigateTo('/pages/check-in/index')">
          <view class="entry-icon" style="background: #e6a23c">
            <text class="entry-icon-text">&#x1F4CD;</text>
          </view>
          <text class="entry-label">外勤打卡</text>
        </view>
        <view class="entry-item" @click="navigateTo('/pages/route/plan')">
          <view class="entry-icon" style="background: #f56c6c">
            <text class="entry-icon-text">&#x1F5FA;</text>
          </view>
          <text class="entry-label">路线规划</text>
        </view>
      </view>

      <!-- Bottom spacer for TabBar -->
      <view style="height: 140rpx" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabBar from '@/components/TabBar.vue'
import { useUserStore } from '@/stores/user'
import { followUpApi } from '@/api/follow-up'
import { salesTargetApi, type OverviewItem, TargetMetricType } from '@/api/sales-target'

const userStore = useUserStore()
const isRefreshing = ref(false)
const todoCount = ref(0)
const overdueCount = ref(0)
const overviewItems = ref<OverviewItem[]>([])

const todayStr = computed(() => {
  const now = new Date()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 周${weekDays[now.getDay()]}`
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

function metricLabel(type: string): string {
  const map: Record<string, string> = {
    revenue: '收入金额',
    deal_count: '成交数',
    new_customer: '新客户',
    call_count: '通话数',
  }
  return map[type] || type
}

function formatValue(value: number): string {
  if (value >= 10000) {
    return (value / 10000).toFixed(1) + '万'
  }
  return String(value)
}

async function loadData() {
  try {
    // Load today's follow-ups
    const today = new Date().toISOString().split('T')[0]
    const followUpRes = await followUpApi.getList({
      nextFollowUpDate: today,
      page: 1,
      pageSize: 1,
    })
    if (followUpRes.code === 0 && followUpRes.data) {
      todoCount.value = followUpRes.data.total
    }
  } catch {
    // Silently fail
  }

  try {
    // Load performance overview
    const overviewRes = await salesTargetApi.getOverview(new Date().getFullYear())
    if (overviewRes.code === 0 && overviewRes.data) {
      overviewItems.value = overviewRes.data
    }
  } catch {
    // Silently fail
  }
}

async function onRefresh() {
  isRefreshing.value = true
  await loadData()
  isRefreshing.value = false
}

function navigateTo(url: string) {
  uni.navigateTo({ url })
}

function switchToCustomer() {
  uni.switchTab({ url: '/pages/customer/list' })
}

function switchToPerformance() {
  uni.switchTab({ url: '/pages/performance/index' })
}

onMounted(() => {
  loadData()
})

onShow(() => {
  loadData()
})
</script>

<style scoped>
.workbench-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.scroll-content {
  height: 100vh;
}

.welcome-section {
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  padding: 60rpx 32rpx 40rpx;
}

.welcome-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-text {
  font-size: 36rpx;
  color: #ffffff;
  font-weight: bold;
  display: block;
  margin-bottom: 8rpx;
}

.date-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.card {
  margin: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
}

.card-action {
  font-size: 24rpx;
  color: #409eff;
}

.todo-stats {
  display: flex;
  gap: 40rpx;
}

.todo-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 48rpx;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #999999;
}

.performance-items {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}

.perf-item {
  flex: 1;
  min-width: 40%;
  display: flex;
  flex-direction: column;
}

.perf-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 8rpx;
}

.perf-progress {
  height: 8rpx;
  background: #f0f0f0;
  border-radius: 4rpx;
  margin-bottom: 8rpx;
  overflow: hidden;
}

.perf-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  border-radius: 4rpx;
  transition: width 0.3s;
}

.perf-label {
  font-size: 24rpx;
  color: #666666;
}

.perf-target {
  font-size: 20rpx;
  color: #999999;
}

.quick-entry {
  display: flex;
  justify-content: space-around;
  padding: 32rpx 24rpx;
  background: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
}

.entry-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.entry-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.entry-icon-text {
  font-size: 40rpx;
}

.entry-label {
  font-size: 24rpx;
  color: #666666;
}
</style>
