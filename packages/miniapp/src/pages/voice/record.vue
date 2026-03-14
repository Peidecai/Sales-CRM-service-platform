<template>
  <view class="voice-record-page">
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

        <!-- Upload Button -->
        <button class="btn-upload" :loading="uploading" @click="handleUpload">
          上传录音
        </button>
      </view>

      <!-- Transcript Placeholder -->
      <view class="card">
        <view class="card-header">
          <text class="card-title">语音转文字</text>
        </view>
        <view v-if="transcript" class="transcript-content">
          <text>{{ transcript }}</text>
        </view>
        <view v-else class="placeholder-content">
          <text class="placeholder-text">上传后将自动转写（需后端 ASR 服务支持）</text>
        </view>
      </view>

      <!-- AI Summary Placeholder -->
      <view class="card">
        <view class="card-header">
          <text class="card-title">AI 摘要</text>
        </view>
        <view class="placeholder-content">
          <text class="placeholder-text">AI 将根据转写内容生成会话摘要</text>
        </view>
      </view>

      <!-- Attach to Follow-up -->
      <button class="btn-attach" @click="attachToFollowUp">
        关联到跟进记录
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { BASE_URL, TOKEN_KEY } from '@/api/request'

function getAuthHeader(): Record<string, string> {
  const token = uni.getStorageSync(TOKEN_KEY) as string
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const isRecording = ref(false)
const isPlaying = ref(false)
const duration = ref(0)
const recordedDuration = ref(0)
const recordedFile = ref('')
const uploading = ref(false)
const transcript = ref('')

let recorderManager: UniApp.RecorderManager | null = null
let audioContext: UniApp.InnerAudioContext | null = null
let durationTimer: ReturnType<typeof setInterval> | null = null
let waveTimer: ReturnType<typeof setInterval> | null = null

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
    // Waveform animation refresh
    waveTimer = setInterval(() => {
      // Vue reactivity will re-render the wave bars with new random heights
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

function playRecording() {
  if (!recordedFile.value) return

  if (isPlaying.value) {
    audioContext?.stop()
    isPlaying.value = false
    return
  }

  audioContext = uni.createInnerAudioContext()
  audioContext.src = recordedFile.value
  audioContext.onEnded(() => {
    isPlaying.value = false
  })
  audioContext.onError(() => {
    isPlaying.value = false
  })
  audioContext.play()
  isPlaying.value = true
}

async function handleUpload() {
  if (!recordedFile.value || uploading.value) return
  uploading.value = true

  try {
    // Upload to recordings API
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
      // Parse response for transcript (if any)
      try {
        const data = JSON.parse(uploadResult.data)
        if (data.data?.transcript) {
          transcript.value = data.data.transcript
        }
      } catch {
        // No transcript available
      }
    } else {
      uni.showToast({ title: '上传失败（后端 API 开发中）', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '上传失败（后端 API 开发中）', icon: 'none' })
  } finally {
    uploading.value = false
  }
}

function attachToFollowUp() {
  uni.navigateTo({
    url: `/pages/follow-up/create?audioFile=${encodeURIComponent(recordedFile.value)}`,
  })
}

onUnmounted(() => {
  if (durationTimer) clearInterval(durationTimer)
  if (waveTimer) clearInterval(waveTimer)
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

.btn-upload {
  width: 100%;
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
