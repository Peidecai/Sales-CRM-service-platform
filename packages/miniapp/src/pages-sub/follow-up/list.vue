<template>
  <view class="follow-up-list-page">
    <!-- Search Bar -->
    <SearchBar
      v-model="keyword"
      placeholder="搜索客户名/跟进内容"
      :show-filter="false"
      @search="onSearch"
    />

    <!-- Time Filter Tabs -->
    <view class="filter-tabs">
      <view
        v-for="tab in timeTabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: activeTab === tab.value }"
        @click="selectTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- Follow-up List -->
    <scroll-view
      scroll-y
      class="follow-up-scroll"
      @scrolltolower="loadMore"
      :refresher-triggered="isRefreshing"
      refresher-enabled
      @refresherrefresh="onRefresh"
    >
      <EmptyState
        v-if="list.length === 0 && !loading"
        title="暂无跟进记录"
        description="点击右下角 + 新建跟进"
      />

      <view v-if="list.length > 0" class="timeline-wrapper">
        <view
          v-for="item in list"
          :key="item.id"
          class="timeline-card"
          @click="goCustomerDetail(item.customerId)"
        >
          <view class="timeline-dot" :style="{ backgroundColor: dotColor(item.type) }" />
          <view class="timeline-body">
            <view class="timeline-header">
              <view class="header-left">
                <text class="type-tag" :style="{ color: dotColor(item.type) }">{{ typeLabel(item.type) }}</text>
                <text class="customer-name">{{ item.customerName || '未知客户' }}</text>
              </view>
              <text class="timeline-time">{{ formatTime(item.createdAt) }}</text>
            </view>
            <text class="timeline-content">{{ item.content }}</text>
            <text v-if="item.nextFollowUpNote" class="next-plan">
              下次计划: {{ item.nextFollowUpNote }}
            </text>
          </view>
        </view>
      </view>

      <LoadMore v-if="loading" status="loading" />
      <LoadMore v-else-if="noMore && list.length > 0" status="noMore" />

      <view style="height: 140rpx" />
    </scroll-view>

    <!-- FAB: create follow-up -->
    <view class="fab-btn" @click="goCreate">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SearchBar from '@/components/SearchBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import LoadMore from '@/components/LoadMore.vue'
import { followUpApi, type FollowUpVO, type QueryFollowUpParams } from '@/api/follow-up'

interface FollowUpListItem extends FollowUpVO {
  customerName?: string
}

const typeMap: Record<string, { label: string; color: string }> = {
  call: { label: '电话', color: '#409EFF' },
  visit: { label: '拜访', color: '#67C23A' },
  wechat: { label: '微信', color: '#07C160' },
  email: { label: '邮件', color: '#E6A23C' },
  other: { label: '其他', color: '#909399' },
}

function typeLabel(type: string): string {
  return typeMap[type]?.label ?? type
}

function dotColor(type: string): string {
  return typeMap[type]?.color ?? '#909399'
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const pad = (n: number) => String(n).padStart(2, '0')
  if (isToday) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// --- Time filter tabs ---
type TimeFilter = 'all' | 'today' | 'week' | 'month'

const timeTabs: { label: string; value: TimeFilter }[] = [
  { label: '全部', value: 'all' },
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
]

const activeTab = ref<TimeFilter>('all')
const keyword = ref('')
const list = ref<FollowUpListItem[]>([])
const loading = ref(false)
const noMore = ref(false)
const isRefreshing = ref(false)
const page = ref(1)
const pageSize = 20

function getDateRange(filter: TimeFilter): { start?: string; end?: string } {
  if (filter === 'all') return {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start: Date

  if (filter === 'today') {
    start = today
  } else if (filter === 'week') {
    const day = today.getDay() || 7
    start = new Date(today)
    start.setDate(today.getDate() - day + 1)
  } else {
    start = new Date(today.getFullYear(), today.getMonth(), 1)
  }

  return {
    start: start.toISOString().slice(0, 10),
    end: now.toISOString().slice(0, 10),
  }
}

async function fetchList(reset = false) {
  if (loading.value) return
  if (reset) {
    page.value = 1
    noMore.value = false
    list.value = []
  }

  loading.value = true
  try {
    const dateRange = getDateRange(activeTab.value)
    const params: QueryFollowUpParams & Record<string, unknown> = {
      page: page.value,
      pageSize,
    }
    if (keyword.value.trim()) {
      (params as Record<string, unknown>)['keyword'] = keyword.value.trim()
    }
    if (dateRange.start) {
      (params as Record<string, unknown>)['startDate'] = dateRange.start
    }
    if (dateRange.end) {
      (params as Record<string, unknown>)['endDate'] = dateRange.end
    }

    const res = await followUpApi.getList(params)
    if (res.code === 0 && res.data) {
      const newItems = (res.data.list ?? []) as FollowUpListItem[]
      if (reset) {
        list.value = newItems
      } else {
        list.value.push(...newItems)
      }
      noMore.value = list.value.length >= (res.data.total ?? 0)
      page.value++
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
    isRefreshing.value = false
  }
}

function selectTab(tab: TimeFilter) {
  activeTab.value = tab
  fetchList(true)
}

function onSearch() {
  fetchList(true)
}

function loadMore() {
  if (!noMore.value && !loading.value) {
    fetchList()
  }
}

function onRefresh() {
  isRefreshing.value = true
  fetchList(true)
}

function goCustomerDetail(customerId: number) {
  uni.navigateTo({ url: `/pages-sub/customer/detail?id=${customerId}` })
}

function goCreate() {
  uni.navigateTo({ url: '/pages-sub/follow-up/create' })
}

onShow(() => {
  fetchList(true)
})
</script>

<style scoped>
.follow-up-list-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.filter-tabs {
  display: flex;
  background: #ffffff;
  padding: 0 24rpx;
  border-bottom: 1rpx solid #ebeef5;
}

.filter-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  font-size: 28rpx;
  color: #606266;
  position: relative;
}

.filter-tab.active {
  color: #409eff;
  font-weight: 600;
}

.filter-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 25%;
  right: 25%;
  height: 4rpx;
  background: #409eff;
  border-radius: 2rpx;
}

.follow-up-scroll {
  flex: 1;
  overflow: hidden;
}

.timeline-wrapper {
  padding: 24rpx 24rpx 0;
}

.timeline-card {
  display: flex;
  gap: 20rpx;
  margin-bottom: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.timeline-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 8rpx;
}

.timeline-body {
  flex: 1;
  min-width: 0;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.type-tag {
  font-size: 24rpx;
  font-weight: 600;
}

.customer-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
}

.timeline-time {
  font-size: 22rpx;
  color: #909399;
  flex-shrink: 0;
}

.timeline-content {
  font-size: 26rpx;
  color: #606266;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.next-plan {
  display: block;
  font-size: 24rpx;
  color: #409eff;
  margin-top: 12rpx;
}

.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(64, 158, 255, 0.4);
  z-index: 100;
}

.fab-icon {
  font-size: 48rpx;
  color: #ffffff;
  line-height: 1;
}
</style>
