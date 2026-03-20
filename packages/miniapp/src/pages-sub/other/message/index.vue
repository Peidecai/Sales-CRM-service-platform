<template>
  <view class="message-page">
    <!-- Navigation Bar -->
    <view class="nav-bar">
      <text class="nav-title">消息中心</text>
      <text
        v-if="totalUnread > 0"
        class="mark-all-btn"
        @click="markAllRead"
      >
        全部已读
      </text>
    </view>

    <!-- Category Tabs -->
    <scroll-view scroll-x class="category-tabs">
      <view class="tabs-inner">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)"
        >
          <text class="tab-text">{{ tab.label }}</text>
          <view v-if="tab.badge > 0" class="tab-badge">
            <text class="tab-badge-text">{{ tab.badge > 99 ? '99+' : tab.badge }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- Notification List -->
    <scroll-view
      scroll-y
      class="message-scroll"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onPullRefresh"
      @scrolltolower="loadMore"
    >
      <!-- Empty State -->
      <view v-if="messageList.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">&#x1F4ED;</text>
        <text class="empty-text">暂无{{ activeTab === 'all' ? '' : activeTabLabel }}消息</text>
      </view>

      <!-- Messages -->
      <view
        v-for="msg in messageList"
        :key="msg.id"
        class="message-item"
        :class="{ unread: !msg.isRead }"
        @click="handleMessageClick(msg)"
      >
        <view class="msg-icon" :class="'type-' + msg.type">
          <text class="msg-icon-text">{{ typeIcon(msg.type) }}</text>
        </view>
        <view class="msg-content">
          <view class="msg-header">
            <text class="msg-title">{{ msg.title }}</text>
            <text class="msg-time">{{ formatTime(msg.createdAt) }}</text>
          </view>
          <text class="msg-body">{{ msg.content }}</text>
          <view v-if="msg.type !== NotificationType.SYSTEM && msg.relatedId" class="msg-action">
            <text class="msg-action-text">查看详情 &gt;</text>
          </view>
        </view>
        <view v-if="!msg.isRead" class="unread-dot" />
      </view>

      <!-- Expanded System Detail -->
      <view v-if="expandedMsg" class="system-detail">
        <view class="system-detail-header">
          <text class="system-detail-title">{{ expandedMsg.title }}</text>
          <text class="system-detail-close" @click="expandedMsg = null">关闭</text>
        </view>
        <text class="system-detail-content">{{ expandedMsg.content }}</text>
        <text class="system-detail-time">{{ expandedMsg.createdAt }}</text>
      </view>

      <!-- Loading / No More -->
      <view v-if="loading" class="status-text">
        <text>加载中...</text>
      </view>
      <view v-if="noMore && messageList.length > 0" class="status-text">
        <text>没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import {
  notificationApi,
  NotificationType,
  type NotificationVO,
  type UnreadCountByType,
} from '@/api/notification'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

// --- Tab definitions ---
type TabKey = 'all' | NotificationType.SYSTEM | NotificationType.TASK | NotificationType.FOLLOW_UP | NotificationType.OPPORTUNITY

interface TabDef {
  key: TabKey
  label: string
  badge: number
}

const activeTab = ref<TabKey>('all')
const unreadCounts = ref<UnreadCountByType>({
  total: 0,
  system: 0,
  task: 0,
  follow_up: 0,
  opportunity: 0,
  mention: 0,
})

const totalUnread = computed(() => unreadCounts.value.total)

const tabs = computed<TabDef[]>(() => [
  { key: 'all', label: '全部', badge: unreadCounts.value.total },
  { key: NotificationType.SYSTEM, label: '系统通知', badge: unreadCounts.value.system },
  { key: NotificationType.TASK, label: '任务提醒', badge: unreadCounts.value.task },
  { key: NotificationType.FOLLOW_UP, label: '跟进提醒', badge: unreadCounts.value.follow_up },
  { key: NotificationType.OPPORTUNITY, label: '商机更新', badge: unreadCounts.value.opportunity },
])

const activeTabLabel = computed(() => {
  const tab = tabs.value.find((t) => t.key === activeTab.value)
  return tab?.label || ''
})

// --- List state ---
const messageList = ref<NotificationVO[]>([])
const loading = ref(false)
const refreshing = ref(false)
const noMore = ref(false)
const page = ref(1)
const pageSize = 20
const expandedMsg = ref<NotificationVO | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

// --- Icon mapping ---
function typeIcon(type: string): string {
  const map: Record<string, string> = {
    [NotificationType.SYSTEM]: '\u{1F514}',
    [NotificationType.TASK]: '\u{2705}',
    [NotificationType.FOLLOW_UP]: '\u{1F4DD}',
    [NotificationType.OPPORTUNITY]: '\u{1F4B0}',
    [NotificationType.MENTION]: '@',
  }
  return map[type] || '\u{1F514}'
}

// --- Time formatting ---
function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 172800000) return '昨天'
  return dateStr.slice(5, 10)
}

