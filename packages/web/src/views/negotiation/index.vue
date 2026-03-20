<template>
  <div class="negotiation-page" style="padding: 20px">
    <!-- Dashboard Cards -->
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="平均评分" :value="dashboard.avgScore" :precision="1" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="胜率" :value="dashboard.winRate * 100" :precision="1" suffix="%" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="分析总数" :value="dashboard.totalAnalyses" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="平均让步次数" :value="dashboard.avgConcessions" :precision="1" />
        </el-card>
      </el-col>
    </el-row>

    <!-- Filters -->
    <el-card style="margin-bottom: 20px">
      <el-form :inline="true" :model="filters">
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部" style="width: 120px">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已完成" value="completed" />
            <el-option label="失败" value="failed" />
          </el-select>
        </el-form-item>
        <el-form-item label="结果">
          <el-select v-model="filters.outcome" clearable placeholder="全部" style="width: 120px">
            <el-option label="赢单" value="won" />
            <el-option label="丢单" value="lost" />
            <el-option label="待定" value="pending" />
            <el-option label="未知" value="unknown" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadList">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="success" @click="showTriggerDialog = true">触发分析</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- List Table -->
    <el-card>
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="callRecordId" label="通话记录" width="100" />
        <el-table-column prop="customerId" label="客户ID" width="80" />
        <el-table-column prop="overallScore" label="评分" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.overallScore !== null" :type="getScoreType(row.overallScore)">
              {{ row.overallScore }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="strategy" label="策略" width="120">
          <template #default="{ row }">
            {{ strategyLabel(row.strategy) }}
          </template>
        </el-table-column>
        <el-table-column prop="outcome" label="结果" width="80">
          <template #default="{ row }">
            <el-tag :type="outcomeTagType(row.outcome)">
              {{ outcomeLabel(row.outcome) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="summary" label="摘要" show-overflow-tooltip min-width="200" />
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="goDetail(row.id)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="total > 0"
        style="margin-top: 16px; justify-content: flex-end"
        layout="total, sizes, prev, pager, next"
        :total="total"
        :page-size="filters.pageSize"
        :current-page="filters.page"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </el-card>

    <!-- Trigger Dialog -->
    <el-dialog v-model="showTriggerDialog" title="触发谈判分析" width="400px">
      <el-form>
        <el-form-item label="通话记录ID">
          <el-input-number
            v-model="triggerCallRecordId"
            :min="1"
            placeholder="输入通话记录ID"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTriggerDialog = false">取消</el-button>
        <el-button type="primary" :loading="triggering" @click="handleTrigger">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getNegotiationList,
  getNegotiationDashboard,
  triggerNegotiationAnalysis,
  type NegotiationAnalysis,
  type NegotiationDashboard,
} from '@/api/negotiation'

const router = useRouter()
const loading = ref(false)
const list = ref<NegotiationAnalysis[]>([])
const total = ref(0)
const triggering = ref(false)
const showTriggerDialog = ref(false)
const triggerCallRecordId = ref<number>(1)
const dateRange = ref<string[] | null>(null)

const dashboard = ref<NegotiationDashboard>({
  avgScore: 0,
  totalAnalyses: 0,
  winRate: 0,
  avgConcessions: 0,
  strategyDistribution: [],
  outcomeDistribution: [],
})

const filters = reactive({
  page: 1,
  pageSize: 20,
  status: '' as string,
  outcome: '' as string,
})

function getScoreType(score: number): 'success' | 'warning' | 'danger' | undefined {
  if (score >= 70) return 'success'
  if (score >= 40) return 'warning'
  return 'danger'
}

function strategyLabel(s: string | null): string {
  const map: Record<string, string> = {
    competitive: '竞争型',
    collaborative: '合作型',
    compromise: '妥协型',
    avoidant: '回避型',
  }
  return s ? (map[s] ?? s) : '-'
}

function outcomeLabel(o: string | null): string {
  const map: Record<string, string> = {
    won: '赢单',
    lost: '丢单',
    pending: '待定',
    unknown: '未知',
  }
  return o ? (map[o] ?? o) : '-'
}

function outcomeTagType(o: string | null): 'success' | 'danger' | 'warning' | 'info' | undefined {
  const map: Record<string, 'success' | 'danger' | 'warning' | 'info' | undefined> = {
    won: 'success',
    lost: 'danger',
    pending: 'warning',
    unknown: 'info',
  }
  return o ? (map[o] ?? undefined) : 'info'
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  }
  return map[s] ?? s
}

function statusTagType(s: string): 'success' | 'warning' | 'danger' | 'info' | undefined {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | undefined> = {
    pending: 'info',
    processing: 'warning',
    completed: 'success',
    failed: 'danger',
  }
  return map[s] ?? undefined
}

async function loadDashboard() {
  try {
    const res = await getNegotiationDashboard()
    dashboard.value = res as unknown as NegotiationDashboard
  } catch {
    // ignore
  }
}

async function loadList() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page: filters.page,
      pageSize: filters.pageSize,
    }
    if (filters.status) params.status = filters.status
    if (filters.outcome) params.outcome = filters.outcome
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await getNegotiationList(params as Parameters<typeof getNegotiationList>[0])
    const data = res as unknown as { list: NegotiationAnalysis[]; total: number }
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.status = ''
  filters.outcome = ''
  filters.page = 1
  dateRange.value = null
  loadList()
}

function handlePageChange(page: number) {
  filters.page = page
  loadList()
}

function handleSizeChange(size: number) {
  filters.pageSize = size
  filters.page = 1
  loadList()
}

function goDetail(id: number) {
  router.push(`/negotiation/${id}`)
}

async function handleTrigger() {
  if (!triggerCallRecordId.value) return
  triggering.value = true
  try {
    await triggerNegotiationAnalysis(triggerCallRecordId.value)
    ElMessage.success('分析已触发')
    showTriggerDialog.value = false
    loadList()
  } catch {
    // error handled by interceptor
  } finally {
    triggering.value = false
  }
}

onMounted(() => {
  loadDashboard()
  loadList()
})
</script>
