<template>
  <div class="screen-container" @keydown.esc="exitScreen">
    <div class="screen-header">
      <h1 class="screen-title">销售驾驶舱</h1>
      <span class="screen-time">{{ currentTime }}</span>
      <el-button class="exit-btn" text @click="exitScreen">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <div class="screen-grid">
      <!-- Gauges -->
      <div class="panel">
        <div class="panel-title">今日通话</div>
        <div class="gauge-row">
          <div class="gauge-item">
            <div class="gauge-value">{{ data.todayCalls }}</div>
            <div class="gauge-label">通话数</div>
          </div>
          <div class="gauge-item">
            <div class="gauge-value">{{ data.connectRate }}%</div>
            <div class="gauge-label">接通率</div>
          </div>
          <div class="gauge-item">
            <div class="gauge-value">{{ Math.round(data.avgDuration) }}s</div>
            <div class="gauge-label">均时长</div>
          </div>
        </div>
      </div>

      <!-- Funnel -->
      <div class="panel">
        <div class="panel-title">业务漏斗</div>
        <div ref="funnelRef" class="chart-area" />
      </div>

      <!-- Payment Progress -->
      <div class="panel">
        <div class="panel-title">回款进度</div>
        <div class="payment-info">
          <div class="payment-row">
            <span>计划回款</span>
            <span class="payment-val">¥{{ formatNum(data.paymentProgress.totalPlanned) }}</span>
          </div>
          <div class="payment-row">
            <span>已回款</span>
            <span class="payment-val collected"
              >¥{{ formatNum(data.paymentProgress.totalCollected) }}</span
            >
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: paymentPct + '%' }" />
          </div>
          <div class="payment-pct">{{ paymentPct }}%</div>
        </div>
      </div>

      <!-- Team Efficiency -->
      <div class="panel panel-wide">
        <div class="panel-title">团队效率 (今日)</div>
        <div ref="teamRef" class="chart-area" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { Close } from '@element-plus/icons-vue'
import { getCockpitScreen } from '@/api/report'

const router = useRouter()

const funnelRef = ref<HTMLElement>()
const teamRef = ref<HTMLElement>()
let funnelChart: echarts.ECharts | null = null
let teamChart: echarts.ECharts | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null

const currentTime = ref(new Date().toLocaleString('zh-CN'))

interface CockpitData {
  todayCalls: number
  connectRate: number
  avgDuration: number
  funnelData: { customers: number; opportunities: number; contracts: number }
  paymentProgress: { totalPlanned: number; totalCollected: number }
  teamEfficiency: Array<{ userName: string; callCount: number; connected: number }>
}

const data = ref<CockpitData>({
  todayCalls: 0,
  connectRate: 0,
  avgDuration: 0,
  funnelData: { customers: 0, opportunities: 0, contracts: 0 },
  paymentProgress: { totalPlanned: 0, totalCollected: 0 },
  teamEfficiency: [],
})

const paymentPct = computed(() => {
  const planned = data.value.paymentProgress.totalPlanned
  if (planned <= 0) return 0
  return Math.round((data.value.paymentProgress.totalCollected / planned) * 100)
})

function formatNum(n: number): string {
  return Number(n).toLocaleString()
}

function exitScreen() {
  router.back()
}

async function loadData() {
  try {
    const res = await getCockpitScreen()
    data.value = ((res as unknown as { data: CockpitData }).data ?? res) as CockpitData
    updateCharts()
  } catch {
    // handled
  }
}

function updateCharts() {
  if (funnelChart) {
    const fd = data.value.funnelData
    funnelChart.setOption({
      backgroundColor: 'transparent',
      textStyle: { color: '#ccc' },
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'funnel',
          left: '10%',
          width: '80%',
          sort: 'descending',
          data: [
            { name: '客户', value: fd.customers },
            { name: '商机', value: fd.opportunities },
            { name: '合同', value: fd.contracts },
          ],
          label: { formatter: '{b}: {c}', color: '#ccc' },
          itemStyle: { borderColor: 'rgba(255,255,255,0.1)' },
        },
      ],
    })
  }

  if (teamChart) {
    const team = data.value.teamEfficiency
    teamChart.setOption({
      backgroundColor: 'transparent',
      textStyle: { color: '#ccc' },
      tooltip: { trigger: 'axis' },
      legend: { data: ['通话数', '接通数'], textStyle: { color: '#ccc' } },
      xAxis: {
        type: 'category',
        data: team.map((t) => t.userName),
        axisLine: { lineStyle: { color: '#555' } },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#555' } },
        splitLine: { lineStyle: { color: '#222' } },
      },
      series: [
        {
          name: '通话数',
          type: 'bar',
          data: team.map((t) => Number(t.callCount)),
          itemStyle: { color: '#409eff' },
        },
        {
          name: '接通数',
          type: 'bar',
          data: team.map((t) => Number(t.connected)),
          itemStyle: { color: '#67c23a' },
        },
      ],
    })
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') exitScreen()
}

onMounted(() => {
  if (funnelRef.value) funnelChart = echarts.init(funnelRef.value)
  if (teamRef.value) teamChart = echarts.init(teamRef.value)
  loadData()

  refreshTimer = setInterval(() => {
    currentTime.value = new Date().toLocaleString('zh-CN')
    loadData()
  }, 300000)

  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  funnelChart?.dispose()
  teamChart?.dispose()
  if (refreshTimer) clearInterval(refreshTimer)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.screen-container {
  position: fixed;
  inset: 0;
  background: #0a1628;
  color: #e0e0e0;
  z-index: 9999;
  overflow: auto;
  padding: 20px;
}

.screen-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 20px;
  position: relative;
}

.screen-title {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(90deg, #e6a23c, #f56c6c);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.screen-time {
  font-size: 14px;
  color: #888;
}

.exit-btn {
  position: absolute;
  right: 0;
  color: #888;
}

.screen-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  height: calc(100vh - 100px);
  grid-template-rows: 1fr 1fr;
}

.panel {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.panel-wide {
  grid-column: 1 / -1;
}

.panel-title {
  font-size: 14px;
  color: #999;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.chart-area {
  flex: 1;
  min-height: 150px;
}

.gauge-row {
  display: flex;
  justify-content: space-around;
  flex: 1;
  align-items: center;
}

.gauge-item {
  text-align: center;
}

.gauge-value {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
}

.gauge-label {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

.payment-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}

.payment-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.payment-val {
  font-weight: 600;
  color: #e6a23c;
}

.payment-val.collected {
  color: #67c23a;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e6a23c, #67c23a);
  border-radius: 4px;
  transition: width 0.5s;
}

.payment-pct {
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  color: #67c23a;
}
</style>
