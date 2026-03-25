<template>
  <div class="page-container" style="padding: 20px">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>我的考试</span>
        </div>
      </template>

      <!-- Available papers -->
      <h3 style="margin-bottom: 12px">可参加的考试</h3>
      <el-table v-loading="loadingPapers" :data="papers" border style="margin-bottom: 24px">
        <el-table-column prop="title" label="试卷名称" min-width="200" />
        <el-table-column prop="totalScore" label="总分" width="80" />
        <el-table-column prop="passScore" label="及格分" width="80" />
        <el-table-column prop="duration" label="时长(分)" width="90" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="router.push(`/exam/take/${row.id}`)">
              参加考试
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- History -->
      <h3 style="margin-bottom: 12px">考试记录</h3>
      <el-table v-loading="loadingHistory" :data="history" border>
        <el-table-column prop="paper.title" label="试卷" min-width="200" />
        <el-table-column prop="totalScore" label="得分" width="80" />
        <el-table-column prop="passed" label="结果" width="80">
          <template #default="{ row }">
            <el-tag :type="row.passed ? 'success' : 'danger'" size="small">
              {{ row.passed ? '通过' : '未通过' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="attemptNo" label="第几次" width="80" />
        <el-table-column prop="submittedAt" label="提交时间" width="170">
          <template #default="{ row }">
            {{ row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'graded'"
              text
              type="primary"
              @click="router.push(`/exam/result/${row.id}`)"
            >
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getExamPapers, getMyExamHistory, type ExamPaper, type ExamSession } from '@/api/exam'

const router = useRouter()
const loadingPapers = ref(false)
const loadingHistory = ref(false)
const papers = ref<ExamPaper[]>([])
const history = ref<ExamSession[]>([])

onMounted(async () => {
  loadingPapers.value = true
  try {
    const res = (await getExamPapers({ pageSize: 50 })) as unknown as { list: ExamPaper[] }
    papers.value = res.list
  } finally {
    loadingPapers.value = false
  }

  loadingHistory.value = true
  try {
    const res = (await getMyExamHistory({ pageSize: 50 })) as unknown as { list: ExamSession[] }
    history.value = res.list
  } finally {
    loadingHistory.value = false
  }
})
</script>
