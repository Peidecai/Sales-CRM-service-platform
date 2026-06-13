<template>
  <view v-if="visible" class="action-sheet-mask" @click="onMaskClick">
    <view class="action-sheet" :class="{ show: visible }" @click.stop>
      <view v-if="title" class="sheet-header">
        <text class="sheet-title">{{ title }}</text>
      </view>
      <view class="sheet-actions">
        <view
          v-for="(item, index) in actions"
          :key="index"
          class="sheet-action-item"
          :class="{ destructive: item.destructive }"
          @click="onSelect(index)"
        >
          <text v-if="item.icon" class="action-icon">{{ item.icon }}</text>
          <text class="action-label">{{ item.label }}</text>
        </view>
      </view>
      <view class="sheet-cancel" @click="onCancel">
        <text class="cancel-text">{{ cancelText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
export interface ActionItem {
  label: string
  icon?: string
  destructive?: boolean
}

const props = withDefaults(defineProps<{
  visible: boolean
  title?: string
  actions: ActionItem[]
  cancelText?: string
  maskClosable?: boolean
}>(), {
  title: '',
  cancelText: '取消',
  maskClosable: true,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [index: number]
  cancel: []
}>()

function close() {
  emit('update:visible', false)
}

function onMaskClick() {
  if (props.maskClosable) {
    close()
    emit('cancel')
  }
}

function onCancel() {
  close()
  emit('cancel')
}

function onSelect(index: number) {
  emit('select', index)
  close()
}
</script>

<style scoped>
.action-sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.action-sheet {
  width: 100%;
  background: #f5f5f5;
  border-radius: 24rpx 24rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.sheet-header {
  padding: 24rpx;
  text-align: center;
  border-bottom: 1rpx solid #ebeef5;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
}

.sheet-title {
  font-size: 28rpx;
  color: #909399;
}

.sheet-actions {
  background: #ffffff;
}

.sheet-action-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 112rpx;
  gap: 12rpx;
  border-bottom: 1rpx solid #ebeef5;
}

.sheet-action-item:last-child {
  border-bottom: none;
}

.sheet-action-item.destructive .action-label {
  color: #f56c6c;
}

.action-icon {
  font-size: 36rpx;
}

.action-label {
  font-size: 32rpx;
  color: #303133;
}

.sheet-cancel {
  margin-top: 12rpx;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 112rpx;
}

.cancel-text {
  font-size: 32rpx;
  color: #303133;
}
</style>
