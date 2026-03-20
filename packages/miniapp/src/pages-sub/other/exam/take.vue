<template>
  <view class="exam-take-page">
    <!-- Result overlay -->
    <view v-if="submitted" class="result-overlay">
      <view class="result-card">
        <text class="result-icon">{{ result?.passed ? '🎉' : '😥' }}</text>
        <text class="result-title">{{ result?.passed ? '恭喜通过！' : '未通过' }}</text>
        <view class="result-score">
          <text class="score-num">{{ result?.score }}</text>
          <text class="score-total">/{{ result?.totalScore }}</text>
        </view>
        <view class="result-detail">
          <text class="detail-text">答对 {{ result?.correctCount }}/{{ result?.questionCount }} 题</text>
        </view>
        <view class="result-btn" @click="goBack">
          <text class="result-btn-text">返回列表</text>
        </view>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- Exam content -->
    <template v-if="exam && !loading">
      <!-- Top bar: timer + progress -->
      <view class="top-bar">
        <view class="timer" :class="{ warning: remainSeconds <= 60 }">
          <text class="timer-text">{{ formatTime(remainSeconds) }}</text>
        </view>
        <text class="progress-text">{{ currentIndex + 1 }}/{{ exam.questions.length }}</text>
      </view>

      <!-- Question number nav -->
      <scroll-view scroll-x class="question-nav">
        <view
          v-for="(q, idx) in exam.questions"
          :key="q.id"
          class="nav-dot"
          :class="{
            active: idx === currentIndex,
            answered: answers[q.id] !== undefined,
          }"
          @click="currentIndex = idx"
        >
          <text class="nav-dot-text">{{ idx + 1 }}</text>
        </view>
      </scroll-view>

      <!-- Question content -->
      <view class="question-area">
        <view class="question-type-badge">
          <text class="type-text">{{ typeLabel(currentQuestion.type) }}</text>
          <text class="score-text">{{ currentQuestion.score }}分</text>
        </view>
        <text class="question-title">{{ currentQuestion.title }}</text>

        <!-- Options -->
        <view class="options-list">
          <view
            v-for="(opt, optIdx) in currentQuestion.options"
            :key="optIdx"
            class="option-item"
            :class="{
              selected: isSelected(currentQuestion.id, optIdx),
            }"
            @click="selectOption(currentQuestion, optIdx)"
          >
            <view class="option-index">
              <text class="option-index-text">{{ optionLabel(optIdx) }}</text>
            </view>
            <text class="option-text">{{ opt }}</text>
          </view>
        </view>
      </view>

      <!-- Bottom bar -->
      <view class="bottom-bar">
        <view
          class="btn-prev"
          :class="{ disabled: currentIndex === 0 }"
          @click="prevQuestion"
        >
          <text class="btn-text">上一题</text>
        </view>
        <view
          v-if="currentIndex < exam.questions.length - 1"
          class="btn-next"
          @click="nextQuestion"
        >
          <text class="btn-text">下一题</text>
        </view>
        <view
          v-else
          class="btn-submit"
          @click="handleSubmit"
        >
          <text class="btn-text">提交</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { examApi, type ExamDetailVO, type ExamQuestion, type ExamSubmitResult, type ExamAnswer } from '@/api/exam'

const exam = ref<ExamDetailVO | null>(null)
const loading = ref(true)
const currentIndex = ref(0)
const answers = ref<Record<number, number | number[]>>({})
const submitted = ref(false)
const result = ref<ExamSubmitResult | null>(null)
const remainSeconds = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const currentQuestion = computed<ExamQuestion>(() => {
  return exam.value!.questions[currentIndex.value]
})

function typeLabel(type: ExamQuestion['type']): string {
  const map: Record<ExamQuestion['type'], string> = {
    single: '单选题',
    multiple: '多选题',
    judge: '判断题',
  }
  return map[type]
}

function optionLabel(idx: number): string {
  return String.fromCharCode(65 + idx) // A, B, C, D...
}

function isSelected(questionId: number, optIdx: number): boolean {
  const ans = answers.value[questionId]
  if (ans === undefined) return false
  if (Array.isArray(ans)) return ans.includes(optIdx)
  return ans === optIdx
}

function selectOption(question: ExamQuestion, optIdx: number) {
  if (submitted.value) return

  if (question.type === 'multiple') {
    const current = (answers.value[question.id] as number[] | undefined) || []
    const idx = current.indexOf(optIdx)
    if (idx >= 0) {
      const next = [...current]
      next.splice(idx, 1)
      answers.value[question.id] = next.length > 0 ? next : undefined as unknown as number[]
      if (next.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete answers.value[question.id]
      }
    } else {
      answers.value[question.id] = [...current, optIdx]
    }
  } else {
    answers.value[question.id] = optIdx
  }
}

function prevQuestion() {
  if (currentIndex.value > 0) currentIndex.value--
}

