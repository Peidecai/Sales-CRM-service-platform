<template>
  <view class="voice-record-page">
    <!-- Call Context Banner (when from call flow) -->
    <view v-if="callContext" class="context-banner">
      <text class="context-label">通话对象：{{ customerName }}</text>
      <text class="context-sub">通话速记模式</text>
    </view>

    <!-- Recording Section -->
    <view class="record-section">
      <view class="duration-display">
        <text class="duration-text">{{ formatDuration(duration) }}</text>
      </view>

      <!-- Waveform Animation -->
      <view class="waveform">
        <view
          v-for="i in 20"
          :key="i"
          class="wave-bar"
          :style="{
            height: isRecording ? (20 + Math.random() * 60) + 'rpx' : '20rpx',
            transition: isRecording ? 'height 0.15s' : 'height 0.3s',
          }"
        />
      </view>

      <!-- Record Button -->
      <view class="record-btn-wrap">
        <view
          class="record-btn"
          :class="{ recording: isRecording }"
          @click="toggleRecording"
        >
          <text class="record-btn-icon">{{ isRecording ? '&#x23F9;' : '&#x1F3A4;' }}</text>
        </view>
        <text class="record-hint">{{ isRecording ? '点击停止' : '点击录音' }}</text>
      </view>
    </view>

    <!-- Guide Prompts (shown before/during recording in call context) -->
    <view v-if="callContext && !recordedFile" class="guide-section">
      <text class="guide-title">💡 速记提示：</text>
      <text class="guide-item">• 客户的核心需求是什么？</text>
      <text class="guide-item">• 客户有哪些异议或顾虑？</text>
      <text class="guide-item">• 你承诺了什么后续动作？</text>
      <text class="guide-item">• 下次跟进的时间和计划？</text>
    </view>

    <!-- Recorded Audio -->
    <view v-if="recordedFile" class="result-section">
      <view class="card">
        <view class="card-header">
          <text class="card-title">录音文件</text>
          <text class="card-action" @click="playRecording">
            {{ isPlaying ? '停止' : '播放' }}
          </text>
        </view>
        <text class="file-info">时长: {{ formatDuration(recordedDuration) }}</text>

        <view class="btn-row">
          <button class="btn-rerecord" @click="reRecord">重新录制</button>
          <button class="btn-upload" :loading="uploading" @click="handleUpload">
            上传并分析
          </button>
        </view>
      </view>

      <!-- Transcript -->
      <view class="card">
        <view class="card-header">
          <text class="card-title">语音转文字</text>
        </view>
        <view v-if="transcript" class="transcript-content">
          <text>{{ transcript }}</text>
        </view>
        <view v-else class="placeholder-content">
          <text class="placeholder-text">
            {{ uploading ? '上传中...' : uploadDone ? 'ASR 转写处理中...' : '上传后将自动转写' }}
          </text>
        </view>
      </view>

      <!-- AI Analysis Result -->
      <view class="card">
        <view class="card-header">
          <text class="card-title">AI 分析结果</text>
        </view>
        <view v-if="analysisResult" class="analysis-content">
          <view v-if="analysisResult.summary" class="analysis-item">
            <text class="analysis-icon">📝</text>
            <view class="analysis-body">
              <text class="analysis-label">通话摘要</text>
              <text class="analysis-text">{{ analysisResult.summary }}</text>
            </view>
          </view>
          <view v-if="analysisResult.customerClassify" class="analysis-item">
            <text class="analysis-icon">🎯</text>
            <view class="analysis-body">
              <text class="analysis-label">客户分类</text>
              <text class="analysis-text">{{ analysisResult.customerClassify }}</text>
            </view>
          </view>
          <view v-if="analysisResult.speechFeedback" class="analysis-item">
            <text class="analysis-icon">💬</text>
            <view class="analysis-body">
              <text class="analysis-label">话术建议</text>
              <text class="analysis-text">{{ analysisResult.speechFeedback }}</text>
            </view>
          </view>
          <view v-if="analysisResult.confidenceNote" class="confidence-note">
            <text>⚠️ {{ analysisResult.confidenceNote }}</text>
          </view>
        </view>
        <view v-else class="placeholder-content">
          <text class="placeholder-text">
            {{ analyzingStatus === 'processing' ? 'AI 分析处理中...' : 'AI 将根据转写内容分析通话要点' }}
          </text>
        </view>
      </view>

      <!-- Attach to Follow-up (non-call context) -->
      <button v-if="!callContext" class="btn-attach" @click="attachToFollowUp">
        关联到跟进记录
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { BASE_URL, TOKEN_KEY } from '@/api/request'
import { callRecordApi, type CallAnalysisResultVO } from '@/api/call-record'
import { useUserStore } from '@/stores/user'

