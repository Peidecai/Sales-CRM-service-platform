<template>
  <view v-if="visible" class="overlay" @click.self="onClose">
    <view class="modal">
      <view class="modal-header">
        <text class="modal-title">选择拨号方式</text>
        <text class="modal-close" @click="onClose">&#xe720;</text>
      </view>

      <view class="customer-info">
        <text class="customer-name">{{ customerName }}</text>
        <text class="customer-phone">{{ phone }}</text>
      </view>

      <view class="mode-options">
        <view
          class="mode-card"
          :class="{ active: selectedMode === 'native' }"
          @click="selectedMode = 'native'"
        >
          <view class="mode-icon-wrap">
            <text class="mode-emoji">&#x1F4F1;</text>
          </view>
          <view class="mode-text">
            <text class="mode-label">直接拨号</text>
            <text class="mode-desc">使用手机原生拨号，无录音</text>
          </view>
          <view class="mode-check" :class="{ checked: selectedMode === 'native' }" />
        </view>

        <view
          class="mode-card"
          :class="{ active: selectedMode === 'cloud' }"
          @click="selectedMode = 'cloud'"
        >
          <view class="mode-icon-wrap">
            <text class="mode-emoji">&#x2601;&#xFE0F;</text>
          </view>
          <view class="mode-text">
            <text class="mode-label">云呼录音</text>
            <text class="mode-desc">全程录音，支持 AI 分析</text>
          </view>
          <view class="mode-check" :class="{ checked: selectedMode === 'cloud' }" />
        </view>
      </view>

      <view class="remember-row" @click="remember = !remember">
        <view class="checkbox" :class="{ checked: remember }" />
        <text class="remember-text">记住我的选择</text>
      </view>

      <button class="confirm-btn" @click="onConfirm">确认拨号</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CallMode } from '@/stores/call-state'
import { useCallStateStore } from '@/stores/call-state'

const props = defineProps<{
  visible: boolean
  phone: string
  customerName: string
  customerId: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [payload: { mode: CallMode; remember: boolean }]
}>()

const callState = useCallStateStore()
const selectedMode = ref<CallMode>(callState.callMode)
const remember = ref(false)

watch(() => props.visible, (val) => {
  if (val) {
    selectedMode.value = callState.callMode
    remember.value = false
  }
})

function onClose() {
  emit('update:visible', false)
}

function onConfirm() {
  emit('select', { mode: selectedMode.value, remember: remember.value })
  emit('update:visible', false)
}
</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal {
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx 32rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.modal-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #303133;
}

.modal-close {
  font-family: "uni-icons";
  font-size: 36rpx;
  color: #909399;
  padding: 8rpx;
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  margin-bottom: 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.customer-name {
  font-size: 28rpx;
  color: #303133;
  font-weight: 500;
}

.customer-phone {
  font-size: 26rpx;
  color: #909399;
}

.mode-options {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 32rpx;
}

.mode-card {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  background: #f5f7fa;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  gap: 20rpx;
}

.mode-card.active {
  background: #ecf5ff;
  border-color: #409eff;
}

.mode-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mode-emoji {
  font-size: 48rpx;
}

.mode-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.mode-label {
  font-size: 30rpx;
  color: #303133;
  font-weight: 500;
}

.mode-desc {
  font-size: 24rpx;
  color: #909399;
}

.mode-check {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #dcdfe6;
  box-sizing: border-box;
}

.mode-check.checked {
  border-color: #409eff;
  background: #409eff;
  position: relative;
}

.mode-check.checked::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14rpx;
  height: 14rpx;
  background: #ffffff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.remember-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 32rpx;
  padding: 0 4rpx;
}

.checkbox {
  width: 32rpx;
  height: 32rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 6rpx;
  box-sizing: border-box;
}

.checkbox.checked {
  background: #409eff;
  border-color: #409eff;
}

.remember-text {
  font-size: 26rpx;
  color: #606266;
}

.confirm-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 500;
  border-radius: 44rpx;
  border: none;
}

.confirm-btn::after {
  border: none;
}
</style>
