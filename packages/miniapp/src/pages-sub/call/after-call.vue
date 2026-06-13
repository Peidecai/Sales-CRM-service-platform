<template>
  <view class="after-call-page">
    <view class="card">
      <!-- Customer Info Header -->
      <view class="customer-header">
        <view class="avatar-circle">
          <text class="avatar-text">{{ avatarChar }}</text>
        </view>
        <view class="customer-info">
          <text class="customer-name">{{ callState.pendingCall?.customerName || '-' }}</text>
          <text class="customer-phone">{{ maskedPhone }}</text>
        </view>
      </view>

      <view class="info-row">
        <text class="info-label">拨出时间</text>
        <text class="info-value">{{ dialTimeStr }}</text>
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
    </view>

    <!-- CallResultForm Component -->
    <view class="card">
      <CallResultForm
        :customer-name="callState.pendingCall?.customerName"
        @submit="handleFormSubmit"
        @skip="handleSkip"
      />
    </view>

    <!-- Voice Memo Button -->
    <view class="card voice-memo-btn" @click="goVoiceMemo">
      <text class="voice-memo-icon">🎤</text>
      <view class="voice-memo-text">
        <text class="voice-memo-title">点击开始语音速记</text>
        <text class="voice-memo-desc">录制通话要点，AI 自动分析</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCallStateStore } from '@/stores/call-state'
import { callRecordApi } from '@/api/call-record'
import type { CallResultData } from '@/components/CallResultForm.vue'
import CallResultForm from '@/components/CallResultForm.vue'

const callState = useCallStateStore()

const estimatedDuration = ref<number>(180)
const createdRecordId = ref(0)

const durationOptions = [
  { value: 30, label: '< 1分钟' },
  { value: 120, label: '1-3分钟' },
  { value: 240, label: '3-5分钟' },
  { value: 600, label: '> 5分钟' },
]

const avatarChar = computed(() => {
  const name = callState.pendingCall?.customerName || ''
  return name.charAt(0) || '?'
})

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
  const pc = callState.pendingCall
  if (!pc) return
  const params = `callContext=1&customerId=${pc.customerId}&customerName=${encodeURIComponent(pc.customerName)}`
  const recordParam = createdRecordId.value ? `&callRecordId=${createdRecordId.value}` : ''
  uni.navigateTo({
    url: `/pages-sub/other/voice/record?${params}${recordParam}`,
  })
}

function handleSkip() {
  callState.clearPendingCall()
  uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/index/index' }) })
}

async function handleFormSubmit(data: CallResultData) {
  const pc = callState.pendingCall
  if (!pc) {
    handleSkip()
    return
  }

  try {
    // returnTime 由 App.onShow 写入；没有拿到时用当前时间兜底，服务端会再次校验时间窗口。
    const endedAt = normalizeEndedAt(pc.dialTime, pc.returnTime)
    const res = await callRecordApi.createNativeOutbound({
      clientCallId: pc.clientCallId,
      customerId: pc.customerId,
      customerPhone: pc.phone,
      startedAt: pc.dialTime,
      endedAt,
      callResult: data.result as 'connected' | 'no_answer' | 'busy' | 'power_off',
      notes: data.notes || undefined,
      simSlot: pc.simSlot,
    })

    if (res.code === 0) {
      createdRecordId.value = res.data?.id || 0
      uni.showToast({ title: '记录已保存', icon: 'success' })
      callState.clearPendingCall()

      // Notify other pages to refresh call records
      uni.$emit('call-record-created', { customerId: pc.customerId })

      // Create follow-up if date was specified
      if (data.nextFollowUp) {
        uni.$emit('follow-up-scheduled', {
          customerId: pc.customerId,
          date: data.nextFollowUp,
        })
      }

      setTimeout(() => {
        uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/index/index' }) })
      }, 1000)
    } else {
      uni.showToast({ title: res.message || '保存失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

function normalizeEndedAt(startedAt: string, returnedAt?: string): string {
  const startTime = new Date(startedAt).getTime()
  const rawEnd = returnedAt ?? new Date().toISOString()
  const endTime = new Date(rawEnd).getTime()
  // 异常时退回拨出时间，避免负时长破坏后续云转写匹配。
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    return startedAt
  }
  return rawEnd
}
</script>

<style scoped>
.after-call-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
  padding-bottom: env(safe-area-inset-bottom);
}

.card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.customer-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.avatar-circle {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 36rpx;
  color: #ffffff;
  font-weight: bold;
}

.customer-info {
  display: flex;
  flex-direction: column;
}

.customer-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.customer-phone {
  font-size: 26rpx;
  color: #999;
  margin-top: 4rpx;
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

.voice-memo-btn {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #409eff, #2d8cf0) !important;
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
</style>
