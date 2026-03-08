<template>
  <div class="customer-page">
    <!-- Search bar -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="濮撳悕/鍏徃/鎵嬫満/閭"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          >
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch"> 鎼滅储 </el-button>
          <el-button @click="handleReset"> 閲嶇疆 </el-button>
        </el-form-item>
      </el-form>
      <div class="toolbar-right">
        <el-button v-if="isAdminOrManager" :loading="exportLoading" @click="handleExport">
          <el-icon><Download /></el-icon>
          瀵煎嚭
        </el-button>
        <el-button v-if="isAdminOrManager" type="warning" @click="importDialogVisible = true">
          <el-icon><Upload /></el-icon>
          瀵煎叆
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          鏂板缓瀹㈡埛
        </el-button>
      </div>
    </el-card>

    <!-- Table -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" row-key="id" stripe style="width: 100%">
        <el-table-column prop="name" label="濮撳悕" min-width="120" sortable>
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="$router.push(`/customer/${row.id}`)"
            >
              {{ row.name }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column
          prop="company"
          label="鍏徃"
          min-width="160"
          show-overflow-tooltip
          sortable
        />
        <el-table-column prop="phone" label="鎵嬫満" min-width="130" />
        <el-table-column prop="email" label="閭" min-width="180" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" min-width="110" sortable>
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="industry" label="琛屼笟" min-width="100" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="鍒涘缓鏃堕棿" min-width="170" sortable>
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="鎿嶄綔" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="$router.push(`/customer/${row.id}`)"
            >
              璇︽儏
            </el-button>
            <el-button type="primary" link size="small" @click="handleEdit(row)">
              缂栬緫
            </el-button>
            <el-button
              v-if="isAdminOrManager"
              type="primary"
              link
              size="small"
              @click="openAllocateDialog(row)"
            >
              鍒嗛厤
            </el-button>
            <el-popconfirm
              v-if="isAdminOrManager"
              title="纭畾瑕佸垹闄よ瀹㈡埛鍚楋紵"
              confirm-button-text="纭畾"
              cancel-button-text="鍙栨秷"
              @confirm="handleDelete(row.id)"
            >
              <template #reference>
                <el-button type="danger" link size="small"> 鍒犻櫎 </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="鏆傛棤瀹㈡埛鏁版嵁" :image-size="100">
            <el-button type="primary" @click="handleCreate"> 鏂板缓瀹㈡埛 </el-button>
          </el-empty>
        </template>
      </el-table>

      <!-- Pagination -->
      <div v-if="pagination.total > 0" class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Create / Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
      @closed="handleDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="80px"
        label-position="right"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="濮撳悕" prop="name">
              <el-input v-model="formData.name" placeholder="请输入姓名" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="鍏徃" prop="company">
              <el-input v-model="formData.company" placeholder="请输入公司" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="鎵嬫満" prop="phone">
              <el-input v-model="formData.phone" placeholder="璇疯緭鍏ユ墜鏈哄彿" maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="閭" prop="email">
              <el-input v-model="formData.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
                <el-option
                  v-for="opt in statusOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="琛屼笟" prop="industry">
              <el-input v-model="formData.industry" placeholder="请输入行业" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="鏉ユ簮" prop="source">
              <el-input v-model="formData.source" placeholder="请输入来源" maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="澶囨敞" prop="notes">
              <el-input
                v-model="formData.notes"
                type="textarea"
                :rows="3"
                placeholder="请输入备注"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false"> 鍙栨秷 </el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ isEdit ? '淇濆瓨' : '鍒涘缓' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Allocate Dialog -->
    <el-dialog
      v-model="allocateDialogVisible"
      title="鍒嗛厤瀹㈡埛"
      width="400px"
      :close-on-click-modal="false"
      @closed="allocateForm.assignedUserId = undefined"
    >
      <el-form label-width="90px">
        <el-form-item label="鐩爣閿€鍞憳">
          <el-select
            v-model="allocateForm.assignedUserId"
            placeholder="请选择目标销售员"
            filterable
            :loading="salesUsersLoading"
            style="width: 100%"
          >
            <el-option
              v-for="user in salesUsers"
              :key="user.id"
              :label="`${user.name} (${user.username})`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="allocateDialogVisible = false"> 鍙栨秷 </el-button>
        <el-button type="primary" :loading="allocateLoading" @click="handleAllocate">
          纭鍒嗛厤
        </el-button>
      </template>
    </el-dialog>

    <!-- Import Dialog -->
    <el-dialog
      v-model="importDialogVisible"
      title="瀵煎叆瀹㈡埛"
      width="560px"
      :close-on-click-modal="false"
      @closed="handleImportDialogClosed"
    >
      <div class="import-content">
        <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
          <template #title>
            请上传 CSV
            文件，表头必须包含“姓名”列，支持列：姓名、公司、手机、邮箱、状态、行业、来源、备注
          </template>
        </el-alert>

        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          accept=".csv"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          drag
        >
          <el-icon class="el-icon--upload">
            <Upload />
          </el-icon>
          <div class="el-upload__text">灏?CSV 鏂囦欢鎷栧埌姝ゅ锛屾垨 <em>鐐瑰嚮涓婁紶</em></div>
          <template #tip>
            <div class="el-upload__tip">仅支持 .csv 文件，单次最多导入 1000 条</div>
          </template>
        </el-upload>

        <!-- Preview parsed data -->
        <div v-if="importPreview.length > 0" class="import-preview">
          <div class="preview-header">棰勮锛堝墠 5 鏉★級</div>
          <el-table :data="importPreview.slice(0, 5)" size="small" border style="width: 100%">
            <el-table-column
              v-for="col in importColumns"
              :key="col"
              :prop="col"
              :label="col"
              min-width="80"
              show-overflow-tooltip
            />
          </el-table>
          <div class="preview-count">共解析 {{ importParsedRows.length }} 条记录</div>
        </div>

        <!-- Import result -->
        <div v-if="importResult" class="import-result">
          <el-alert
            :type="importResult.errors.length > 0 ? 'warning' : 'success'"
            :closable="false"
            show-icon
          >
            <template #title>
              成功导入 {{ importResult.imported }} 条客户
              <template v-if="importResult.errors.length > 0">
                ，{{ importResult.errors.length }} 条失败
              </template>
            </template>
          </el-alert>
          <div v-if="importResult.errors.length > 0" class="import-errors">
            <div
              v-for="(err, idx) in importResult.errors.slice(0, 10)"
              :key="idx"
              class="error-line"
            >
              {{ err }}
            </div>
            <div v-if="importResult.errors.length > 10" class="error-line">
              ...杩樻湁 {{ importResult.errors.length - 10 }} 鏉￠敊璇?
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false"> 鍙栨秷 </el-button>
        <el-button
          type="primary"
          :loading="importLoading"
          :disabled="importParsedRows.length === 0 || !!importResult"
          @click="handleImportSubmit"
        >
          瀵煎叆
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Download, Upload } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  customerApi,
  CustomerStatus,
  type CustomerVO,
  type CreateCustomerParams,
  type UpdateCustomerParams,
  type ImportResult,
} from '@/api/customer'
import { userApi, UserRole, type UserVO } from '@/api/user'
import { formatDate } from '@/utils/format'
import { getStatusTagType, getStatusLabel } from '@/utils/tag-helpers'
import { usePermission } from '@/composables/usePermission'

