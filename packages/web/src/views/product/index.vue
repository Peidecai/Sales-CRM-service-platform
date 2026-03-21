<template>
  <div class="product-page">
    <div class="product-layout">
      <!-- Left: Category Tree -->
      <div class="category-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">产品分类</span>
          <el-button
            v-if="isAdminOrManager"
            type="primary"
            link
            size="small"
            @click="handleAddCategory"
          >
            添加
          </el-button>
        </div>
        <el-tree
          ref="treeRef"
          :data="categoryTree"
          :props="{ label: 'name', children: 'children' }"
          node-key="id"
          highlight-current
          default-expand-all
          @node-click="handleCategoryClick"
        >
          <template #default="{ node, data }">
            <span class="tree-node">
              <span>{{ node.label }}</span>
              <span v-if="isAdminOrManager" class="tree-actions">
                <el-button type="primary" link size="small" @click.stop="handleEditCategory(data)">
                  编辑
                </el-button>
                <el-button type="danger" link size="small" @click.stop="handleDeleteCategory(data)">
                  删除
                </el-button>
              </span>
            </span>
          </template>
        </el-tree>
        <div v-if="selectedCategoryId" class="sidebar-footer">
          <el-button link size="small" @click="clearCategoryFilter">清除筛选</el-button>
        </div>
      </div>

      <!-- Right: Product Table -->
      <div class="product-content">
        <!-- Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索产品名称/编码"
              clearable
              style="width: 240px"
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select
              v-model="searchStatus"
              placeholder="状态"
              clearable
              style="width: 120px"
              @change="handleSearch"
            >
              <el-option label="上架" value="active" />
              <el-option label="下架" value="inactive" />
              <el-option label="停产" value="discontinued" />
            </el-select>
          </div>
          <div v-if="isAdminOrManager" class="toolbar-right">
            <el-button type="primary" @click="handleExport">导出</el-button>
            <el-button type="primary" @click="handleCreate">新建产品</el-button>
          </div>
        </div>

        <!-- Table -->
        <el-table v-loading="loading" :data="productList" stripe style="width: 100%">
          <el-table-column prop="code" label="编码" width="120" />
          <el-table-column prop="name" label="产品名称" min-width="180">
            <template #default="{ row }">
              <el-button link type="primary" @click="goDetail(row.id)">
                {{ row.name }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column label="分类" width="120">
            <template #default="{ row }">
              {{ row.category?.name ?? '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="price" label="单价" width="120" align="right">
            <template #default="{ row }">
              {{ Number(row.price).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column prop="unit" label="单位" width="80" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isAdminOrManager" label="操作" width="160">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- Pagination -->
        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @size-change="fetchProducts"
            @current-change="fetchProducts"
          />
        </div>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingProduct ? '编辑产品' : '新建产品'"
      width="600px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="200" />
        </el-form-item>
        <el-form-item label="编码" prop="code">
          <el-input v-model="form.code" maxlength="50" :disabled="!!editingProduct" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-tree-select
            v-model="form.categoryId"
            :data="categoryTree"
            :props="{ label: 'name', children: 'children', value: 'id' } as any"
            clearable
            placeholder="选择分类"
            check-strictly
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="单价" prop="price">
          <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="form.unit" maxlength="20" placeholder="件/套/个/年" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="上架" value="active" />
            <el-option label="下架" value="inactive" />
            <el-option label="停产" value="discontinued" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- Category Dialog -->
    <el-dialog
      v-model="categoryDialogVisible"
      :title="editingCategory ? '编辑分类' : '新建分类'"
      width="400px"
      destroy-on-close
    >
      <el-form
        ref="categoryFormRef"
        :model="categoryForm"
        :rules="categoryFormRules"
        label-width="80px"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="categoryForm.name" maxlength="100" />
        </el-form-item>
        <el-form-item label="父分类">
          <el-tree-select
            v-model="categoryForm.parentId"
            :data="categoryTree"
            :props="{ label: 'name', children: 'children', value: 'id' } as any"
            clearable
            placeholder="无（顶级分类）"
            check-strictly
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="categoryForm.sort" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCategorySubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { usePermission } from '@/composables/usePermission'
import { productApi, type ProductVO, type ProductCategoryVO } from '@/api/product'

const router = useRouter()
const { isAdminOrManager } = usePermission()

// State
const loading = ref(false)
const submitting = ref(false)
const productList = ref<ProductVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const searchStatus = ref('')
const selectedCategoryId = ref<number | undefined>(undefined)

// Category tree
const categoryTree = ref<ProductCategoryVO[]>([])
const treeRef = ref()

// Product dialog
const dialogVisible = ref(false)
const editingProduct = ref<ProductVO | null>(null)
const formRef = ref<FormInstance>()
const form = reactive({
  name: '',
  code: '',
  categoryId: undefined as number | undefined,
  price: 0,
  unit: '',
  status: 'active',
  description: '',
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入产品编码', trigger: 'blur' }],
  price: [{ required: true, message: '请输入单价', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

// Category dialog
const categoryDialogVisible = ref(false)
const editingCategory = ref<ProductCategoryVO | null>(null)
const categoryFormRef = ref<FormInstance>()
const categoryForm = reactive({
  name: '',
  parentId: undefined as number | undefined,
  sort: 0,
})

const categoryFormRules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
}

// Helpers
function statusLabel(status: string): string {
  const map: Record<string, string> = { active: '上架', inactive: '下架', discontinued: '停产' }
  return map[status] ?? status
}

function statusTagType(status: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
  const map: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
    active: 'success',
    inactive: 'info',
    discontinued: 'danger',
  }
  return map[status] ?? 'info'
}

// Data fetching
async function fetchProducts() {
  loading.value = true
  try {
    const res = await productApi.getList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value || undefined,
      categoryId: selectedCategoryId.value,
      status: (searchStatus.value || undefined) as ProductVO['status'] | undefined,
    })
    productList.value = res.data?.list ?? []
    total.value = res.data?.total ?? 0
  } finally {
    loading.value = false
  }
}

async function fetchCategories() {
  try {
    const res = await productApi.getCategoryTree()
    categoryTree.value = res.data ?? []
  } catch {
    categoryTree.value = []
  }
}

function handleSearch() {
  page.value = 1
  fetchProducts()
}

function handleCategoryClick(data: ProductCategoryVO) {
  selectedCategoryId.value = data.id
  page.value = 1
  fetchProducts()
}

function clearCategoryFilter() {
  selectedCategoryId.value = undefined
  treeRef.value?.setCurrentKey(null)
  page.value = 1
  fetchProducts()
}

function goDetail(id: number) {
  router.push(`/product/${id}`)
}

// Product CRUD
function handleCreate() {
  editingProduct.value = null
  Object.assign(form, {
    name: '',
    code: '',
    categoryId: undefined,
    price: 0,
    unit: '',
    status: 'active',
    description: '',
  })
  dialogVisible.value = true
}

function handleEdit(row: ProductVO) {
  editingProduct.value = row
  Object.assign(form, {
    name: row.name,
    code: row.code,
    categoryId: row.categoryId ?? undefined,
    price: Number(row.price),
    unit: row.unit,
    status: row.status,
    description: row.description ?? '',
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (editingProduct.value) {
      await productApi.update(editingProduct.value.id, { ...form } as unknown as Partial<ProductVO>)
      ElMessage.success('更新成功')
    } else {
      await productApi.create({ ...form } as unknown as Partial<ProductVO>)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchProducts()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: ProductVO) {
  await ElMessageBox.confirm(`确定删除产品「${row.name}」？`, '提示', { type: 'warning' })
  await productApi.remove(row.id)
  ElMessage.success('删除成功')
  fetchProducts()
}

async function handleExport() {
  const blob = await productApi.exportCsv()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `products_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Category CRUD
function handleAddCategory() {
  editingCategory.value = null
  Object.assign(categoryForm, { name: '', parentId: undefined, sort: 0 })
  categoryDialogVisible.value = true
}

function handleEditCategory(data: ProductCategoryVO) {
  editingCategory.value = data
  Object.assign(categoryForm, {
    name: data.name,
    parentId: data.parentId ?? undefined,
    sort: data.sort,
  })
  categoryDialogVisible.value = true
}

async function handleDeleteCategory(data: ProductCategoryVO) {
  await ElMessageBox.confirm(`确定删除分类「${data.name}」？`, '提示', { type: 'warning' })
  await productApi.removeCategory(data.id)
  ElMessage.success('删除成功')
  fetchCategories()
}

async function handleCategorySubmit() {
  await categoryFormRef.value?.validate()
  submitting.value = true
  try {
    if (editingCategory.value) {
      await productApi.updateCategory(editingCategory.value.id, { ...categoryForm })
      ElMessage.success('更新成功')
    } else {
      await productApi.createCategory({ ...categoryForm })
      ElMessage.success('创建成功')
    }
    categoryDialogVisible.value = false
    fetchCategories()
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchProducts()
  fetchCategories()
})
</script>

<style scoped>
.product-page {
  padding: 20px;
  height: 100%;
}

.product-layout {
  display: flex;
  gap: 16px;
  height: 100%;
}

.category-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 4px;
  padding: 12px;
  border: 1px solid #ebeef5;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
}

.sidebar-footer {
  margin-top: 8px;
  text-align: center;
}

.tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-size: 13px;
}

.tree-actions {
  display: none;
}

.tree-node:hover .tree-actions {
  display: inline-flex;
}

.product-content {
  flex: 1;
  background: #fff;
  border-radius: 4px;
  padding: 16px;
  border: 1px solid #ebeef5;
}

.toolbar {
  display: flex;
  justify-content: space-between;
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

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
