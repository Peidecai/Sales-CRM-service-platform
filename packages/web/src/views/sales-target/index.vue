<template>
  <div class="performance-page">
    <!-- 公司目标进度 -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="section-header">
          <span class="section-title">公司目标进度 ({{ currentYear }})</span>
          <el-select v-model="currentYear" size="small" style="width: 100px" @change="loadOverview">
            <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
          </el-select>
        </div>
      </template>
      <el-skeleton :loading="overviewLoading" animated :rows="2">
        <template #default>
          <el-row v-if="overview.length > 0" :gutter="16">
            <el-col v-for="item in overview" :key="item.metricType" :xs="12" :sm="6">
              <div class="metric-card" :class="metricColorClass(item.metricType)">
                <div class="metric-label">{{ metricLabel(item.metricType) }}</div>
                <div class="metric-value">
                  {{ formatMetricValue(item.achievedValue, item.metricType) }}
                </div>
                <el-progress
                  :percentage="Math.min(item.achievementRate, 100)"
                  :stroke-width="8"
                  :color="progressColor(item.achievementRate)"
                  :format="() => item.achievementRate.toFixed(1) + '%'"
                />
                <div class="metric-target">
                  目标: {{ formatMetricValue(item.targetValue, item.metricType) }}
                </div>
              </div>
            </el-col>
          </el-row>
          <el-empty v-else description="暂无公司目标数据" :image-size="60" />
        </template>
      </el-skeleton>
    </el-card>

    <el-row :gutter="16">
      <!-- 销售排行 TOP10 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="section-card">
          <template #header>
            <div class="section-header">
              <span class="section-title">个人 TOP10</span>
              <el-select
                v-model="rankMetricType"
                size="small"
                style="width: 120px"
                @change="onRankMetricChange"
              >
                <el-option
                  v-for="opt in metricOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </div>
          </template>
          <el-skeleton :loading="salesRankingLoading" animated :rows="6">
            <template #default>
              <el-table
                v-if="salesRanking.length > 0"
                :data="salesRanking"
                size="small"
                stripe
                :show-header="true"
              >
                <el-table-column label="排名" width="60" align="center">
                  <template #default="{ row }">
                    <span :class="['rank-badge', rankClass(row.rank)]">{{ row.rank }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="userName" label="销售" min-width="100" />
                <el-table-column label="业绩值" min-width="100" align="right">
                  <template #default="{ row }">
                    {{ formatMetricValue(row.metricValue, rankMetricType) }}
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="暂无排行数据" :image-size="60" />
            </template>
          </el-skeleton>
        </el-card>
      </el-col>

      <!-- 团队排行 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="section-card">
          <template #header>
            <span class="section-title">团队排行</span>
          </template>
          <el-skeleton :loading="teamRankingLoading" animated :rows="4">
            <template #default>
              <el-table v-if="teamRanking.length > 0" :data="teamRanking" size="small" stripe>
                <el-table-column label="排名" width="60" align="center">
                  <template #default="{ row }">
                    <span :class="['rank-badge', rankClass(row.rank)]">{{ row.rank }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="teamId" label="团队" min-width="120" />
                <el-table-column label="业绩总值" min-width="100" align="right">
                  <template #default="{ row }">
                    {{ formatMetricValue(row.totalValue, rankMetricType) }}
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="暂无团队排行数据" :image-size="60" />
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
    </el-row>

    <!-- 月度趋势图 -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="section-header">
          <span class="section-title">月度业绩趋势</span>
          <el-select
            v-model="trendMetricType"
            size="small"
            style="width: 120px"
            @change="loadTrend"
          >
            <el-option
              v-for="opt in metricOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>
      </template>
      <el-skeleton :loading="trendLoading" animated :rows="4">
        <template #default>
          <div v-if="trendData.length > 0">
            <v-chart :option="trendChartOption" class="trend-chart" autoresize />
          </div>
          <el-empty v-else description="暂无趋势数据" :image-size="60" />
        </template>
      </el-skeleton>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { useUserStore } from '@/stores/user'
import {
  salesTargetApi,
  TargetMetricType,
  TargetPeriod,
  type OverviewItem,
  type RankingItem,
  type TeamRankingItem,
} from '@/api/sales-target'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const userStore = useUserStore()

// ── State ───────────────────────────────────────────────────────────────

const now = new Date()
const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
const currentYear = ref(now.getFullYear())

const overviewLoading = ref(false)
const overview = ref<OverviewItem[]>([])

const salesRankingLoading = ref(false)
const salesRanking = ref<RankingItem[]>([])
const rankMetricType = ref<TargetMetricType>(TargetMetricType.REVENUE)

const teamRankingLoading = ref(false)
const teamRanking = ref<TeamRankingItem[]>([])

const trendLoading = ref(false)
const trendData = ref<RankingItem[]>([])
const trendMetricType = ref<TargetMetricType>(TargetMetricType.REVENUE)

const metricOptions = [
  { label: '收入金额', value: TargetMetricType.REVENUE },
  { label: '成交数', value: TargetMetricType.DEAL_COUNT },
  { label: '新客户数', value: TargetMetricType.NEW_CUSTOMER },
  { label: '通话数', value: TargetMetricType.CALL_COUNT },
]

// ── Labels & Formatting ─────────────────────────────────────────────────

function metricLabel(type: TargetMetricType): string {
  const labels: Record<TargetMetricType, string> = {
    [TargetMetricType.REVENUE]: '收入金额',
    [TargetMetricType.DEAL_COUNT]: '成交数',
    [TargetMetricType.NEW_CUSTOMER]: '新客户数',
    [TargetMetricType.CALL_COUNT]: '通话数',
  }
  return labels[type] ?? type
}

function metricColorClass(type: TargetMetricType): string {
  const map: Record<TargetMetricType, string> = {
    [TargetMetricType.REVENUE]: 'metric-revenue',
    [TargetMetricType.DEAL_COUNT]: 'metric-deal',
    [TargetMetricType.NEW_CUSTOMER]: 'metric-customer',
    [TargetMetricType.CALL_COUNT]: 'metric-call',
  }
  return map[type] ?? ''
}

function formatMetricValue(value: number, type: TargetMetricType): string {
  if (type === TargetMetricType.REVENUE) {
    return value >= 10000 ? `${(value / 10000).toFixed(1)}万` : `¥${value.toLocaleString()}`
  }
  return value.toLocaleString()
}

function progressColor(rate: number): string {
  if (rate >= 100) return '#67c23a'
  if (rate >= 60) return '#409eff'
  if (rate >= 30) return '#e6a23c'
  return '#f56c6c'
}

function rankClass(rank: number): string {
  if (rank === 1) return 'rank-gold'
  if (rank === 2) return 'rank-silver'
  if (rank === 3) return 'rank-bronze'
  return ''
}

// ── Trend Chart ─────────────────────────────────────────────────────────

const trendChartOption = computed(() => {
  const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
  const values = months.map((_, i) => {
    const item = trendData.value.find((d) => d.month === i + 1)
    return item ? Number(item.metricValue) : 0
  })
  const ranks = months.map((_, i) => {
    const item = trendData.value.find((d) => d.month === i + 1)
    return item ? item.rank : null
  })

  return {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['业绩值', '排名'],
      top: 0,
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: months,
    },
    yAxis: [
      {
        type: 'value',
        name: trendMetricType.value === TargetMetricType.REVENUE ? '金额' : '数量',
        position: 'left',
      },
      {
        type: 'value',
        name: '排名',
        position: 'right',
        inverse: true,
        min: 1,
      },
    ],
    series: [
      {
        name: '业绩值',
        type: 'bar',
        data: values,
        barWidth: '40%',
        itemStyle: { color: '#409eff' },
        yAxisIndex: 0,
      },
      {
        name: '排名',
        type: 'line',
        data: ranks,
        smooth: true,
        lineStyle: { color: '#f56c6c', width: 2 },
        itemStyle: { color: '#f56c6c' },
        yAxisIndex: 1,
      },
    ],
  }
})

// ── Data Loading ────────────────────────────────────────────────────────

async function loadOverview() {
  overviewLoading.value = true
  try {
    const res = await salesTargetApi.getOverview(currentYear.value)
    overview.value = res?.data ?? []
  } catch {
    overview.value = []
  } finally {
    overviewLoading.value = false
  }
}

async function loadSalesRanking() {
  salesRankingLoading.value = true
  try {
    const month = now.getMonth() + 1
    const res = await salesTargetApi.getSalesRanking({
      metricType: rankMetricType.value,
      period: TargetPeriod.MONTH,
      year: currentYear.value,
      month,
      limit: 10,
    })
    salesRanking.value = res?.data ?? []
  } catch {
    salesRanking.value = []
  } finally {
    salesRankingLoading.value = false
  }
}

async function loadTeamRanking() {
  teamRankingLoading.value = true
  try {
    const quarter = Math.ceil((now.getMonth() + 1) / 3)
    const res = await salesTargetApi.getTeamRanking({
      metricType: rankMetricType.value,
      year: currentYear.value,
      quarter,
    })
    teamRanking.value = res?.data ?? []
  } catch {
    teamRanking.value = []
  } finally {
    teamRankingLoading.value = false
  }
}

async function loadTrend() {
  trendLoading.value = true
  try {
    const userId = userStore.userInfo?.id
    if (!userId) return
    const res = await salesTargetApi.getRankingTrend({
      userId,
      metricType: trendMetricType.value,
      year: currentYear.value,
    })
    trendData.value = res?.data ?? []
  } catch {
    trendData.value = []
  } finally {
    trendLoading.value = false
  }
}

function onRankMetricChange() {
  loadSalesRanking()
  loadTeamRanking()
}

onMounted(() => {
  loadOverview()
  loadSalesRanking()
  loadTeamRanking()
  loadTrend()
})
</script>

<style scoped>
.performance-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-card :deep(.el-card__header) {
  padding: 12px 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

/* Metric cards */
.metric-card {
  padding: 16px;
  border-radius: 8px;
  background: #f7f8fa;
  margin-bottom: 8px;
}

.metric-card.metric-revenue {
  border-left: 4px solid #409eff;
}
.metric-card.metric-deal {
  border-left: 4px solid #67c23a;
}
.metric-card.metric-customer {
  border-left: 4px solid #e6a23c;
}
.metric-card.metric-call {
  border-left: 4px solid #909399;
}

.metric-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.metric-value {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 8px;
}

.metric-target {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 6px;
}

/* Rank badges */
.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  background: #f0f2f5;
  color: #606266;
}

.rank-gold {
  background: #fef0e0;
  color: #e6a23c;
}
.rank-silver {
  background: #f0f2f5;
  color: #909399;
}
.rank-bronze {
  background: #fde2e2;
  color: #f56c6c;
}

/* Trend chart */
.trend-chart {
  width: 100%;
  height: 360px;
}
</style>
