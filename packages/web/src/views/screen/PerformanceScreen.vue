<template>
  <div class="screen-container" @keydown.esc="exitScreen">
    <div class="screen-header">
      <h1 class="screen-title">业绩数据大屏</h1>
      <span class="screen-time">{{ currentTime }}</span>
      <el-button class="exit-btn" text @click="exitScreen">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <div class="screen-grid">
      <div class="panel panel-revenue">
        <div class="panel-title">总营收</div>
        <div class="big-number">¥{{ formatNum(data.totalRevenue) }}</div>
        <div class="sub-text">合同总数: {{ data.totalContracts }}</div>
      </div>

      <div class="panel panel-trend">
        <div class="panel-title">签约趋势</div>
        <div ref="trendRef" class="chart-area" />
      </div>

      <div class="panel panel-top10">
        <div class="panel-title">TOP 10 排行</div>
        <div ref="rankRef" class="chart-area" />
      </div>

      <div class="panel panel-recent">
        <div class="panel-title">最新签约</div>
        <div class="scroll-list">
          <div v-for="item in data.recentSignings" :key="item.id" class="scroll-item">
            <span class="item-title">{{ item.title }}</span>
            <span class="item-amount">¥{{ formatNum(item.totalAmount) }}</span>
          </div>
        </div>
      </div>

      <div class="panel panel-target">
        <div class="panel-title">目标进度</div>
        <div class="target-list">
          <div v-for="t in data.targetProgress" :key="t.name" class="target-item">
            <span class="target-name">{{ t.name }}</span>
            <div class="target-bar">
              <div
                class="target-fill"
                :style="{ width: Math.min(Number(t.progress), 100) + '%' }"
              />
            </div>
            <span class="target-pct">{{ t.progress }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { Close } from '@element-plus/icons-vue'
import { getPerformanceScreen } from '@/api/report'

const router = useRouter()

const trendRef = ref<HTMLElement>()
const rankRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let rankChart: echarts.ECharts | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null

const currentTime = ref(new Date().toLocaleString('zh-CN'))

interface ScreenData {
  totalRevenue: number
  totalContracts: number
  trendLine: Array<{ period: string; amount: number }>
  top10Ranking: Array<{ userName: string; amount: number }>
  recentSignings: Array<{ id: number; title: string; totalAmount: number }>
  targetProgress: Array<{ name: string; progress: number }>
}

const data = ref<ScreenData>({
  totalRevenue: 0,
  totalContracts: 0,
  trendLine: [],
  top10Ranking: [],
  recentSignings: [],
  targetProgress: [],
})

function formatNum(n: number): string {
  return Number(n).toLocaleString()
}

function exitScreen() {
  router.back()
}

async function loadData() {
  try {
    const res = await getPerformanceScreen()
    data.value = ((res as unknown as { data: ScreenData }).data ?? res) as ScreenData
    updateCharts()
  } catch {
    // handled
  }
}

function updateCharts() {
  if (trendChart) {
    const trends = data.value.trendLine
    trendChart.setOption({
      backgroundColor: 'transparent',
      textStyle: { color: '#ccc' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: trends.map((t) => t.period),
        axisLine: { lineStyle: { color: '#555' } },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#555' } },
        splitLine: { lineStyle: { color: '#222' } },
      },
      series: [
        {
          type: 'line',
          data: trends.map((t) => Number(t.amount)),
          smooth: true,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(64, 158, 255, 0.4)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.05)' },
            ]),
          },
          lineStyle: { color: '#409eff' },
          itemStyle: { color: '#409eff' },
        },
      ],
    })
  }

  if (rankChart) {
    const top = data.value.top10Ranking
    rankChart.setOption({
      backgroundColor: 'transparent',
      textStyle: { color: '#ccc' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#555' } },
        splitLine: { lineStyle: { color: '#222' } },
      },
      yAxis: {
        type: 'category',
        data: top.map((t) => t.userName).reverse(),
        axisLine: { lineStyle: { color: '#555' } },
      },
      series: [
        {
          type: 'bar',
          data: top.map((t) => Number(t.amount)).reverse(),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#409eff' },
              { offset: 1, color: '#67c23a' },
            ]),
          },
        },
      ],
    })
  }
}

onMounted(() => {
  if (trendRef.value) trendChart = echarts.init(trendRef.value)
  if (rankRef.value) rankChart = echarts.init(rankRef.value)
  loadData()

  refreshTimer = setInterval(() => {
    currentTime.value = new Date().toLocaleString('zh-CN')
    loadData()
  }, 300000) // 5min

  document.addEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') exitScreen()
}

onUnmounted(() => {
  trendChart?.dispose()
  rankChart?.dispose()
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
  background: linear-gradient(90deg, #409eff, #67c23a);
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
  grid-template-columns: 1fr 2fr 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 16px;
  height: calc(100vh - 100px);
}

.panel {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 14px;
  color: #999;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.panel-revenue {
  grid-column: 1;
  grid-row: 1;
}

.big-number {
  font-size: 36px;
  font-weight: 700;
  color: #409eff;
}

.sub-text {
  font-size: 14px;
  color: #888;
  margin-top: 8px;
}

.panel-trend {
  grid-column: 2;
  grid-row: 1 / 3;
}

.panel-top10 {
  grid-column: 3;
  grid-row: 1 / 3;
}

.panel-recent {
  grid-column: 1;
  grid-row: 2 / 4;
}

.panel-target {
  grid-column: 2 / 4;
  grid-row: 3;
}

.chart-area {
  flex: 1;
  min-height: 200px;
}

.scroll-list {
  flex: 1;
  overflow-y: auto;
}

.scroll-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 13px;
}

.item-title {
  color: #ccc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.item-amount {
  color: #67c23a;
  font-weight: 600;
}

.target-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.target-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.target-name {
  width: 120px;
  font-size: 13px;
  color: #ccc;
}

.target-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.target-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.target-pct {
  width: 50px;
  text-align: right;
  font-size: 13px;
  color: #409eff;
}
</style>
