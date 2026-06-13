<template>
  <div class="page-container">
    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>销售漏斗</template>
          <div ref="funnelRef" style="height: 400px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>阶段转化率</template>
          <el-table :data="conversionData" stripe border>
            <el-table-column prop="from" label="从" />
            <el-table-column prop="to" label="到" />
            <el-table-column prop="rate" label="转化率(%)">
              <template #default="{ row }">
                <el-progress
                  :percentage="Math.min(row.rate, 100)"
                  :color="row.rate >= 50 ? '#67c23a' : '#e6a23c'"
                />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top: 16px">
      <template #header>漏斗数据</template>
      <el-descriptions :column="4" border>
        <el-descriptions-item v-for="stage in funnelStages" :key="stage.name" :label="stage.name">
          {{ stage.count }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" style="margin-top: 16px">
      <template #header>活动趋势</template>
      <div ref="visitRef" style="height: 350px" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { getSalesFunnel, getStageConversion, getVisitStatistics } from '@/api/report'
import type { ReportFilter } from '@/api/report'

const props = defineProps<{ filter: ReportFilter }>()

const funnelRef = ref<HTMLElement>()
const visitRef = ref<HTMLElement>()
let funnelChart: echarts.ECharts | null = null
let visitChart: echarts.ECharts | null = null

const funnelStages = ref<Array<{ name: string; count: number }>>([])
const conversionData = ref<Array<{ from: string; to: string; rate: number }>>([])

async function loadData() {
  try {
    // Funnel
    const funnelRes = await getSalesFunnel(props.filter)
    const funnelData = ((funnelRes as unknown as { data: Record<string, unknown> }).data ??
      funnelRes) as {
      stages: Array<{ name: string; count: number }>
      conversionRates: Record<string, number>
    }
    funnelStages.value = funnelData.stages ?? []

    if (funnelChart) {
      funnelChart.setOption({
        tooltip: { trigger: 'item' },
        series: [
          {
            type: 'funnel',
            left: '10%',
            width: '80%',
            sort: 'descending',
            data: funnelStages.value.map((s) => ({ name: s.name, value: s.count })),
            label: { formatter: '{b}: {c}' },
          },
        ],
      })
    }

    // Stage conversion
    const stageRes = await getStageConversion(props.filter)
    const stageData = ((stageRes as unknown as { data: Record<string, unknown> }).data ??
      stageRes) as {
      conversions: Array<{ from: string; to: string; rate: number }>
    }
    conversionData.value = stageData.conversions ?? []

    // Visits
    const visitRes = await getVisitStatistics(props.filter)
    const visits = ((visitRes as unknown as { data: Array<{ period: string; count: number }> })
      .data ?? visitRes) as Array<{
      period: string
      count: number
    }>

    if (visitChart) {
      visitChart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: visits.map((v) => v.period) },
        yAxis: { type: 'value' },
        series: [
          {
            name: '活动数',
            type: 'line',
            data: visits.map((v) => Number(v.count)),
            smooth: true,
            areaStyle: {},
          },
        ],
      })
    }
  } catch {
    // handled
  }
}

onMounted(() => {
  if (funnelRef.value) funnelChart = echarts.init(funnelRef.value)
  if (visitRef.value) visitChart = echarts.init(visitRef.value)
  loadData()
})

onUnmounted(() => {
  funnelChart?.dispose()
  visitChart?.dispose()
})

watch(() => props.filter, loadData, { deep: true })
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
}
</style>
