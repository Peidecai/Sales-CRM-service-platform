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
      <!-- Header with notification badge -->
      <view class="header-section">
        <view class="header-left">
          <view>
            <text class="welcome-text">{{ greeting }}，{{ userStore.displayName }}</text>
            <text class="date-text">{{ todayStr }}</text>
          </view>
        </view>
        <view class="header-right">
          <view class="notification-btn" @click="goToMessages">
            <text class="notification-icon">&#x1F514;</text>
            <view v-if="unreadCount > 0" class="badge">
              <text class="badge-text">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
            </view>
          </view>
          <!-- Scope toggle for Admin/Manager -->
          <view
            v-if="canToggleScope"
            class="scope-toggle"
            @click="toggleScope"
          >
            <text class="scope-text">{{ scope === 'personal' ? '个人' : '团队' }}</text>
            <text class="scope-arrow">&#x25BC;</text>
          </view>
        </view>
      </view>

      <!-- Stats Cards Grid (skeleton or data) -->
      <view class="stats-grid">
        <template v-if="loading">
          <view v-for="i in 4" :key="i" class="skeleton-card">
            <view class="skeleton-line short" />
            <view class="skeleton-line long" />
          </view>
        </template>
        <template v-else>
          <StatsCard
            label="今日通话"
            :value="stats.todayCalls"
            :trend="stats.todayCallsTrend"
            @click="goToCallRecords"
          />
          <StatsCard
            label="新增客户"
            :value="stats.newCustomers"
            :trend="stats.newCustomersTrend"
            @click="switchToCustomer"
          />
          <StatsCard
            label="待跟进"
            :value="stats.pendingFollowUps"
            :trend="stats.pendingFollowUpsTrend"
            @click="goToFollowUp"
          />
          <StatsCard
            label="本月业绩"
            :value="stats.monthRevenue"
            prefix="¥"
            :trend="stats.monthRevenueTrend"
            @click="switchToPerformance"
          />
        </template>
      </view>

      <!-- Quick Entry Buttons -->
      <view class="quick-entry card">
        <view class="card-header">
          <text class="card-title">快捷操作</text>
        </view>
        <view class="entry-row">
          <view class="entry-item" @click="navigateTo('/pages-sub/other/voice/record')">
            <view class="entry-icon" style="background: #409eff">
              <text class="entry-icon-text">&#x1F4DE;</text>
            </view>
            <text class="entry-label">拨号</text>
          </view>
          <view class="entry-item" @click="switchToCustomer">
            <view class="entry-icon" style="background: #67c23a">
              <text class="entry-icon-text">&#x1F465;</text>
            </view>
            <text class="entry-label">新客户</text>
          </view>
          <view class="entry-item" @click="navigateTo('/pages-sub/follow-up/create')">
            <view class="entry-icon" style="background: #e6a23c">
              <text class="entry-icon-text">&#x1F4DD;</text>
            </view>
            <text class="entry-label">跟进</text>
          </view>
          <view class="entry-item" @click="navigateTo('/pages-sub/other/check-in/index')">
            <view class="entry-icon" style="background: #f56c6c">
              <text class="entry-icon-text">&#x1F4CD;</text>
            </view>
            <text class="entry-label">打卡</text>
          </view>
        </view>
      </view>

      <!-- Today's Todo List -->
      <view class="card">
        <view class="card-header">
          <text class="card-title">今日待办</text>
          <text class="card-action" @click="goToFollowUp">全部 &gt;</text>
        </view>
        <template v-if="loading">
          <view v-for="i in 3" :key="i" class="skeleton-todo">
            <view class="skeleton-line long" />
            <view class="skeleton-line short" />
          </view>
        </template>
        <template v-else-if="todoList.length > 0">
          <view
            v-for="item in todoList"
            :key="item.id"
            class="todo-item"
            @click="goToCustomerDetail(item.customerId)"
          >
            <view class="todo-dot" :class="item.isOverdue ? 'overdue' : ''" />
            <view class="todo-info">
              <text class="todo-title">{{ item.content }}</text>
              <text class="todo-meta">
                {{ item.customerName || '未知客户' }}
                <text v-if="item.nextFollowUpDate" class="todo-time"> — {{ formatTime(item.nextFollowUpDate) }}</text>
              </text>
            </view>
            <text v-if="item.isOverdue" class="todo-tag overdue-tag">逾期</text>
          </view>
        </template>
        <EmptyState v-else title="暂无待办" description="今天没有需要跟进的任务" />
      </view>

      <!-- PK Progress -->
      <view v-if="pkTarget" class="card">
        <view class="card-header">
          <text class="card-title">PK 进展</text>
          <text class="card-action" @click="switchToPerformance">详情 &gt;</text>
        </view>
        <view class="pk-section">
          <view class="pk-info">
            <text class="pk-name">{{ pkTarget.name }}</text>
            <text class="pk-rate">{{ pkTarget.rate }}%</text>
          </view>
          <view class="pk-bar-bg">
            <view
              class="pk-bar-fill"
              :style="{ width: Math.min(pkTarget.rate, 100) + '%' }"
              :class="pkBarClass"
            />
          </view>
          <view class="pk-values">
            <text class="pk-achieved">已完成 {{ formatMoney(pkTarget.achieved) }}</text>
            <text class="pk-target-val">目标 {{ formatMoney(pkTarget.target) }}</text>
          </view>
        </view>
      </view>

      <!-- Bottom spacer for TabBar + FAB -->
      <view style="height: 260rpx" />
    </scroll-view>

    <!-- AI Assistant FAB -->
    <view class="ai-fab" @click="goToAiChat">
      <text class="ai-fab-icon">&#x1F916;</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import TabBar from '@/components/TabBar.vue'
