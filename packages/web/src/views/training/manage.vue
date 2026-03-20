<template>
  <div class="training-manage-page" style="padding: 20px">
    <el-card shadow="never">
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        "
      >
        <h2 style="margin: 0">视频管理</h2>
        <div style="display: flex; gap: 12px">
          <el-button type="primary" @click="showCreateDialog = true">添加视频</el-button>
          <el-button @click="showCategoryDialog = true">管理分类</el-button>
        </div>
      </div>

      <el-table :data="videos" border stripe>
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column label="分类" width="120">
          <template #default="{ row }">{{ row.category?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="时长" width="100">
          <template #default="{ row }">{{ formatDuration(row.duration) }}</template>
        </el-table-column>
        <el-table-column label="格式" width="80" prop="format" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isPublished ? 'success' : 'info'" size="small">
              {{ row.isPublished ? '已发布' : '未发布' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button
              text
              :type="row.isPublished ? 'warning' : 'success'"
              size="small"
              @click="handleTogglePublish(row)"
            >
              {{ row.isPublished ? '下架' : '发布' }}
            </el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row.id)"
              >删除</el-button
            >
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

    <!-- Create/Edit Video Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingVideo ? '编辑视频' : '添加视频'"
      width="600px"
      @close="resetForm"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" maxlength="200" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="form.categoryId" placeholder="选择分类" style="width: 100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="视频 URL" required>
          <el-input v-model="form.fileUrl" placeholder="视频文件 URL" />
        </el-form-item>
        <el-form-item label="封面 URL">
          <el-input v-model="form.coverUrl" placeholder="封面图片 URL（可选）" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="时长(秒)" required>
              <el-input-number v-model="form.duration" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="大小" required>
              <el-input-number v-model="form.fileSize" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="格式" required>
              <el-input v-model="form.format" placeholder="mp4" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- Category Management Dialog -->
    <el-dialog v-model="showCategoryDialog" title="分类管理" width="500px">
      <div style="margin-bottom: 12px; display: flex; gap: 8px">
        <el-input v-model="newCategoryName" placeholder="分类名称" style="flex: 1" />
        <el-select v-model="newCategoryType" placeholder="类型" style="width: 140px">
          <el-option label="产品知识" value="product" />
          <el-option label="销售技巧" value="sales_skill" />
          <el-option label="入职培训" value="onboarding" />
          <el-option label="行业知识" value="industry" />
          <el-option label="其他" value="other" />
        </el-select>
        <el-button type="primary" @click="handleCreateCategory">添加</el-button>
      </div>
      <el-table :data="categories" border size="small">
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button text type="danger" size="small" @click="handleDeleteCategory(row.id)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { trainingApi, type TrainingVideoVO, type TrainingCategoryVO } from '@/api/training'

const videos = ref<TrainingVideoVO[]>([])
const categories = ref<TrainingCategoryVO[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const showCreateDialog = ref(false)
const showCategoryDialog = ref(false)
const editingVideo = ref<TrainingVideoVO | null>(null)
const newCategoryName = ref('')
const newCategoryType = ref('other')

const form = reactive({
  title: '',
  description: '',
  fileUrl: '',
  coverUrl: '',
  duration: 0,
  fileSize: 0,
  format: 'mp4',
  categoryId: undefined as number | undefined,
})

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function resetForm() {
  editingVideo.value = null
  form.title = ''
  form.description = ''
  form.fileUrl = ''
  form.coverUrl = ''
  form.duration = 0
  form.fileSize = 0
  form.format = 'mp4'
  form.categoryId = undefined
}

function handleEdit(row: TrainingVideoVO) {
  editingVideo.value = row
  form.title = row.title
  form.description = row.description || ''
  form.fileUrl = row.fileUrl
  form.coverUrl = row.coverUrl || ''
  form.duration = row.duration
  form.fileSize = row.fileSize
  form.format = row.format
  form.categoryId = row.categoryId
  showCreateDialog.value = true
}

async function handleSave() {
  if (!form.title || !form.fileUrl || !form.categoryId) {
    ElMessage.warning('请填写必填字段')
    return
  }
  try {
    if (editingVideo.value) {
      await trainingApi.updateVideo(editingVideo.value.id, {
        title: form.title,
        description: form.description || undefined,
        fileUrl: form.fileUrl,
        coverUrl: form.coverUrl || undefined,
        duration: form.duration,
        fileSize: form.fileSize,
        format: form.format,
        categoryId: form.categoryId,
      } as Partial<TrainingVideoVO>)
      ElMessage.success('更新成功')
    } else {
      await trainingApi.createVideo({
        title: form.title,
        description: form.description || undefined,
        fileUrl: form.fileUrl,
        coverUrl: form.coverUrl || undefined,
        duration: form.duration,
        fileSize: form.fileSize,
        format: form.format,
        categoryId: form.categoryId,
      })
      ElMessage.success('创建成功')
    }
    showCreateDialog.value = false
    resetForm()
    await loadVideos()
  } catch {
    // handled by interceptor
  }
}

async function handleTogglePublish(row: TrainingVideoVO) {
  await trainingApi.togglePublish(row.id)
  ElMessage.success(row.isPublished ? '已下架' : '已发布')
  await loadVideos()
}

async function handleDelete(id: number) {
  await ElMessageBox.confirm('确定删除该视频？', '提示', { type: 'warning' })
  await trainingApi.deleteVideo(id)
  ElMessage.success('删除成功')
  await loadVideos()
}

async function handleCreateCategory() {
  if (!newCategoryName.value) return
  await trainingApi.createCategory({ name: newCategoryName.value, type: newCategoryType.value })
  newCategoryName.value = ''
  ElMessage.success('分类已创建')
  await loadCategories()
}

async function handleDeleteCategory(id: number) {
  await trainingApi.deleteCategory(id)
  ElMessage.success('分类已删除')
  await loadCategories()
}

async function loadVideos() {
  try {
    const res = (await trainingApi.getVideos({
      page: page.value,
      pageSize: pageSize.value,
    })) as unknown as { list: TrainingVideoVO[]; total: number }
    videos.value = res.list
    total.value = res.total
  } catch {
    // handled
  }
}

async function loadCategories() {
  try {
    categories.value = (await trainingApi.getCategories()) as unknown as TrainingCategoryVO[]
  } catch {
    // handled
  }
}

function handlePageChange(p: number) {
  page.value = p
  loadVideos()
}

onMounted(() => {
  loadVideos()
  loadCategories()
})
</script>
