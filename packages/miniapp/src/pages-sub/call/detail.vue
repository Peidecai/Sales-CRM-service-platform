<template>
  <view class="call-detail-page">
    <!-- Header Card -->
    <view class="card header-card">
      <view class="header-row">
        <text class="customer-name">{{ detail?.customer?.name || '未知客户' }}</text>
        <view class="call-type-tag" :class="isCloudCall ? 'type-cloud' : 'type-native'">
          <text>{{ isCloudCall ? '云呼录音' : '直接拨号' }}</text>
        </view>
      </view>
      <view class="info-grid">
        <view class="info-item">
          <text class="info-label">通话时间</text>
          <text class="info-value">{{ formatDateTime(detail?.callAt) }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">通话时长</text>
          <text class="info-value">{{ formatDuration(detail) }}</text>
        </view>
        <view class="info-item">
          <text class="info-label">通话结果</text>
          <text class="info-value" :class="resultColorClass">{{ resultLabel }}</text>
        </view>
      </view>
    </view>

    <!-- Audio Player (cloud calls only) -->
    <view v-if="isCloudCall && detail?.recordingUrl" class="card player-card">
      <text class="section-title">通话录音</text>
      <AudioPlayer
        :src="recordingUrl"
        :duration="detail.duration || detail.estimatedDuration || 0"
        @refresh="refreshRecordingUrl"
      />
    </view>

    <view v-if="isCloudCall && !detail?.recordingUrl" class="card no-recording-card">
      <text class="section-title">通话录音</text>
      <text class="no-recording-text">录音处理中或暂无录音</text>
    </view>

    <!-- AI Analysis -->
    <view v-if="analysis" class="card analysis-card">
      <text class="section-title">AI 分析</text>

      <!-- Summary (collapsible) -->
      <view v-if="analysis.summary" class="analysis-section">
        <view class="analysis-header" @click="summaryExpanded = !summaryExpanded">
          <text class="analysis-label">通话摘要</text>
          <text class="toggle-icon">{{ summaryExpanded ? '收起' : '展开' }}</text>
        </view>
        <text v-if="summaryExpanded" class="analysis-content">{{ analysis.summary }}</text>
        <text v-else class="analysis-content summary-collapsed">{{ truncate(analysis.summary, 60) }}</text>
      </view>

      <!-- Customer intention tag with color -->
      <view v-if="analysis.customerClassify" class="analysis-section">
        <text class="analysis-label">客户意向</text>
        <view class="classify-row">
          <view class="classify-tag" :class="intentionClass">
            <text>{{ intentionLabel }}</text>
          </view>
          <text v-if="analysis.classifyConfidence" class="confidence">
            置信度 {{ Math.round(analysis.classifyConfidence * 100) }}%
          </text>
        </view>
      </view>

      <!-- Score (stars + number) -->
      <view v-if="analysis.speechScore !== null && analysis.speechScore !== undefined" class="analysis-section">
        <text class="analysis-label">通话评分</text>
        <view class="score-row">
          <view class="stars-row">
            <text
              v-for="i in 5"
              :key="i"
              class="star"
              :class="i <= starCount ? 'star-filled' : 'star-empty'"
            >&#x2605;</text>
          </view>
          <text class="score-value">{{ analysis.speechScore }}</text>
          <text class="score-unit">/100</text>
        </view>
        <text v-if="analysis.speechFeedback" class="analysis-content feedback">
          {{ analysis.speechFeedback }}
        </text>
      </view>

      <!-- Keywords tag cloud -->
      <view v-if="analysis.suggestedTags && analysis.suggestedTags.length > 0" class="analysis-section">
        <text class="analysis-label">关键词</text>
        <view class="tags-wrap">
          <view v-for="tag in analysis.suggestedTags" :key="tag" class="keyword-tag">
            <text>{{ tag }}</text>
          </view>
        </view>
      </view>

      <!-- Improvement suggestions -->
      <view v-if="improvements.length > 0" class="analysis-section">
        <text class="analysis-label">改进建议</text>
        <view class="suggestions-list">
          <view v-for="(item, idx) in improvements" :key="idx" class="suggestion-item">
            <text class="suggestion-idx">{{ idx + 1 }}.</text>
            <text class="suggestion-text">{{ item }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!analysis && isCloudCall && !analysisLoading" class="card">
      <text class="section-title">AI 分析</text>
      <text class="no-recording-text">暂无分析结果</text>
    </view>

    <!-- Notes -->
    <view v-if="detail?.notes" class="card">
      <text class="section-title">通话备注</text>
      <text class="notes-text">{{ detail.notes }}</text>
    </view>

    <!-- Bottom Action -->
    <view v-if="detail?.customerId" class="bottom-action">
      <button class="go-customer-btn" @click="goCustomer">查看客户详情</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { callRecordApi, type CallRecordVO, type CallAnalysisResultVO } from '@/api/call-record'
import AudioPlayer from '@/components/AudioPlayer.vue'

const detail = ref<CallRecordVO | null>(null)
const analysis = ref<CallAnalysisResultVO | null>(null)
const analysisLoading = ref(false)
const loading = ref(false)
const summaryExpanded = ref(false)
const recordingUrl = ref('')
let recordId = 0

const isCloudCall = computed(() => {
  if (!detail.value) return false
  return !!detail.value.recordingUrl || detail.value.callType === 'normal'
})

const resultLabel = computed(() => {
  const map: Record<string, string> = {
    connected: '已接通',
    no_answer: '未接',
    busy: '忙线',
    power_off: '关机',
  }
  return map[detail.value?.callResult || ''] || detail.value?.callResult || '-'
})

const resultColorClass = computed(() => {
  return detail.value?.callResult === 'connected' ? 'text-success' : 'text-danger'
})

/** Map classify to high/medium/low intention */
const intentionClass = computed(() => {
  const c = (analysis.value?.customerClassify || '').toLowerCase()
  if (c.includes('高') || c.includes('high') || c === 'a') return 'intention-high'
  if (c.includes('低') || c.includes('low') || c === 'c') return 'intention-low'
  return 'intention-medium'
})

const intentionLabel = computed(() => {
  return analysis.value?.customerClassify || ''
})

/** Convert score (0-100) to 1-5 stars */
const starCount = computed(() => {
  const score = analysis.value?.speechScore ?? 0
  if (score >= 90) return 5
  if (score >= 75) return 4
  if (score >= 60) return 3
  if (score >= 40) return 2
  return 1
})

/** Parse improvement suggestions from speechFeedback */
const improvements = computed(() => {
  const fb = analysis.value?.speechFeedback
  if (!fb) return []
  // Try to extract numbered or bullet items
  const lines = fb.split(/\n|；|;/).map(l => l.trim()).filter(Boolean)
  if (lines.length > 1) return lines
  return []
})

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}

function formatDateTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDuration(record: CallRecordVO | null): string {
  if (!record) return '-'
  const dur = record.duration || record.estimatedDuration || 0
  if (dur === 0) return '-'
  if (dur < 60) return `${dur}秒`
  const min = Math.floor(dur / 60)
  const sec = dur % 60
  return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`
}

/** Re-fetch detail to get a fresh signed recording URL */
async function refreshRecordingUrl() {
  if (!recordId) return
  try {
    const res = await callRecordApi.getDetail(recordId)
    if (res.code === 0 && res.data?.recordingUrl) {
      recordingUrl.value = res.data.recordingUrl
      detail.value = res.data
      uni.showToast({ title: '已刷新录音链接', icon: 'none' })
    } else {
      uni.showToast({ title: '获取录音链接失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '刷新失败，请稍后重试', icon: 'none' })
  }
}

function goCustomer() {
  if (detail.value?.customerId) {
    uni.navigateTo({ url: `/pages-sub/customer/detail?id=${detail.value.customerId}` })
  }
}

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const id = Number((currentPage as unknown as { options: Record<string, string> }).options?.id)
  if (!id) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    return
  }
  recordId = id

  loading.value = true
  try {
    const res = await callRecordApi.getDetail(id)
    if (res.code === 0 && res.data) {
      detail.value = res.data
      if (res.data.recordingUrl) {
        recordingUrl.value = res.data.recordingUrl
      }
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }

  // Fetch AI analysis
  analysisLoading.value = true
  try {
    const res = await callRecordApi.getAnalysis(id)
    if (res.code === 0 && res.data) {
      analysis.value = res.data
    }
  } catch {
    // No analysis available
  } finally {
    analysisLoading.value = false
  }
})
</script>

<style scoped>
.call-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
}

.card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.customer-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #303133;
}

.call-type-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.type-cloud {
  background: #ecf5ff;
  color: #409eff;
}

.type-native {
  background: #f0f9eb;
  color: #67c23a;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.info-item {
  flex: 1;
  min-width: 30%;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.info-label {
  font-size: 22rpx;
  color: #909399;
}

.info-value {
  font-size: 26rpx;
  color: #303133;
}

.text-success {
  color: #67c23a;
}

.text-danger {
  color: #f56c6c;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
  display: block;
  margin-bottom: 20rpx;
}

.no-recording-text {
  font-size: 26rpx;
  color: #909399;
}

.analysis-section {
  margin-bottom: 24rpx;
}

.analysis-section:last-child {
  margin-bottom: 0;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.analysis-label {
  font-size: 24rpx;
  color: #909399;
  display: block;
  margin-bottom: 8rpx;
}

.toggle-icon {
  font-size: 22rpx;
  color: #409eff;
}

.analysis-content {
  font-size: 26rpx;
  color: #606266;
  line-height: 1.6;
}

.summary-collapsed {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.feedback {
  margin-top: 8rpx;
  display: block;
}

.classify-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.classify-tag {
  padding: 6rpx 20rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: 500;
}

.intention-high {
  background: #f0f9eb;
  color: #67c23a;
}

.intention-medium {
  background: #fdf6ec;
  color: #e6a23c;
}

.intention-low {
  background: #fef0f0;
  color: #f56c6c;
}

.confidence {
  font-size: 22rpx;
  color: #c0c4cc;
}

.score-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.stars-row {
  display: flex;
  gap: 4rpx;
  margin-right: 8rpx;
}

.star {
  font-size: 32rpx;
}

.star-filled {
  color: #f7ba2a;
}

.star-empty {
  color: #e4e7ed;
}

.score-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #409eff;
}

.score-unit {
  font-size: 24rpx;
  color: #909399;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.keyword-tag {
  background: #f0f2f5;
  color: #606266;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.suggestion-item {
  display: flex;
  gap: 8rpx;
  align-items: flex-start;
}

.suggestion-idx {
  font-size: 24rpx;
  color: #409eff;
  font-weight: 600;
  flex-shrink: 0;
}

.suggestion-text {
  font-size: 26rpx;
  color: #606266;
  line-height: 1.5;
}

.notes-text {
  font-size: 26rpx;
  color: #606266;
  line-height: 1.6;
}

.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1rpx solid #eee;
}

.go-customer-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  color: #ffffff;
  font-size: 28rpx;
  border-radius: 40rpx;
  border: none;
}

.go-customer-btn::after {
  border: none;
}
</style>
