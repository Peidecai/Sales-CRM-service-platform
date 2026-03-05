<template>
  <div class="dashboard-page">
    <!-- Header -->
    <div class="dashboard-header">
      <div>
        <h2 class="dashboard-title">工作台</h2>
        <p class="dashboard-subtitle">欢迎回来，{{ userName }}</p>
      </div>
      <el-button :icon="Refresh" circle :loading="statsLoading" @click="fetchAllStats" />
    </div>

    <!-- Stats Cards -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card
          shadow="hover"
          class="stat-card stat-card-customer"
          @click="$router.push('/customer')"
        >
          <el-skeleton :loading="statsLoading" animated :rows="1">
            <template #default>
              <div class="stat-card-inner">
                <div class="stat-icon customer-icon">
                  <el-icon :size="28">
                    <User />
                  </el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">
                    {{ customerTotal }}
                  </div>
                  <div class="stat-label">客户总数</div>
                </div>
              </div>
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card
          shadow="hover"
          class="stat-card stat-card-call"
          @click="$router.push('/call-record')"
        >
          <el-skeleton :loading="statsLoading" animated :rows="1">
            <template #default>
              <div class="stat-card-inner">
                <div class="stat-icon call-icon">
                  <el-icon :size="28">
                    <Phone />
                  </el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">
                    {{ weekCallCount }}
                  </div>
                  <div class="stat-label">本周通话</div>
                </div>
              </div>
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card
          shadow="hover"
          class="stat-card stat-card-amount"
          @click="$router.push('/opportunity')"
        >
          <el-skeleton :loading="statsLoading" animated :rows="1">
            <template #default>
              <div class="stat-card-inner">
                <div class="stat-icon amount-icon">
                  <el-icon :size="28">
                    <TrendCharts />
                  </el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">
                    {{ formatShortAmount(totalOpportunityAmount) }}
                  </div>
                  <div class="stat-label">商机总额</div>
                </div>
              </div>
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card
          shadow="hover"
          class="stat-card stat-card-opp"
          @click="$router.push('/opportunity')"
        >
          <el-skeleton :loading="statsLoading" animated :rows="1">
            <template #default>
              <div class="stat-card-inner">
                <div class="stat-icon opp-icon">
                  <el-icon :size="28">
                    <DataAnalysis />
                  </el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">
                    {{ totalOpportunityCount }}
                  </div>
                  <div class="stat-label">商机总数</div>
                </div>
              </div>
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
    </el-row>

    <!-- Middle: Charts -->
    <el-row :gutter="16">
      <el-col :xs="24" :md="14">
        <!-- Pipeline Funnel Chart (ECharts) -->
        <el-card shadow="never" class="stage-card">
          <template #header>
            <span class="card-header-title">商机管道漏斗</span>
          </template>
          <el-skeleton :loading="statsLoading" animated :rows="6">
            <template #default>
              <div v-if="stageStats.length === 0" class="empty-tip">暂无商机数据</div>
              <v-chart v-else :option="funnelChartOption" class="echart-box" autoresize />
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="10">
        <!-- Customer Status Pie Chart -->
        <el-card shadow="never" class="funnel-card">
          <template #header>
            <span class="card-header-title">客户状态分布</span>
          </template>
          <el-skeleton :loading="statsLoading" animated :rows="6">
            <template #default>
              <div v-if="customerStatusData.length === 0" class="empty-tip">暂无数据</div>
              <v-chart v-else :option="pieChartOption" class="echart-box" autoresize />
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
    </el-row>

    <!-- Stage Distribution Bar -->
    <el-row :gutter="16">
      <el-col :span="24">
        <el-card shadow="never" class="stage-card">
          <template #header>
            <span class="card-header-title">商机阶段金额分布</span>
          </template>
          <el-skeleton :loading="statsLoading" animated :rows="4">
            <template #default>
              <div v-if="stageStats.length === 0" class="empty-tip">暂无商机数据</div>
              <v-chart v-else :option="barChartOption" class="echart-box" autoresize />
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
    </el-row>

    <!-- Bottom: Recent Records -->
    <el-row :gutter="16">
      <el-col :xs="24" :md="8">
        <el-card shadow="never" class="recent-card">
          <template #header>
            <div class="card-header-row">
              <span class="card-header-title">最近客户</span>
              <el-button type="primary" link size="small" @click="$router.push('/customer')">
                查看全部
              </el-button>
            </div>
          </template>
          <el-skeleton :loading="recentLoading" animated :rows="4">
            <template #default>
              <div v-if="recentCustomers.length === 0" class="empty-tip">暂无客户</div>
              <div v-else class="recent-list">
                <div
                  v-for="c in recentCustomers"
                  :key="c.id"
                  class="recent-item"
                  @click="$router.push(`/customer/${c.id}`)"
                >
                  <div class="recent-main">
                    <span class="recent-name">{{ c.name }}</span>
                    <span v-if="c.company" class="recent-sub">{{ c.company }}</span>
                  </div>
                  <el-tag :type="getStatusTagType(c.status)" size="small">
                    {{ getStatusLabel(c.status) }}
                  </el-tag>
                </div>
              </div>
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card shadow="never" class="recent-card">
          <template #header>
            <div class="card-header-row">
              <span class="card-header-title">最近商机</span>
              <el-button type="primary" link size="small" @click="$router.push('/opportunity')">
                查看全部
              </el-button>
            </div>
          </template>
          <el-skeleton :loading="recentLoading" animated :rows="4">
            <template #default>
              <div v-if="recentOpportunities.length === 0" class="empty-tip">暂无商机</div>
              <div v-else class="recent-list">
                <div
                  v-for="o in recentOpportunities"
                  :key="o.id"
                  class="recent-item"
                  @click="$router.push(`/opportunity/${o.id}`)"
                >
                  <div class="recent-main">
                    <span class="recent-name">{{ o.title }}</span>
                    <span class="recent-sub">¥{{ formatAmount(o.amount) }}</span>
                  </div>
                  <el-tag :type="getStageTagType(o.stage)" size="small">
                    {{ stageLabel(o.stage) }}
                  </el-tag>
                </div>
              </div>
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card shadow="never" class="recent-card">
          <template #header>
            <div class="card-header-row">
              <span class="card-header-title">最近通话</span>
              <el-button type="primary" link size="small" @click="$router.push('/call-record')">
                查看全部
              </el-button>
            </div>
          </template>
          <el-skeleton :loading="recentLoading" animated :rows="4">
            <template #default>
              <div v-if="recentCallRecords.length === 0" class="empty-tip">暂无通话记录</div>
              <div v-else class="recent-list">
                <div
                  v-for="r in recentCallRecords"
                  :key="r.id"
                  class="recent-item"
                  @click="$router.push(`/call-record/${r.id}`)"
                >
                  <div class="recent-main">
                    <span class="recent-name">{{
                      callRecordCustomerMap[r.customerId] ?? `客户ID: ${r.customerId}`
                    }}</span>
                    <span class="recent-sub">{{ formatDuration(r.duration) }}</span>
                  </div>
                  <span class="recent-date">{{ formatShortDate(r.callAt) }}</span>
                </div>
              </div>
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
    </el-row>

    <!-- Quick Actions -->
    <el-card shadow="never" class="quick-actions-card">
      <template #header>
        <span class="card-header-title">快捷操作</span>
      </template>
      <div class="quick-actions">
        <el-button type="primary" @click="$router.push('/customer')">
          <el-icon><User /></el-icon>
          新建客户
        </el-button>
        <el-button type="success" @click="$router.push('/opportunity')">
          <el-icon><TrendCharts /></el-icon>
          新建商机
        </el-button>
        <el-button type="warning" @click="$router.push('/call-record')">
          <el-icon><Phone /></el-icon>
          记录通话
        </el-button>
        <el-button type="info" @click="$router.push('/knowledge')">
          <el-icon><ChatDotSquare /></el-icon>
          知识库问答
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  User,
  Phone,
  TrendCharts,
  DataAnalysis,
  ChatDotSquare,
  Refresh,
} from '@element-plus/icons-vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { FunnelChart, PieChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { useUserStore } from '@/stores/user'
import { customerApi, CustomerStatus, type CustomerVO } from '@/api/customer'
import { callRecordApi, type CallRecordVO } from '@/api/call-record'
import {
  opportunityApi,
  type OpportunityStageStats,
  OpportunityStage,
  type OpportunityVO,
} from '@/api/opportunity'
import { formatAmount, formatDuration } from '@/utils/format'
import { getStatusTagType, getStatusLabel, getStageTagType } from '@/utils/tag-helpers'