function getAuthHeader(): Record<string, string> {
  const token = uni.getStorageSync(TOKEN_KEY) as string
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Call context params (passed from after-call page or customer detail)
const callContext = ref(false)
const callCustomerId = ref(0)
const customerName = ref('')
const callRecordId = ref(0)

const isRecording = ref(false)
const isPlaying = ref(false)
const duration = ref(0)
const recordedDuration = ref(0)
const recordedFile = ref('')
const uploading = ref(false)
const uploadDone = ref(false)
const transcript = ref('')
const analysisResult = ref<CallAnalysisResultVO | null>(null)
const analyzingStatus = ref<'idle' | 'processing' | 'done'>('idle')

let recorderManager: UniApp.RecorderManager | null = null
let audioContext: UniApp.InnerAudioContext | null = null
let durationTimer: ReturnType<typeof setInterval> | null = null
let waveTimer: ReturnType<typeof setInterval> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function toggleRecording() {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

function startRecording() {
  recorderManager = uni.getRecorderManager()

  recorderManager.onStart(() => {
    isRecording.value = true
    duration.value = 0
    durationTimer = setInterval(() => {
      duration.value++
    }, 1000)
    waveTimer = setInterval(() => {
      // Vue reactivity will re-render wave bars
    }, 150)
  })

  recorderManager.onStop((res) => {
    isRecording.value = false
    if (durationTimer) clearInterval(durationTimer)
    if (waveTimer) clearInterval(waveTimer)
    recordedFile.value = res.tempFilePath
    recordedDuration.value = Math.round((res.duration || 0) / 1000)
    if (recordedDuration.value === 0) {
      recordedDuration.value = duration.value
    }
  })

  recorderManager.onError((err) => {
    console.error('[VoiceRecord] error:', err)
    isRecording.value = false
    if (durationTimer) clearInterval(durationTimer)
    if (waveTimer) clearInterval(waveTimer)
    uni.showToast({ title: '录音失败', icon: 'none' })
  })

  recorderManager.start({
    format: 'mp3',
    sampleRate: 16000,
    numberOfChannels: 1,
  })
}

function stopRecording() {
  if (recorderManager) {
    recorderManager.stop()
  }
}

function reRecord() {
  recordedFile.value = ''
  recordedDuration.value = 0
  uploadDone.value = false
  transcript.value = ''
  analysisResult.value = null
  analyzingStatus.value = 'idle'
}

function playRecording() {
  if (!recordedFile.value) return

  if (isPlaying.value) {
    audioContext?.stop()
    isPlaying.value = false
    return
  }

  audioContext = uni.createInnerAudioContext()
  audioContext.src = recordedFile.value
  audioContext.onEnded(() => { isPlaying.value = false })
  audioContext.onError(() => { isPlaying.value = false })
  audioContext.play()
  isPlaying.value = true
}

async function handleUpload() {
  if (!recordedFile.value || uploading.value) return

  // If in call context but no callRecordId yet, we need one
  // The after-call page should have created the record; if not, create a minimal one
  if (callContext.value && !callRecordId.value && callCustomerId.value) {
    try {
      const userStore = useUserStore()
      const res = await callRecordApi.create({
        customerId: callCustomerId.value,
        userId: userStore.userId,
        callAt: new Date().toISOString(),
        callType: 'manual',
        callResult: 'connected',
      })
      if (res.code === 0 && res.data) {
        callRecordId.value = res.data.id
      }
    } catch {
      // Continue anyway
    }
  }

  uploading.value = true
  try {
    if (callRecordId.value) {
      // Use the typed API method
      const res = await callRecordApi.uploadRecording(recordedFile.value, callRecordId.value)
      if (res.code === 0) {
        uni.showToast({ title: '上传成功', icon: 'success' })
        uploadDone.value = true
        // Trigger AI analysis
        if (res.data?.asrTriggered) {
          analyzingStatus.value = 'processing'
          startPollingAnalysis()
        } else {
          // Manually trigger summarize
          try {
            await callRecordApi.summarize(callRecordId.value)
            analyzingStatus.value = 'processing'
            startPollingAnalysis()
          } catch {
            // Analysis trigger failed silently
          }
        }
      } else {
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    } else {
      // Generic upload (no call context)
      const uploadResult = await new Promise<UniApp.UploadFileSuccessCallbackResult>((resolve, reject) => {
        uni.uploadFile({
          url: `${BASE_URL}/recordings/upload`,
          filePath: recordedFile.value,
          name: 'file',
          header: getAuthHeader(),
          success: resolve,
          fail: reject,
        })
      })

      if (uploadResult.statusCode === 200 || uploadResult.statusCode === 201) {
        uni.showToast({ title: '上传成功', icon: 'success' })
        uploadDone.value = true
        try {
          const data = JSON.parse(uploadResult.data as string)
          if (data.data?.transcript) {
            transcript.value = data.data.transcript
          }
        } catch {
          // No transcript
        }
      } else {
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    }
  } catch {
    uni.showToast({ title: '上传失败', icon: 'none' })
  } finally {
    uploading.value = false
  }
}

function startPollingAnalysis() {
  if (!callRecordId.value) return
  let attempts = 0
  pollTimer = setInterval(async () => {
    attempts++
    if (attempts > 30) {
      // Stop after ~2.5 minutes
      if (pollTimer) clearInterval(pollTimer)
      analyzingStatus.value = 'done'
      return
    }
    try {
      const res = await callRecordApi.getAnalysis(callRecordId.value)
      if (res.code === 0 && res.data && res.data.status === 'completed') {
        analysisResult.value = res.data
        analyzingStatus.value = 'done'
        if (pollTimer) clearInterval(pollTimer)
      }
    } catch {
      // Keep polling
    }
  }, 5000)
}

function attachToFollowUp() {
  uni.navigateTo({
    url: `/pages/follow-up/create?audioFile=${encodeURIComponent(recordedFile.value)}`,
  })
}

onLoad((options) => {
  if (options?.callContext === '1') {
    callContext.value = true
    callCustomerId.value = Number(options.customerId) || 0
    customerName.value = decodeURIComponent(options.customerName || '')
    callRecordId.value = Number(options.callRecordId) || 0
  }
})

onUnmounted(() => {
  if (durationTimer) clearInterval(durationTimer)
  if (waveTimer) clearInterval(waveTimer)
  if (pollTimer) clearInterval(pollTimer)
  if (audioContext) {
    audioContext.stop()
    audioContext.destroy()
  }
})
</script>

<style scoped>
.voice-record-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.context-banner {
  background: #ffffff;
  padding: 20rpx 28rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #f0f0f0;
}

.context-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.context-sub {
  font-size: 24rpx;
  color: #409eff;
}

.record-section {
  background: linear-gradient(180deg, #2d8cf0, #409eff);
  padding: 80rpx 40rpx 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.duration-display {
  margin-bottom: 40rpx;
}

.duration-text {
  font-size: 72rpx;
  font-weight: 200;
  color: #ffffff;
  font-family: monospace;
}

.waveform {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  height: 120rpx;
  margin-bottom: 40rpx;
}

.wave-bar {
  width: 6rpx;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 3rpx;
  min-height: 20rpx;
}

.record-btn-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.record-btn {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 4rpx solid rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.record-btn.recording {
  background: rgba(255, 77, 79, 0.3);
  border-color: #ff4d4f;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.record-btn-icon {
  font-size: 52rpx;
  color: #ffffff;
}

.record-hint {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* Guide Section */
.guide-section {
  background: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 28rpx;
}

.guide-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.guide-item {
  font-size: 26rpx;
  color: #666;
  display: block;
  line-height: 2;
}

.result-section {
  padding: 24rpx;
}

.card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.card-action {
  font-size: 26rpx;
  color: #409eff;
}

.file-info {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 16rpx;
}

.btn-row {
  display: flex;
  gap: 16rpx;
}

.btn-rerecord {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  background: #f5f7fa;
  color: #666;
  font-size: 28rpx;
  border-radius: 38rpx;
  border: none;
}

.btn-rerecord::after { border: none; }

.btn-upload {
  flex: 2;
  height: 76rpx;
  line-height: 76rpx;
  background: #409eff;
  color: #ffffff;
  font-size: 28rpx;
  border-radius: 38rpx;
  border: none;
}

.btn-upload::after { border: none; }

.transcript-content {
  font-size: 26rpx;
  color: #333;
  line-height: 1.6;
}

.placeholder-content {
  padding: 20rpx 0;
}

.placeholder-text {
  font-size: 26rpx;
  color: #c0c4cc;
  text-align: center;
  display: block;
}

/* AI Analysis */
.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.analysis-item {
  display: flex;
  gap: 12rpx;
}

.analysis-icon {
  font-size: 28rpx;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.analysis-body {
  flex: 1;
}

.analysis-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 4rpx;
}

.analysis-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.5;
  display: block;
}

.confidence-note {
  margin-top: 12rpx;
  padding: 12rpx;
  background: #fdf6ec;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #e6a23c;
}

.btn-attach {
  width: calc(100% - 48rpx);
  margin: 0 24rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: #ffffff;
  color: #409eff;
  font-size: 28rpx;
  border-radius: 40rpx;
  border: 2rpx solid #409eff;
}

.btn-attach::after { border: none; }
</style>
