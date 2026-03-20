<template>
  <div class="training-tasks-page" style="padding: 20px">
    <el-card shadow="never">
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        "
      >
        <h2 style="margin: 0">学习任务</h2>
        <div style="display: flex; gap: 12px">
          <el-radio-group v-model="viewMode" @change="loadTasks">
            <el-radio-button value="my">我的任务</el-radio-button>
            <el-radio-button v-if="isAdminOrManager" value="all">全部任务</el-radio-button>
          </el-radio-group>
          <el-button v-if="isAdminOrManager" type="primary" @click="showCreateDialog = true"
            >创建任务</el-button
          >
        </div>
      </div>

      <el-table :data="tasks" border stripe>
        <el-table-column prop="title" label="任务名称" min-width="180" />
        <el-table-column label="关联视频" min-width="160">
          <template #default="{ row }">{{ row.video?.title || '-' }}</template>
        </el-table-column>
        <el-table-column label="截止日期" width="180">
          <template #default="{ row }">
            <span :style="{ color: isOverdue(row.deadline) ? '#f56c6c' : '' }">
              {{ formatDate(row.deadline) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="完成情况" width="120">
          <template #default="{ row }">
            <span>{{ getCompletedCount(row) }}/{{ row.assignees?.length || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="viewMode === 'my'" label="我的状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getMyStatus(row) === 'completed' ? 'success' : 'warning'" size="small">
              {{ getMyStatus(row) === 'completed' ? '已完成' : '未完成' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              v-if="viewMode === 'my' && getMyStatus(row) !== 'completed'"
              text
              type="primary"
              size="small"
              @click="handleComplete(row.id)"
            >
              标记完成
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > pageSize"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="handlePageChange"
      />
    </el-card>

    <!-- Create Task Dialog -->
    <el-dialog v-model="showCreateDialog" title="创建学习任务" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="任务名称" required>
          <el-input v-model="form.title" maxlength="200" />
        </el-form-item>
        <el-form-item label="关联视频" required>
          <el-select v-model="form.videoId" placeholder="选择视频" style="width: 100%" filterable>
            <el-option v-for="v in allVideos" :key="v.id" :label="v.title" :value="v.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="指派人员" required>
          <el-input v-model="form.assigneeIdsStr" placeholder="用户ID，逗号分隔" />
        </el-form-item>
        <el-form-item label="截止日期" required>
          <el-date-picker
            v-model="form.deadline"
            type="datetime"
            placeholder="选择截止日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateTask">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { usePermission } from '@/composables/usePermission'
import { useUserStore } from '@/stores/user'
import { trainingApi, type TrainingTaskVO, type TrainingVideoVO } from '@/api/training'

const { isAdminOrManager } = usePermission()
const userStore = useUserStore()
const tasks = ref<TrainingTaskVO[]>([])
const allVideos = ref<TrainingVideoVO[]>([])
const viewMode = ref<'my' | 'all'>('my')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const showCreateDialog = ref(false)

const form = reactive({
  title: '',
  videoId: undefined as number | undefined,
  assigneeIdsStr: '',
  deadline: '' as string | Date,
  description: '',
})

function formatDate(d: string): string {
  return new Date(d).toLocaleString('zh-CN')
}

function isOverdue(deadline: string): boolean {
  return new Date(deadline) < new Date()
}

function getCompletedCount(task: TrainingTaskVO): number {
  return task.assignees?.filter((a) => a.isCompleted).length || 0
}

function getMyStatus(task: TrainingTaskVO): string {
  const userId = userStore.userInfo?.id
  const assignee = task.assignees?.find((a) => a.userId === userId)
  return assignee?.isCompleted ? 'completed' : 'pending'
}

async function loadTasks() {
  try {
    const userId = viewMode.value === 'my' ? userStore.userInfo?.id : undefined
    const res = (await trainingApi.getTasks({
      userId,
      page: page.value,
      pageSize: pageSize.value,
    })) as unknown as {
      list: TrainingTaskVO[]
      total: number
    }
    tasks.value = res.list
    total.value = res.total
  } catch {
    // handled
  }
}

async function handleComplete(taskId: number) {
  try {
    await trainingApi.completeTask(taskId)
    ElMessage.success('已标记完成')
    await loadTasks()
  } catch {
    // handled
  }
}

async function handleCreateTask() {
  if (!form.title || !form.videoId || !form.assigneeIdsStr || !form.deadline) {
    ElMessage.warning('请填写必填字段')
    return
  }
  const assigneeIds = form.assigneeIdsStr
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n))
  if (assigneeIds.length === 0) {
    ElMessage.warning('请输入有效的用户ID')
    return
  }
  try {
    const deadline = typeof form.deadline === 'string' ? form.deadline : form.deadline.toISOString()
    await trainingApi.createTask({
      title: form.title,
      videoId: form.videoId,
      assigneeIds,
      deadline,
      description: form.description || undefined,
    })
    ElMessage.success('任务创建成功')
    showCreateDialog.value = false
    form.title = ''
    form.videoId = undefined
    form.assigneeIdsStr = ''
    form.deadline = ''
    form.description = ''
    await loadTasks()
  } catch {
    // handled
  }
}

function handlePageChange(p: number) {
  page.value = p
  loadTasks()
}

onMounted(async () => {
  loadTasks()
  try {
    const res = (await trainingApi.getVideos({ isPublished: true, pageSize: 200 })) as unknown as {
      list: TrainingVideoVO[]
    }
    allVideos.value = res.list
  } catch {
    // handled
  }
})
</script>
