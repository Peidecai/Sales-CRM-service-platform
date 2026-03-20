<template>
  <div class="page-container">
    <el-row :gutter="16">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>签约趋势</template>
          <div ref="trendRef" style="height: 350px" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>转化率</template>
          <div class="conversion-info">
            <el-statistic title="商机总数" :value="data.totalOpportunities" />
            <el-statistic title="已转化" :value="data.convertedCount" />
            <el-statistic title="转化率" :value="data.conversionRate" suffix="%" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top: 16px">
      <template #header>签约排行</template>
      <div ref="rankRef" style="height: 350px" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { getPerformanceSigning } from '@/api/report'
import type { ReportFilter } from '@/api/report'

const props = defineProps<{ filter: ReportFilter }>()

const trendRef = ref<HTMLElement>()
const rankRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let rankChart: echarts.ECharts | null = null

const data = ref({ totalOpportunities: 0, convertedCount: 0, conversionRate: 0 })

async function loadData() {
  try {
    const res = await getPerformanceSigning(props.filter)
    const d = ((res as unknown as { data: Record<string, unknown> }).data ?? res) as Record<
      string,
      unknown
    >

    data.value = {
      totalOpportunities: Number(d['totalOpportunities'] ?? 0),
      convertedCount: Number(d['convertedCount'] ?? 0),
      conversionRate: Number(d['conversionRate'] ?? 0),
    }

    const trends = (d['trends'] ?? []) as Array<{ period: string; amount: number; count: number }>
    const topSigners = (d['topSigners'] ?? []) as Array<{ userName: string; amount: number }>

    if (trendChart) {
      trendChart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: trends.map((t) => t.period) },
        yAxis: { type: 'value', name: '金额' },
        series: [
          {
            name: '签约金额',
            type: 'line',
            data: trends.map((t) => Number(t.amount)),
            smooth: true,
            areaStyle: {},
          },
        ],
      })
    }

    if (rankChart) {
      const names = topSigners.map((s) => s.userName).reverse()
      const amounts = topSigners.map((s) => Number(s.amount)).reverse()
      rankChart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: names },
        series: [{ type: 'bar', data: amounts, itemStyle: { color: '#409eff' } }],
      })
    }
  } catch {
    // handled
  }
}

onMounted(() => {
  if (trendRef.value) trendChart = echarts.init(trendRef.value)
  if (rankRef.value) rankChart = echarts.init(rankRef.value)
  loadData()
})

onUnmounted(() => {
  trendChart?.dispose()
  rankChart?.dispose()
})

watch(() => props.filter, loadData, { deep: true })
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
}

.conversion-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
