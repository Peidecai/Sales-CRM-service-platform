<template>
  <div class="service-page">
    <!-- Stat cards -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">全部工单</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-pending">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待处理</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-processing">
          <div class="stat-value">{{ stats.processing }}</div>
          <div class="stat-label">处理中</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-alert">
          <div class="stat-value">{{ slaAlertCount }}</div>
          <div class="stat-label">SLA预警</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Filters -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" @submit.prevent="loadList">
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部" @change="loadList">
            <el-option label="待处理" :value="ServiceStatus.PENDING" />
            <el-option label="处理中" :value="ServiceStatus.PROCESSING" />
            <el-option label="已解决" :value="ServiceStatus.RESOLVED" />
            <el-option label="已关闭" :value="ServiceStatus.CLOSED" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.type" clearable placeholder="全部" @change="loadList">
            <el-option label="投诉" :value="ServiceType.COMPLAINT" />
            <el-option label="咨询" :value="ServiceType.CONSULTATION" />
            <el-option label="维护" :value="ServiceType.MAINTENANCE" />
            <el-option label="退货" :value="ServiceType.RETURN" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="filters.priority" clearable placeholder="全部" @change="loadList">
            <el-option label="低" :value="ServicePriority.LOW" />
            <el-option label="中" :value="ServicePriority.MEDIUM" />
            <el-option label="高" :value="ServicePriority.HIGH" />
            <el-option label="紧急" :value="ServicePriority.URGENT" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索标题/描述"
            clearable
            @clear="loadList"
            @keyup.enter="loadList"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Toolbar -->
    <div class="toolbar">
      <el-button type="primary" @click="showCreateDialog = true">新建工单</el-button>
      <el-button v-if="isAdminOrManager" @click="handleExport">导出</el-button>
    </div>

    <!-- Table -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe @row-click="goDetail">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">{{ typeLabel(row.type) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{
              statusLabel(row.status)
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="90">
          <template #default="{ row }">
            <el-tag :type="priorityTagType(row.priority)" size="small">{{
              priorityLabel(row.priority)
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="客户" width="140">
          <template #default="{ row }">{{ row.customer?.name ?? '-' }}</template>
        </el-table-column>
        <el-table-column label="满意度" width="80">
          <template #default="{ row }">{{
            row.satisfactionScore ? row.satisfactionScore + '星' : '-'
          }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click.stop="goDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="pagination"
        background
        layout="total, prev, pager, next, sizes"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        @current-change="
          (v: number) => {
            page = v
            loadList()
          }
        "
        @size-change="
          (v: number) => {
            pageSize = v
            page = 1
            loadList()
          }
        "
      />
    </el-card>

    <!-- Create Dialog -->
    <el-dialog v-model="showCreateDialog" title="新建服务工单" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="200" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" placeholder="选择类型">
            <el-option label="投诉" :value="ServiceType.COMPLAINT" />
            <el-option label="咨询" :value="ServiceType.CONSULTATION" />
            <el-option label="维护" :value="ServiceType.MAINTENANCE" />
            <el-option label="退货" :value="ServiceType.RETURN" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="form.priority">
            <el-option label="低" :value="ServicePriority.LOW" />
            <el-option label="中" :value="ServicePriority.MEDIUM" />
            <el-option label="高" :value="ServicePriority.HIGH" />
            <el-option label="紧急" :value="ServicePriority.URGENT" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户ID" prop="customerId">
          <el-input-number v-model="form.customerId" :min="1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { usePermission } from '@/composables/usePermission'
import {
  serviceRecordApi,
  ServiceType,
  ServiceStatus,
  ServicePriority,
  type ServiceRecordVO,
  type ServiceRecordQueryParams,
} from '@/api/service-record'

const router = useRouter()
const { isAdminOrManager } = usePermission()

const loading = ref(false)
const submitting = ref(false)
const list = ref<ServiceRecordVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const showCreateDialog = ref(false)
const formRef = ref<FormInstance>()
const slaAlertCount = ref(0)

const stats = reactive({ total: 0, pending: 0, processing: 0 })
const filters = reactive<ServiceRecordQueryParams>({})

const form = reactive({
  title: '',
  description: '',
  type: ServiceType.CONSULTATION,
  priority: ServicePriority.MEDIUM,
  customerId: undefined as number | undefined,
})

const formRules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  customerId: [{ required: true, message: '请输入客户ID', trigger: 'blur' }],
}

