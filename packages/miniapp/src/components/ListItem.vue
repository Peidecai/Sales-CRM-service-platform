<template>
  <view class="list-item" @click="onTap">
    <view v-if="icon" class="item-icon-wrap" :style="iconBgStyle">
      <text class="item-icon">{{ icon }}</text>
    </view>
    <view class="item-content">
      <text class="item-title">{{ title }}</text>
      <text v-if="subtitle" class="item-subtitle">{{ subtitle }}</text>
    </view>
    <view class="item-right">
      <text v-if="extra" class="item-extra">{{ extra }}</text>
      <text v-if="showArrow" class="item-arrow">&#x203A;</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  icon?: string
  iconColor?: string
  iconBg?: string
  extra?: string
  showArrow?: boolean
}>(), {
  subtitle: '',
  icon: '',
  iconColor: '#409EFF',
  iconBg: '#ECF5FF',
  extra: '',
  showArrow: true,
})

const emit = defineEmits<{
  click: []
}>()

const iconBgStyle = computed(() => ({
  backgroundColor: props.iconBg,
  color: props.iconColor,
}))

function onTap() {
  emit('click')
}
</script>

<style scoped>
.list-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #ffffff;
  min-height: 88rpx;
  gap: 20rpx;
}

.item-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-icon {
  font-size: 36rpx;
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  overflow: hidden;
}

.item-title {
  font-size: 28rpx;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-subtitle {
  font-size: 24rpx;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.item-extra {
  font-size: 24rpx;
  color: #909399;
}

.item-arrow {
  font-size: 32rpx;
  color: #c0c4cc;
}
</style>
