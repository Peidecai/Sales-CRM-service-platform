<template>
  <view class="call-result-form">
    <view class="form-title">
      <text class="title-text">通话记录</text>
      <text v-if="customerName" class="customer-text">{{ customerName }}</text>
    </view>

    <!-- Call result -->
    <view class="form-section">
      <text class="section-label">通话结果</text>
      <view class="result-options">
        <view
          v-for="option in resultOptions"
          :key="option.value"
          class="result-option"
          :class="{ active: result === option.value }"
          @click="result = option.value"
        >
          <text class="option-text">{{ option.label }}</text>
        </view>
      </view>
    </view>

    <!-- Notes -->
    <view class="form-section">
      <text class="section-label">备注</text>
      <textarea
        class="notes-input"
        :value="notes"
        placeholder="记录通话要点..."
        maxlength="500"
        @input="onNotesInput"
      />
    </view>

    <!-- Next follow-up -->
    <view class="form-section">
      <text class="section-label">下次跟进</text>
      <picker mode="date" :value="nextFollowUp" @change="onDateChange">
        <view class="date-picker">
          <text :class="nextFollowUp ? 'date-text' : 'date-placeholder'">
            {{ nextFollowUp || '选择日期' }}
          </text>
        </view>
      </picker>
    </view>

    <!-- Actions -->
    <view class="form-actions">
      <view class="btn btn-skip" @click="onSkip">
        <text class="btn-text">跳过</text>
      </view>
      <view class="btn btn-submit" @click="onSubmit">
        <text class="btn-text-primary">提交</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CallResult } from '@crm/shared'

export interface CallResultData {
  result: string
  notes: string
  nextFollowUp: string
}

defineProps<{
  customerName?: string
}>()

const emit = defineEmits<{
  submit: [data: CallResultData]
  skip: []
}>()

const result = ref(CallResult.CONNECTED)
const notes = ref('')
const nextFollowUp = ref('')

const resultOptions = [
  { label: '已接通', value: CallResult.CONNECTED },
  { label: '未接听', value: CallResult.NO_ANSWER },
  { label: '忙线', value: CallResult.BUSY },
  { label: '关机', value: CallResult.POWER_OFF },
]

function onNotesInput(e: { detail: { value: string } }) {
  notes.value = e.detail.value
}

function onDateChange(e: { detail: { value: string } }) {
  nextFollowUp.value = e.detail.value
}

function onSubmit() {
  emit('submit', {
    result: result.value,
    notes: notes.value,
    nextFollowUp: nextFollowUp.value,
  })
}

function onSkip() {
  emit('skip')
}
</script>

<style scoped>
.call-result-form {
  padding: 32rpx 24rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
}

.form-title {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.title-text {
  font-size: 36rpx;
  font-weight: 600;
  color: #303133;
}

.customer-text {
  font-size: 28rpx;
  color: #909399;
}

.form-section {
  margin-bottom: 32rpx;
}

.section-label {
  font-size: 28rpx;
  color: #303133;
  font-weight: 600;
  margin-bottom: 16rpx;
  display: block;
}

.result-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.result-option {
  height: 72rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
}

.result-option.active {
  background: #ecf5ff;
  border-color: #409eff;
}

.option-text {
  font-size: 28rpx;
  color: #303133;
}

.result-option.active .option-text {
  color: #409eff;
}

.notes-input {
  width: 100%;
  height: 160rpx;
  padding: 16rpx;
  font-size: 28rpx;
  color: #303133;
  background: #f5f5f5;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.date-picker {
  height: 72rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}

.date-text {
  font-size: 28rpx;
  color: #303133;
}

.date-placeholder {
  font-size: 28rpx;
  color: #c0c4cc;
}

.form-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 16rpx;
}

.btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
}

.btn-skip {
  background: #f5f5f5;
}

.btn-submit {
  background: #409eff;
}

.btn-text {
  font-size: 32rpx;
  color: #303133;
}

.btn-text-primary {
  font-size: 32rpx;
  color: #ffffff;
}
</style>
