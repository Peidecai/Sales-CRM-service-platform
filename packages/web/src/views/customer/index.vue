<template>
  <div class="customer-page">
    <!-- Search bar -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="姓名/公司/手机/邮箱"
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
          <el-button type="primary" @click="handleSearch"> 搜索 </el-button>
          <el-button @click="handleReset"> 重置 </el-button>
        </el-form-item>
      </el-form>
      <div class="toolbar-right">
        <el-button v-if="isAdminOrManager" :loading="exportLoading" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button v-if="isAdminOrManager" type="warning" @click="importWizardVisible = true">
          <el-icon><Upload /></el-icon>
          导入
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          新建客户
        </el-button>
      </div>
    </el-card>

    <!-- Table -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" row-key="id" stripe style="width: 100%">
        <el-table-column prop="name" label="姓名" min-width="120" sortable>
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
          label="公司"
          min-width="160"
          show-overflow-tooltip
          sortable
        />
        <el-table-column prop="phone" label="手机" min-width="160">
          <template #default="{ row }">
            <template v-if="row.phone">
              {{ row.phone }}
              <el-button type="success" link size="small" @click="handleCloudCall(row)">
                <el-icon><Phone /></el-icon>
              </el-button>
            </template>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" min-width="110" sortable>
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="industry" label="行业" min-width="100" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" min-width="170" sortable>
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="$router.push(`/customer/${row.id}`)"
            >
              详情
            </el-button>
            <el-button type="primary" link size="small" @click="handleEdit(row)"> 编辑 </el-button>
            <el-button
              v-if="isAdminOrManager"
              type="primary"
              link
              size="small"
              @click="openAllocateDialog(row)"
            >
              分配
            </el-button>
            <el-popconfirm
              v-if="isAdminOrManager"
              title="确定要删除该客户吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="handleDelete(row.id)"
            >
              <template #reference>
                <el-button type="danger" link size="small"> 删除 </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无客户数据" :image-size="100">
            <el-button type="primary" @click="handleCreate"> 新建客户 </el-button>
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
            <el-form-item label="姓名" prop="name">
              <el-input v-model="formData.name" placeholder="请输入姓名" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公司" prop="company">
              <el-input v-model="formData.company" placeholder="请输入公司" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机" prop="phone">
              <el-input v-model="formData.phone" placeholder="请输入手机号" maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
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
            <el-form-item label="行业" prop="industry">
              <el-input v-model="formData.industry" placeholder="请输入行业" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="来源" prop="source">
              <el-input v-model="formData.source" placeholder="请输入来源" maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="notes">
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
        <el-button @click="dialogVisible = false"> 取消 </el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Allocate Dialog -->
    <el-dialog
      v-model="allocateDialogVisible"
      title="分配客户"
      width="400px"
      :close-on-click-modal="false"
      @closed="allocateForm.assignedUserId = undefined"
    >
      <el-form label-width="90px">
        <el-form-item label="目标销售员">
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
        <el-button @click="allocateDialogVisible = false"> 取消 </el-button>
        <el-button type="primary" :loading="allocateLoading" @click="handleAllocate">
          确认分配
        </el-button>
      </template>
    </el-dialog>

    <!-- Import Wizard -->
    <ImportWizard v-model:visible="importWizardVisible" @success="fetchList" />

    <!-- Cloud Call Dialog -->
    <CloudCallDialog
      v-model:visible="cloudCallDialogVisible"
      :customer-id="cloudCallCustomer.id"
      :customer-name="cloudCallCustomer.name"
      :customer-phone="cloudCallCustomer.phone"
      @call-completed="fetchList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Download, Upload, Phone } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  customerApi,
  CustomerStatus,
  type CustomerVO,
  type CreateCustomerParams,
  type UpdateCustomerParams,
} from '@/api/customer'
import { userApi, UserRole, type UserVO } from '@/api/user'
import { formatDate } from '@/utils/format'
import { getStatusTagType, getStatusLabel } from '@/utils/tag-helpers'
import { usePermission } from '@/composables/usePermission'
import ImportWizard from './components/ImportWizard.vue'
import CloudCallDialog from './components/CloudCallDialog.vue'

const userStore = useUserStore()
const { isAdminOrManager } = usePermission()

// ---- Status helpers ----
interface StatusOption {
  value: CustomerStatus
  label: string
}

const statusOptions: StatusOption[] = [
  { value: CustomerStatus.LEAD, label: '线索' },
  { value: CustomerStatus.POTENTIAL, label: '潜在客户' },
  { value: CustomerStatus.INTENTION, label: '有意向' },
  { value: CustomerStatus.OPPORTUNITY, label: '商机客户' },
  { value: CustomerStatus.DEAL, label: '成交客户' },
  { value: CustomerStatus.MAINTAIN, label: '维护期' },
  { value: CustomerStatus.INVALID, label: '无效客户' },
  { value: CustomerStatus.LOST, label: '已流失' },
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
  email: [{ type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的11位手机号', trigger: 'blur' }],
}

const dialogTitle = ref('新建客户')

function handleCreate() {
  isEdit.value = false
  editId.value = null
  dialogTitle.value = '新建客户'
  Object.assign(formData, defaultForm())
  dialogVisible.value = true
}

function handleEdit(row: CustomerVO) {
  isEdit.value = true
  editId.value = row.id
  dialogTitle.value = '编辑客户'
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
      ElMessage.success('客户更新成功')
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
      ElMessage.success('客户创建成功')
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
    ElMessage.success('删除成功')
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
    ElMessage.success('客户分配成功')
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
    ElMessage.success('导出成功')
  } catch {
    // Error handled by request interceptor
  } finally {
    exportLoading.value = false
  }
}

// ---- Import (via ImportWizard component) ----
const importWizardVisible = ref(false)

// ---- Cloud Call ----
const cloudCallDialogVisible = ref(false)
const cloudCallCustomer = reactive({ id: 0, name: '', phone: '' })

function handleCloudCall(row: { id: number; name: string; phone?: string }) {
  if (!row.phone) return
  cloudCallCustomer.id = row.id
  cloudCallCustomer.name = row.name
  cloudCallCustomer.phone = row.phone
  cloudCallDialogVisible.value = true
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
</style>
