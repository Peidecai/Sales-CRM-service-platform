<template>
  <view class="after-call-page">
    <view class="card">
      <text class="card-title">通话记录</text>

      <!-- Customer Info -->
      <view class="info-row">
        <text class="info-label">客户</text>
        <text class="info-value">{{ callState.pendingCall?.customerName || '-' }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">号码</text>
        <text class="info-value">{{ maskedPhone }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">拨出时间</text>
        <text class="info-value">{{ dialTimeStr }}</text>
      </view>

      <!-- Call Result -->
      <view class="section">
        <text class="section-label">通话结果</text>
        <view class="option-group">
          <view
            v-for="opt in resultOptions"
            :key="opt.value"
            class="option-tag"
            :class="{ active: callResult === opt.value }"
            @click="callResult = opt.value"
          >
            <text>{{ opt.label }}</text>
          </view>
        </view>
      </view>

      <!-- Estimated Duration -->
      <view class="section">
        <text class="section-label">通话时长（估算）</text>
        <view class="option-group">
          <view
            v-for="opt in durationOptions"
            :key="opt.value"
            class="option-tag"
            :class="{ active: estimatedDuration === opt.value }"
            @click="estimatedDuration = opt.value"
          >
            <text>{{ opt.label }}</text>
          </view>
        </view>
      </view>

      <!-- Notes -->
      <view class="section">
        <text class="section-label">文字备注</text>
        <textarea
          v-model="notes"
          class="notes-input"
          placeholder="可选填写简要备注..."
          :maxlength="500"
        />
      </view>

      <!-- Voice Memo Button -->
      <view class="voice-memo-btn" @click="goVoiceMemo">
        <text class="voice-memo-icon">🎤</text>
        <view class="voice-memo-text">
          <text class="voice-memo-title">点击开始语音速记</text>
          <text class="voice-memo-desc">录制通话要点，AI 自动分析</text>
        </view>
      </view>
    </view>

    <!-- Bottom Actions -->
    <view class="action-bar">
      <button class="btn-skip" @click="handleSkip">跳过</button>
      <button class="btn-submit" :loading="submitting" @click="handleSubmit">提交记录</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCallStateStore } from '@/stores/call-state'
import { useUserStore } from '@/stores/user'
import { callRecordApi } from '@/api/call-record'

const callState = useCallStateStore()
const userStore = useUserStore()

const callResult = ref<string>('connected')
const estimatedDuration = ref<number>(180)
const notes = ref('')
const submitting = ref(false)
const createdRecordId = ref(0)

const resultOptions = [
  { value: 'connected', label: '已接通' },
  { value: 'no_answer', label: '未接' },
  { value: 'busy', label: '忙线' },
  { value: 'power_off', label: '关机' },
]

const durationOptions = [
  { value: 30, label: '< 1分钟' },
  { value: 120, label: '1-3分钟' },
  { value: 240, label: '3-5分钟' },
  { value: 600, label: '> 5分钟' },
]

const maskedPhone = computed(() => {
  const phone = callState.pendingCall?.phone || ''
  if (phone.length >= 7) {
    return phone.slice(0, 3) + '****' + phone.slice(-4)
  }
  return phone
})

const dialTimeStr = computed(() => {
  const dt = callState.pendingCall?.dialTime
  if (!dt) return '-'
  const d = new Date(dt)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

function goVoiceMemo() {
  // Navigate to voice record page with call context
  const pc = callState.pendingCall
  if (!pc) return
  const params = `callContext=1&customerId=${pc.customerId}&customerName=${encodeURIComponent(pc.customerName)}`
  const recordParam = createdRecordId.value ? `&callRecordId=${createdRecordId.value}` : ''
  uni.navigateTo({
    url: `/pages/voice/record?${params}${recordParam}`,
  })
}

function handleSkip() {
  callState.clearPendingCall()
  uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/index/index' }) })
}

async function handleSubmit() {
  const pc = callState.pendingCall
  if (!pc) {
    handleSkip()
    return
  }

  submitting.value = true
  try {
    const res = await callRecordApi.create({
      customerId: pc.customerId,
      userId: userStore.userId,
      callAt: pc.dialTime,
      callType: 'manual',
      callResult: callResult.value as 'connected' | 'no_answer' | 'busy' | 'power_off',
      estimatedDuration: estimatedDuration.value,
      notes: notes.value || undefined,
    })

    if (res.code === 0) {
      createdRecordId.value = res.data?.id || 0
      uni.showToast({ title: '记录已保存', icon: 'success' })
      callState.clearPendingCall()
      setTimeout(() => {
        uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/index/index' }) })
      }, 1000)
    } else {
      uni.showToast({ title: res.message || '保存失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.after-call-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 140rpx;
}

.card {
  background: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 32rpx;
}

.card-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 24rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.info-label {
  font-size: 26rpx;
  color: #999;
}

.info-value {
  font-size: 26rpx;
  color: #333;
}

.section {
  margin-top: 32rpx;
}

.section-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.option-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.option-tag {
  padding: 12rpx 28rpx;
  background: #f5f7fa;
  border-radius: 28rpx;
  font-size: 26rpx;
  color: #666;
  border: 2rpx solid transparent;
}

.option-tag.active {
  background: #ecf5ff;
  color: #409eff;
  border-color: #409eff;
}

.notes-input {
  width: 100%;
  height: 160rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

.voice-memo-btn {
  margin-top: 32rpx;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  border-radius: 16rpx;
  padding: 28rpx;
  gap: 20rpx;
}

.voice-memo-icon {
  font-size: 48rpx;
}

.voice-memo-text {
  display: flex;
  flex-direction: column;
}

.voice-memo-title {
  font-size: 30rpx;
  color: #ffffff;
  font-weight: 500;
}

.voice-memo-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4rpx;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 20rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1rpx solid #eee;
}

.btn-skip,
.btn-submit {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  border-radius: 40rpx;
  border: none;
}

.btn-skip::after,
.btn-submit::after {
  border: none;
}

.btn-skip {
  background: #f5f7fa;
  color: #666;
}

.btn-submit {
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  color: #ffffff;
}
</style>
