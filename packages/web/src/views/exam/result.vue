<template>
  <div class="page-container" style="padding: 20px">
    <el-card v-loading="loading">
      <template #header>
        <span>考试结果</span>
      </template>

      <template v-if="session">
        <!-- Score summary -->
        <div style="text-align: center; padding: 20px 0">
          <h2>{{ session.paper?.title }}</h2>
          <div style="margin: 20px 0">
            <el-statistic
              title="得分"
              :value="session.totalScore ?? 0"
              style="display: inline-block; margin: 0 24px"
            />
            <el-statistic
              title="满分"
              :value="session.paper?.totalScore ?? 0"
              style="display: inline-block; margin: 0 24px"
            />
          </div>
          <el-tag :type="session.passed ? 'success' : 'danger'" size="large">
            {{ session.passed ? '通过' : '未通过' }}
          </el-tag>
          <div style="margin-top: 12px; color: #999">
            提交时间:
            {{ session.submittedAt ? new Date(session.submittedAt).toLocaleString() : '-' }}
          </div>
        </div>

        <el-divider>题目详情</el-divider>

        <!-- Per-question review -->
        <div
          v-for="(pq, idx) in paperQuestions"
          :key="pq.id"
          style="margin-bottom: 24px; padding: 16px; border: 1px solid #eee; border-radius: 8px"
        >
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px">
            <strong>第 {{ idx + 1 }} 题 ({{ pq.score }}分)</strong>
            <el-tag v-if="getAnswer(pq.questionId)?.isCorrect" type="success" size="small"
              >正确</el-tag
            >
            <el-tag v-else type="danger" size="small">
              得分: {{ getAnswer(pq.questionId)?.score ?? 0 }}
            </el-tag>
          </div>
          <p style="white-space: pre-wrap">{{ pq.question?.content }}</p>

          <!-- Options display -->
          <div v-if="pq.question?.options?.length" style="margin: 8px 0">
            <div
              v-for="opt in pq.question.options"
              :key="opt.label"
              :style="{
                color: isCorrectOption(pq.question, opt.label)
                  ? '#67c23a'
                  : isUserOption(pq.questionId, opt.label)
                    ? '#f56c6c'
                    : '#333',
              }"
            >
              {{ opt.label }}. {{ opt.content }}
              <span v-if="isCorrectOption(pq.question, opt.label)"> [正确答案]</span>
              <span v-if="isUserOption(pq.questionId, opt.label)"> [你的选择]</span>
            </div>
          </div>

          <div style="margin-top: 8px; color: #999">
            <span
              >你的答案:
              {{ (getAnswer(pq.questionId)?.userAnswer ?? []).join(', ') || '未作答' }}</span
            >
            <span style="margin-left: 16px"
              >正确答案: {{ (pq.question?.answer ?? []).join(', ') }}</span
            >
          </div>

          <div
            v-if="pq.question?.explanation"
            style="margin-top: 8px; padding: 8px; background: #f5f7fa; border-radius: 4px"
          >
            <strong>解析:</strong> {{ pq.question.explanation }}
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px">
          <el-button @click="router.push('/exam/my')">返回考试列表</el-button>
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getExamResult, type ExamSession, type ExamPaperQuestion, type Question } from '@/api/exam'
import type { ExamAnswer } from '@crm/shared'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const session = ref<ExamSession | null>(null)
const paperQuestions = ref<(ExamPaperQuestion & { question: Question })[]>([])

function getAnswer(questionId: number): ExamAnswer | undefined {
  return session.value?.answers?.find((a) => a.questionId === questionId)
}

function isCorrectOption(question: Question, label: string): boolean {
  return question.answer.includes(label)
}

function isUserOption(questionId: number, label: string): boolean {
  const a = getAnswer(questionId)
  return a?.userAnswer?.includes(label) ?? false
}

onMounted(async () => {
  loading.value = true
  try {
    const sessionId = Number(route.params.sessionId)
    const res = (await getExamResult(sessionId)) as unknown as ExamSession & {
      paperQuestions: (ExamPaperQuestion & { question: Question })[]
    }
    session.value = res
    paperQuestions.value = res.paperQuestions ?? []
  } finally {
    loading.value = false
  }
})
</script>