const typeLabel = (t: ServiceType) =>
  ({ complaint: '投诉', consultation: '咨询', maintenance: '维护', return: '退货' })[t] ?? t

const statusLabel = (s: ServiceStatus) =>
  ({ pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' })[s] ?? s

const priorityLabel = (p: ServicePriority) =>
  ({ low: '低', medium: '中', high: '高', urgent: '紧急' })[p] ?? p

type TagType = 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined

const statusTagType = (s: ServiceStatus): TagType => {
  const map: Record<string, TagType> = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    closed: 'info',
  }
  return map[s]
}

const priorityTagType = (p: ServicePriority): TagType => {
  const map: Record<string, TagType> = {
    low: 'info',
    medium: undefined,
    high: 'warning',
    urgent: 'danger',
  }
  return map[p]
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN')
}

async function loadList() {
  loading.value = true
  try {
    const res = await serviceRecordApi.getList({
      page: page.value,
      pageSize: pageSize.value,
      ...filters,
    })
    const data = res as unknown as { list: ServiceRecordVO[]; total: number }
    list.value = data.list
    total.value = data.total
  } catch {
    /* handled by interceptor */
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const data = await serviceRecordApi.getStatistics()
    const d = data as unknown as Record<string, unknown>
    stats.total = (d['total'] as number) ?? 0
    const byStatus = (d['byStatus'] as Array<{ status: string; count: string }>) ?? []
    stats.pending = parseInt(byStatus.find((s) => s.status === 'pending')?.count ?? '0', 10)
    stats.processing = parseInt(byStatus.find((s) => s.status === 'processing')?.count ?? '0', 10)
  } catch {
    /* ignore */
  }
}

async function loadSlaAlerts() {
  try {
    const alerts = await serviceRecordApi.getSlaAlerts()
    slaAlertCount.value = (alerts as unknown as ServiceRecordVO[]).length
  } catch {
    /* ignore */
  }
}

function resetFilters() {
  Object.assign(filters, {
    status: undefined,
    type: undefined,
    priority: undefined,
    keyword: undefined,
  })
  page.value = 1
  loadList()
}

async function handleCreate() {
  if (!formRef.value) return
  await formRef.value.validate()
  submitting.value = true
  try {
    await serviceRecordApi.create({
      title: form.title,
      description: form.description,
      type: form.type,
      priority: form.priority,
      customerId: form.customerId!,
    })
    ElMessage.success('创建成功')
    showCreateDialog.value = false
    form.title = ''
    form.description = ''
    loadList()
    loadStats()
  } catch {
    /* handled */
  } finally {
    submitting.value = false
  }
}

function goDetail(row: ServiceRecordVO) {
  router.push(`/service/${row.id}`)
}

async function handleExport() {
  try {
    const blob = await serviceRecordApi.exportCsv()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'service-records.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    /* handled */
  }
}

onMounted(() => {
  loadList()
  loadStats()
  loadSlaAlerts()
})
</script>

<style scoped>
.service-page {
  padding: 20px;
}
.stat-row {
  margin-bottom: 16px;
}
.stat-card {
  text-align: center;
}
.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
.stat-pending .stat-value {
  color: #e6a23c;
}
.stat-processing .stat-value {
  color: #409eff;
}
.stat-alert .stat-value {
  color: #f56c6c;
}
.filter-card {
  margin-bottom: 16px;
}
.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
