<template>
  <view class="exam-list-page">
    <scroll-view
      scroll-y
      class="exam-scroll"
      @scrolltolower="loadMore"
      :refresher-triggered="isRefreshing"
      refresher-enabled
      @refresherrefresh="onRefresh"
    >
      <EmptyState
        v-if="examList.length === 0 && !loading"
        title="暂无考试"
        description="目前没有可参加的考试"
      />

      <view
        v-for="exam in examList"
        :key="exam.id"
        class="exam-card"
        @click="goExam(exam)"
      >
        <view class="exam-header">
          <text class="exam-title">{{ exam.title }}</text>
          <view class="status-badge" :class="exam.status">
            <text class="status-text">{{ statusLabel(exam.status) }}</text>
          </view>
        </view>
        <text v-if="exam.description" class="exam-desc">{{ exam.description }}</text>
        <view class="exam-meta">
          <view class="meta-item">
            <text class="meta-label">题目数</text>
            <text class="meta-value">{{ exam.questionCount }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">时限</text>
            <text class="meta-value">{{ exam.timeLimit }}分钟</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">总分</text>
            <text class="meta-value">{{ exam.totalScore }}分</text>
          </view>
          <view v-if="exam.status === 'completed'" class="meta-item">
            <text class="meta-label">得分</text>
            <text class="meta-value score">{{ exam.score }}分</text>
          </view>
        </view>
        <view class="exam-footer">
          <text class="expire-text">截止: {{ formatDate(exam.expiredAt) }}</text>
        </view>
      </view>

      <LoadMore v-if="loading" status="loading" />
      <LoadMore v-else-if="noMore && examList.length > 0" status="noMore" />

      <view style="height: 40rpx" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LoadMore from '@/components/LoadMore.vue'
import EmptyState from '@/components/EmptyState.vue'
import { examApi, type ExamVO } from '@/api/exam'

const examList = ref<ExamVO[]>([])
const loading = ref(false)
const isRefreshing = ref(false)
const page = ref(1)
const pageSize = 20
const noMore = ref(false)

function statusLabel(status: ExamVO['status']): string {
  const map: Record<ExamVO['status'], string> = {
    pending: '未做',
    completed: '已完成',
    expired: '已过期',
  }
  return map[status]
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${min}`
}

function goExam(exam: ExamVO) {
  if (exam.status === 'expired') {
    uni.showToast({ title: '考试已过期', icon: 'none' })
    return
  }
  if (exam.status === 'completed') {
    uni.showToast({ title: '已完成此考试', icon: 'none' })
    return
  }
  uni.navigateTo({ url: `/pages-sub/other/exam/take?id=${exam.id}` })
}

async function resetAndLoad() {
  page.value = 1
  noMore.value = false
  examList.value = []
  await loadExams()
}

async function loadExams() {
  if (loading.value || noMore.value) return
  loading.value = true
  try {
    const res = await examApi.getExams({ page: page.value, pageSize })
    if (res.code === 0 && res.data) {
      const newItems = res.data.list
      if (page.value === 1) {
        examList.value = newItems
      } else {
        examList.value = [...examList.value, ...newItems]
      }
      if (newItems.length < pageSize) {
        noMore.value = true
      }
    }
  } catch {
    // handled by request
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (!noMore.value && !loading.value) {
    page.value++
    loadExams()
  }
}

async function onRefresh() {
  isRefreshing.value = true
  await resetAndLoad()
  isRefreshing.value = false
}

onMounted(() => {
  loadExams()
})
</script>

<style scoped>
.exam-list-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.exam-scroll {
  height: 100vh;
}

.exam-card {
  background: #ffffff;
  padding: 28rpx 24rpx;
  margin-bottom: 2rpx;
}

.exam-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.exam-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #303133;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.status-badge.pending {
  background: #ecf5ff;
}

.status-badge.pending .status-text {
  color: #409eff;
}

.status-badge.completed {
  background: #f0f9eb;
}

.status-badge.completed .status-text {
  color: #67c23a;
}

.status-badge.expired {
  background: #fef0f0;
}

.status-badge.expired .status-text {
  color: #f56c6c;
}

.status-text {
  font-size: 22rpx;
}

.exam-desc {
  font-size: 24rpx;
  color: #909399;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.exam-meta {
  display: flex;
  gap: 32rpx;
  margin-bottom: 12rpx;
}

.meta-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.meta-label {
  font-size: 22rpx;
  color: #c0c4cc;
}

.meta-value {
  font-size: 26rpx;
  color: #606266;
  font-weight: 500;
}

.meta-value.score {
  color: #409eff;
}

.exam-footer {
  display: flex;
  justify-content: flex-end;
}

.expire-text {
  font-size: 22rpx;
  color: #c0c4cc;
}
</style>
