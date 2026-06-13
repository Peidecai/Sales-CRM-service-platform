<template>
  <div class="page-container">
    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>时段分布</template>
          <div ref="hourlyRef" style="height: 350px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>时长分布</template>
          <div ref="durationRef" style="height: 350px" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { getCallDetailAnalysis } from '@/api/report'
import type { ReportFilter } from '@/api/report'

const props = defineProps<{ filter: ReportFilter }>()

const hourlyRef = ref<HTMLElement>()
const durationRef = ref<HTMLElement>()
let hourlyChart: echarts.ECharts | null = null
let durationChart: echarts.ECharts | null = null

async function loadData() {
  try {
    const res = await getCallDetailAnalysis(props.filter)
    const data = ((res as unknown as { data: Record<string, unknown> }).data ?? res) as {
      hourlyDistribution: Array<{ hour: number; count: number }>
      durationDistribution: Array<{ durationRange: string; count: number }>
    }

    if (hourlyChart) {
      const hours = Array.from({ length: 24 }, (_, i) => `${i}时`)
      const counts = Array.from({ length: 24 }, () => 0)
      for (const item of data.hourlyDistribution ?? []) {
        counts[Number(item.hour)] = Number(item.count)
      }
      hourlyChart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: hours },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: counts, itemStyle: { color: '#409eff' } }],
      })
    }

    if (durationChart) {
      const dist = data.durationDistribution ?? []
      durationChart.setOption({
        tooltip: { trigger: 'item' },
        series: [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            data: dist.map((d) => ({ name: d.durationRange, value: Number(d.count) })),
          },
        ],
      })
    }
  } catch {
    // handled
  }
}

onMounted(() => {
  if (hourlyRef.value) hourlyChart = echarts.init(hourlyRef.value)
  if (durationRef.value) durationChart = echarts.init(durationRef.value)
  loadData()
})

onUnmounted(() => {
  hourlyChart?.dispose()
  durationChart?.dispose()
})

watch(() => props.filter, loadData, { deep: true })
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
}
</style>