// --- Tab switch ---
function switchTab(key: TabKey) {
  activeTab.value = key
  expandedMsg.value = null
  loadMessages()
}

// --- Fetch messages ---
async function loadMessages() {
  page.value = 1
  noMore.value = false
  messageList.value = []
  await fetchMessages()
}

async function fetchMessages() {
  if (loading.value) return
  loading.value = true

  try {
    const params: Record<string, unknown> = {
      page: page.value,
      pageSize,
    }
    if (activeTab.value !== 'all') {
      params.type = activeTab.value
    }

    const res = await notificationApi.getList(params as never)
    if (res.code === 0 && res.data) {
      if (page.value === 1) {
        messageList.value = res.data.list
      } else {
        messageList.value = [...messageList.value, ...res.data.list]
      }
      if (res.data.list.length < pageSize) {
        noMore.value = true
      }
    }
  } catch {
    // Silently fail
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!noMore.value && !loading.value) {
    page.value++
    fetchMessages()
  }
}

// --- Pull to refresh ---
async function onPullRefresh() {
  refreshing.value = true
  await Promise.all([loadMessages(), fetchUnreadCounts()])
  refreshing.value = false
}

// --- Click handler with navigation ---
async function handleMessageClick(msg: NotificationVO) {
  // Mark as read
  if (!msg.isRead) {
    try {
      await notificationApi.markRead(msg.id)
      msg.isRead = true
      // Decrement local unread counts
      unreadCounts.value.total = Math.max(0, unreadCounts.value.total - 1)
      const typeKey = msg.type as keyof UnreadCountByType
      if (typeKey in unreadCounts.value && typeof unreadCounts.value[typeKey] === 'number') {
        (unreadCounts.value[typeKey] as number) = Math.max(0, (unreadCounts.value[typeKey] as number) - 1)
      }
      appStore.setUnreadCount(unreadCounts.value.total)
    } catch {
      // Silently fail
    }
  }

  // Navigate based on type
  switch (msg.type) {
    case NotificationType.FOLLOW_UP:
      if (msg.relatedId) {
        uni.navigateTo({ url: `/pages-sub/customer/detail?id=${msg.relatedId}` })
      }
      break
    case NotificationType.OPPORTUNITY:
      if (msg.relatedId) {
        uni.navigateTo({ url: `/pages-sub/opportunity/detail?id=${msg.relatedId}` })
      }
      break
    case NotificationType.TASK:
      if (msg.relatedId) {
        // Task-related notifications navigate to customer detail as fallback
        uni.navigateTo({ url: `/pages-sub/customer/detail?id=${msg.relatedId}` })
      }
      break
    case NotificationType.SYSTEM:
    case NotificationType.MENTION:
    default:
      // Expand system detail inline
      expandedMsg.value = expandedMsg.value?.id === msg.id ? null : msg
      break
  }
}