const userStore = useUserStore()
const { isAdminOrManager } = usePermission()

// ---- Status helpers ----
interface StatusOption {
  value: CustomerStatus
  label: string
}

const statusOptions: StatusOption[] = [
  { value: CustomerStatus.POTENTIAL, label: '潜在客户' },
  { value: CustomerStatus.FOLLOWING, label: '跟进中' },
  { value: CustomerStatus.NEGOTIATING, label: '谈判中' },
  { value: CustomerStatus.SIGNED, label: '已签约' },
  { value: CustomerStatus.LOST, label: '已流失' },
  { value: CustomerStatus.INACTIVE, label: '暂不合作' },
]

// ---- Search ----
const searchForm = reactive({
  keyword: '',
  status: undefined as CustomerStatus | undefined,
})

// ---- Table data ----
const loading = ref(false)
const tableData = ref<CustomerVO[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function fetchList() {
  loading.value = true
  try {
    const res = await customerApi.getList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      status: searchForm.status || undefined,
    })
    if (res && res.data) {
      tableData.value = res.data.list
      pagination.total = res.data.total
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.page = 1
    fetchList()
  }, 300)
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.status = undefined
  pagination.page = 1
  fetchList()
}

function handlePageChange(page: number) {
  pagination.page = page
  fetchList()
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  fetchList()
}

