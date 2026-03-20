<template>
  <el-card shadow="hover" class="reminder-card" :class="{ 'is-unread': !reminder.isRead }">
    <div class="card-top">
      <div class="card-tags">
        <el-tag :type="typeTagMap[reminder.type] ?? 'info'" size="small">
          {{ typeLabel(reminder.type) }}
        </el-tag>
        <el-tag :type="priorityTagMap[reminder.priority] ?? 'info'" size="small">
          {{ priorityLabel(reminder.priority) }}
        </el-tag>
      </div>
      <span class="card-time">{{ formatDate(reminder.createdAt) }}</span>
    </div>

    <div class="card-title">{{ reminder.title }}</div>
    <div class="card-content">{{ reminder.content }}</div>

    <div class="card-actions">
      <el-button
        v-if="!reminder.isRead"
        text
        type="primary"
        size="small"
        @click="emit('read', reminder.id)"
      >
        标为已读
      </el-button>
      <el-dropdown
        v-if="!reminder.feedback"
        trigger="click"
        @command="(cmd: string) => emit('feedback', reminder.id, cmd as AiReminderFeedback)"
      >
        <el-button text type="success" size="small">反馈</el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="helpful">有帮助</el-dropdown-item>
            <el-dropdown-item command="not_helpful">没帮助</el-dropdown-item>
            <el-dropdown-item command="acted_on">已采纳</el-dropdown-item>
            <el-dropdown-item command="dismissed">忽略</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-tag v-else size="small" type="success">{{ feedbackLabel(reminder.feedback) }}</el-tag>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import type { AiReminderItem } from '@/api/ai-reminder'
import { AiReminderFeedback } from '@crm/shared'

type TagType = 'success' | 'warning' | 'danger' | 'info' | 'primary'

const typeTagMap: Record<string, TagType> = {
  score_change: 'warning',
  risk_alert: 'danger',
  next_action: 'success',
  competitor_mention: 'danger',
  follow_up_schedule: 'info',
  stagnant: 'warning',
}

const priorityTagMap: Record<string, TagType> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'info',
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    score_change: '评分变化',
    risk_alert: '风险预警',
    next_action: '下一步',
    competitor_mention: '竞品提及',
    follow_up_schedule: '跟进安排',
    stagnant: '停滞提醒',
  }
  return map[type] ?? type
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

defineProps<{
  reminder: AiReminderItem
}>()

const emit = defineEmits<{
  read: [id: number]
  feedback: [id: number, feedback: AiReminderFeedback]
}>()
</script>

<style scoped>
.reminder-card {
  margin-bottom: 12px;
}

.reminder-card.is-unread {
  border-left: 3px solid var(--el-color-primary);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-tags {
  display: flex;
  gap: 6px;
}

.card-time {
  font-size: 12px;
  color: #909399;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.card-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