import StatsCard from '@/components/StatsCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useUserStore } from '@/stores/user'
import { dashboardApi, type DashboardStats } from '@/api/dashboard'
import { followUpApi, type FollowUpVO } from '@/api/follow-up'
import { salesTargetApi, type OverviewItem } from '@/api/sales-target'
import { notificationApi } from '@/api/notification'

const userStore = useUserStore()
const loading = ref(true)
const isRefreshing = ref(false)
const unreadCount = ref(0)
const scope = ref<'personal' | 'team'>('personal')

// Stats data
const stats = ref<DashboardStats>({
  todayCalls: 0,
  todayCallsTrend: 0,
  newCustomers: 0,
  newCustomersTrend: 0,
  pendingFollowUps: 0,
  pendingFollowUpsTrend: 0,
  monthRevenue: 0,
  monthRevenueTrend: 0,
})

// Todo list
interface TodoItem {
  id: number
  customerId: number
  customerName: string
  content: string
  nextFollowUpDate: string | null
  isOverdue: boolean
}
const todoList = ref<TodoItem[]>([])

// PK target
interface PkTargetInfo {
  name: string
  achieved: number
  target: number
  rate: number
}
const pkTarget = ref<PkTargetInfo | null>(null)

// Computed
const canToggleScope = computed(() => {
  const role = userStore.role
  return role === 'admin' || role === 'manager'
})

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

const pkBarClass = computed(() => {
  if (!pkTarget.value) return ''
  const rate = pkTarget.value.rate
  if (rate >= 80) return 'pk-bar-good'
  if (rate >= 50) return 'pk-bar-mid'
  return 'pk-bar-low'
})

// Functions
function toggleScope() {
  scope.value = scope.value === 'personal' ? 'team' : 'personal'
  loadData()
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatMoney(value: number): string {
  if (value >= 10000) {
    return '¥' + (value / 10000).toFixed(1) + '万'
  }
  return '¥' + String(value)
}

async function loadData() {
  loading.value = true

  await Promise.allSettled([
    loadStats(),
    loadTodos(),
    loadPkTarget(),
    loadUnreadCount(),
  ])

  loading.value = false
}

async function loadStats() {
  try {
    const res = await dashboardApi.getStats(scope.value)
    if (res.code === 0 && res.data) {
      stats.value = res.data
    }
  } catch {
    // Silently fail — stats show 0
  }
}

async function loadTodos() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const [todayRes, overdueRes] = await Promise.allSettled([
      followUpApi.getList({ nextFollowUpDate: today, page: 1, pageSize: 5 }),
      followUpApi.getList({ nextFollowUpDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], page: 1, pageSize: 3 }),
    ])

    const items: TodoItem[] = []

    // Overdue items first
    if (overdueRes.status === 'fulfilled' && overdueRes.value.code === 0 && overdueRes.value.data) {
      for (const fu of overdueRes.value.data.list as (FollowUpVO & { customer?: { name: string } })[]) {
        items.push({
          id: fu.id,
          customerId: fu.customerId,
          customerName: (fu as FollowUpVO & { customer?: { name: string } }).customer?.name || '',
          content: fu.content || fu.nextFollowUpNote || '跟进客户',
          nextFollowUpDate: fu.nextFollowUpDate,
          isOverdue: true,
        })
      }
    }

    // Today's items
    if (todayRes.status === 'fulfilled' && todayRes.value.code === 0 && todayRes.value.data) {
      for (const fu of todayRes.value.data.list as (FollowUpVO & { customer?: { name: string } })[]) {
        items.push({
          id: fu.id,
          customerId: fu.customerId,
          customerName: (fu as FollowUpVO & { customer?: { name: string } }).customer?.name || '',
          content: fu.content || fu.nextFollowUpNote || '跟进客户',
          nextFollowUpDate: fu.nextFollowUpDate,
          isOverdue: false,
        })
      }
    }

    todoList.value = items.slice(0, 6)
  } catch {
    todoList.value = []
  }
}