// ---- Dialog ----
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

interface CustomerForm {
  name: string
  company: string
  phone: string
  email: string
  status: CustomerStatus
  notes: string
  industry: string
  source: string
}

const defaultForm = (): CustomerForm => ({
  name: '',
  company: '',
  phone: '',
  email: '',
  status: CustomerStatus.POTENTIAL,
  notes: '',
  industry: '',
  source: '',
})

const formData = reactive<CustomerForm>(defaultForm())

const formRules: FormRules = {
  name: [{ required: true, message: '请输入客户姓名', trigger: 'blur' }],
  email: [{ type: 'email', message: '璇疯緭鍏ユ湁鏁堢殑閭鍦板潃', trigger: 'blur' }],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '璇疯緭鍏ユ湁鏁堢殑11浣嶆墜鏈哄彿', trigger: 'blur' },
  ],
}

const dialogTitle = ref('鏂板缓瀹㈡埛')

function handleCreate() {
  isEdit.value = false
  editId.value = null
  dialogTitle.value = '鏂板缓瀹㈡埛'
  Object.assign(formData, defaultForm())
  dialogVisible.value = true
}

function handleEdit(row: CustomerVO) {
  isEdit.value = true
  editId.value = row.id
  dialogTitle.value = '缂栬緫瀹㈡埛'
  Object.assign(formData, {
    name: row.name ?? '',
    company: row.company ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    status: row.status ?? CustomerStatus.POTENTIAL,
    notes: row.notes ?? '',
    industry: row.industry ?? '',
    source: row.source ?? '',
  })
  dialogVisible.value = true
}

function handleDialogClosed() {
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    if (isEdit.value && editId.value !== null) {
      const params: UpdateCustomerParams = {
        name: formData.name,
        company: formData.company || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
        industry: formData.industry || undefined,
        source: formData.source || undefined,
      }
      await customerApi.update(editId.value, params)
      ElMessage.success('瀹㈡埛鏇存柊鎴愬姛')
    } else {
      const params: CreateCustomerParams = {
        name: formData.name,
        company: formData.company || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        status: formData.status,
        assignedUserId: userStore.userInfo?.id ?? 1,
        notes: formData.notes || undefined,
        industry: formData.industry || undefined,
        source: formData.source || undefined,
      }
      await customerApi.create(params)
      ElMessage.success('瀹㈡埛鍒涘缓鎴愬姛')
    }
    dialogVisible.value = false
    fetchList()
  } catch {
    // Error handled by request interceptor
  } finally {
    submitLoading.value = false
  }
}

// ---- Delete ----
async function handleDelete(id: number) {
  try {
    await customerApi.remove(id)
    ElMessage.success('鍒犻櫎鎴愬姛')
    // If last item on current page and not page 1, go back
    if (tableData.value.length === 1 && pagination.page > 1) {
      pagination.page -= 1
    }
    fetchList()
  } catch {
    // Error handled by request interceptor
  }
}

// ---- Allocate ----
const allocateDialogVisible = ref(false)
const allocateLoading = ref(false)
const allocateTargetId = ref<number | null>(null)
const allocateForm = reactive({ assignedUserId: undefined as number | undefined })
const salesUsersLoading = ref(false)
const salesUsers = ref<UserVO[]>([])
let salesUsersLoaded = false

