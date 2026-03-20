<template>
  <view class="empty-state">
    <image
      v-if="icon"
      class="empty-icon"
      :src="icon"
      mode="aspectFit"
    />
    <view v-else class="empty-icon-placeholder">
      <text class="empty-icon-text">&#xe6ab;</text>
    </view>
    <text class="empty-title">{{ title }}</text>
    <text v-if="description" class="empty-desc">{{ description }}</text>
    <view
      v-if="actionText"
      class="empty-action"
      @click="onAction"
    >
      <text class="empty-action-text">{{ actionText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  title?: string
  description?: string
  actionText?: string
}>(), {
  icon: '',
  title: '暂无数据',
  description: '',
  actionText: '',
})

const emit = defineEmits<{
  action: []
}>()

function onAction() {
  emit('action')
}
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx 80rpx;
}

.empty-icon {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 32rpx;
}

.empty-icon-placeholder {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon-text {
  font-family: "uni-icons";
  font-size: 120rpx;
  color: #dcdfe6;
}

.empty-title {
  font-size: 32rpx;
  color: #303133;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 24rpx;
  color: #909399;
  text-align: center;
  margin-bottom: 32rpx;
}

.empty-action {
  min-width: 200rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409eff;
  border-radius: 12rpx;
  padding: 0 40rpx;
}

.empty-action-text {
  font-size: 28rpx;
  color: #ffffff;
}
</style>
