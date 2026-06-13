<template>
  <div class="todo-page" style="padding: 20px">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>待办事项</span>
          <el-button type="primary" @click="showCreateDialog = true">新建待办</el-button>
        </div>
      </template>

      <!-- Filters -->
      <el-form :inline="true" style="margin-bottom: 16px">
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部" @change="loadList">
            <el-option label="待处理" :value="TodoStatus.PENDING" />
            <el-option label="已完成" :value="TodoStatus.COMPLETED" />
            <el-option label="已取消" :value="TodoStatus.CANCELLED" />
            <el-option label="已逾期" :value="TodoStatus.OVERDUE" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="filters.priority" clearable placeholder="全部" @change="loadList">
            <el-option label="高" :value="TodoPriority.HIGH" />
            <el-option label="中" :value="TodoPriority.MEDIUM" />
            <el-option label="低" :value="TodoPriority.LOW" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filters.category" clearable placeholder="全部" @change="loadList">
            <el-option label="跟进" :value="TodoCategory.FOLLOW_UP" />
            <el-option label="电话" :value="TodoCategory.CALL" />
            <el-option label="会议" :value="TodoCategory.MEETING" />
            <el-option label="其他" :value="TodoCategory.OTHER" />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- Table -->
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="category" label="分类" width="100">
          <template #default="{ row }">
            {{ categoryLabel(row.category) }}
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">
            <el-tag :type="priorityType(row.priority)" size="small">
              {{ priorityLabel(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="dueDate" label="截止时间" width="170">
          <template #default="{ row }">
            {{ row.dueDate ? new Date(row.dueDate).toLocaleString('zh-CN') : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === TodoStatus.PENDING || row.status === TodoStatus.OVERDUE"
              type="success"
              size="small"
              text
              @click="handleComplete(row.id)"
            >
              完成
            </el-button>
            <el-button
              v-if="row.status === TodoStatus.PENDING"
              type="warning"
              size="small"
              text
              @click="handleCancel(row.id)"
            >
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        style="margin-top: 16px; justify-content: flex-end"
        :total="total"
        layout="total, sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        @current-change="loadList"
        @size-change="loadList"
      />
    </el-card>

    <!-- Create Dialog -->
    <el-dialog v-model="showCreateDialog" title="新建待办" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="请输入待办标题" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category">
            <el-option label="跟进" :value="TodoCategory.FOLLOW_UP" />
            <el-option label="电话" :value="TodoCategory.CALL" />
            <el-option label="会议" :value="TodoCategory.MEETING" />
            <el-option label="其他" :value="TodoCategory.OTHER" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="form.priority">
            <el-option label="高" :value="TodoPriority.HIGH" />
            <el-option label="中" :value="TodoPriority.MEDIUM" />
            <el-option label="低" :value="TodoPriority.LOW" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止时间">
          <el-date-picker v-model="form.dueDate" type="datetime" placeholder="选择截止时间" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { TodoStatus, TodoPriority, TodoCategory } from '@crm/shared'
import { todoApi, type TodoVO } from '@/api/todo'

const list = ref<TodoVO[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const showCreateDialog = ref(false)
const submitting = ref(false)

const filters = reactive<{
  status?: TodoStatus
  priority?: TodoPriority
  category?: TodoCategory
}>({})

const form = reactive({
  title: '',
  description: '',
  category: TodoCategory.OTHER as TodoCategory,
  priority: TodoPriority.MEDIUM as TodoPriority,
  dueDate: null as Date | null,
})

async function loadList() {
  loading.value = true
  try {
    const res = await todoApi.list({
      page: page.value,
      pageSize: pageSize.value,
      ...filters,
    })
    if (res.code === 0 && res.data) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!form.title.trim()) {
    ElMessage.warning('请输入标题')
    return
  }
  submitting.value = true
  try {
    const res = await todoApi.create({
      title: form.title,
      description: form.description || undefined,
      category: form.category,
      priority: form.priority,
      dueDate: form.dueDate ? form.dueDate.toISOString() : undefined,
    })
    if (res.code === 0) {
      ElMessage.success('创建成功')
      showCreateDialog.value = false
      form.title = ''
      form.description = ''
      form.category = TodoCategory.OTHER
      form.priority = TodoPriority.MEDIUM
      form.dueDate = null
      await loadList()
    }
  } catch {
    // handled by interceptor
  } finally {
    submitting.value = false
  }
}

async function handleComplete(id: number) {
  try {
    const res = await todoApi.complete(id)
    if (res.code === 0) {
      ElMessage.success('已完成')
      await loadList()
    }
  } catch {
    ElMessage.error('操作失败')
  }
}

async function handleCancel(id: number) {
  try {
    const res = await todoApi.cancel(id)
    if (res.code === 0) {
      ElMessage.success('已取消')
      await loadList()
    }
  } catch {
    ElMessage.error('操作失败')
  }
}

function priorityLabel(p: TodoPriority): string {
  const map: Record<string, string> = { high: '高', medium: '中', low: '低' }
  return map[p] ?? p
}
function priorityType(p: TodoPriority): 'danger' | 'warning' | 'info' {
  if (p === TodoPriority.HIGH) return 'danger'
  if (p === TodoPriority.MEDIUM) return 'warning'
  return 'info'
}
function statusLabel(s: TodoStatus): string {
  const map: Record<string, string> = {
    pending: '待处理',
    completed: '已完成',
    cancelled: '已取消',
    overdue: '已逾期',
  }
  return map[s] ?? s
}
function statusType(s: TodoStatus): 'info' | 'success' | 'warning' | 'danger' {
  if (s === TodoStatus.COMPLETED) return 'success'
  if (s === TodoStatus.CANCELLED) return 'info'
  if (s === TodoStatus.OVERDUE) return 'danger'
  return 'warning'
}
function categoryLabel(c: TodoCategory): string {
  const map: Record<string, string> = {
    follow_up: '跟进',
    call: '电话',
    meeting: '会议',
    other: '其他',
  }
  return map[c] ?? c
}

onMounted(loadList)
</script>
