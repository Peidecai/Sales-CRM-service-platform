<template>
  <div class="communication-analysis-page">
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="AI意向">
          <el-select
            v-model="filterForm.customerClassify"
            clearable
            placeholder="全部"
            style="width: 140px"
          >
            <el-option label="高意向" value="高意向" />
            <el-option label="中意向" value="中意向" />
            <el-option label="低意向" value="低意向" />
            <el-option label="无意向" value="无意向" />
          </el-select>
        </el-form-item>
        <el-form-item label="销售人员">
          <el-select
            v-model="filterForm.userId"
            clearable
            filterable
            remote
            :remote-method="searchUsers"
            placeholder="全部"
            style="width: 160px"
          >
            <el-option v-for="u in userOptions" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="时长范围">
          <el-input-number
            v-model="filterForm.minDuration"
            :min="0"
            placeholder="最小"
            style="width: 100px"
            :controls="false"
          />
          <span style="margin: 0 4px">-</span>
          <el-input-number
            v-model="filterForm.maxDuration"
            :min="0"
            placeholder="最大"
            style="width: 100px"
            :controls="false"
          />
          <span style="margin-left: 4px; color: #909399; font-size: 12px">秒</span>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button v-if="isAdminOrManager" type="success" plain @click="handleExport"
            >导出CSV</el-button
          >
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Tabs -->
    <el-card shadow="never" style="margin-top: 12px">
      <el-tabs v-model="activeTab" @tab-click="handleSearch">
        <el-tab-pane :label="`全部 (${tabs.total})`" name="all" />
        <el-tab-pane :label="`已分析 (${tabs.analyzed})`" name="analyzed" />
        <el-tab-pane :label="`待分析 (${tabs.pending})`" name="pending" />
      </el-tabs>

      <el-table v-loading="loading" :data="tableData" stripe style="width: 100%" size="small">
        <el-table-column label="客户" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <el-button
              v-if="row.customerId"
              type="primary"
              link
              size="small"
              @click="$router.push(`/customer/${row.customerId}`)"
            >
              {{ row.customerName || `客户#${row.customerId}` }}
            </el-button>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="AI意向" width="100">
          <template #default="{ row }">
            <el-tag
              v-if="row.customerClassify"
              :type="getClassifyTagType(row.customerClassify)"
              size="small"
            >
              {{ row.customerClassify }}
            </el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="分析摘要" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.summary ?? '—' }}
          </template>
        </el-table-column>
        <el-table-column label="话术评分" width="100" align="center">
          <template #default="{ row }">
            <span
              v-if="row.speechScore != null"
              :style="{
                color:
                  row.speechScore >= 80 ? '#67c23a' : row.speechScore >= 60 ? '#e6a23c' : '#f56c6c',
              }"
            >
              {{ row.speechScore }}
            </span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag
              :type="
                row.status === 'completed'
                  ? 'success'
                  : row.status === 'failed'
                    ? 'danger'
                    : row.status === 'applied'
                      ? 'info'
                      : 'warning'
              "
              size="small"
            >
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="$router.push(`/call-record/${row.callRecordId}`)"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { callAnalysisApi, type CallAnalysisResultVO } from '@/api/ai-analysis'
import { formatDate } from '@/utils/format'
import { usePermission } from '@/composables/usePermission'
import { userApi } from '@/api/user'

const { isAdminOrManager } = usePermission()

const loading = ref(false)
const tableData = ref<CallAnalysisResultVO[]>([])
const activeTab = ref('all')
const dateRange = ref<[string, string] | null>(null)
const userOptions = ref<Array<{ id: number; name: string }>>([])

const tabs = reactive({ total: 0, analyzed: 0, pending: 0 })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const filterForm = reactive({
  customerClassify: undefined as string | undefined,
  userId: undefined as number | undefined,
  minDuration: undefined as number | undefined,
  maxDuration: undefined as number | undefined,
})

function getClassifyTagType(
  classify: string,
): 'danger' | 'warning' | 'info' | 'success' | undefined {
  if (classify.includes('高')) return 'danger'
  if (classify.includes('中')) return 'warning'
  if (classify.includes('低')) return 'info'
  return undefined
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '待分析',
    completed: '已完成',
    failed: '失败',
    applied: '已应用',
  }
  return map[status] ?? status
}

async function searchUsers(query: string) {
  if (!query) return
  try {
    const res = await userApi.getList({ keyword: query, page: 1, pageSize: 20 })
    const data = (res as unknown as { data: { list: Array<{ id: number; name: string }> } }).data
    userOptions.value = data?.list ?? []
  } catch (e) {
    console.error(e)
    ElMessage.error('搜索用户失败')
  }
}

async function handleSearch() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (filterForm.customerClassify) params.customerClassify = filterForm.customerClassify
    if (filterForm.userId) params.userId = filterForm.userId
    if (filterForm.minDuration != null) params.minDuration = filterForm.minDuration
    if (filterForm.maxDuration != null) params.maxDuration = filterForm.maxDuration
    if (dateRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    if (activeTab.value === 'analyzed') params.status = 'completed'
    if (activeTab.value === 'pending') params.status = 'pending'

    const res = await callAnalysisApi.getList(params)
    if (res?.data) {
      tableData.value = res.data.list
      pagination.total = res.data.total
      if (res.data.tabs) {
        tabs.total = res.data.tabs.total
        tabs.analyzed = res.data.tabs.analyzed
        tabs.pending = res.data.tabs.pending
      }
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('加载沟通分析数据失败')
  } finally {
    loading.value = false
  }
}

function handleReset() {
  filterForm.customerClassify = undefined
  filterForm.userId = undefined
  filterForm.minDuration = undefined
  filterForm.maxDuration = undefined
  dateRange.value = null
  activeTab.value = 'all'
  pagination.page = 1
  handleSearch()
}

async function handleExport() {
  try {
    const params: Record<string, unknown> = {}
    if (filterForm.customerClassify) params.customerClassify = filterForm.customerClassify
    if (filterForm.userId) params.userId = filterForm.userId
    if (dateRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await callAnalysisApi.exportList(params)
    const data = (res as unknown as { data: { list: CallAnalysisResultVO[] } }).data
    if (!data?.list?.length) return

    const headers = ['ID', '客户分类', '摘要', '话术评分', '状态', '创建时间']
    const rows = data.list.map((r: CallAnalysisResultVO) => [
      r.id,
      r.customerClassify ?? '',
      (r.summary ?? '').replace(/"/g, '""'),
      r.speechScore ?? '',
      r.status,
      r.createdAt,
    ])
    const csv = [
      headers.join(','),
      ...rows.map((r: unknown[]) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `communication-analysis-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error(e)
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  handleSearch()
})
</script>

<style scoped>
.communication-analysis-page {
  padding: 16px;
}

.filter-card :deep(.el-card__body) {
  padding: 12px 16px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