// Register ECharts components
use([
  CanvasRenderer,
  FunnelChart,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const userStore = useUserStore()
const userName = computed(() => userStore.userInfo?.name ?? userStore.userInfo?.username ?? '用户')

// ---- State ----
const statsLoading = ref(true)
const recentLoading = ref(true)
const customerTotal = ref(0)
const weekCallCount = ref(0)
const stageStats = ref<OpportunityStageStats[]>([])
const recentCustomers = ref<CustomerVO[]>([])
const recentOpportunities = ref<OpportunityVO[]>([])
const recentCallRecords = ref<CallRecordVO[]>([])
const customerStatusData = ref<Array<{ name: string; value: number }>>([])
const callRecordCustomerMap = ref<Record<number, string>>({})

const totalOpportunityCount = computed(() => stageStats.value.reduce((sum, s) => sum + s.count, 0))
const totalOpportunityAmount = computed(() =>
  stageStats.value.reduce((sum, s) => sum + s.totalAmount, 0),
)

// ---- ECharts Options ----
const stageColorArray = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#529b2e', '#c0c4cc']

const funnelChartOption = computed(() => {
  const funnelStages = [
    OpportunityStage.LEAD,
    OpportunityStage.QUALIFIED,
    OpportunityStage.PROPOSAL,
    OpportunityStage.NEGOTIATION,
    OpportunityStage.CLOSED_WON,
  ]
  const data = funnelStages.map((stage, idx) => {
    const found = stageStats.value.find((s) => s.stage === stage)
    return {
      name: stageLabel(stage),
      value: found?.count ?? 0,
      itemStyle: { color: stageColorArray[idx] },
    }
  })

  return {
    tooltip: {
      trigger: 'item' as const,
      formatter: '{b}: {c}个 ({d}%)',
    },
    series: [
      {
        type: 'funnel',
        left: '10%',
        top: 20,
        bottom: 20,
        width: '80%',
        min: 0,
        max: Math.max(...data.map((d) => d.value), 1),
        minSize: '20%',
        maxSize: '100%',
        sort: 'descending',
        gap: 4,
        label: {
          show: true,
          position: 'inside',
          formatter: '{b}: {c}',
          fontSize: 13,
        },
        data,
      },
    ],
  }
})

const customerStatusColorMap: Record<string, string> = {
  潜在客户: '#409eff',
  跟进中: '#e6a23c',
  谈判中: '#f56c6c',
  已签约: '#67c23a',
  已流失: '#909399',
  暂不合作: '#c0c4cc',
}

const pieChartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c}个 ({d}%)',
  },
  legend: {
    orient: 'vertical',
    right: 10,
    top: 'center',
    textStyle: { fontSize: 12 },
  },
  series: [
    {
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' },
      },
      data: customerStatusData.value.map((item) => ({
        ...item,
        itemStyle: { color: customerStatusColorMap[item.name] ?? '#409eff' },
      })),
    },
  ],
}))

