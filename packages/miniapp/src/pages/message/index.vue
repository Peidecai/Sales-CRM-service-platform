<template>
  <view class="message-page">
    <!-- Filter Tabs -->
    <view class="filter-tabs">
      <text
        class="filter-tab"
        :class="{ active: filterType === 'all' }"
        @click="filterType = 'all'; loadMessages()"
      >
        全部
      </text>
      <text
        class="filter-tab"
        :class="{ active: filterType === 'unread' }"
        @click="filterType = 'unread'; loadMessages()"
      >
        未读 {{ unreadCount > 0 ? `(${unreadCount})` : '' }}
      </text>
    </view>

    <!-- Message List -->
    <scroll-view scroll-y class="message-scroll" @scrolltolower="loadMore">
      <view v-if="messageList.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无消息</text>
      </view>

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
        </view>
        <view v-if="!msg.isRead" class="unread-dot" />
      </view>

      <view v-if="loading" class="loading-text">
        <text>加载中...</text>
      </view>
      <view v-if="noMore && messageList.length > 0" class="loading-text">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- Mark All Read -->
    <view v-if="unreadCount > 0" class="mark-all-bar" @click="markAllRead">
      <text class="mark-all-text">全部标为已读</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { notificationApi, type NotificationVO, NotificationType } from '@/api/notification'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const filterType = ref<'all' | 'unread'>('all')
const messageList = ref<NotificationVO[]>([])
const loading = ref(false)
const noMore = ref(false)
const page = ref(1)
const pageSize = 20
const unreadCount = ref(0)
let pollTimer: ReturnType<typeof setInterval> | null = null

function typeIcon(type: string): string {
  const map: Record<string, string> = {
    [NotificationType.SYSTEM]: '&#x1F514;',
    [NotificationType.TASK]: '&#x2705;',
    [NotificationType.FOLLOW_UP]: '&#x1F4DD;',
    [NotificationType.OPPORTUNITY]: '&#x1F4B0;',
    [NotificationType.MENTION]: '&#x40;',
  }
  return map[type] || '&#x1F514;'
}

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
    const res = await notificationApi.getList({
      page: page.value,
      pageSize,
      isRead: filterType.value === 'unread' ? false : undefined,
    })
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

async function handleMessageClick(msg: NotificationVO) {
  if (!msg.isRead) {
    try {
      await notificationApi.markRead(msg.id)
      msg.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      appStore.setUnreadCount(unreadCount.value)
    } catch {
      // Silently fail
    }
  }

  // Show detail
  uni.showModal({
    title: msg.title,
    content: msg.content,
    showCancel: false,
  })
}

async function markAllRead() {
  try {
    await notificationApi.markAllRead()
    messageList.value.forEach((m) => (m.isRead = true))
    unreadCount.value = 0
    appStore.setUnreadCount(0)
    uni.showToast({ title: '已全部标为已读', icon: 'success' })
  } catch {
    // Silently fail
  }
}

async function fetchUnreadCount() {
  try {
    const res = await notificationApi.getUnreadCount()
    if (res.code === 0 && res.data) {
      unreadCount.value = res.data.count
      appStore.setUnreadCount(res.data.count)
    }
  } catch {
    // Silently fail
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(fetchUnreadCount, 60000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(() => {
  loadMessages()
  fetchUnreadCount()
})

onShow(() => {
  fetchUnreadCount()
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
}

.filter-tabs {
  display: flex;
  background: #ffffff;
  padding: 0 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.filter-tab {
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  color: #666;
  border-bottom: 4rpx solid transparent;
}

.filter-tab.active {
  color: #409eff;
  border-bottom-color: #409eff;
  font-weight: 500;
}

.message-scroll {
  height: calc(100vh - 100rpx);
}

.message-item {
  display: flex;
  align-items: flex-start;
  padding: 24rpx;
  background: #ffffff;
  margin-bottom: 2rpx;
  position: relative;
}

.message-item.unread {
  background: #f8fbff;
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
  background: #ecf5ff;
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

.unread-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #f56c6c;
  position: absolute;
  top: 28rpx;
  left: 76rpx;
}

.mark-all-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-top: 1rpx solid #eee;
  padding-bottom: env(safe-area-inset-bottom);
}

.mark-all-text {
  font-size: 28rpx;
  color: #409eff;
}

.loading-text { text-align: center; padding: 24rpx; font-size: 24rpx; color: #999; }
.empty-state { padding: 120rpx; text-align: center; }
.empty-text { font-size: 28rpx; color: #ccc; }
</style>
