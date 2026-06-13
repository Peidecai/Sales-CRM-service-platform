<template>
  <view class="load-more" @click="onRetry">
    <view v-if="status === 'loading'" class="loading-wrap">
      <view class="loading-spinner" />
      <text class="loading-text">{{ loadingText }}</text>
    </view>
    <text v-else-if="status === 'noMore'" class="no-more-text">{{ noMoreText }}</text>
    <view v-else-if="status === 'error'" class="error-wrap">
      <text class="error-text">{{ errorText }}</text>
      <text class="retry-text">点击重试</text>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  status: 'loading' | 'noMore' | 'error'
  loadingText?: string
  noMoreText?: string
  errorText?: string
}>(), {
  loadingText: '加载中...',
  noMoreText: '— 没有更多了 —',
  errorText: '加载失败',
})

const emit = defineEmits<{
  retry: []
}>()

function onRetry() {
  emit('retry')
}
</script>

<style scoped>
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 0;
  min-height: 88rpx;
}

.loading-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.loading-spinner {
  width: 32rpx;
  height: 32rpx;
  border: 4rpx solid #dcdfe6;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text,
.no-more-text {
  font-size: 24rpx;
  color: #909399;
}

.error-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.error-text {
  font-size: 24rpx;
  color: #f56c6c;
}

.retry-text {
  font-size: 24rpx;
  color: #409eff;
}
</style>