function nextQuestion() {
  if (exam.value && currentIndex.value < exam.value.questions.length - 1) {
    currentIndex.value++
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

async function handleSubmit() {
  if (!exam.value) return

  const unanswered = exam.value.questions.filter(q => answers.value[q.id] === undefined).length
  if (unanswered > 0) {
    uni.showModal({
      title: '提示',
      content: `还有 ${unanswered} 题未作答，确认提交吗？`,
      success: (res) => {
        if (res.confirm) doSubmit()
      },
    })
    return
  }
  await doSubmit()
}

async function doSubmit() {
  if (!exam.value) return
  if (timer) {
    clearInterval(timer)
    timer = null
  }

  const answerList: ExamAnswer[] = exam.value.questions
    .filter(q => answers.value[q.id] !== undefined)
    .map(q => ({
      questionId: q.id,
      answer: answers.value[q.id],
    }))

  try {
    uni.showLoading({ title: '提交中...' })
    const res = await examApi.submitExam(exam.value.id, answerList)
    if (res.code === 0 && res.data) {
      result.value = res.data
      submitted.value = true
    }
  } catch {
    uni.showToast({ title: '提交失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function goBack() {
  uni.navigateBack()
}

function startTimer(minutes: number) {
  remainSeconds.value = minutes * 60
  timer = setInterval(() => {
    remainSeconds.value--
    if (remainSeconds.value <= 0) {
      if (timer) clearInterval(timer)
      timer = null
      uni.showToast({ title: '时间到，自动提交', icon: 'none' })
      doSubmit()
    }
  }, 1000)
}

onMounted(async () => {
  const id = Number((getCurrentPages().pop() as { options?: Record<string, string> })?.options?.id)
  if (!id) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    uni.navigateBack()
    return
  }

  try {
    const res = await examApi.getExam(id)
    if (res.code === 0 && res.data) {
      exam.value = res.data
      startTimer(res.data.timeLimit)
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<style scoped>
.exam-take-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60vh;
}

.loading-text {
  font-size: 28rpx;
  color: #909399;
}

/* Top bar */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: #ffffff;
}

.timer {
  background: #ecf5ff;
  padding: 8rpx 24rpx;
  border-radius: 8rpx;
}

.timer.warning {
  background: #fef0f0;
}

.timer-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #409eff;
}

.timer.warning .timer-text {
  color: #f56c6c;
}

.progress-text {
  font-size: 26rpx;
  color: #606266;
}

/* Question nav */
.question-nav {
  white-space: nowrap;
  background: #ffffff;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.nav-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #f5f5f5;
  margin-right: 16rpx;
}

.nav-dot.active {
  background: #409eff;
}

.nav-dot.active .nav-dot-text {
  color: #ffffff;
}

.nav-dot.answered {
  background: #e1f3d8;
}

.nav-dot.answered .nav-dot-text {
  color: #67c23a;
}

.nav-dot.active.answered {
  background: #409eff;
}

.nav-dot.active.answered .nav-dot-text {
  color: #ffffff;
}

.nav-dot-text {
  font-size: 24rpx;
  color: #909399;
}

/* Question area */
.question-area {
  flex: 1;
  padding: 24rpx;
}

.question-type-badge {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.type-text {
  font-size: 24rpx;
  color: #409eff;
  background: #ecf5ff;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}

.score-text {
  font-size: 22rpx;
  color: #909399;
}

.question-title {
  font-size: 32rpx;
  color: #303133;
  line-height: 1.6;
  margin-bottom: 32rpx;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.option-item {
  display: flex;
  align-items: center;
  background: #ffffff;
  padding: 24rpx;
  border-radius: 12rpx;
  border: 2rpx solid #e4e7ed;
}

.option-item.selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.option-index {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.option-item.selected .option-index {
  background: #409eff;
}

.option-index-text {
  font-size: 24rpx;
  color: #606266;
}

.option-item.selected .option-index-text {
  color: #ffffff;
}

.option-text {
  font-size: 28rpx;
  color: #303133;
  flex: 1;
}

/* Bottom bar */
.bottom-bar {
  display: flex;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  gap: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.btn-prev,
.btn-next,
.btn-submit {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
}

.btn-prev {
  background: #f5f5f5;
}

.btn-prev.disabled {
  opacity: 0.5;
}

.btn-next {
  background: #409eff;
}

.btn-submit {
  background: #67c23a;
}

.btn-prev .btn-text {
  color: #606266;
  font-size: 28rpx;
}

.btn-next .btn-text,
.btn-submit .btn-text {
  color: #ffffff;
  font-size: 28rpx;
}

/* Result overlay */
.result-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.result-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 60rpx 48rpx;
  width: 600rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.result-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.result-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #303133;
  margin-bottom: 24rpx;
}

.result-score {
  display: flex;
  align-items: baseline;
  margin-bottom: 16rpx;
}

.score-num {
  font-size: 72rpx;
  font-weight: 700;
  color: #409eff;
}

.score-total {
  font-size: 32rpx;
  color: #909399;
}

.result-detail {
  margin-bottom: 40rpx;
}

.detail-text {
  font-size: 26rpx;
  color: #909399;
}

.result-btn {
  width: 100%;
  height: 80rpx;
  background: #409eff;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-btn-text {
  color: #ffffff;
  font-size: 30rpx;
}
</style>