const barChartOption = computed(() => {
  const allStages = [
    OpportunityStage.LEAD,
    OpportunityStage.QUALIFIED,
    OpportunityStage.PROPOSAL,
    OpportunityStage.NEGOTIATION,
    OpportunityStage.CLOSED_WON,
    OpportunityStage.CLOSED_LOST,
  ]
  const categories = allStages.map((s) => stageLabel(s))
  const countData = allStages.map((stage) => {
    const found = stageStats.value.find((s) => s.stage === stage)
    return found?.count ?? 0
  })
  const amountData = allStages.map((stage) => {
    const found = stageStats.value.find((s) => s.stage === stage)
    return Number(((found?.totalAmount ?? 0) / 10000).toFixed(1))
  })

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['商机数量', '金额(万元)'],
      top: 0,
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { fontSize: 12 },
    },
    yAxis: [
      { type: 'value', name: '数量', position: 'left' },
      { type: 'value', name: '万元', position: 'right' },
    ],
    series: [
      {
        name: '商机数量',
        type: 'bar',
        data: countData.map((v, i) => ({
          value: v,
          itemStyle: { color: stageColorArray[i] ?? '#409eff' },
        })),
        barWidth: '35%',
        yAxisIndex: 0,
      },
      {
        name: '金额(万元)',
        type: 'bar',
        data: amountData.map((v, i) => ({
          value: v,
          itemStyle: { color: stageColorArray[i] ?? '#409eff', opacity: 0.6 },
        })),
        barWidth: '35%',
        yAxisIndex: 1,
      },
    ],
  }
})

