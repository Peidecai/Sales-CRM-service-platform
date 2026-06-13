<template>
  <view class="audio-player">
    <view class="player-controls">
      <view class="play-btn" :class="{ disabled: errorState }" @click="togglePlay">
        <text class="play-icon">{{ isPlaying ? '\u23F8' : '\u25B6' }}</text>
      </view>
      <view class="progress-section">
        <slider
          class="progress-slider"
          :value="displayTime"
          :max="totalDuration"
          :block-size="14"
          activeColor="#409eff"
          backgroundColor="#e4e7ed"
          @change="onSeek"
          @changing="onSeeking"
        />
        <view class="time-row">
          <text class="time-text">{{ formatTime(displayTime) }}</text>
          <text class="time-text">{{ formatTime(totalDuration) }}</text>
        </view>
      </view>
    </view>
    <view class="speed-row">
      <view
        v-for="rate in playbackRates"
        :key="rate"
        class="speed-btn"
        :class="{ active: currentRate === rate }"
        @click="setRate(rate)"
      >
        <text>{{ rate }}x</text>
      </view>
    </view>
    <view v-if="errorState" class="error-bar" @click="$emit('refresh')">
      <text class="error-text">{{ errorMessage }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue'

const props = defineProps<{
  src: string
  duration?: number
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const playbackRates = [1, 1.5, 2] as const
const SIGNED_URL_TTL_MS = 15 * 60 * 1000

const isPlaying = ref(false)
const currentTime = ref(0)
const audioDuration = ref(0)
const currentRate = ref<number>(1)
const isSeeking = ref(false)
const seekValue = ref(0)
const errorState = ref(false)
const errorMessage = ref('')

let audioCtx: UniApp.InnerAudioContext | null = null
let srcLoadedAt = 0

const totalDuration = computed(() => {
  if (audioDuration.value > 0) return audioDuration.value
  return props.duration || 0
})

const displayTime = computed(() => {
  return isSeeking.value ? seekValue.value : currentTime.value
})

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function createAudio(url: string) {
  destroyAudio()
  errorState.value = false
  errorMessage.value = ''
  srcLoadedAt = Date.now()

  audioCtx = uni.createInnerAudioContext()
  audioCtx.src = url
  audioCtx.playbackRate = currentRate.value

  audioCtx.onTimeUpdate(() => {
    if (audioCtx && !isSeeking.value) {
      currentTime.value = audioCtx.currentTime
    }
  })

  audioCtx.onCanplay(() => {
    if (audioCtx && audioCtx.duration > 0) {
      audioDuration.value = audioCtx.duration
    }
  })

  audioCtx.onEnded(() => {
    isPlaying.value = false
    currentTime.value = 0
  })

  audioCtx.onError(() => {
    isPlaying.value = false
    if (isUrlExpired()) {
      errorState.value = true
      errorMessage.value = '录音链接已过期，点击刷新'
    } else {
      errorState.value = true
      errorMessage.value = '录音播放失败，点击重试'
    }
  })
}

function destroyAudio() {
  if (audioCtx) {
    audioCtx.stop()
    audioCtx.destroy()
    audioCtx = null
  }
  isPlaying.value = false
}

function isUrlExpired(): boolean {
  return srcLoadedAt > 0 && Date.now() - srcLoadedAt > SIGNED_URL_TTL_MS
}

function togglePlay() {
  if (errorState.value) {
    emit('refresh')
    return
  }
  if (!audioCtx) return
  if (isUrlExpired()) {
    errorState.value = true
    errorMessage.value = '录音链接已过期，点击刷新'
    emit('refresh')
    return
  }
  if (isPlaying.value) {
    audioCtx.pause()
    isPlaying.value = false
  } else {
    audioCtx.play()
    isPlaying.value = true
  }
}

function onSeeking(e: { detail: { value: number } }) {
  isSeeking.value = true
  seekValue.value = e.detail.value
}

function onSeek(e: { detail: { value: number } }) {
  isSeeking.value = false
  if (audioCtx) {
    audioCtx.seek(e.detail.value)
    currentTime.value = e.detail.value
  }
}

function setRate(rate: number) {
  currentRate.value = rate
  if (audioCtx) {
    audioCtx.playbackRate = rate
  }
}

watch(() => props.src, (url) => {
  if (url) {
    createAudio(url)
  } else {
    destroyAudio()
  }
}, { immediate: true })

onUnmounted(() => {
  destroyAudio()
})
</script>

<style scoped>
.audio-player {
  background: #f8f9fb;
  border-radius: 12rpx;
  padding: 20rpx;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.play-btn {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.play-btn.disabled {
  background: #c0c4cc;
}

.play-icon {
  color: #ffffff;
  font-size: 30rpx;
}

.progress-section {
  flex: 1;
}

.progress-slider {
  margin: 0;
}

.time-row {
  display: flex;
  justify-content: space-between;
  margin-top: 2rpx;
}

.time-text {
  font-size: 20rpx;
  color: #909399;
}

.speed-row {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
  justify-content: flex-end;
}

.speed-btn {
  padding: 4rpx 20rpx;
  border-radius: 20rpx;
  background: #ebeef5;
  font-size: 22rpx;
  color: #606266;
}

.speed-btn.active {
  background: #409eff;
  color: #ffffff;
}

.error-bar {
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: #fef0f0;
  border-radius: 8rpx;
  text-align: center;
}

.error-text {
  font-size: 24rpx;
  color: #f56c6c;
}
</style>
