<template>
  <view class="customer-card" @click="onTap" @touchstart="onTouchStart" @touchend="onTouchEnd">
    <view class="card-inner" :style="{ transform: `translateX(${offsetX}rpx)` }">
      <view class="card-content">
        <view class="card-header">
          <text class="customer-name">{{ name }}</text>
          <StatusTag v-if="status" :status="status" type="customer" />
        </view>
        <view class="card-info">
          <view v-if="level" class="info-item">
            <text class="info-label">等级</text>
            <text class="info-value level-badge" :class="`level-${level}`">{{ level }}</text>
          </view>
          <view v-if="phone" class="info-item">
            <text class="info-label">电话</text>
            <text class="info-value">{{ phone }}</text>
          </view>
          <view v-if="industry" class="info-item">
            <text class="info-label">行业</text>
            <text class="info-value">{{ industry }}</text>
          </view>
        </view>
        <view v-if="lastFollowUp" class="card-footer">
          <text class="footer-text">最近跟进: {{ lastFollowUp }}</text>
        </view>
      </view>
    </view>
    <!-- Swipe actions -->
    <view v-if="showActions" class="swipe-actions">
      <view class="action-btn action-call" @click.stop="onCall">
        <text class="action-text">拨号</text>
      </view>
      <view class="action-btn action-follow" @click.stop="onFollowUp">
        <text class="action-text">跟进</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CustomerStatus } from '@crm/shared'
import StatusTag from './StatusTag.vue'

const props = withDefaults(defineProps<{
  id: number | string
  name: string
  status?: CustomerStatus | string
  level?: string
  phone?: string
  industry?: string
  lastFollowUp?: string
  swipeable?: boolean
}>(), {
  status: '',
  level: '',
  phone: '',
  industry: '',
  lastFollowUp: '',
  swipeable: true,
})

const emit = defineEmits<{
  click: [id: number | string]
  call: [id: number | string]
  followUp: [id: number | string]
}>()

const startX = ref(0)
const offsetX = ref(0)
const showActions = computed(() => offsetX.value < -60)

function onTouchStart(e: TouchEvent) {
  if (!props.swipeable) return
  startX.value = e.touches[0].clientX
}

function onTouchEnd(e: TouchEvent) {
  if (!props.swipeable) return
  const diff = e.changedTouches[0].clientX - startX.value
  if (diff < -50) {
    offsetX.value = -200
  } else {
    offsetX.value = 0
  }
}

function onTap() {
  if (offsetX.value < 0) {
    offsetX.value = 0
    return
  }
  emit('click', props.id)
}

function onCall() {
  offsetX.value = 0
  emit('call', props.id)
}

function onFollowUp() {
  offsetX.value = 0
  emit('followUp', props.id)
}
</script>

<style scoped>
.customer-card {
  position: relative;
  overflow: hidden;
  margin: 0 24rpx 16rpx;
  border-radius: 8rpx;
  background: #ffffff;
}

.card-inner {
  position: relative;
  z-index: 1;
  background: #ffffff;
  transition: transform 0.2s ease;
}

.card-content {
  padding: 24rpx;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.customer-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #303133;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 16rpx;
}

.card-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx 32rpx;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.info-label {
  font-size: 24rpx;
  color: #909399;
}

.info-value {
  font-size: 24rpx;
  color: #303133;
}

.level-badge {
  font-weight: 600;
}

.level-A { color: #f56c6c; }
.level-B { color: #e6a23c; }
.level-C { color: #409eff; }
.level-D { color: #909399; }

.card-footer {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #ebeef5;
}

.footer-text {
  font-size: 22rpx;
  color: #909399;
}

.swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
}

.action-btn {
  width: 100rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-call {
  background: #409eff;
}

.action-follow {
  background: #67c23a;
}

.action-text {
  font-size: 24rpx;
  color: #ffffff;
}
</style>
