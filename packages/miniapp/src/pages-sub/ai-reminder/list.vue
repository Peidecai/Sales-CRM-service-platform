<template>
  <view class="reminder-list-page">
    <scroll-view
      scroll-y
      class="reminder-scroll"
      @scrolltolower="loadMore"
      :refresher-triggered="isRefreshing"
      refresher-enabled
      @refresherrefresh="onRefresh"
    >
      <EmptyState
        v-if="list.length === 0 && !loading"
        title="暂无提醒"
        description="AI 助手暂无新提醒"
      />

      <view
        v-for="item in list"
        :key="item.id"
        class="reminder-card"
        @click="goDetail(item)"
      >
        <view class="card-top">
          <view class="card-tags">
            <view class="tag" :class="'tag-' + typeColor(item.type)">
              <text class="tag-text">{{ typeLabel(item.type) }}</text>
            </view>
            <view class="tag" :class="'tag-' + priorityColor(item.priority)">
              <text class="tag-text">{{ priorityLabel(item.priority) }}</text>
            </view>
          </view>
          <view v-if="!item.isRead" class="unread-dot" />
        </view>

        <text class="card-title">{{ item.title }}</text>
        <text class="card-content">{{ item.content }}</text>

        <view class="card-footer">
          <text class="card-time">{{ formatDate(item.createdAt) }}</text>
        </view>
      </view>

      <LoadMore v-if="loading" status="loading" />
      <LoadMore v-else-if="noMore && list.length > 0" status="noMore" />

      <view style="height: 40rpx" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadMore from '@/components/LoadMore.vue'
import EmptyState from '@/components/EmptyState.vue'
import { aiReminderApi, type AiReminderItem } from '@/api/ai-reminder'

const list = ref<AiReminderItem[]>([])
const loading = ref(false)
const isRefreshing = ref(false)
const page = ref(1)
const pageSize = 20
const noMore = ref(false)

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    score_change: '评分',
    risk_alert: '风险',
    next_action: '行动',
    competitor_mention: '竞品',
    follow_up_schedule: '跟进',
    stagnant: '停滞',
  }
  return map[type] ?? type
}

function typeColor(type: string): string {
  const map: Record<string, string> = {
    score_change: 'warning',
    risk_alert: 'danger',
    next_action: 'success',
    competitor_mention: 'danger',
    follow_up_schedule: 'info',
    stagnant: 'warning',
  }
  return map[type] ?? 'info'
}

function priorityLabel(priority: string): string {
  const map: Record<string, string> = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低',
  }
  return map[priority] ?? priority
}

function priorityColor(priority: string): string {
  const map: Record<string, string> = {
    urgent: 'danger',
    high: 'warning',
    medium: 'primary',
    low: 'info',
  }
  return map[priority] ?? 'info'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${min}`
}

function goDetail(item: AiReminderItem) {
  uni.navigateTo({ url: `/pages-sub/ai-reminder/detail?id=${item.id}` })
}

async function loadList() {
  if (loading.value || noMore.value) return
  loading.value = true
  try {
    const res = await aiReminderApi.getReminders({ page: page.value, pageSize })
    if (res.code === 0 && res.data) {
      const newItems = res.data.list
      if (page.value === 1) {
        list.value = newItems
      } else {
        list.value = [...list.value, ...newItems]
      }
      if (newItems.length < pageSize) {
        noMore.value = true
      }
    }
  } catch {
    // handled by request
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!noMore.value && !loading.value) {
    page.value++
    loadList()
  }
}

async function resetAndLoad() {
  page.value = 1
  noMore.value = false
  list.value = []
  await loadList()
}

async function onRefresh() {
  isRefreshing.value = true
  await resetAndLoad()
  isRefreshing.value = false
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.reminder-list-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.reminder-scroll {
  height: 100vh;
}

.reminder-card {
  background: #ffffff;
  padding: 28rpx 24rpx;
  margin-bottom: 2rpx;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.card-tags {
  display: flex;
  gap: 12rpx;
}

.tag {
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}

.tag-text {
  font-size: 22rpx;
}

.tag-danger {
  background: #fef0f0;
}
.tag-danger .tag-text {
  color: #f56c6c;
}

.tag-warning {
  background: #fdf6ec;
}
.tag-warning .tag-text {
  color: #e6a23c;
}

.tag-success {
  background: #f0f9eb;
}
.tag-success .tag-text {
  color: #67c23a;
}

.tag-info {
  background: #f4f4f5;
}
.tag-info .tag-text {
  color: #909399;
}

.tag-primary {
  background: #ecf5ff;
}
.tag-primary .tag-text {
  color: #409eff;
}

.unread-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #f56c6c;
}

.card-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8rpx;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-content {
  font-size: 26rpx;
  color: #606266;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
}

.card-time {
  font-size: 22rpx;
  color: #c0c4cc;
}
</style>