// --- Mark all as read ---
async function markAllRead() {
  try {
    await notificationApi.markAllRead()
    messageList.value.forEach((m) => (m.isRead = true))
    unreadCounts.value = { total: 0, system: 0, task: 0, follow_up: 0, opportunity: 0, mention: 0 }
    appStore.setUnreadCount(0)
    uni.showToast({ title: '已全部标为已读', icon: 'success' })
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

// --- Fetch unread counts ---
async function fetchUnreadCounts() {
  try {
    const counts = await notificationApi.getUnreadCountByType()
    unreadCounts.value = counts
    appStore.setUnreadCount(counts.total)
  } catch {
    // Silently fail
  }
}

// --- Polling ---
function startPolling() {
  stopPolling()
  pollTimer = setInterval(fetchUnreadCounts, 60000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// --- Lifecycle ---
onMounted(() => {
  loadMessages()
  fetchUnreadCounts()
})

onShow(() => {
  fetchUnreadCounts()
  startPolling()
})

onHide(() => {
  stopPolling()
})
</script>

<style scoped>
.message-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* Nav Bar */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 88rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}

.mark-all-btn {
  font-size: 26rpx;
  color: #409eff;
  padding: 8rpx 16rpx;
}

/* Category Tabs */
.category-tabs {
  background: #ffffff;
  white-space: nowrap;
  border-bottom: 1rpx solid #f0f0f0;
}

.tabs-inner {
  display: inline-flex;
  padding: 0 16rpx;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  padding: 20rpx 24rpx;
  position: relative;
  border-bottom: 4rpx solid transparent;
  flex-shrink: 0;
}

.tab-item.active {
  border-bottom-color: #409eff;
}

.tab-item.active .tab-text {
  color: #409eff;
  font-weight: 500;
}

.tab-text {
  font-size: 26rpx;
  color: #666;
}

.tab-badge {
  min-width: 32rpx;
  height: 32rpx;
  border-radius: 16rpx;
  background: #f56c6c;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8rpx;
  padding: 0 8rpx;
}

.tab-badge-text {
  font-size: 20rpx;
  color: #ffffff;
  line-height: 32rpx;
}

/* Message Scroll */
.message-scroll {
  flex: 1;
  height: calc(100vh - 180rpx);
}

/* Message Item */
.message-item {
  display: flex;
  align-items: flex-start;
  padding: 24rpx 32rpx;
  background: #ffffff;
  margin-bottom: 2rpx;
  position: relative;
}

.message-item.unread {
  background: #f0f7ff;
}

.msg-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.msg-icon.type-system { background: #ecf5ff; }
.msg-icon.type-task { background: #f0f9eb; }
.msg-icon.type-follow_up { background: #fdf6ec; }
.msg-icon.type-opportunity { background: #fef0f0; }
.msg-icon.type-mention { background: #f4f4f5; }

.msg-icon-text {
  font-size: 32rpx;
}

.msg-content {
  flex: 1;
  min-width: 0;
}

.msg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.msg-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.msg-time {
  font-size: 22rpx;
  color: #999;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.msg-body {
  font-size: 24rpx;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.msg-action {
  margin-top: 12rpx;
}

.msg-action-text {
  font-size: 24rpx;
  color: #409eff;
}

.unread-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #f56c6c;
  position: absolute;
  top: 28rpx;
  left: 84rpx;
}

/* System Detail Expand */
.system-detail {
  margin: 16rpx 32rpx;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 12rpx;
  border: 1rpx solid #e4e7ed;
}

.system-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.system-detail-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.system-detail-close {
  font-size: 24rpx;
  color: #409eff;
  padding: 8rpx;
}

.system-detail-content {
  font-size: 26rpx;
  color: #555;
  line-height: 40rpx;
  margin-bottom: 16rpx;
}

.system-detail-time {
  font-size: 22rpx;
  color: #999;
}

/* Status */
.status-text {
  text-align: center;
  padding: 24rpx;
  font-size: 24rpx;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0 80rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #ccc;
}
</style>
