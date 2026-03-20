<template>
  <div class="score-trend">
    <div class="chart-row">
      <div ref="lineChartRef" class="chart-box" />
      <div ref="radarChartRef" class="chart-box" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { getScoreHistory, type OpportunityScore } from '@/api/ai-reminder'

const props = defineProps<{
  opportunityId: number
}>()

const lineChartRef = ref<HTMLDivElement>()
const radarChartRef = ref<HTMLDivElement>()
let lineChart: echarts.ECharts | null = null
let radarChart: echarts.ECharts | null = null

const scores = ref<OpportunityScore[]>([])

async function fetchData() {
  try {
    const res = await getScoreHistory({
      opportunityId: props.opportunityId,
      page: 1,
      pageSize: 50,
    })
    scores.value = res.data.list.reverse()
    renderCharts()
  } catch {
    // handled by interceptor
  }
}

function renderCharts() {
  if (!lineChartRef.value || !radarChartRef.value) return

  // Line chart
  if (!lineChart) {
    lineChart = echarts.init(lineChartRef.value)
  }
  const dates = scores.value.map((s) =>
    new Date(s.scoredAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
  )
  const totalScores = scores.value.map((s) => s.score)

  lineChart.setOption({
    title: { text: '评分趋势', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', min: 0, max: 100 },
    series: [
      {
        name: '综合评分',
        type: 'line',
        data: totalScores,
        smooth: true,
        areaStyle: { opacity: 0.15 },
        itemStyle: { color: '#409EFF' },
      },
    ],
    grid: { top: 40, bottom: 30, left: 50, right: 20 },
  })

  // Radar chart — use latest score dimensions
  if (!radarChart) {
    radarChart = echarts.init(radarChartRef.value)
  }
  const latest = scores.value[scores.value.length - 1]
  const dims = latest?.dimensions
  const radarData = dims
    ? [
        dims.customerFit,
        dims.engagementLevel,
        dims.stageProgress,
        dims.sentimentTrend,
        dims.competitorRisk,
      ]
    : [0, 0, 0, 0, 0]

  radarChart.setOption({
    title: { text: '五维评分', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: {},
    radar: {
      indicator: [
        { name: '客户匹配', max: 100 },
        { name: '参与度', max: 100 },
        { name: '阶段进展', max: 100 },
        { name: '情绪趋势', max: 100 },
        { name: '竞品风险', max: 100 },
      ],
      radius: '60%',
    },
    series: [
      {
        type: 'radar',
        data: [{ value: radarData, name: '当前评分' }],
        areaStyle: { opacity: 0.2 },
      },
    ],
  })
}

function handleResize() {
  lineChart?.resize()
  radarChart?.resize()
}

watch(
  () => props.opportunityId,
  () => fetchData(),
)

onMounted(async () => {
  await nextTick()
  fetchData()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  lineChart?.dispose()
  radarChart?.dispose()
})
</script>

<style scoped>
.chart-row {
  display: flex;
  gap: 16px;
}

.chart-box {
  flex: 1;
  height: 280px;
  min-width: 0;
}
</style>
