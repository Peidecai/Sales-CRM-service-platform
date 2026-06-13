<template>
  <div class="call-record-page">
    <!-- Search bar -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="客户">
          <el-select
            v-model="searchForm.customerId"
            filterable
            remote
            :remote-method="searchCustomersForFilter"
            placeholder="搜索客户"
            clearable
            style="width: 180px"
            :loading="customerFilterLoading"
          >
            <el-option
              v-for="c in customerFilterOptions"
              :key="c.id"
              :label="`${c.name}${c.company ? ' (' + c.company + ')' : ''}`"
              :value="c.id"
            />
          </el-select>
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
        <el-button v-if="isAdminOrManager" :loading="exportLoading" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          新建通话记录
        </el-button>
      </div>
    </el-card>

    <!-- Table -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" row-key="id" stripe style="width: 100%">
        <el-table-column prop="customerId" label="客户" min-width="120">
          <template #default="{ row }">
            <el-button
              v-if="getLinkedCustomerId(row) && getCallRecordCustomerName(row)"
              type="primary"
              link
              size="small"
              @click="$router.push(`/customer/${getLinkedCustomerId(row)}`)"
            >
              {{ getCallRecordCustomerName(row) }}
            </el-button>
            <span v-else-if="getLinkedCustomerId(row)">ID: {{ getLinkedCustomerId(row) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="对方号码" min-width="130">
          <template #default="{ row }">
            {{ getCallRecordPhoneDisplay(row) }}
          </template>
        </el-table-column>
        <el-table-column label="销售员" min-width="120">
          <template #default="{ row }">
            <div class="sales-user-cell">
              <span>{{ getCallRecordSalesDisplay(row) }}</span>
              <span v-if="getCallRecordSalesPhone(row)" class="sales-user-phone">
                {{ getCallRecordSalesPhone(row) }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="opportunityId" label="商机" min-width="140">
          <template #default="{ row }">
            <el-button
              v-if="
                row.opportunityId && (row.opportunity?.title || opportunityMap[row.opportunityId])
              "
              type="primary"
              link
              size="small"
              @click="$router.push(`/opportunity/${row.opportunityId}`)"
            >
              {{ row.opportunity?.title || opportunityMap[row.opportunityId] }}
            </el-button>
            <el-button
              v-else-if="row.opportunityId"
              type="primary"
              link
              size="small"
              @click="$router.push(`/opportunity/${row.opportunityId}`)"
            >
              商机 #{{ row.opportunityId }}
            </el-button>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column prop="callAt" label="通话时间" min-width="170" sortable>
          <template #default="{ row }">
            {{ formatDate(row.callAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="时长" min-width="100" sortable>
          <template #default="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="AI摘要" min-width="100">
          <template #default="{ row }">
            <el-tag v-if="summarizingIds.has(row.id)" type="warning" size="small">
              生成中...
            </el-tag>
            <el-tag
              v-else-if="row.aiSummary"
              type="success"
              size="small"
              class="clickable-tag"
              @click="handleViewSummary(row)"
            >
              有摘要
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="$router.push(`/call-record/${row.id}`)"
            >
              详情
            </el-button>
            <el-button type="primary" link size="small" @click="handleEdit(row)"> 编辑 </el-button>
            <el-button
              v-if="row.notes && !row.aiSummary && !summarizingIds.has(row.id)"
              type="success"
              link
              size="small"
              @click="handleSummarize(row)"
            >
              <el-icon><MagicStick /></el-icon>
              AI摘要
            </el-button>
            <el-popconfirm
              v-if="isAdminOrManager"
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
        <template #empty>
          <el-empty description="暂无通话记录" :image-size="100">
            <el-button type="primary" @click="handleCreate"> 新建通话记录 </el-button>
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
        label-width="90px"
        label-position="right"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="关联客户" prop="customerId">
              <el-select
                v-model="formData.customerId"
                filterable
                remote
                :remote-method="searchCustomersForDialog"
                placeholder="搜索并选择客户"
                style="width: 100%"
                :loading="customerDialogLoading"
              >
                <el-option
                  v-for="c in customerDialogOptions"
                  :key="c.id"
                  :label="`${c.name}${c.company ? ' (' + c.company + ')' : ''}`"
                  :value="c.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联商机" prop="opportunityId">
              <el-select
                v-model="formData.opportunityId"
                filterable
                remote
                :remote-method="searchOpportunitiesForDialog"
                placeholder="搜索并选择商机（可选）"
                clearable
                style="width: 100%"
                :loading="opportunityDialogLoading"
              >
                <el-option
                  v-for="o in opportunityDialogOptions"
                  :key="o.id"
                  :label="o.title"
                  :value="o.id"
                />
              </el-select>
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
          <el-col :span="6">
            <el-form-item label="分钟" prop="durationMin">
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
          <el-col :span="6">
            <el-form-item label="秒" prop="durationSec">
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

    <!-- AI Summary Drawer -->
    <el-drawer v-model="summaryDrawerVisible" title="AI 通话摘要" direction="rtl" size="480px">
      <template v-if="summaryRecord">
        <el-descriptions :column="1" border size="small" class="summary-desc">
          <el-descriptions-item label="客户">
            {{ getCallRecordCustomerDisplay(summaryRecord) }}
          </el-descriptions-item>
          <el-descriptions-item label="通话时间">
            {{ formatDate(summaryRecord.callAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="时长">
            {{ formatDuration(summaryRecord.duration) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left"> 原始备注 </el-divider>
        <div class="summary-section">
          {{ summaryRecord.notes || '无备注' }}
        </div>

        <el-divider content-position="left"> AI 摘要 </el-divider>
        <div class="summary-section ai-summary-text">
          {{ summaryRecord.aiSummary }}
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus, MagicStick, Download } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  callRecordApi,
  type CallRecordVO,
  type CreateCallRecordParams,
  type UpdateCallRecordParams,
} from '@/api/call-record'
import { customerApi, type CustomerVO } from '@/api/customer'
import { opportunityApi, type OpportunityVO } from '@/api/opportunity'
import { formatDate, formatDuration } from '@/utils/format'
import { usePermission } from '@/composables/usePermission'
import { toLinkedEntityId } from './detail-helpers'

const route = useRoute()
const userStore = useUserStore()
const { isAdminOrManager } = usePermission()

// ---- Customer Name Resolution ----
const customerMap = ref<Record<number, string>>({})

async function resolveCustomerNames(ids: number[]) {
  const uniqueIds = [...new Set(ids)].filter((id) => !(id in customerMap.value))
  if (uniqueIds.length === 0) return
  try {
    const res = await customerApi.getList({ page: 1, pageSize: 100 })
    if (res?.data) {
      for (const c of res.data.list) {
        customerMap.value[c.id] = c.name
      }
    }
  } catch {
    // Silently fail
  }
}

function getLinkedCustomerId(record: CallRecordVO): number | null {
  return toLinkedEntityId(record.customerId)
}

function getCallRecordCustomerName(record: CallRecordVO): string {
  const customerId = getLinkedCustomerId(record)
  return customerId ? (record.customer?.name ?? customerMap.value[customerId] ?? '') : ''
}

function getCallRecordCustomerDisplay(record: CallRecordVO): string {
  const customerId = getLinkedCustomerId(record)
  if (!customerId) return '-'
  return record.customer?.name ?? customerMap.value[customerId] ?? `ID: ${customerId}`
}

function getCallRecordPhoneDisplay(record: CallRecordVO): string {
  return (
    record.counterpartPhone ||
    record.callPhoneNumber ||
    record.customerPhone ||
    record.customer?.phone ||
    '-'
  )
}

function getCallRecordSalesDisplay(record: CallRecordVO): string {
  return (
    record.salesUserName || record.user?.name || record.user?.username || `ID: ${record.userId}`
  )
}

function getCallRecordSalesPhone(record: CallRecordVO): string {
  return record.salesUserPhone || record.user?.phone || ''
}

// ---- Opportunity Name Resolution (fallback when backend doesn't embed) ----
const opportunityMap = ref<Record<number, string>>({})

async function resolveOpportunityNames(records: CallRecordVO[]) {
  // Collect IDs that have no embedded opportunity object and are not yet in the map
  const ids = records
    .filter(
      (r) => r.opportunityId && !r.opportunity?.title && !(r.opportunityId in opportunityMap.value),
    )
    .map((r) => r.opportunityId!)
  const uniqueIds = [...new Set(ids)]
  if (uniqueIds.length === 0) return
  try {
    const res = await opportunityApi.getList({ page: 1, pageSize: 100 })
    if (res?.data) {
      for (const o of res.data.list) {
        opportunityMap.value[o.id] = o.title
      }
    }
  } catch {
    // Silently fail
  }
}

// ---- Customer Search for Filter ----
const customerFilterLoading = ref(false)
const customerFilterOptions = ref<CustomerVO[]>([])

async function searchCustomersForFilter(query: string) {
  if (!query) {
    customerFilterOptions.value = []
    return
  }
  customerFilterLoading.value = true
  try {
    const res = await customerApi.getList({ keyword: query, page: 1, pageSize: 20 })
    if (res?.data) {
      customerFilterOptions.value = res.data.list
    }
  } catch {
    customerFilterOptions.value = []
  } finally {
    customerFilterLoading.value = false
  }
}

// ---- Customer Search for Dialog ----
const customerDialogLoading = ref(false)
const customerDialogOptions = ref<CustomerVO[]>([])

async function searchCustomersForDialog(query: string) {
  if (!query) {
    customerDialogOptions.value = []
    return
  }
  customerDialogLoading.value = true
  try {
    const res = await customerApi.getList({ keyword: query, page: 1, pageSize: 20 })
    if (res?.data) {
      customerDialogOptions.value = res.data.list
    }
  } catch {
    customerDialogOptions.value = []
  } finally {
    customerDialogLoading.value = false
  }
}

// ---- Opportunity Search for Dialog ----
const opportunityDialogLoading = ref(false)
const opportunityDialogOptions = ref<OpportunityVO[]>([])

async function searchOpportunitiesForDialog(query: string) {
  if (!query) {
    opportunityDialogOptions.value = []
    return
  }
  opportunityDialogLoading.value = true
  try {
    const res = await opportunityApi.getList({ keyword: query, page: 1, pageSize: 20 })
    if (res?.data) {
      opportunityDialogOptions.value = res.data.list
    }
  } catch {
    opportunityDialogOptions.value = []
  } finally {
    opportunityDialogLoading.value = false
  }
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
      // Resolve customer names
      const ids = res.data.list
        .map((r) => toLinkedEntityId(r.customerId))
        .filter((id): id is number => id !== null)
      resolveCustomerNames(ids)
      // Resolve opportunity names (fallback for records without embedded opportunity)
      resolveOpportunityNames(res.data.list)
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

// ---- AI Summary ----
const summarizingIds = ref<Set<number>>(new Set())
const summaryDrawerVisible = ref(false)
const summaryRecord = ref<CallRecordVO | null>(null)

function handleViewSummary(row: CallRecordVO) {
  summaryRecord.value = row
  summaryDrawerVisible.value = true
}

async function handleSummarize(row: CallRecordVO) {
  try {
    summarizingIds.value.add(row.id)
    await callRecordApi.summarize(row.id)
    ElMessage.success('AI 摘要生成任务已提交，正在等待结果...')
    // Poll for completion with exponential backoff
    pollForSummary(row.id)
  } catch {
    summarizingIds.value.delete(row.id)
    // Error handled by request interceptor
  }
}

/**
 * Poll the call record detail until aiSummary is populated.
 * Uses exponential backoff: 3s, 5s, 8s, 12s, 18s (max 5 attempts, ~46s total).
 */
async function pollForSummary(recordId: number, attempt = 0) {
  const delays = [3000, 5000, 8000, 12000, 18000]
  const maxAttempts = delays.length

  if (attempt >= maxAttempts) {
    // Give up polling — user can refresh manually
    summarizingIds.value.delete(recordId)
    ElMessage.warning('AI 摘要生成较慢，请稍后手动刷新查看结果')
    return
  }

  setTimeout(async () => {
    try {
      const res = await callRecordApi.getDetail(recordId)
      if (res?.data?.aiSummary) {
        // Summary is ready — update the table row in place
        summarizingIds.value.delete(recordId)
        const idx = tableData.value.findIndex((r) => r.id === recordId)
        if (idx !== -1) {
          tableData.value[idx] = { ...tableData.value[idx], aiSummary: res.data.aiSummary }
        }
        ElMessage.success('AI 摘要已生成')
      } else {
        // Not ready yet — continue polling
        pollForSummary(recordId, attempt + 1)
      }
    } catch {
      // Network error — continue polling
      pollForSummary(recordId, attempt + 1)
    }
  }, delays[attempt])
}

// ---- Export ----
const exportLoading = ref(false)

async function handleExport() {
  exportLoading.value = true
  try {
    const blob = await callRecordApi.exportCsv()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `call-records_${new Date().toISOString().slice(0, 10)}.csv`
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

// ---- Dialog ----
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

interface CallRecordForm {
  customerId: number | undefined
  opportunityId: number | undefined
  callAt: string
  durationMin: number
  durationSec: number
  notes: string
  recordingUrl: string
}

const defaultForm = (): CallRecordForm => ({
  customerId: undefined,
  opportunityId: undefined,
  callAt: '',
  durationMin: 0,
  durationSec: 0,
  notes: '',
  recordingUrl: '',
})

const formData = reactive<CallRecordForm>(defaultForm())

const formRules: FormRules = {
  customerId: [{ required: true, message: '请选择关联客户', trigger: 'change' }],
  callAt: [{ required: true, message: '请选择通话时间', trigger: 'change' }],
}

const dialogTitle = ref('新建通话记录')

function handleCreate() {
  isEdit.value = false
  editId.value = null
  dialogTitle.value = '新建通话记录'
  customerDialogOptions.value = []
  opportunityDialogOptions.value = []
  const form = defaultForm()
  // Check if coming from customer detail page
  const createForCustomer = route.query.createForCustomer
  if (createForCustomer) {
    form.customerId = Number(createForCustomer)
  }
  Object.assign(formData, form)
  dialogVisible.value = true
}

function handleEdit(row: CallRecordVO) {
  isEdit.value = true
  editId.value = row.id
  dialogTitle.value = '编辑通话记录'
  const totalSec = row.duration ?? 0
  customerDialogOptions.value = []
  opportunityDialogOptions.value = []
  Object.assign(formData, {
    customerId: toLinkedEntityId(row.customerId) ?? undefined,
    opportunityId: row.opportunityId ?? undefined,
    callAt: row.callAt ? row.callAt.replace(' ', 'T').slice(0, 19) : '',
    durationMin: Math.floor(totalSec / 60),
    durationSec: totalSec % 60,
    notes: row.notes ?? '',
    recordingUrl: row.recordingUrl ?? '',
  })
  // Set customer option for current record
  const customerId = toLinkedEntityId(row.customerId)
  if (customerId && customerMap.value[customerId]) {
    customerDialogOptions.value = [
      {
        id: customerId,
        name: customerMap.value[customerId],
      },
    ] as CustomerVO[]
  }
  // Set opportunity option for current record
  if (row.opportunityId) {
    const oppTitle = row.opportunity?.title || opportunityMap.value[row.opportunityId]
    if (oppTitle) {
      opportunityDialogOptions.value = [
        {
          id: row.opportunityId,
          title: oppTitle,
        },
      ] as OpportunityVO[]
    }
  }
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
        userId: userStore.userInfo?.id ?? 1,
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
        userId: userStore.userInfo?.id ?? 1,
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
  // Check if should auto-open create dialog from customer page
  if (route.query.createForCustomer) {
    handleCreate()
  }
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

.clickable-tag {
  cursor: pointer;
}

.clickable-tag:hover {
  opacity: 0.8;
}

.sales-user-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.4;
}

.sales-user-phone {
  font-size: 12px;
  color: #909399;
}

/* Summary Drawer */
.summary-desc {
  margin-bottom: 8px;
}

.summary-section {
  padding: 12px 0;
  font-size: 14px;
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-summary-text {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}
</style>