// ---- Helpers ----
function formatShortAmount(value: number): string {
  if (value >= 10000) {
    return (value / 10000).toFixed(1) + '万'
  }
  return String(value)
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const stageLabelMap: Record<string, string> = {
  [OpportunityStage.LEAD]: '线索',
  [OpportunityStage.QUALIFIED]: '意向客户',
  [OpportunityStage.PROPOSAL]: '方案报价',
  [OpportunityStage.NEGOTIATION]: '商务谈判',
  [OpportunityStage.CLOSED_WON]: '成交',
  [OpportunityStage.CLOSED_LOST]: '丢单',
}

function stageLabel(stage: string): string {
  return stageLabelMap[stage] ?? stage
}

// ---- Data Fetching ----

const statusLabelMap: Record<string, string> = {
  [CustomerStatus.POTENTIAL]: '潜在客户',
  [CustomerStatus.FOLLOWING]: '跟进中',
  [CustomerStatus.NEGOTIATING]: '谈判中',
  [CustomerStatus.SIGNED]: '已签约',
  [CustomerStatus.LOST]: '已流失',
  [CustomerStatus.INACTIVE]: '暂不合作',
}

/**
 * Resolve customer names for recent call records.
 * First reuses names from recentCustomers, then fetches remaining.
 */
async function resolveCallRecordCustomerNames(records: CallRecordVO[]) {
  const map: Record<number, string> = {}
  // Reuse names from already-loaded recent customers
  for (const c of recentCustomers.value) {
    map[c.id] = c.name
  }
  // Find IDs still missing
  const missingIds = [...new Set(records.map((r) => r.customerId))].filter((id) => !(id in map))
  if (missingIds.length > 0) {
    try {
      // Fetch customer details for missing IDs
      const results = await Promise.all(
        missingIds.map((id) => customerApi.getDetail(id).catch(() => null)),
      )
      for (const res of results) {
        if (res?.data) {
          map[res.data.id] = res.data.name
        }
      }
    } catch {
      // Silently fail
    }
  }
  callRecordCustomerMap.value = map
}

async function fetchAllStats() {
  statsLoading.value = true
  recentLoading.value = true
  try {
    // Fetch customer counts by status for pie chart
    const statusCounts: Array<{ name: string; value: number }> = []
    const allStatuses = [
      CustomerStatus.POTENTIAL,
      CustomerStatus.FOLLOWING,
      CustomerStatus.NEGOTIATING,
      CustomerStatus.SIGNED,
      CustomerStatus.LOST,
      CustomerStatus.INACTIVE,
    ]

    const [
      customerRes,
      callRes,
      oppRes,
      recentCustRes,
      recentOppRes,
      recentCallRes,
      ...statusResults
    ] = await Promise.all([
      customerApi.getList({ page: 1, pageSize: 1 }),
      callRecordApi.getStats(),
      opportunityApi.getStats(),
      customerApi.getList({ page: 1, pageSize: 5 }),
      opportunityApi.getList({ page: 1, pageSize: 5 }),
      callRecordApi.getList({ page: 1, pageSize: 5 }),
      ...allStatuses.map((status) => customerApi.getList({ page: 1, pageSize: 1, status })),
    ])

    if (customerRes?.data) {
      customerTotal.value = customerRes.data.total
    }
    if (callRes?.data) {
      weekCallCount.value = callRes.data.weekCount
    }
    if (oppRes?.data) {
      stageStats.value = oppRes.data
    }
    if (recentCustRes?.data) {
      recentCustomers.value = recentCustRes.data.list
    }
    if (recentOppRes?.data) {
      recentOpportunities.value = recentOppRes.data.list
    }
    if (recentCallRes?.data) {
      recentCallRecords.value = recentCallRes.data.list
      // Resolve customer names for call records
      resolveCallRecordCustomerNames(recentCallRes.data.list)
    }

    // Build customer status pie data
    for (let i = 0; i < allStatuses.length; i++) {
      const res = statusResults[i]
      if (res?.data && res.data.total > 0) {
        statusCounts.push({
          name: statusLabelMap[allStatuses[i]] ?? allStatuses[i],
          value: res.data.total,
        })
      }
    }
    customerStatusData.value = statusCounts
  } catch {
    // Error handled by request interceptor
  } finally {
    statsLoading.value = false
    recentLoading.value = false
  }
}

onMounted(() => {
  fetchAllStats()
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.dashboard-title {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.dashboard-subtitle {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

/* Stats Cards */
.stats-row {
  margin-bottom: 0;
}

.stat-card {
  margin-bottom: 0;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card :deep(.el-card__body) {
  padding: 20px;
}

.stat-card-inner {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.customer-icon {
  background: #ecf5ff;
  color: #409eff;
}
.call-icon {
  background: #fdf6ec;
  color: #e6a23c;
}
.amount-icon {
  background: #f0f9eb;
  color: #67c23a;
}
.opp-icon {
  background: #fef0f0;
  color: #f56c6c;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

/* Stage Distribution Card */
.stage-card :deep(.el-card__body) {
  padding: 20px;
}

.card-header-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.empty-tip {
  text-align: center;
  padding: 32px 0;
  color: #909399;
  font-size: 14px;
}

/* ECharts container */
.echart-box {
  width: 100%;
  height: 320px;
}

/* Funnel Card */
.funnel-card :deep(.el-card__body) {
  padding: 20px;
}

/* Recent Records */
.recent-card :deep(.el-card__body) {
  padding: 0;
}

.recent-list {
  display: flex;
  flex-direction: column;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f5f5f5;
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-item:hover {
  background: #f5f7fa;
}

.recent-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.recent-name {
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-sub {
  font-size: 12px;
  color: #909399;
}

.recent-date {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  margin-left: 8px;
}

/* Quick Actions */
.quick-actions-card :deep(.el-card__body) {
  padding: 20px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.quick-actions .el-button {
  min-width: 120px;
}
</style>