async function fetchSalesUsers() {
  if (salesUsersLoaded) return
  salesUsersLoading.value = true
  try {
    const res = await userApi.getList({
      page: 1,
      pageSize: 200,
      role: UserRole.SALES,
    })
    salesUsers.value = (res.data?.list ?? []).filter((user) => user.isActive)
    salesUsersLoaded = true
  } catch {
    // Error handled by request interceptor
  } finally {
    salesUsersLoading.value = false
  }
}
async function openAllocateDialog(row: CustomerVO) {
  await fetchSalesUsers()
  allocateTargetId.value = row.id
  allocateForm.assignedUserId = row.assignedUserId
  allocateDialogVisible.value = true
}

async function handleAllocate() {
  if (!allocateTargetId.value || !allocateForm.assignedUserId) {
    ElMessage.warning('请选择目标销售员')
    return
  }
  allocateLoading.value = true
  try {
    await customerApi.allocate(allocateTargetId.value, {
      assignedUserId: allocateForm.assignedUserId,
    })
    ElMessage.success('瀹㈡埛鍒嗛厤鎴愬姛')
    allocateDialogVisible.value = false
    fetchList()
  } catch {
    // Error handled by request interceptor
  } finally {
    allocateLoading.value = false
  }
}

// ---- Export ----
const exportLoading = ref(false)

async function handleExport() {
  exportLoading.value = true
  try {
    const blob = await customerApi.exportCsv()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success('瀵煎嚭鎴愬姛')
  } catch {
    // Error handled by request interceptor
  } finally {
    exportLoading.value = false
  }
}

// ---- Import ----
const importDialogVisible = ref(false)
const importLoading = ref(false)
const importParsedRows = ref<Array<Record<string, string>>>([])
const importPreview = ref<Array<Record<string, string>>>([])
const importColumns = ref<string[]>([])
const importResult = ref<ImportResult | null>(null)

function parseCsvText(text: string): { columns: string[]; rows: Array<Record<string, string>> } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length < 2) return { columns: [], rows: [] }

  const columns = parseCsvLine(lines[0])
  const rows: Array<Record<string, string>> = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    columns.forEach((col, idx) => {
      row[col] = values[idx] ?? ''
    })
    rows.push(row)
  }

  return { columns, rows }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current.trim())
  return result
}

interface UploadFile {
  raw?: File
}

function handleFileChange(file: UploadFile) {
  if (!file.raw) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    if (!text) return
    const { columns, rows } = parseCsvText(text)
    if (!columns.includes('濮撳悕') && !columns.includes('name')) {
      ElMessage.warning('CSV 文件必须包含“姓名”列')
      importParsedRows.value = []
      importPreview.value = []
      importColumns.value = []
      return
    }
    importColumns.value = columns
    importParsedRows.value = rows
    importPreview.value = rows.slice(0, 5)
  }
  reader.readAsText(file.raw, 'utf-8')
}

function handleFileRemove() {
  importParsedRows.value = []
  importPreview.value = []
  importColumns.value = []
  importResult.value = null
}

function handleImportDialogClosed() {
  importParsedRows.value = []
  importPreview.value = []
  importColumns.value = []
  importResult.value = null
}

async function handleImportSubmit() {
  if (importParsedRows.value.length === 0) return

  importLoading.value = true
  try {
    const res = await customerApi.importCsv(importParsedRows.value)
    if (res?.data) {
      importResult.value = res.data
      ElMessage.success(`成功导入 ${res.data.imported} 条客户`)
      fetchList()
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    importLoading.value = false
  }
}

// ---- Init ----
onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.customer-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.search-card :deep(.el-card__body) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
}

.search-form {
  flex: 1;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

.table-card :deep(.el-table) {
  border-radius: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px;
}

/* Import Dialog */
.import-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-preview {
  margin-top: 8px;
}

.preview-header {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.preview-count {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.import-result {
  margin-top: 8px;
}

.import-errors {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fef0f0;
  border-radius: 4px;
  max-height: 150px;
  overflow-y: auto;
}

.error-line {
  font-size: 12px;
  color: #f56c6c;
  line-height: 1.6;
}
</style>
