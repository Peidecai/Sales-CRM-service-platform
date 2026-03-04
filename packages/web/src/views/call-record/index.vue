<template>
  <div class="call-record-page">
    <!-- Search bar -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="客户ID">
          <el-input-number
            v-model="searchForm.customerId"
            placeholder="输入客户ID"
            :min="1"
            :controls="false"
            style="width: 140px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="通话日期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch"> 搜索 </el-button>
          <el-button @click="handleReset"> 重置 </el-button>
        </el-form-item>
      </el-form>
      <div class="toolbar-right">
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          新建通话记录
        </el-button>
      </div>
    </el-card>

    <!-- Table -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" row-key="id" stripe style="width: 100%">
        <el-table-column prop="customerId" label="客户ID" min-width="90" />
        <el-table-column prop="opportunityId" label="商机ID" min-width="90">
          <template #default="{ row }">
            {{ row.opportunityId ?? '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="userId" label="拨打人ID" min-width="90" />
        <el-table-column prop="callAt" label="通话时间" min-width="170">
          <template #default="{ row }">
            {{ formatDate(row.callAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="时长" min-width="100">
          <template #default="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="AI摘要" min-width="100">
          <template #default="{ row }">
            <el-tag v-if="row.aiSummary" type="success" size="small"> 有摘要 </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)"> 编辑 </el-button>
            <el-popconfirm
              title="确定要删除该通话记录吗？"
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
      </el-table>

      <!-- Pagination -->
      <div class="pagination-wrap">
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
        label-width="90px"
        label-position="right"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="客户ID" prop="customerId">
              <el-input-number
                v-model="formData.customerId"
                :min="1"
                :controls="false"
                style="width: 100%"
                placeholder="请输入客户ID"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="商机ID" prop="opportunityId">
              <el-input-number
                v-model="formData.opportunityId"
                :min="1"
                :controls="false"
                style="width: 100%"
                placeholder="可选"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="拨打人ID" prop="userId">
              <el-input-number
                v-model="formData.userId"
                :min="1"
                :controls="false"
                style="width: 100%"
                placeholder="请输入用户ID"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="通话时间" prop="callAt">
              <el-date-picker
                v-model="formData.callAt"
                type="datetime"
                placeholder="请选择通话时间"
                value-format="YYYY-MM-DDTHH:mm:ss"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="时长（分钟）" prop="durationMin">
              <el-input-number
                v-model="formData.durationMin"
                :min="0"
                :max="999"
                :controls="false"
                style="width: 100%"
                placeholder="分钟"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="时长（秒）" prop="durationSec">
              <el-input-number
                v-model="formData.durationSec"
                :min="0"
                :max="59"
                :controls="false"
                style="width: 100%"
                placeholder="秒"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="notes">
              <el-input
                v-model="formData.notes"
                type="textarea"
                :rows="3"
                placeholder="请输入通话备注"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="录音链接" prop="recordingUrl">
              <el-input
                v-model="formData.recordingUrl"
                placeholder="请输入录音文件URL（可选）"
                maxlength="500"
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  callRecordApi,
  type CallRecordVO,
  type CreateCallRecordParams,
  type UpdateCallRecordParams,
} from '@/api/call-record'

// ---- Helpers ----
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0分0秒'
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}分${sec}秒`
}

// ---- Search ----
interface SearchForm {
  customerId: number | undefined
  dateRange: [string, string] | null
}

const searchForm = reactive<SearchForm>({
  customerId: undefined,
  dateRange: null,
})

// ---- Table data ----
const loading = ref(false)
const tableData = ref<CallRecordVO[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

async function fetchList() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (searchForm.customerId) {
      params.customerId = searchForm.customerId
    }
    if (searchForm.dateRange && searchForm.dateRange[0]) {
      params.startDate = searchForm.dateRange[0]
    }
    if (searchForm.dateRange && searchForm.dateRange[1]) {
      params.endDate = searchForm.dateRange[1]
    }

    const res = await callRecordApi.getList(params)
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
  pagination.page = 1
  fetchList()
}

function handleReset() {
  searchForm.customerId = undefined
  searchForm.dateRange = null
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

interface CallRecordForm {
  customerId: number | undefined
  opportunityId: number | undefined
  userId: number | undefined
  callAt: string
  durationMin: number
  durationSec: number
  notes: string
  recordingUrl: string
}

const defaultForm = (): CallRecordForm => ({
  customerId: undefined,
  opportunityId: undefined,
  userId: undefined,
  callAt: '',
  durationMin: 0,
  durationSec: 0,
  notes: '',
  recordingUrl: '',
})

const formData = reactive<CallRecordForm>(defaultForm())

const formRules: FormRules = {
  customerId: [{ required: true, message: '请输入客户ID', trigger: 'blur' }],
  userId: [{ required: true, message: '请输入拨打人ID', trigger: 'blur' }],
  callAt: [{ required: true, message: '请选择通话时间', trigger: 'change' }],
}

const dialogTitle = ref('新建通话记录')

function handleCreate() {
  isEdit.value = false
  editId.value = null
  dialogTitle.value = '新建通话记录'
  Object.assign(formData, defaultForm())
  dialogVisible.value = true
}

function handleEdit(row: CallRecordVO) {
  isEdit.value = true
  editId.value = row.id
  dialogTitle.value = '编辑通话记录'
  const totalSec = row.duration ?? 0
  Object.assign(formData, {
    customerId: row.customerId,
    opportunityId: row.opportunityId ?? undefined,
    userId: row.userId,
    callAt: row.callAt ? row.callAt.replace(' ', 'T').slice(0, 19) : '',
    durationMin: Math.floor(totalSec / 60),
    durationSec: totalSec % 60,
    notes: row.notes ?? '',
    recordingUrl: row.recordingUrl ?? '',
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

  const duration = (formData.durationMin ?? 0) * 60 + (formData.durationSec ?? 0)

  submitLoading.value = true
  try {
    if (isEdit.value && editId.value !== null) {
      const params: UpdateCallRecordParams = {
        customerId: formData.customerId,
        opportunityId: formData.opportunityId || undefined,
        userId: formData.userId,
        callAt: formData.callAt,
        duration,
        notes: formData.notes || undefined,
        recordingUrl: formData.recordingUrl || undefined,
      }
      await callRecordApi.update(editId.value, params)
      ElMessage.success('通话记录更新成功')
    } else {
      const params: CreateCallRecordParams = {
        customerId: formData.customerId!,
        opportunityId: formData.opportunityId || undefined,
        userId: formData.userId!,
        callAt: formData.callAt,
        duration,
        notes: formData.notes || undefined,
        recordingUrl: formData.recordingUrl || undefined,
      }
      await callRecordApi.create(params)
      ElMessage.success('通话记录创建成功')
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
    await callRecordApi.remove(id)
    ElMessage.success('删除成功')
    if (tableData.value.length === 1 && pagination.page > 1) {
      pagination.page -= 1
    }
    fetchList()
  } catch {
    // Error handled by request interceptor
  }
}

// ---- Init ----
onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.call-record-page {
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
