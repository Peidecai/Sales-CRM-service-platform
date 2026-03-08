<template>
  <div class="dashboard-page">
    <div class="dashboard-header">
      <div>
        <h2 class="dashboard-title">工作台</h2>
        <p class="dashboard-subtitle">欢迎回来，{{ userName }}</p>
      </div>
      <el-button :icon="Refresh" circle :loading="statsLoading" @click="fetchAllStats" />
    </div>

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
                  <el-icon :size="28"><User /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ customerTotal }}</div>
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
                  <el-icon :size="28"><Phone /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ weekCallCount }}</div>
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
                  <el-icon :size="28"><TrendCharts /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ formatShortAmount(totalOpportunityAmount) }}</div>
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
                  <el-icon :size="28"><DataAnalysis /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ totalOpportunityCount }}</div>
                  <div class="stat-label">商机总数</div>
                </div>
              </div>
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
    </el-row>

    <DashboardCharts
      v-if="showCharts"
      :stats-loading="statsLoading"
      :stage-stats="stageStats"
      :customer-status-data="customerStatusData"
      :stage-label="stageLabel"
    />
    <template v-else>
      <el-row :gutter="16">
        <el-col :xs="24" :md="14">
          <el-card shadow="never" class="chart-placeholder-card">
            <template #header>
              <span class="card-header-title">{{ chartText.pipelineTitle }}</span>
            </template>
            <div class="chart-placeholder-body">
              <el-skeleton animated :rows="6" />
            </div>
          </el-card>
        </el-col>
        <el-col :xs="24" :md="10">
          <el-card shadow="never" class="chart-placeholder-card">
            <template #header>
              <span class="card-header-title">{{ chartText.customerStatusTitle }}</span>
            </template>
            <div class="chart-placeholder-body">
              <el-skeleton animated :rows="6" />
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="24">
          <el-card shadow="never" class="chart-placeholder-card">
            <template #header>
              <span class="card-header-title">{{ chartText.stageAmountTitle }}</span>
            </template>
            <div class="chart-placeholder-body">
              <el-skeleton animated :rows="4" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>

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
                    <span class="recent-sub">￥{{ formatAmount(o.amount) }}</span>
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
                    <span class="recent-name">
                      {{ callRecordCustomerMap[r.customerId] ?? `客户ID: ${r.customerId}` }}
                    </span>
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
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import {
  User,
  Phone,
  TrendCharts,
  DataAnalysis,
  ChatDotSquare,
  Refresh,
} from '@element-plus/icons-vue'
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

const userStore = useUserStore()
const DashboardCharts = defineAsyncComponent(() => import('./components/DashboardCharts.vue'))
const userName = computed(() => userStore.userInfo?.name ?? userStore.userInfo?.username ?? '用户')
const chartText = {
  pipelineTitle: '\u5546\u673A\u7BA1\u9053\u6F0F\u6597',
  customerStatusTitle: '\u5BA2\u6237\u72B6\u6001\u5206\u5E03',
  stageAmountTitle: '\u5546\u673A\u9636\u6BB5\u91D1\u989D\u5206\u5E03',
} as const

const showCharts = ref(false)
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

function formatShortAmount(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}万`
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

const statusLabelMap: Record<string, string> = {
  [CustomerStatus.POTENTIAL]: '潜在客户',
  [CustomerStatus.FOLLOWING]: '跟进中',
  [CustomerStatus.NEGOTIATING]: '谈判中',
  [CustomerStatus.SIGNED]: '已签约',
  [CustomerStatus.LOST]: '已流失',
  [CustomerStatus.INACTIVE]: '暂不合作',
}

async function resolveCallRecordCustomerNames(records: CallRecordVO[]) {
  const map: Record<number, string> = {}

  for (const c of recentCustomers.value) {
    map[c.id] = c.name
  }

  const missingIds = [...new Set(records.map((r) => r.customerId))].filter((id) => !(id in map))
  if (missingIds.length > 0) {
    try {
      const results = await Promise.all(
        missingIds.map((id) => customerApi.getDetail(id).catch(() => null)),
      )
      for (const res of results) {
        if (res?.data) {
          map[res.data.id] = res.data.name
        }
      }
    } catch {
      // noop
    }
  }

  callRecordCustomerMap.value = map
}

async function fetchAllStats() {
  statsLoading.value = true
  recentLoading.value = true

  try {
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
      resolveCallRecordCustomerNames(recentCallRes.data.list)
    }

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
    // request interceptor handles toasts
  } finally {
    statsLoading.value = false
    recentLoading.value = false
  }
}

function scheduleChartsMount() {
  if (typeof window === 'undefined') {
    showCharts.value = true
    return
  }

  const idleWindow = window as Window & {
    requestIdleCallback?: (
      callback: (...args: unknown[]) => void,
      options?: { timeout: number },
    ) => number
  }

  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleWindow.requestIdleCallback(
      () => {
        showCharts.value = true
      },
      { timeout: 1200 },
    )
    return
  }

  window.setTimeout(() => {
    showCharts.value = true
  }, 180)
}

onMounted(() => {
  fetchAllStats()
  scheduleChartsMount()
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

.chart-placeholder-card :deep(.el-card__body) {
  padding: 20px;
}

.chart-placeholder-body {
  min-height: 320px;
}

.empty-tip {
  text-align: center;
  padding: 32px 0;
  color: #909399;
  font-size: 14px;
}

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
