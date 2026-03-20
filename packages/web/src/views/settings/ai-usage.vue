<template>
  <div class="ai-usage-page">
    <el-card class="filter-card">
      <el-form inline>
        <el-form-item label="模块">
          <el-select v-model="query.module" clearable placeholder="全部" style="width: 150px">
            <el-option v-for="m in moduleOptions" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
            style="width: 280px"
          />
        </el-form-item>
        <el-form-item label="聚合">
          <el-select v-model="query.groupBy" style="width: 100px">
            <el-option label="按天" value="day" />
            <el-option label="按周" value="week" />
            <el-option label="按月" value="month" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="20" style="margin-top: 16px">
      <el-col :span="16">
        <el-card>
          <template #header><span>Token 用量趋势</span></template>
          <div ref="trendChartRef" style="height: 350px" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header><span>模块分布</span></template>
          <div ref="pieChartRef" style="height: 350px" />
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 16px">
      <template #header><span>费用汇总</span></template>
      <el-table :data="costData" stripe>
        <el-table-column prop="module" label="模块" />
        <el-table-column prop="requestCount" label="请求数" />
        <el-table-column prop="totalTokens" label="总 Token" />
        <el-table-column label="预估费用">
          <template #default="{ row }"> ¥{{ Number(row.totalCost).toFixed(4) }} </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, shallowRef } from 'vue'
import * as echarts from 'echarts'
import {
  aiConfigApi,
  type UsageStatItemVO,
  type UsageCostItemVO,
  type AiConfigVO,
} from '@/api/ai-config'

const trendChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()
const trendChart = shallowRef<echarts.ECharts>()
const pieChart = shallowRef<echarts.ECharts>()

const moduleOptions = ref<string[]>([])
const dateRange = ref<string[]>([])
const query = ref({ module: '', groupBy: 'day' as string })
const statsData = ref<UsageStatItemVO[]>([])
const costData = ref<UsageCostItemVO[]>([])

async function loadModules() {
  try {
    const res = (await aiConfigApi.getAllConfigs()) as unknown as { data: AiConfigVO[] }
    moduleOptions.value = res.data.map((c) => c.module)
  } catch {
    /* handled */
  }
}

async function loadData() {
  const params: Record<string, string> = { groupBy: query.value.groupBy }
  if (query.value.module) params.module = query.value.module
  if (dateRange.value?.length === 2) {
    params.startDate = dateRange.value[0]
    params.endDate = dateRange.value[1]
  }

  try {
    const [statsRes, costRes] = await Promise.all([
      aiConfigApi.getUsageStats(params) as unknown as Promise<{ data: UsageStatItemVO[] }>,
      aiConfigApi.getUsageCost(params) as unknown as Promise<{ data: UsageCostItemVO[] }>,
    ])
    statsData.value = statsRes.data
    costData.value = costRes.data
    await nextTick()
    renderTrendChart()
    renderPieChart()
  } catch {
    /* handled */
  }
}

function renderTrendChart() {
  if (!trendChartRef.value) return
  if (!trendChart.value) {
    trendChart.value = echarts.init(trendChartRef.value)
  }

  const dates = [...new Set(statsData.value.map((s) => s.date))].sort()
  const modules = [...new Set(statsData.value.map((s) => s.module))]

  const series = modules.map((mod) => ({
    name: mod,
    type: 'line' as const,
    smooth: true,
    data: dates.map((d) => {
      const item = statsData.value.find((s) => s.date === d && s.module === mod)
      return item ? Number(item.totalTokens) : 0
    }),
  }))

  trendChart.value.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: modules },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', name: 'Tokens' },
    series,
  })
}

function renderPieChart() {
  if (!pieChartRef.value) return
  if (!pieChart.value) {
    pieChart.value = echarts.init(pieChartRef.value)
  }

  const data = costData.value.map((c) => ({
    name: c.module,
    value: Number(c.totalTokens),
  }))

  pieChart.value.setOption({
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data,
        label: { formatter: '{b}: {d}%' },
      },
    ],
  })
}

watch(
  () => [trendChartRef.value, pieChartRef.value],
  () => {
    if (statsData.value.length) {
      renderTrendChart()
      renderPieChart()
    }
  },
)

onMounted(async () => {
  await loadModules()
  await loadData()
})
</script>

<style scoped>
.ai-usage-page {
  padding: 20px;
}
.filter-card {
  margin-bottom: 0;
}
</style>
