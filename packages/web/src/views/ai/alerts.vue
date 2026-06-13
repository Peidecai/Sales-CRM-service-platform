<template>
  <div class="alerts-page">
    <div class="page-header">
      <h2 class="page-title">异常预警</h2>
      <div class="filters">
        <el-select
          v-model="filterStatus"
          placeholder="状态"
          clearable
          style="width: 140px"
          @change="fetchAlerts"
        >
          <el-option label="待处理" value="pending" />
          <el-option label="已确认" value="acknowledged" />
          <el-option label="已解决" value="resolved" />
        </el-select>
        <el-select
          v-model="filterType"
          placeholder="类型"
          clearable
          style="width: 160px"
          @change="fetchAlerts"
        >
          <el-option label="流失风险" value="churn_risk" />
          <el-option label="停滞商机" value="stalled_opportunity" />
          <el-option label="情感下降" value="sentiment_drop" />
        </el-select>
      </div>
    </div>

    <el-table v-loading="loading" :data="alerts" stripe style="width: 100%">
      <el-table-column prop="alertType" label="类型" width="140">
        <template #default="{ row }">
          <el-tag :type="alertTypeTag(row.alertType)" size="small">
            {{ alertTypeLabel(row.alertType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column prop="customerId" label="客户ID" width="100" />
      <el-table-column prop="opportunityId" label="商机ID" width="100" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)" size="small">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'pending'"
            type="primary"
            link
            size="small"
            @click="handleAcknowledge(row.id)"
          >
            确认
          </el-button>
          <el-button
            v-if="row.status !== 'resolved'"
            type="success"
            link
            size="small"
            @click="handleResolve(row.id)"
          >
            解决
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > pageSize"
      class="pagination"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="page"
      @current-change="handlePageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
  type AiAlertVO,
  type AlertStatus,
} from '@/api/ai'
import { formatDate } from '@/utils/format'

const loading = ref(false)
const alerts = ref<AiAlertVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const filterStatus = ref<AlertStatus | ''>('')
const filterType = ref('')

const alertTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    churn_risk: '流失风险',
    stalled_opportunity: '停滞商机',
    sentiment_drop: '情感下降',
  }
  return map[type] ?? type
}

const alertTypeTag = (type: string) => {
  const map: Record<string, 'danger' | 'warning' | 'info'> = {
    churn_risk: 'danger',
    stalled_opportunity: 'warning',
    sentiment_drop: 'info',
  }
  return map[type] ?? 'info'
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    acknowledged: '已确认',
    resolved: '已解决',
  }
  return map[status] ?? status
}

const statusTag = (status: string) => {
  const map: Record<string, 'danger' | 'warning' | 'success'> = {
    pending: 'danger',
    acknowledged: 'warning',
    resolved: 'success',
  }
  return map[status] ?? 'info'
}

async function fetchAlerts() {
  loading.value = true
  try {
    const params: Record<string, unknown> = { page: page.value, pageSize }
    if (filterStatus.value) params['status'] = filterStatus.value
    if (filterType.value) params['alertType'] = filterType.value

    const res = (await getAlerts(params as Parameters<typeof getAlerts>[0])) as {
      data: { list: AiAlertVO[]; total: number }
    }
    if (res?.data) {
      alerts.value = res.data.list
      total.value = res.data.total
    }
  } catch {
    // handled
  } finally {
    loading.value = false
  }
}

async function handleAcknowledge(id: number) {
  await acknowledgeAlert(id)
  ElMessage.success('已确认')
  fetchAlerts()
}

async function handleResolve(id: number) {
  await resolveAlert(id)
  ElMessage.success('已解决')
  fetchAlerts()
}

function handlePageChange(newPage: number) {
  page.value = newPage
  fetchAlerts()
}

onMounted(() => fetchAlerts())
</script>

<style scoped>
.alerts-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.filters {
  display: flex;
  gap: 12px;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
