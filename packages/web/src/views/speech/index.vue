<template>
  <div class="speech-page">
    <div class="speech-layout">
      <!-- Left sidebar: categories -->
      <div class="category-sidebar">
        <div class="sidebar-header">
          <span>话术分类</span>
          <el-button
            v-if="isAdminOrManager"
            text
            type="primary"
            size="small"
            @click="showCategoryDialog = true"
          >
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
        <div class="category-list">
          <div
            class="category-item"
            :class="{ active: !selectedCategoryId }"
            @click="selectedCategoryId = undefined"
          >
            <span>全部</span>
            <span class="count">{{ totalCount }}</span>
          </div>
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="category-item"
            :class="{ active: selectedCategoryId === cat.id }"
            @click="selectedCategoryId = cat.id"
          >
            <span>{{ cat.name }}</span>
            <el-dropdown
              v-if="isAdminOrManager"
              trigger="click"
              @command="handleCategoryAction($event, cat)"
            >
              <el-icon class="category-more"><MoreFilled /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item command="delete">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <!-- Main content -->
      <div class="main-content">
        <!-- Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left">
            <el-input
              v-model="keyword"
              placeholder="搜索话术标题或内容"
              prefix-icon="Search"
              clearable
              style="width: 280px"
              @keyup.enter="loadTemplates"
              @clear="loadTemplates"
            />
            <el-select
              v-model="statusFilter"
              placeholder="状态"
              clearable
              style="width: 120px"
              @change="loadTemplates"
            >
              <el-option label="草稿" value="draft" />
              <el-option label="已发布" value="published" />
              <el-option label="已归档" value="archived" />
            </el-select>
          </div>
          <div class="toolbar-right">
            <el-button v-if="isAdminOrManager" @click="handleExport">
              <el-icon><Download /></el-icon> 导出
            </el-button>
            <el-button v-if="isAdminOrManager" type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon> 新建话术
            </el-button>
          </div>
        </div>

        <!-- Table -->
        <el-table v-loading="loading" :data="templates" stripe>
          <el-table-column prop="title" label="标题" min-width="200" />
          <el-table-column prop="category.name" label="分类" width="120" />
          <el-table-column prop="scene" label="场景" width="150" />
          <el-table-column prop="usageCount" label="使用次数" width="100" sortable />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="$router.push(`/speech/${row.id}`)"
                >查看</el-button
              >
              <el-button
                v-if="isAdminOrManager"
                text
                type="primary"
                size="small"
                @click="openEditDialog(row)"
                >编辑</el-button
              >
              <el-button
                v-if="isAdminOrManager"
                text
                type="danger"
                size="small"
                @click="handleDelete(row)"
                >删除</el-button
              >
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-if="total > 0"
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          style="margin-top: 16px; justify-content: flex-end"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- Create/Edit Template Dialog -->
    <el-dialog
      v-model="showTemplateDialog"
      :title="editingTemplate ? '编辑话术' : '新建话术'"
      width="640px"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="200" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="选择分类">
            <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="6" />
        </el-form-item>
        <el-form-item label="场景">
          <el-input v-model="form.scene" maxlength="200" placeholder="适用场景" />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="form.tags" maxlength="500" placeholder="逗号分隔" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
            <el-option label="已归档" value="archived" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTemplateDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveTemplate">保存</el-button>
      </template>
    </el-dialog>

    <!-- Category Dialog -->
    <el-dialog v-model="showCategoryDialog" title="新建分类" width="400px">
      <el-form :model="categoryForm" label-width="60px">
        <el-form-item label="名称">
          <el-input v-model="categoryForm.name" />
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="categoryForm.code" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="categoryForm.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCategoryDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveCategory">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, MoreFilled, Download } from '@element-plus/icons-vue'
import { usePermission } from '@/composables/usePermission'
import {
  getTemplates,
  getCategories,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  exportTemplates,
  createCategory,
  updateCategory,
  deleteCategory,
  type SpeechTemplate,
  type SpeechCategory,
} from '@/api/speech'

const { isAdminOrManager } = usePermission()

const loading = ref(false)
const saving = ref(false)
const templates = ref<SpeechTemplate[]>([])
const categories = ref<SpeechCategory[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const totalCount = ref(0)
const keyword = ref('')
const statusFilter = ref<string>()
const selectedCategoryId = ref<number>()

const showTemplateDialog = ref(false)
const showCategoryDialog = ref(false)
const editingTemplate = ref<SpeechTemplate | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  title: '',
  content: '',
  categoryId: undefined as number | undefined,
  scene: '',
  tags: '',
  status: 'draft',
})