async function loadPkTarget() {
  try {
    const year = new Date().getFullYear()
    const res = await salesTargetApi.getOverview(year)
    if (res.code === 0 && res.data && res.data.length > 0) {
      // Use revenue metric as PK target
      const revenue = res.data.find((item: OverviewItem) => item.metricType === 'revenue' as unknown) || res.data[0]
      pkTarget.value = {
        name: metricLabel(String(revenue.metricType)),
        achieved: revenue.achievedValue,
        target: revenue.targetValue,
        rate: revenue.targetValue > 0 ? Math.round((revenue.achievedValue / revenue.targetValue) * 100) : 0,
      }
    }
  } catch {
    pkTarget.value = null
  }
}

async function loadUnreadCount() {
  try {
    const res = await notificationApi.getUnreadCount()
    if (res.code === 0 && res.data) {
      unreadCount.value = res.data.count
    }
  } catch {
    unreadCount.value = 0
  }
}

function metricLabel(type: string): string {
  const map: Record<string, string> = {
    revenue: '收入金额',
    deal_count: '成交数',
    new_customer: '新客户',
    call_count: '通话数',
  }
  return map[type] || type
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

function goToMessages() {
  uni.navigateTo({ url: '/pages-sub/other/message/index' })
}

function goToFollowUp() {
  uni.navigateTo({ url: '/pages-sub/follow-up/create' })
}

function goToCallRecords() {
  uni.navigateTo({ url: '/pages-sub/other/voice/record' })
}

function goToCustomerDetail(customerId: number) {
  uni.navigateTo({ url: `/pages-sub/customer/detail?id=${customerId}` })
}

function goToAiChat() {
  uni.navigateTo({ url: '/pages-sub/other/ai-chat/index' })
}

onMounted(() => {
  loadData()
})

onShow(() => {
  // Reload on every show for fresh data
  loadData()
})
</script>

<style scoped>
.workbench-page {
  min-height: 100vh;
  background: #f5f5f5;
  position: relative;
}

.scroll-content {
  height: 100vh;
}

/* Header */
.header-section {
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  padding: 60rpx 32rpx 40rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20rpx;
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

.notification-btn {
  position: relative;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-icon {
  font-size: 40rpx;
}

.badge {
  position: absolute;
  top: -4rpx;
  right: -8rpx;
  background: #f56c6c;
  border-radius: 20rpx;
  min-width: 32rpx;
  height: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.badge-text {
  font-size: 20rpx;
  color: #ffffff;
  line-height: 1;
}

.scope-toggle {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 24rpx;
  padding: 8rpx 20rpx;
}

.scope-text {
  font-size: 24rpx;
  color: #ffffff;
}

.scope-arrow {
  font-size: 16rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* Stats Grid */
.stats-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 24rpx;
  margin-top: -20rpx;
}

.stats-grid > :deep(.stats-card) {
  min-width: calc(50% - 8rpx);
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  border-radius: 16rpx;
}

/* Skeleton loading */
.skeleton-card {
  flex: 1;
  min-width: calc(50% - 8rpx);
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  min-height: 140rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.skeleton-line {
  height: 24rpx;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  border-radius: 4rpx;
  margin-bottom: 16rpx;
}

.skeleton-line.short {
  width: 50%;
}

.skeleton-line.long {
  width: 80%;
}

.skeleton-todo {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

/* Card base */
.card {
  margin: 0 24rpx 24rpx;
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

/* Quick Entry */
.entry-row {
  display: flex;
  justify-content: space-around;
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

/* Todo Items */
.todo-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #409eff;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.todo-dot.overdue {
  background: #f56c6c;
}

.todo-info {
  flex: 1;
  min-width: 0;
}

.todo-title {
  font-size: 28rpx;
  color: #333333;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-meta {
  font-size: 22rpx;
  color: #999999;
  display: block;
  margin-top: 6rpx;
}

.todo-time {
  color: #999999;
}

.todo-tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  margin-left: 12rpx;
}

.overdue-tag {
  background: #fef0f0;
  color: #f56c6c;
}

/* PK Progress */
.pk-section {
  /* contained in card */
}

.pk-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.pk-name {
  font-size: 28rpx;
  color: #333333;
  font-weight: 500;
}

.pk-rate {
  font-size: 36rpx;
  font-weight: bold;
  color: #409eff;
}

.pk-bar-bg {
  height: 20rpx;
  background: #f0f0f0;
  border-radius: 10rpx;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.pk-bar-fill {
  height: 100%;
  border-radius: 10rpx;
  transition: width 0.5s ease;
}

.pk-bar-good {
  background: linear-gradient(90deg, #67c23a, #85ce61);
}

.pk-bar-mid {
  background: linear-gradient(90deg, #e6a23c, #ebb563);
}

.pk-bar-low {
  background: linear-gradient(90deg, #f56c6c, #f89898);
}

.pk-values {
  display: flex;
  justify-content: space-between;
}

.pk-achieved {
  font-size: 22rpx;
  color: #666666;
}

.pk-target-val {
  font-size: 22rpx;
  color: #999999;
}

/* AI FAB */
.ai-fab {
  position: fixed;
  right: 32rpx;
  bottom: 200rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #5b6abf);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(64, 158, 255, 0.4);
  z-index: 100;
}

.ai-fab-icon {
  font-size: 44rpx;
}
</style>
