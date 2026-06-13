<template>
  <div class="page-container">
    <el-row :gutter="16" class="summary-cards">
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="总通话数" :value="summary.totalCalls" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="接通数" :value="summary.connectedCalls" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="接通率" :value="summary.connectRate" suffix="%" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="平均时长(秒)" :value="summary.avgDuration" />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="chart-card">
      <template #header>通话趋势</template>
      <div ref="chartRef" style="height: 400px" />
    </el-card>

    <el-card shadow="never" class="chart-card">
      <template #header>数据明细</template>
      <el-table :data="tableData" stripe border>
        <el-table-column prop="period" label="日期" sortable />
        <el-table-column prop="totalCalls" label="总通话" sortable />
        <el-table-column prop="connectedCalls" label="接通数" sortable />
        <el-table-column prop="connectRate" label="接通率(%)" sortable />
        <el-table-column prop="avgDuration" label="平均时长(秒)" sortable />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { getCallStatistics } from '@/api/report'
import type { ReportFilter } from '@/api/report'

const props = defineProps<{ filter: ReportFilter }>()

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

interface StatRow {
  period: string
  totalCalls: number
  connectedCalls: number
  avgDuration: number
  connectRate: number
}

const tableData = ref<StatRow[]>([])
const summary = ref({ totalCalls: 0, connectedCalls: 0, avgDuration: 0, connectRate: 0 })

async function loadData() {
  try {
    const res = await getCallStatistics(props.filter)
    const data = ((res as unknown as { data: StatRow[] }).data ?? res) as StatRow[]
    tableData.value = data.map((r: StatRow) => ({
      ...r,
      totalCalls: Number(r.totalCalls),
      connectedCalls: Number(r.connectedCalls),
      avgDuration: Math.round(Number(r.avgDuration ?? 0)),
      connectRate: Number(r.connectRate ?? 0),
    }))

    // Summary
    const totals = tableData.value.reduce(
      (acc, row) => ({
        totalCalls: acc.totalCalls + row.totalCalls,
        connectedCalls: acc.connectedCalls + row.connectedCalls,
        totalDuration: acc.totalDuration + row.avgDuration * row.connectedCalls,
        connectedTotal: acc.connectedTotal + row.connectedCalls,
      }),
      { totalCalls: 0, connectedCalls: 0, totalDuration: 0, connectedTotal: 0 },
    )

    summary.value = {
      totalCalls: totals.totalCalls,
      connectedCalls: totals.connectedCalls,
      avgDuration:
        totals.connectedTotal > 0 ? Math.round(totals.totalDuration / totals.connectedTotal) : 0,
      connectRate:
        totals.totalCalls > 0
          ? Math.round((totals.connectedCalls / totals.totalCalls) * 10000) / 100
          : 0,
    }

    updateChart()
  } catch {
    // Error handled by request interceptor
  }
}

function updateChart() {
  if (!chart) return
  const periods = tableData.value.map((r) => r.period)

  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['通话量', '接通量', '接通率'] },
    xAxis: { type: 'category', data: periods },
    yAxis: [
      { type: 'value', name: '数量' },
      { type: 'value', name: '接通率(%)', max: 100 },
    ],
    series: [
      {
        name: '通话量',
        type: 'bar',
        data: tableData.value.map((r) => r.totalCalls),
      },
      {
        name: '接通量',
        type: 'bar',
        data: tableData.value.map((r) => r.connectedCalls),
      },
      {
        name: '接通率',
        type: 'line',
        yAxisIndex: 1,
        data: tableData.value.map((r) => r.connectRate),
      },
    ],
  })
}

onMounted(() => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value)
  }
  loadData()
})

onUnmounted(() => {
  chart?.dispose()
})

watch(() => props.filter, loadData, { deep: true })
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-cards {
  margin-bottom: 0;
}

.chart-card {
  margin-bottom: 0;
}
</style>
