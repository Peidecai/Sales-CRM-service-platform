<template>
  <div class="page-container" style="padding: 20px">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>题库管理</span>
          <el-button type="primary" @click="openCreate">新建题目</el-button>
        </div>
      </template>

      <!-- Filters -->
      <el-form :inline="true" style="margin-bottom: 16px">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索题目"
            clearable
            @clear="loadData"
            @keyup.enter="loadData"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-tree-select
            v-model="filters.categoryId"
            :data="categoryTree"
            :props="{ label: 'name', value: 'id', children: 'children' } as any"
            placeholder="全部"
            clearable
            check-strictly
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.type" placeholder="全部" clearable>
            <el-option label="单选" value="single_choice" />
            <el-option label="多选" value="multi_choice" />
            <el-option label="判断" value="true_false" />
            <el-option label="填空" value="fill_blank" />
          </el-select>
        </el-form-item>
        <el-form-item label="难度">
          <el-select v-model="filters.difficulty" placeholder="全部" clearable>
            <el-option v-for="d in 5" :key="d" :label="`${d}级`" :value="d" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
        </el-form-item>
      </el-form>

      <!-- Table -->
      <el-table v-loading="loading" :data="list" border>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="content" label="题目内容" show-overflow-tooltip min-width="200" />
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            {{ typeLabel(row.type) }}
          </template>
        </el-table-column>
        <el-table-column prop="category.name" label="分类" width="120" />
        <el-table-column prop="difficulty" label="难度" width="80" />
        <el-table-column prop="correctRate" label="正确率" width="80">
          <template #default="{ row }">{{ row.correctRate }}%</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" @click="openEdit(row)">编辑</el-button>
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

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑题目' : '新建题目'"
      width="700px"
      destroy-on-close
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="类型" required>
          <el-select v-model="form.type">
            <el-option label="单选" value="single_choice" />
            <el-option label="多选" value="multi_choice" />
            <el-option label="判断" value="true_false" />
            <el-option label="填空" value="fill_blank" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类" required>
          <el-tree-select
            v-model="form.categoryId"
            :data="categoryTree"
            :props="{ label: 'name', value: 'id', children: 'children' } as any"
            placeholder="选择分类"
            check-strictly
          />
        </el-form-item>
        <el-form-item label="题目内容" required>
          <el-input v-model="form.content" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="难度">
          <el-rate v-model="form.difficulty" :max="5" />
        </el-form-item>

        <!-- Options (for choice types) -->
        <template v-if="form.type === 'single_choice' || form.type === 'multi_choice'">
          <el-form-item label="选项">
            <div
              v-for="(opt, idx) in form.options"
              :key="idx"
              style="display: flex; gap: 8px; margin-bottom: 8px; width: 100%"
            >
              <el-input v-model="opt.label" style="width: 60px" placeholder="A" />
              <el-input v-model="opt.content" style="flex: 1" placeholder="选项内容" />
              <el-button text type="danger" @click="form.options.splice(idx, 1)">删除</el-button>
            </div>
            <el-button
              @click="
                form.options.push({
                  label: String.fromCharCode(65 + form.options.length),
                  content: '',
                })
              "
            >
              添加选项
            </el-button>
          </el-form-item>
        </template>

        <!-- Answer -->
        <el-form-item label="正确答案" required>
          <template v-if="form.type === 'single_choice'">
            <el-radio-group v-model="singleAnswer">
              <el-radio v-for="opt in form.options" :key="opt.label" :value="opt.label">
                {{ opt.label }}
              </el-radio>
            </el-radio-group>
          </template>
          <template v-else-if="form.type === 'multi_choice'">
            <el-checkbox-group v-model="form.answer">
              <el-checkbox
                v-for="opt in form.options"
                :key="opt.label"
                :label="opt.label"
                :value="opt.label"
              />
            </el-checkbox-group>
          </template>
          <template v-else-if="form.type === 'true_false'">
            <el-radio-group v-model="singleAnswer">
              <el-radio value="true">正确</el-radio>
              <el-radio value="false">错误</el-radio>
            </el-radio-group>
          </template>
          <template v-else>
            <el-input v-model="fillAnswer" placeholder="填空答案" />
          </template>
        </el-form-item>

        <el-form-item label="解析">
          <el-input v-model="form.explanation" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionCategoryTree,
  type Question,
  type QuestionCategory,
} from '@/api/exam'

const loading = ref(false)
const saving = ref(false)
const list = ref<Question[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const categoryTree = ref<QuestionCategory[]>([])
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)

const filters = reactive({
  keyword: '',
  categoryId: undefined as number | undefined,
  type: undefined as string | undefined,
  difficulty: undefined as number | undefined,
})

const form = reactive({
  type: 'single_choice',
  content: '',
  categoryId: undefined as number | undefined,
  options: [
    { label: 'A', content: '' },
    { label: 'B', content: '' },
    { label: 'C', content: '' },
    { label: 'D', content: '' },
  ],
  answer: [] as string[],
  explanation: '',
  difficulty: 3,
})

const singleAnswer = computed({
  get: () => form.answer[0] ?? '',
  set: (v: string) => {
    form.answer = [v]
  },
})

const fillAnswer = computed({
  get: () => form.answer[0] ?? '',
  set: (v: string) => {
    form.answer = [v]
  },
})

function typeLabel(t: string): string {
  const map: Record<string, string> = {
    single_choice: '单选',
    multi_choice: '多选',
    true_false: '判断',
    fill_blank: '填空',
  }
  return map[t] ?? t
}

async function loadData() {
  loading.value = true
  try {
    const res = (await getQuestions({
      page: page.value,
      pageSize: pageSize.value,
      ...filters,
    })) as unknown as { list: Question[]; total: number }
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const res = await getQuestionCategoryTree()
    categoryTree.value = res as unknown as QuestionCategory[]
  } catch {
    /* empty */
  }
}

function openCreate() {
  editingId.value = null
  form.type = 'single_choice'
  form.content = ''
  form.categoryId = undefined
  form.options = [
    { label: 'A', content: '' },
    { label: 'B', content: '' },
    { label: 'C', content: '' },
    { label: 'D', content: '' },
  ]
  form.answer = []
  form.explanation = ''
  form.difficulty = 3
  dialogVisible.value = true
}

function openEdit(row: Question) {
  editingId.value = row.id
  form.type = row.type
  form.content = row.content
  form.categoryId = row.categoryId
  form.options = [...row.options]
  form.answer = [...row.answer]
  form.explanation = row.explanation ?? ''
  form.difficulty = row.difficulty
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.content || !form.categoryId) {
    ElMessage.warning('请填写必填项')
    return
  }
  saving.value = true
  try {
    const data = {
      type: form.type,
      content: form.content,
      categoryId: form.categoryId,
      options: form.options,
      answer: form.answer,
      explanation: form.explanation || undefined,
      difficulty: form.difficulty,
    }
    if (editingId.value) {
      await updateQuestion(editingId.value, data)
      ElMessage.success('更新成功')
    } else {
      await createQuestion(data)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadData()
  } finally {
    saving.value = false
  }
}

async function handleDelete(id: number) {
  await deleteQuestion(id)
  ElMessage.success('删除成功')
  await loadData()
}

onMounted(() => {
  loadData()
  loadCategories()
})
</script>
