<template>
  <div class="page-container">
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>今日</template>
          <div class="kpi-grid">
            <el-statistic title="通话数" :value="todayStats.totalCalls" />
            <el-statistic title="接通数" :value="todayStats.connectedCalls" />
            <el-statistic title="接通率" :value="todayStats.connectRate" suffix="%" />
            <el-statistic title="均时长(秒)" :value="todayStats.avgDuration" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>昨日</template>
          <div class="kpi-grid">
            <el-statistic title="通话数" :value="yesterdayStats.totalCalls" />
            <el-statistic title="接通数" :value="yesterdayStats.connectedCalls" />
            <el-statistic title="接通率" :value="yesterdayStats.connectRate" suffix="%" />
            <el-statistic title="均时长(秒)" :value="yesterdayStats.avgDuration" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>上周同日</template>
          <div class="kpi-grid">
            <el-statistic title="通话数" :value="lastWeekStats.totalCalls" />
            <el-statistic title="接通数" :value="lastWeekStats.connectedCalls" />
            <el-statistic title="接通率" :value="lastWeekStats.connectRate" suffix="%" />
            <el-statistic title="均时长(秒)" :value="lastWeekStats.avgDuration" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" style="margin-top: 16px">
      <template #header>日环比 / 周同比</template>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="通话量日环比">
          <CompareTag :current="todayStats.totalCalls" :previous="yesterdayStats.totalCalls" />
        </el-descriptions-item>
        <el-descriptions-item label="接通率日环比">
          <CompareTag
            :current="todayStats.connectRate"
            :previous="yesterdayStats.connectRate"
            suffix="%"
          />
        </el-descriptions-item>
        <el-descriptions-item label="通话量周同比">
          <CompareTag :current="todayStats.totalCalls" :previous="lastWeekStats.totalCalls" />
        </el-descriptions-item>
        <el-descriptions-item label="接通率周同比">
          <CompareTag
            :current="todayStats.connectRate"
            :previous="lastWeekStats.connectRate"
            suffix="%"
          />
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, defineComponent, h } from 'vue'
import { getCallDailyAnalysis } from '@/api/report'
import type { ReportFilter } from '@/api/report'

const props = defineProps<{ filter: ReportFilter }>()

interface DayStats {
  totalCalls: number
  connectedCalls: number
  connectRate: number
  avgDuration: number
}

const emptyStats: DayStats = { totalCalls: 0, connectedCalls: 0, connectRate: 0, avgDuration: 0 }
const todayStats = ref<DayStats>({ ...emptyStats })
const yesterdayStats = ref<DayStats>({ ...emptyStats })
const lastWeekStats = ref<DayStats>({ ...emptyStats })

function parseStats(raw: Record<string, unknown> | null): DayStats {
  if (!raw) return { ...emptyStats }
  return {
    totalCalls: Number(raw['totalCalls'] ?? 0),
    connectedCalls: Number(raw['connectedCalls'] ?? 0),
    connectRate: Number(raw['connectRate'] ?? 0),
    avgDuration: Math.round(Number(raw['avgDuration'] ?? 0)),
  }
}

async function loadData() {
  try {
    const res = await getCallDailyAnalysis(props.filter)
    const data = (res as unknown as { data: Record<string, unknown> }).data ?? res
    const d = data as Record<string, Record<string, unknown>>
    todayStats.value = parseStats(d['today'] ?? null)
    yesterdayStats.value = parseStats(d['yesterday'] ?? null)
    lastWeekStats.value = parseStats(d['lastWeekSameDay'] ?? null)
  } catch {
    // handled
  }
}

onMounted(loadData)
watch(() => props.filter, loadData, { deep: true })

// Compare tag component
const CompareTag = defineComponent({
  props: {
    current: { type: Number, required: true },
    previous: { type: Number, required: true },
    suffix: { type: String, default: '' },
  },
  setup(p) {
    return () => {
      const diff = p.current - p.previous
      const pct = p.previous > 0 ? Math.round((diff / p.previous) * 100) : 0
      const color = diff > 0 ? '#67c23a' : diff < 0 ? '#f56c6c' : '#909399'
      const arrow = diff > 0 ? '+' : ''
      return h('span', { style: { color, fontWeight: 600 } }, `${arrow}${pct}%`)
    }
  },
})
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
}

.kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
