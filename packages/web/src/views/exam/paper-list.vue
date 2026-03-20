<template>
  <div class="page-container" style="padding: 20px">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>试卷管理</span>
          <el-button type="primary" @click="openCreate">新建试卷</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" border>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="title" label="试卷名称" min-width="200" />
        <el-table-column prop="buildMode" label="组卷方式" width="100">
          <template #default="{ row }">{{ row.buildMode === 'random' ? '随机' : '手动' }}</template>
        </el-table-column>
        <el-table-column prop="totalScore" label="总分" width="80" />
        <el-table-column prop="passScore" label="及格分" width="80" />
        <el-table-column prop="duration" label="时长(分)" width="90" />
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" @click="router.push(`/exam/take/${row.id}?preview=1`)"
              >预览</el-button
            >
            <el-popconfirm title="确认删除?" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button text type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > 0"
        style="margin-top: 16px; justify-content: flex-end"
        layout="total, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @current-change="
          (p: number) => {
            page = p
            loadData()
          }
        "
      />
    </el-card>

    <!-- Create Dialog -->
    <el-dialog v-model="dialogVisible" title="新建试卷" width="800px" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-form-item label="试卷名称" required>
          <el-input v-model="form.title" maxlength="200" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="组卷方式">
          <el-radio-group v-model="form.buildMode">
            <el-radio value="manual">手动选题</el-radio>
            <el-radio value="random">随机组卷</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="总分" required>
          <el-input-number v-model="form.totalScore" :min="1" />
        </el-form-item>
        <el-form-item label="及格分" required>
          <el-input-number v-model="form.passScore" :min="1" />
        </el-form-item>
        <el-form-item label="时长(分钟)" required>
          <el-input-number v-model="form.duration" :min="1" />
        </el-form-item>

        <!-- Manual mode: question selection -->
        <template v-if="form.buildMode === 'manual'">
          <el-divider>选择题目</el-divider>
          <el-table
            :data="allQuestions"
            border
            max-height="300"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="content" label="题目" show-overflow-tooltip />
            <el-table-column prop="type" label="类型" width="80" />
            <el-table-column label="分值" width="100">
              <template #default="{ row }">
                <el-input-number v-model="scoreMap[row.id]" :min="1" size="small" />
              </template>
            </el-table-column>
          </el-table>
        </template>

        <!-- Random mode: config -->
        <template v-if="form.buildMode === 'random'">
          <el-divider>随机规则</el-divider>
          <div
            v-for="(rule, idx) in randomRules"
            :key="idx"
            style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center"
          >
            <el-tree-select
              v-model="rule.categoryId"
              :data="categoryTree"
              :props="{ label: 'name', value: 'id', children: 'children' }"
              placeholder="分类"
              check-strictly
              style="width: 150px"
            />
            <el-select v-model="rule.type" placeholder="题型" style="width: 120px">
              <el-option label="单选" value="single_choice" />
              <el-option label="多选" value="multi_choice" />
              <el-option label="判断" value="true_false" />
              <el-option label="填空" value="fill_blank" />
            </el-select>
            <el-input-number v-model="rule.count" :min="1" placeholder="数量" />
            <el-input-number v-model="rule.scorePerQuestion" :min="1" placeholder="每题分值" />
            <el-button text type="danger" @click="randomRules.splice(idx, 1)">删除</el-button>
          </div>
          <el-button
            @click="
              randomRules.push({
                categoryId: 0,
                type: 'single_choice',
                count: 5,
                scorePerQuestion: 2,
              })
            "
            >添加规则</el-button
          >
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getExamPapers,
  createExamPaper,
  deleteExamPaper,
  getQuestions,
  getQuestionCategoryTree,
  type ExamPaper,
  type Question,
  type QuestionCategory,
} from '@/api/exam'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const list = ref<ExamPaper[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const dialogVisible = ref(false)
const allQuestions = ref<Question[]>([])
const selectedQuestions = ref<Question[]>([])
const scoreMap = reactive<Record<number, number>>({})
const categoryTree = ref<QuestionCategory[]>([])
const randomRules = ref<
  Array<{ categoryId: number; type: string; count: number; scorePerQuestion: number }>
>([])

const form = reactive({
  title: '',
  description: '',
  buildMode: 'manual',
  totalScore: 100,
  passScore: 60,
  duration: 60,
})

async function loadData() {
  loading.value = true
  try {
    const res = (await getExamPapers({
      page: page.value,
      pageSize: pageSize.value,
    })) as unknown as { list: ExamPaper[]; total: number }
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function handleSelectionChange(rows: Question[]) {
  selectedQuestions.value = rows
  for (const q of rows) {
    if (!scoreMap[q.id]) scoreMap[q.id] = 5
  }
}

async function openCreate() {
  form.title = ''
  form.description = ''
  form.buildMode = 'manual'
  form.totalScore = 100
  form.passScore = 60
  form.duration = 60
  selectedQuestions.value = []
  randomRules.value = []
  dialogVisible.value = true

  // Load questions for manual mode
  try {
    const res = (await getQuestions({ pageSize: 200 })) as unknown as { list: Question[] }
    allQuestions.value = res.list
  } catch {
    /* empty */
  }
}

async function handleCreate() {
  if (!form.title) {
    ElMessage.warning('请填写试卷名称')
    return
  }
  saving.value = true
  try {
    const data: Record<string, unknown> = {
      ...form,
    }
    if (form.buildMode === 'manual') {
      data.questions = selectedQuestions.value.map((q, idx) => ({
        questionId: q.id,
        score: scoreMap[q.id] ?? 5,
        sortOrder: idx,
      }))
    } else {
      data.randomConfig = randomRules.value
    }
    await createExamPaper(data)
    ElMessage.success('创建成功')
    dialogVisible.value = false
    await loadData()
  } finally {
    saving.value = false
  }
}

async function handleDelete(id: number) {
  await deleteExamPaper(id)
  ElMessage.success('删除成功')
  await loadData()
}

onMounted(async () => {
  loadData()
  try {
    const cats = await getQuestionCategoryTree()
    categoryTree.value = cats as unknown as QuestionCategory[]
  } catch {
    /* empty */
  }
})
</script>
