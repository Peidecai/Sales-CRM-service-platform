<template>
  <view class="reminder-detail-page">
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else-if="reminder">
      <view class="detail-card">
        <view class="detail-tags">
          <view class="tag" :class="'tag-' + typeColor(reminder.type)">
            <text class="tag-text">{{ typeLabel(reminder.type) }}</text>
          </view>
          <view class="tag" :class="'tag-' + priorityColor(reminder.priority)">
            <text class="tag-text">{{ priorityLabel(reminder.priority) }}</text>
          </view>
          <view v-if="reminder.isRead" class="tag tag-info">
            <text class="tag-text">已读</text>
          </view>
        </view>

        <text class="detail-title">{{ reminder.title }}</text>
        <text class="detail-time">{{ formatDate(reminder.createdAt) }}</text>
        <view class="detail-divider" />
        <text class="detail-content">{{ reminder.content }}</text>
      </view>

      <!-- Actions -->
      <view class="action-bar">
        <view
          v-if="!reminder.isRead"
          class="action-btn action-read"
          @click="handleMarkRead"
        >
          <text class="action-text">标为已读</text>
        </view>

        <template v-if="!reminder.feedback">
          <view class="action-btn action-helpful" @click="handleFeedback('helpful')">
            <text class="action-text">有帮助</text>
          </view>
          <view class="action-btn action-not" @click="handleFeedback('not_helpful')">
            <text class="action-text">没帮助</text>
          </view>
          <view class="action-btn action-acted" @click="handleFeedback('acted_on')">
            <text class="action-text">已采纳</text>
          </view>
          <view class="action-btn action-dismiss" @click="handleFeedback('dismissed')">
            <text class="action-text">忽略</text>
          </view>
        </template>
        <view v-else class="feedback-result">
          <text class="feedback-label">已反馈: {{ feedbackLabel(reminder.feedback) }}</text>
        </view>
      </view>
    </template>

    <view v-else class="empty-wrap">
      <text class="empty-text">提醒不存在</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { aiReminderApi, type AiReminderItem } from '@/api/ai-reminder'
import type { AiReminderFeedback } from '@crm/shared'

const reminder = ref<AiReminderItem | null>(null)
const loading = ref(true)
let reminderId = 0

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    score_change: '评分变化',
    risk_alert: '风险预警',
    next_action: '下一步行动',
    competitor_mention: '竞品提及',
    follow_up_schedule: '跟进安排',
    stagnant: '停滞提醒',
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

function feedbackLabel(feedback: string): string {
  const map: Record<string, string> = {
    helpful: '有帮助',
    not_helpful: '没帮助',
    acted_on: '已采纳',
    dismissed: '已忽略',
  }
  return map[feedback] ?? feedback
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

async function fetchDetail() {
  loading.value = true
  try {
    // Use list endpoint with filter to get this specific reminder
    const res = await aiReminderApi.getReminders({ page: 1, pageSize: 50 })
    if (res.code === 0 && res.data) {
      reminder.value = res.data.list.find((r) => r.id === reminderId) ?? null
    }
  } catch {
    // handled by request
  } finally {
    loading.value = false
  }
}

async function handleMarkRead() {
  if (!reminder.value) return
  try {
    await aiReminderApi.markRead(reminder.value.id)
    reminder.value.isRead = true
    uni.showToast({ title: '已标为已读', icon: 'success' })
  } catch {
    // handled
  }
}

async function handleFeedback(fb: string) {
  if (!reminder.value) return
  try {
    await aiReminderApi.submitFeedback(reminder.value.id, fb as AiReminderFeedback)
    reminder.value.feedback = fb as AiReminderFeedback
    uni.showToast({ title: '反馈已提交', icon: 'success' })
  } catch {
    // handled
  }
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as unknown as { options: Record<string, string> }).options
  reminderId = Number(options.id)
  if (!reminderId || isNaN(reminderId)) {
    loading.value = false
    return
  }
  // Auto-mark as read on enter
  fetchDetail().then(() => {
    if (reminder.value && !reminder.value.isRead) {
      handleMarkRead()
    }
  })
})
</script>

<style scoped>
.reminder-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
}

.loading-wrap,
.empty-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400rpx;
}

.loading-text,
.empty-text {
  font-size: 28rpx;
  color: #909399;
}

.detail-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 24rpx;
}

.detail-tags {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
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

.detail-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8rpx;
}

.detail-time {
  font-size: 24rpx;
  color: #c0c4cc;
  margin-bottom: 16rpx;
}

.detail-divider {
  height: 1px;
  background: #ebeef5;
  margin-bottom: 20rpx;
}

.detail-content {
  font-size: 28rpx;
  color: #606266;
  line-height: 1.7;
  white-space: pre-wrap;
}

.action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  min-width: 160rpx;
  padding: 20rpx 0;
  border-radius: 12rpx;
  text-align: center;
}

.action-text {
  font-size: 28rpx;
  font-weight: 500;
}

.action-read {
  background: #ecf5ff;
}
.action-read .action-text {
  color: #409eff;
}

.action-helpful {
  background: #f0f9eb;
}
.action-helpful .action-text {
  color: #67c23a;
}

.action-not {
  background: #fef0f0;
}
.action-not .action-text {
  color: #f56c6c;
}

.action-acted {
  background: #ecf5ff;
}
.action-acted .action-text {
  color: #409eff;
}

.action-dismiss {
  background: #f4f4f5;
}
.action-dismiss .action-text {
  color: #909399;
}

.feedback-result {
  padding: 20rpx 0;
}

.feedback-label {
  font-size: 28rpx;
  color: #67c23a;
}
</style>
