<template>
  <div class="page-container">
    <el-row :gutter="16">
      <el-col :span="14">
        <el-card shadow="never">
          <template #header>评分排行</template>
          <el-table :data="ranking" stripe border>
            <el-table-column type="index" label="排名" width="60" />
            <el-table-column prop="userName" label="姓名" width="120" />
            <el-table-column prop="totalCalls" label="通话数" sortable />
            <el-table-column prop="score" label="评分" sortable />
            <el-table-column prop="avgDuration" label="均时长(秒)" sortable>
              <template #default="{ row }">
                {{ Math.round(Number(row.avgDuration ?? 0)) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card shadow="never">
          <template #header>时长分布</template>
          <div ref="distRef" style="height: 350px" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { getAiScoreRanking } from '@/api/report'
import type { ReportFilter } from '@/api/report'

const props = defineProps<{ filter: ReportFilter }>()

const distRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
const ranking = ref<Array<Record<string, unknown>>>([])

async function loadData() {
  try {
    const res = await getAiScoreRanking(props.filter)
    const d = ((res as unknown as { data: Record<string, unknown> }).data ?? res) as Record<
      string,
      unknown
    >
    ranking.value = (d['ranking'] ?? []) as Array<Record<string, unknown>>

    const dist = (d['distribution'] ?? []) as Array<{ range: string; count: number }>
    if (chart) {
      chart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: dist.map((d) => d.range) },
        yAxis: { type: 'value' },
        series: [
          { type: 'bar', data: dist.map((d) => Number(d.count)), itemStyle: { color: '#e6a23c' } },
        ],
      })
    }
  } catch {
    // handled
  }
}

onMounted(() => {
  if (distRef.value) chart = echarts.init(distRef.value)
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
