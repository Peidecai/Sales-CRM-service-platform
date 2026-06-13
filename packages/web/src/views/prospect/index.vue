<template>
  <div class="prospect-pool-page">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="总线索" :value="stats.total" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="新线索" :value="stats.newCount" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="已转化" :value="stats.convertedCount" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="转化率" :value="stats.conversionRate" suffix="%" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选与操作 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="queryForm" class="filter-form">
        <el-form-item label="关键词">
          <el-input
            v-model="queryForm.keyword"
            placeholder="企业名称"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="queryForm.status"
            placeholder="全部状态"
            clearable
            style="width: 130px"
          >
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-select
            v-model="queryForm.channel"
            placeholder="全部来源"
            clearable
            style="width: 120px"
          >
            <el-option
              v-for="opt in channelOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="行业">
          <el-select
            v-model="queryForm.industry"
            placeholder="全部行业"
            clearable
            style="width: 140px"
          >
            <el-option v-for="opt in industryOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
      <div class="toolbar-right">
        <el-button
          v-if="isAdminOrManager"
          :disabled="selectedIds.length === 0"
          @click="handleBatchAssign"
        >
          批量分配
        </el-button>
        <el-button
          v-if="isAdminOrManager"
          type="danger"
          plain
          :disabled="selectedIds.length === 0"
          @click="handleBatchReject"
        >
          批量废弃
        </el-button>
        <el-button type="primary" @click="$router.push('/prospect/search')">
          <el-icon><Search /></el-icon>
          去搜索获客
        </el-button>
        <template v-if="isAdminOrManager">
          <el-dropdown class="ml-2" @command="handleImportCommand">
            <el-button type="success" plain>
              <el-icon><Upload /></el-icon>
              导入
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="prospect">导入为线索</el-dropdown-item>
                <el-dropdown-item command="customer">导入为客户</el-dropdown-item>
                <el-dropdown-item divided command="template">下载导入模板</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button
            type="warning"
            plain
            :loading="exportLoading"
            class="ml-2"
            @click="handleExport"
          >
            <el-icon><Download /></el-icon>
            导出
          </el-button>
        </template>
      </div>
    </el-card>

    <!-- Hidden file input for import -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".xlsx,.xls"
      style="display: none"
      @change="handleFileSelected"
    />

    <!-- 列表 -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        row-key="id"
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="companyName" label="企业名称" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="$router.push(`/prospect/${row.id}`)"
            >
              {{ row.companyName }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="industry" label="行业" width="120" show-overflow-tooltip />
        <el-table-column label="地域" width="120">
          <template #default="{ row }">
            {{ row.province ?? '' }}{{ row.city ? ' ' + row.city : '' }}
          </template>
        </el-table-column>
        <el-table-column prop="channel" label="来源" width="90">
          <template #default="{ row }">
            {{ getChannelLabel(row.channel) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="registeredCapital" label="注册资本" width="100" align="right">
          <template #default="{ row }">
            {{ row.registeredCapital ? `${row.registeredCapital}万` : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170" sortable>
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="$router.push(`/prospect/${row.id}`)"
            >
              详情
            </el-button>
            <el-button type="primary" link size="small" @click="handleEdit(row)"> 编辑 </el-button>
            <el-button
              v-if="row.status !== 'converted' && row.status !== 'rejected' && isAdminOrManager"
              type="success"
              link
              size="small"
              @click="handleConvert(row)"
            >
              转化
            </el-button>
            <el-button
              v-if="row.status !== 'converted' && row.status !== 'rejected' && isAdminOrManager"
              type="danger"
              link
              size="small"
              @click="handleReject(row)"
            >
              废弃
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="queryForm.page"
          v-model:page-size="queryForm.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editVisible" title="编辑线索" width="500px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="状态">
          <el-select v-model="editForm.status" style="width: 100%">
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="handleEditSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量分配对话框 -->
    <el-dialog v-model="assignVisible" title="批量分配" width="400px">
      <el-form label-width="80px">
        <el-form-item label="分配给">
          <el-input-number
            v-model="assignUserId"
            :min="1"
            placeholder="销售用户ID"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" :loading="assignLoading" @click="handleAssignSubmit">
          确认分配
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Upload, Download, ArrowDown } from '@element-plus/icons-vue'
import { usePermission } from '@/composables/usePermission'
import {
  prospectApi,
  ProspectStatus,
  ProspectChannel,
  type ProspectVO,
  type ProspectStatsVO,
  type ProspectQueryParams,
} from '@/api/prospect'
import { formatDate } from '@/utils/format'

const router = useRouter()
const { isAdminOrManager } = usePermission()

/* ---- 统计 ---- */
const stats = ref<ProspectStatsVO>({
  total: 0,
  newCount: 0,
  contactedCount: 0,
  qualifiedCount: 0,
  convertedCount: 0,
  rejectedCount: 0,
  conversionRate: 0,
})

/* ---- 列表 ---- */
const loading = ref(false)
const tableData = ref<ProspectVO[]>([])
const total = ref(0)
const selectedIds = ref<number[]>([])
const queryForm = ref<ProspectQueryParams>({
  page: 1,
  pageSize: 20,
  keyword: '',
  status: undefined,
  channel: undefined,
  industry: '',
})

/* ---- 选项 ---- */
const statusOptions = [
  { label: '新线索', value: ProspectStatus.NEW },
  { label: '已联系', value: ProspectStatus.CONTACTED },
  { label: '已确认', value: ProspectStatus.QUALIFIED },
  { label: '已转化', value: ProspectStatus.CONVERTED },
  { label: '已废弃', value: ProspectStatus.REJECTED },
]

const channelOptions = [
  { label: '模拟', value: ProspectChannel.MOCK },
  { label: '天眼查', value: ProspectChannel.TIANYANCHA },
  { label: '企查查', value: ProspectChannel.QICHACHA },
  { label: '手动', value: ProspectChannel.MANUAL },
]

const industryOptions = [
  '互联网/IT',
  '制造业',
  '金融',
  '教育',
  '医疗健康',
  '房地产',
  '零售',
  '物流运输',
  '农业',
  '能源',
]

/* ---- 编辑 ---- */
const editVisible = ref(false)
const editLoading = ref(false)
const editForm = ref<{ id: number; status: ProspectStatus; remark: string }>({
  id: 0,
  status: ProspectStatus.NEW,
  remark: '',
})

/* ---- 批量分配 ---- */
const assignVisible = ref(false)
const assignLoading = ref(false)
const assignUserId = ref<number>(1)

/* ---- 加载数据 ---- */
async function loadData() {
  loading.value = true
  try {
    const params: ProspectQueryParams = { ...queryForm.value }
    if (!params.keyword) delete params.keyword
    if (!params.industry) delete params.industry
    const res = await prospectApi.getList(params)
    if (res.data) {
      tableData.value = res.data.list
      total.value = res.data.total
    }
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const res = await prospectApi.getStats()
    if (res.data) {
      stats.value = res.data
    }
  } catch {
    // stats 加载失败不影响页面
  }
}

function handleSearch() {
  queryForm.value.page = 1
  loadData()
}

function handleReset() {
  queryForm.value = {
    page: 1,
    pageSize: 20,
    keyword: '',
    status: undefined,
    channel: undefined,
    industry: '',
  }
  loadData()
}

function handleSelectionChange(rows: ProspectVO[]) {
  selectedIds.value = rows.map((r) => r.id)
}

/* ---- 编辑 ---- */
function handleEdit(row: ProspectVO) {
  editForm.value = { id: row.id, status: row.status, remark: row.remark ?? '' }
  editVisible.value = true
}

async function handleEditSubmit() {
  editLoading.value = true
  try {
    await prospectApi.update(editForm.value.id, {
      status: editForm.value.status,
      remark: editForm.value.remark,
    })
    ElMessage.success('更新成功')
    editVisible.value = false
    loadData()
    loadStats()
  } catch {
    ElMessage.error('更新失败')
  } finally {
    editLoading.value = false
  }
}

/* ---- 转化 ---- */
async function handleConvert(row: ProspectVO) {
  await ElMessageBox.confirm(`确定将「${row.companyName}」转化为正式客户？`, '转化确认', {
    confirmButtonText: '转化',
    cancelButtonText: '取消',
    type: 'info',
  })
  try {
    const res = await prospectApi.convert({ prospectIds: [row.id] })
    if (res.data && res.data.customerIds.length > 0) {
      ElMessage.success('转化成功')
      router.push(`/customer/${res.data.customerIds[0]}`)
    }
  } catch {
    ElMessage.error('转化失败')
  }
}

/* ---- 废弃 ---- */
async function handleReject(row: ProspectVO) {
  await ElMessageBox.confirm(`确定废弃线索「${row.companyName}」？`, '废弃确认', {
    confirmButtonText: '废弃',
    cancelButtonText: '取消',
    type: 'warning',
  })
  try {
    await prospectApi.update(row.id, { status: ProspectStatus.REJECTED })
    ElMessage.success('已废弃')
    loadData()
    loadStats()
  } catch {
    ElMessage.error('操作失败')
  }
}

/* ---- 批量操作 ---- */
function handleBatchAssign() {
  assignVisible.value = true
}

async function handleAssignSubmit() {
  assignLoading.value = true
  try {
    const res = await prospectApi.batchOperate({
      ids: selectedIds.value,
      action: 'assign',
      assignedUserId: assignUserId.value,
    })
    ElMessage.success(`成功分配 ${res.data?.affected ?? 0} 条`)
    assignVisible.value = false
    loadData()
  } catch {
    ElMessage.error('分配失败')
  } finally {
    assignLoading.value = false
  }
}

async function handleBatchReject() {
  await ElMessageBox.confirm(`确定废弃选中的 ${selectedIds.value.length} 条线索？`, '批量废弃', {
    confirmButtonText: '废弃',
    cancelButtonText: '取消',
    type: 'warning',
  })
  try {
    const res = await prospectApi.batchOperate({ ids: selectedIds.value, action: 'reject' })
    ElMessage.success(`成功废弃 ${res.data?.affected ?? 0} 条`)
    loadData()
    loadStats()
  } catch {
    ElMessage.error('操作失败')
  }
}

/* ---- 导入导出 ---- */
const exportLoading = ref(false)
const importTarget = ref<'prospect' | 'customer'>('prospect')
const fileInputRef = ref<HTMLInputElement | null>(null)

function handleImportCommand(command: string) {
  if (command === 'template') {
    handleDownloadTemplate()
    return
  }
  importTarget.value = command as 'prospect' | 'customer'
  // Reset and trigger the hidden file input
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

async function handleFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const res =
      importTarget.value === 'prospect'
        ? await prospectApi.importExcel(file)
        : await prospectApi.importAsCustomer(file)
    const data = res.data ?? res
    ElMessage.success(`成功导入 ${(data as { imported: number }).imported} 条记录`)
    if ((data as { errors: string[] }).errors?.length) {
      ElMessageBox.alert((data as { errors: string[] }).errors.join('\n'), '部分数据导入失败', {
        type: 'warning',
      })
    }
    loadData()
    loadStats()
  } catch {
    ElMessage.error('导入失败')
  }
}

async function handleDownloadTemplate() {
  try {
    const blob = await prospectApi.downloadImportTemplate()
    const url = URL.createObjectURL(blob as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prospect-import-template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('下载模板失败')
  }
}

async function handleExport() {
  exportLoading.value = true
  try {
    const blob = await prospectApi.exportExcel()
    const url = URL.createObjectURL(blob as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prospects-export-${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

/* ---- 工具方法 ---- */
function getStatusLabel(status: ProspectStatus): string {
  const map: Record<string, string> = {
    new: '新线索',
    contacted: '已联系',
    qualified: '已确认',
    converted: '已转化',
    rejected: '已废弃',
  }
  return map[status] ?? status
}

function getStatusTagType(
  status: ProspectStatus,
): 'success' | 'info' | 'warning' | 'danger' | undefined {
  const map: Record<string, 'success' | 'info' | 'warning' | 'danger' | undefined> = {
    new: 'success',
    contacted: 'info',
    qualified: 'warning',
    converted: undefined,
    rejected: 'danger',
  }
  return map[status] ?? 'info'
}

function getChannelLabel(channel: string): string {
  const map: Record<string, string> = {
    tianyancha: '天眼查',
    qichacha: '企查查',
    manual: '手动',
    mock: '模拟',
  }
  return map[channel] ?? channel
}

/* ---- 初始化 ---- */
onMounted(() => {
  loadData()
  loadStats()
})
</script>

<style scoped>
.prospect-pool-page {
  padding: 20px;
}

.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;
}

.filter-card {
  margin-bottom: 16px;
}

.filter-form {
  display: inline;
}

.toolbar-right {
  float: right;
  margin-top: -6px;
}

.table-card :deep(.el-card__body) {
  padding-bottom: 8px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 0;
}
</style>
