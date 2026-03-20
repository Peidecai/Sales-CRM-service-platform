<template>
  <view class="follow-up-timeline">
    <view
      v-for="(item, index) in items"
      :key="item.id ?? index"
      class="timeline-item"
    >
      <view class="timeline-line-wrap">
        <view class="timeline-dot" :style="{ backgroundColor: dotColor(item.type) }" />
        <view v-if="index < items.length - 1" class="timeline-line" />
      </view>
      <view class="timeline-content">
        <view class="timeline-header">
          <text class="timeline-type">{{ typeLabel(item.type) }}</text>
          <text class="timeline-time">{{ item.time }}</text>
        </view>
        <text class="timeline-text">{{ item.content }}</text>
        <text v-if="item.nextPlan" class="timeline-plan">下次计划: {{ item.nextPlan }}</text>
      </view>
    </view>
    <EmptyState v-if="items.length === 0" title="暂无跟进记录" />
  </view>
</template>

<script setup lang="ts">
import EmptyState from './EmptyState.vue'

export interface FollowUpItem {
  id?: number | string
  type: 'call' | 'visit' | 'wechat' | 'email' | 'other'
  content: string
  time: string
  nextPlan?: string
}

defineProps<{
  items: FollowUpItem[]
}>()

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
</script>

<style scoped>
.follow-up-timeline {
  padding: 24rpx;
}

.timeline-item {
  display: flex;
  gap: 20rpx;
  min-height: 120rpx;
}

.timeline-line-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24rpx;
  flex-shrink: 0;
}

.timeline-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6rpx;
}

.timeline-line {
  flex: 1;
  width: 2rpx;
  background: #ebeef5;
  margin: 8rpx 0;
}

.timeline-content {
  flex: 1;
  padding-bottom: 32rpx;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.timeline-type {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
}

.timeline-time {
  font-size: 22rpx;
  color: #909399;
}

.timeline-text {
  font-size: 26rpx;
  color: #303133;
  line-height: 1.6;
}

.timeline-plan {
  font-size: 24rpx;
  color: #409eff;
  margin-top: 8rpx;
}
</style>
