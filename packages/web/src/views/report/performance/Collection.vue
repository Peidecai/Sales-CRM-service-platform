<template>
  <div class="page-container">
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="回款率" :value="stats.collectionRate" suffix="%" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="逾期率" :value="stats.overdueRate" suffix="%" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="个人回款人数" :value="stats.perUserCount" />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top: 16px">
      <template #header>回款趋势</template>
      <div ref="chartRef" style="height: 350px" />
    </el-card>

    <el-card shadow="never" style="margin-top: 16px">
      <template #header>个人回款排行</template>
      <el-table :data="perUser" stripe border>
        <el-table-column prop="userName" label="姓名" />
        <el-table-column prop="collectedAmount" label="回款金额" sortable>
          <template #default="{ row }">
            ¥{{ Number(row.collectedAmount).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="count" label="笔数" sortable />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { getPerformanceCollection } from '@/api/report'
import type { ReportFilter } from '@/api/report'

const props = defineProps<{ filter: ReportFilter }>()

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const stats = ref({ collectionRate: 0, overdueRate: 0, perUserCount: 0 })
const perUser = ref<Array<Record<string, unknown>>>([])

async function loadData() {
  try {
    const res = await getPerformanceCollection(props.filter)
    const d = ((res as unknown as { data: Record<string, unknown> }).data ?? res) as Record<
      string,
      unknown
    >

    stats.value = {
      collectionRate: Number(d['collectionRate'] ?? 0),
      overdueRate: Number(d['overdueRate'] ?? 0),
      perUserCount: ((d['perUser'] ?? []) as unknown[]).length,
    }
    perUser.value = (d['perUser'] ?? []) as Array<Record<string, unknown>>

    const trends = (d['trends'] ?? []) as Array<{ period: string; amount: number }>
    if (chart) {
      chart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: trends.map((t) => t.period) },
        yAxis: { type: 'value', name: '金额' },
        series: [
          {
            name: '回款金额',
            type: 'bar',
            data: trends.map((t) => Number(t.amount)),
            itemStyle: { color: '#67c23a' },
          },
        ],
      })
    }
  } catch {
    // handled
  }
}

onMounted(() => {
  if (chartRef.value) chart = echarts.init(chartRef.value)
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
