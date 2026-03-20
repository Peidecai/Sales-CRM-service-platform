<template>
  <div class="page-container">
    <el-card shadow="never" class="filter-card">
      <el-select
        v-model="selectedUserId"
        placeholder="选择员工"
        clearable
        style="width: 200px"
        @change="loadData"
      >
        <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
      </el-select>
    </el-card>

    <el-row v-if="portrait" :gutter="16" style="margin-top: 16px">
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="总通话" :value="portraitMetrics.totalCalls" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="接通数" :value="portraitMetrics.connectedCalls" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="均时长(秒)" :value="portraitMetrics.avgDuration" />
        </el-card>
      </el-col>
    </el-row>

    <el-card v-if="portrait" shadow="never" style="margin-top: 16px">
      <template #header>成长曲线</template>
      <div ref="growthRef" style="height: 350px" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { getAiEmployeePortrait } from '@/api/report'
import type { ReportFilter } from '@/api/report'
import request from '@/api/request'

const props = defineProps<{ filter: ReportFilter }>()

const growthRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
const selectedUserId = ref<number | undefined>()
const users = ref<Array<{ id: number; name: string }>>([])
const portrait = ref<Record<string, unknown> | null>(null)

const portraitMetrics = computed(() => {
  const m = (portrait.value?.['metrics'] ?? {}) as Record<string, unknown>
  return {
    totalCalls: Number(m['totalCalls'] ?? 0),
    connectedCalls: Number(m['connectedCalls'] ?? 0),
    avgDuration: Math.round(Number(m['avgDuration'] ?? 0)),
  }
})

async function loadUsers() {
  try {
    const res = await request.get('/users', { params: { page: 1, pageSize: 200 } })
    const data = (res as unknown as { data: { list: Array<{ id: number; name: string }> } }).data
    users.value = data?.list ?? []
  } catch {
    // handled
  }
}

async function loadData() {
  const uid = selectedUserId.value
  if (!uid) return
  try {
    const res = await getAiEmployeePortrait(uid, props.filter)
    portrait.value = ((res as unknown as { data: Record<string, unknown> }).data ?? res) as Record<
      string,
      unknown
    >

    const growth = (portrait.value['growthCurve'] ?? []) as Array<{
      period: string
      callCount: number
      connectRate: number
    }>

    if (chart) {
      chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['通话量', '接通率'] },
        xAxis: { type: 'category', data: growth.map((g) => g.period) },
        yAxis: [
          { type: 'value', name: '通话量' },
          { type: 'value', name: '接通率(%)', max: 100 },
        ],
        series: [
          { name: '通话量', type: 'bar', data: growth.map((g) => Number(g.callCount)) },
          {
            name: '接通率',
            type: 'line',
            yAxisIndex: 1,
            data: growth.map((g) => Number(g.connectRate)),
            smooth: true,
          },
        ],
      })
    }
  } catch {
    // handled
  }
}

onMounted(() => {
  if (growthRef.value) chart = echarts.init(growthRef.value)
  loadUsers()
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
