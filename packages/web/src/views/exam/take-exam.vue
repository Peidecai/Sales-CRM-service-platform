<template>
  <div class="page-container" style="padding: 20px">
    <el-card v-loading="loading">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>{{ paper?.title ?? '考试' }}</span>
          <div
            v-if="session && session.status === 'in_progress'"
            style="display: flex; align-items: center; gap: 12px"
          >
            <el-tag type="danger" size="large">剩余: {{ formattedTime }}</el-tag>
            <el-button type="primary" @click="handleSubmit">提交试卷</el-button>
          </div>
        </div>
      </template>

      <!-- Before start -->
      <template v-if="!session">
        <div style="text-align: center; padding: 40px 0">
          <h2>{{ paper?.title }}</h2>
          <p style="color: #999; margin: 16px 0">{{ paper?.description }}</p>
          <div style="margin-bottom: 24px">
            <el-descriptions :column="3" border>
              <el-descriptions-item label="总分">{{ paper?.totalScore }}</el-descriptions-item>
              <el-descriptions-item label="及格分">{{ paper?.passScore }}</el-descriptions-item>
              <el-descriptions-item label="时长">{{ paper?.duration }} 分钟</el-descriptions-item>
            </el-descriptions>
          </div>
          <el-button type="primary" size="large" @click="doStart">开始考试</el-button>
        </div>
      </template>

      <!-- During exam -->
      <template v-if="session && session.status === 'in_progress' && questions.length > 0">
        <div style="display: flex; gap: 20px">
          <!-- Question navigator sidebar -->
          <div style="width: 200px; flex-shrink: 0">
            <div style="font-weight: bold; margin-bottom: 8px">题目导航</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px">
              <el-button
                v-for="(q, idx) in questions"
                :key="q.questionId"
                :type="
                  currentIdx === idx
                    ? 'primary'
                    : userAnswers[q.questionId]?.length
                      ? 'success'
                      : 'default'
                "
                size="small"
                @click="currentIdx = idx"
              >
                {{ idx + 1 }}
              </el-button>
            </div>
          </div>

          <!-- Question display -->
          <div style="flex: 1">
            <div v-if="currentQuestion" style="min-height: 300px">
              <h3>第 {{ currentIdx + 1 }} 题 ({{ currentPq.score }}分)</h3>
              <p style="font-size: 16px; margin: 16px 0; white-space: pre-wrap">
                {{ currentQuestion.content }}
              </p>

              <!-- Single choice -->
              <template v-if="currentQuestion.type === 'single_choice'">
                <el-radio-group
                  v-model="currentSingleAnswer"
                  style="display: flex; flex-direction: column; gap: 12px"
                >
                  <el-radio
                    v-for="opt in currentQuestion.options"
                    :key="opt.label"
                    :value="opt.label"
                    style="margin: 0"
                  >
                    {{ opt.label }}. {{ opt.content }}
                  </el-radio>
                </el-radio-group>
              </template>

              <!-- Multi choice -->
              <template v-else-if="currentQuestion.type === 'multi_choice'">
                <el-checkbox-group
                  v-model="currentMultiAnswer"
                  style="display: flex; flex-direction: column; gap: 12px"
                >
                  <el-checkbox
                    v-for="opt in currentQuestion.options"
                    :key="opt.label"
                    :label="opt.label"
                    :value="opt.label"
                    style="margin: 0"
                  >
                    {{ opt.label }}. {{ opt.content }}
                  </el-checkbox>
                </el-checkbox-group>
              </template>

              <!-- True/false -->
              <template v-else-if="currentQuestion.type === 'true_false'">
                <el-radio-group v-model="currentSingleAnswer" style="display: flex; gap: 24px">
                  <el-radio value="true">正确</el-radio>
                  <el-radio value="false">错误</el-radio>
                </el-radio-group>
              </template>

              <!-- Fill blank -->
              <template v-else>
                <el-input
                  v-model="currentFillAnswer"
                  placeholder="请输入答案"
                  style="max-width: 400px"
                />
              </template>
            </div>

            <div style="margin-top: 24px; display: flex; justify-content: space-between">
              <el-button :disabled="currentIdx === 0" @click="currentIdx--">上一题</el-button>
              <el-button :disabled="currentIdx >= questions.length - 1" @click="currentIdx++"
                >下一题</el-button
              >
            </div>
          </div>
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getExamPaper,
  startExam,
  submitExam,
  type ExamPaper,
  type ExamPaperQuestion,
  type Question,
  type ExamSession,
} from '@/api/exam'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const paper = ref<ExamPaper | null>(null)
const session = ref<ExamSession | null>(null)
const questions = ref<(ExamPaperQuestion & { question: Question })[]>([])
const currentIdx = ref(0)
const userAnswers = ref<Record<number, string[]>>({})
const remainingSeconds = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const paperId = computed(() => Number(route.params.sessionId))

const currentPq = computed(() => questions.value[currentIdx.value])
const currentQuestion = computed(() => currentPq.value?.question)

const currentSingleAnswer = computed({
  get: () => (userAnswers.value[currentPq.value?.questionId] ?? [])[0] ?? '',
  set: (v: string) => {
    userAnswers.value[currentPq.value?.questionId] = [v]
  },
})
const currentMultiAnswer = computed({
  get: () => userAnswers.value[currentPq.value?.questionId] ?? [],
  set: (v: string[]) => {
    userAnswers.value[currentPq.value?.questionId] = v
  },
})
const currentFillAnswer = computed({
  get: () => (userAnswers.value[currentPq.value?.questionId] ?? [])[0] ?? '',
  set: (v: string) => {
    userAnswers.value[currentPq.value?.questionId] = [v]
  },
})

const formattedTime = computed(() => {
  const m = Math.floor(remainingSeconds.value / 60)
  const s = remainingSeconds.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

// Ensure answers persist as user navigates
watch(currentIdx, () => {
  const qId = currentPq.value?.questionId
  if (qId && !userAnswers.value[qId]) {
    userAnswers.value[qId] = []
  }
})

async function loadPaper() {
  loading.value = true
  try {
    const res = (await getExamPaper(paperId.value)) as unknown as ExamPaper & {
      questions: (ExamPaperQuestion & { question: Question })[]
    }
    paper.value = res
    questions.value = res.questions ?? []
  } finally {
    loading.value = false
  }
}

async function doStart() {
  try {
    const res = (await startExam(paperId.value)) as unknown as ExamSession
    session.value = res
    remainingSeconds.value = (paper.value?.duration ?? 60) * 60
    startTimer()
  } catch {
    ElMessage.error('开始考试失败')
  }
}

function startTimer() {
  timer = setInterval(() => {
    if (remainingSeconds.value <= 0) {
      handleSubmit()
      return
    }
    remainingSeconds.value--
  }, 1000)
}

async function handleSubmit() {
  try {
    await ElMessageBox.confirm('确定提交试卷吗？提交后不可修改。', '确认提交', {
      type: 'warning',
    })
  } catch {
    return
  }

  if (timer) clearInterval(timer)

  const answers = questions.value.map((pq) => ({
    questionId: pq.questionId,
    userAnswer: userAnswers.value[pq.questionId] ?? [],
  }))

  try {
    const res = (await submitExam(session.value!.id, answers)) as unknown as ExamSession
    ElMessage.success(`考试提交成功！得分: ${res.totalScore}`)
    router.push(`/exam/result/${res.id}`)
  } catch {
    ElMessage.error('提交失败')
  }
}

onMounted(() => {
  loadPaper()
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>
