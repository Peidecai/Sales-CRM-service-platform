<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>话术能力雷达图</template>
      <div ref="radarRef" style="height: 450px" />
    </el-card>

    <el-card shadow="never" style="margin-top: 16px">
      <template #header>员工话术评分</template>
      <el-table :data="tableData" stripe border>
        <el-table-column prop="userName" label="姓名" width="120" />
        <el-table-column prop="totalCalls" label="AI分析通话数" sortable />
        <el-table-column label="开场白">
          <template #default="{ row }"> {{ row.dimensions?.opening ?? '-' }} </template>
        </el-table-column>
        <el-table-column label="需求挖掘">
          <template #default="{ row }"> {{ row.dimensions?.needsDiscovery ?? '-' }} </template>
        </el-table-column>
        <el-table-column label="产品介绍">
          <template #default="{ row }"> {{ row.dimensions?.productPresentation ?? '-' }} </template>
        </el-table-column>
        <el-table-column label="异议处理">
          <template #default="{ row }"> {{ row.dimensions?.objectionHandling ?? '-' }} </template>
        </el-table-column>
        <el-table-column label="促成交易">
          <template #default="{ row }"> {{ row.dimensions?.closing ?? '-' }} </template>
        </el-table-column>
        <el-table-column label="跟进">
          <template #default="{ row }"> {{ row.dimensions?.followUp ?? '-' }} </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { getAiSpeechSkill } from '@/api/report'
import type { ReportFilter } from '@/api/report'

interface SpeechRow {
  userId: number
  userName: string
  totalCalls: number
  dimensions: {
    opening: number
    needsDiscovery: number
    productPresentation: number
    objectionHandling: number
    closing: number
    followUp: number
  }
}

const props = defineProps<{ filter: ReportFilter }>()

const radarRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
const tableData = ref<SpeechRow[]>([])

const indicators = [
  { name: '开场白', max: 100 },
  { name: '需求挖掘', max: 100 },
  { name: '产品介绍', max: 100 },
  { name: '异议处理', max: 100 },
  { name: '促成交易', max: 100 },
  { name: '跟进', max: 100 },
]

async function loadData() {
  try {
    const res = await getAiSpeechSkill(props.filter)
    const data = ((res as unknown as { data: SpeechRow[] }).data ?? res) as SpeechRow[]
    tableData.value = data

    if (chart && data.length > 0) {
      // Show first 5 users on radar
      const series = data.slice(0, 5).map((row) => ({
        value: [
          row.dimensions.opening,
          row.dimensions.needsDiscovery,
          row.dimensions.productPresentation,
          row.dimensions.objectionHandling,
          row.dimensions.closing,
          row.dimensions.followUp,
        ],
        name: row.userName,
      }))

      chart.setOption({
        tooltip: {},
        legend: { data: series.map((s) => s.name), bottom: 0 },
        radar: { indicator: indicators },
        series: [{ type: 'radar', data: series }],
      })
    }
  } catch {
    // handled
  }
}

onMounted(() => {
  if (radarRef.value) chart = echarts.init(radarRef.value)
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
}
</style>