const formRules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
}

const categoryForm = reactive({ name: '', code: '', sort: 0 })
const editingCategory = ref<SpeechCategory | null>(null)

function statusTagType(status: string) {
  if (status === 'published') return 'success'
  if (status === 'archived') return 'info'
  return 'warning'
}

function statusLabel(status: string) {
  const map: Record<string, string> = { draft: '草稿', published: '已发布', archived: '已归档' }
  return map[status] ?? status
}

async function loadCategories() {
  try {
    const data = (await getCategories()) as unknown as SpeechCategory[]
    categories.value = data
  } catch {
    /* ignore */
  }
}

async function loadTemplates() {
  loading.value = true
  try {
    const res = (await getTemplates({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      categoryId: selectedCategoryId.value,
      status: statusFilter.value,
    })) as unknown as { list: SpeechTemplate[]; total: number }
    templates.value = res.list
    total.value = res.total
    totalCount.value = res.total
  } finally {
    loading.value = false
  }
}

function handlePageChange(p: number) {
  page.value = p
  loadTemplates()
}

watch(selectedCategoryId, () => {
  page.value = 1
  loadTemplates()
})

function openCreateDialog() {
  editingTemplate.value = null
  form.title = ''
  form.content = ''
  form.categoryId = undefined
  form.scene = ''
  form.tags = ''
  form.status = 'draft'
  showTemplateDialog.value = true
}

function openEditDialog(t: SpeechTemplate) {
  editingTemplate.value = t
  form.title = t.title
  form.content = t.content
  form.categoryId = t.categoryId
  form.scene = t.scene ?? ''
  form.tags = t.tags ?? ''
  form.status = t.status
  showTemplateDialog.value = true
}

async function handleSaveTemplate() {
  await formRef.value?.validate()
  saving.value = true
  try {
    const data = {
      title: form.title,
      content: form.content,
      categoryId: form.categoryId,
      scene: form.scene || undefined,
      tags: form.tags || undefined,
      status: form.status,
    }
    if (editingTemplate.value) {
      await updateTemplate(editingTemplate.value.id, data)
      ElMessage.success('更新成功')
    } else {
      await createTemplate(data)
      ElMessage.success('创建成功')
    }
    showTemplateDialog.value = false
    loadTemplates()
  } finally {
    saving.value = false
  }
}

async function handleDelete(t: SpeechTemplate) {
  await ElMessageBox.confirm(`确定删除话术「${t.title}」？`, '提示', { type: 'warning' })
  await deleteTemplate(t.id)
  ElMessage.success('删除成功')
  loadTemplates()
}

async function handleExport() {
  try {
    const blob = (await exportTemplates()) as unknown as Blob
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'speech-templates.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('导出失败')
  }
}

async function handleSaveCategory() {
  try {
    if (editingCategory.value) {
      await updateCategory(editingCategory.value.id, categoryForm)
    } else {
      await createCategory(categoryForm)
    }
    ElMessage.success('保存成功')
    showCategoryDialog.value = false
    editingCategory.value = null
    loadCategories()
  } catch {
    /* handled by interceptor */
  }
}

async function handleCategoryAction(cmd: string, cat: SpeechCategory) {
  if (cmd === 'edit') {
    editingCategory.value = cat
    categoryForm.name = cat.name
    categoryForm.code = cat.code
    categoryForm.sort = cat.sort
    showCategoryDialog.value = true
  } else if (cmd === 'delete') {
    await ElMessageBox.confirm(`确定删除分类「${cat.name}」？`, '提示', { type: 'warning' })
    await deleteCategory(cat.id)
    ElMessage.success('删除成功')
    loadCategories()
    if (selectedCategoryId.value === cat.id) {
      selectedCategoryId.value = undefined
    }
  }
}

onMounted(() => {
  loadCategories()
  loadTemplates()
})
</script>

<style scoped>
.speech-page {
  padding: 20px;
  height: 100%;
}

.speech-layout {
  display: flex;
  gap: 20px;
  height: 100%;
}

.category-sidebar {
  width: 200px;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.category-item:hover {
  background: #f5f7fa;
}

.category-item.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.category-more {
  opacity: 0;
  transition: opacity 0.2s;
}

.category-item:hover .category-more {
  opacity: 1;
}

.count {
  font-size: 12px;
  color: #999;
}

.main-content {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  min-width: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}
</style>
