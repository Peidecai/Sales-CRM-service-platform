<template>
  <view class="stats-card" @click="onTap">
    <view class="stats-header">
      <text class="stats-label">{{ label }}</text>
      <view v-if="trend !== 0" class="trend" :class="trendClass">
        <text class="trend-arrow">{{ trend > 0 ? '↑' : '↓' }}</text>
        <text class="trend-value">{{ Math.abs(trend) }}%</text>
      </view>
    </view>
    <text class="stats-value">{{ prefix }}{{ formattedValue }}{{ suffix }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  value: number
  prefix?: string
  suffix?: string
  trend?: number
}>(), {
  prefix: '',
  suffix: '',
  trend: 0,
})

const emit = defineEmits<{
  click: []
}>()

const trendClass = computed(() => props.trend > 0 ? 'up' : 'down')

const formattedValue = computed(() => {
  if (props.value >= 10000) {
    return (props.value / 10000).toFixed(1) + 'w'
  }
  return String(props.value)
})

function onTap() {
  emit('click')
}
</script>

<style scoped>
.stats-card {
  flex: 1;
  background: #ffffff;
  border-radius: 8rpx;
  padding: 24rpx;
  min-height: 140rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.stats-label {
  font-size: 24rpx;
  color: #909399;
}

.trend {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.trend.up {
  color: #67c23a;
}

.trend.down {
  color: #f56c6c;
}

.trend-arrow {
  font-size: 22rpx;
}

.trend-value {
  font-size: 22rpx;
}

.stats-value {
  font-size: 44rpx;
  font-weight: 700;
  color: #303133;
}
</style>
