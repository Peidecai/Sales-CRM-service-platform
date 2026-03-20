<template>
  <div class="page-container" style="padding: 20px">
    <el-card v-loading="loading">
      <template #header>
        <span>考试统计</span>
      </template>

      <!-- Summary cards -->
      <el-row :gutter="16" style="margin-bottom: 24px">
        <el-col :span="6">
          <el-statistic title="考试人次" :value="stats.totalCount" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="通过率" :value="stats.passRate" suffix="%" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="平均分" :value="stats.avgScore" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="错题数" :value="stats.topWrongQuestions.length" />
        </el-col>
      </el-row>

      <!-- Score distribution chart -->
      <div ref="chartRef" style="height: 350px; margin-bottom: 24px" />

      <!-- Top wrong questions -->
      <h3 style="margin-bottom: 12px">易错题排行</h3>
      <el-table :data="stats.topWrongQuestions" border>
        <el-table-column prop="questionId" label="题目ID" width="100" />
        <el-table-column prop="wrongCount" label="错误次数" width="120" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getExamStatistics, type ExamStatistics } from '@/api/exam'

const loading = ref(false)
const chartRef = ref<HTMLElement>()
const stats = ref<ExamStatistics>({
  totalCount: 0,
  passRate: 0,
  avgScore: 0,
  scoreDistribution: {},
  topWrongQuestions: [],
})

async function loadStats() {
  loading.value = true
  try {
    const res = (await getExamStatistics()) as unknown as ExamStatistics
    stats.value = res
    await nextTick()
    renderChart()
  } finally {
    loading.value = false
  }
}

function renderChart() {
  if (!chartRef.value) return
  const chart = echarts.init(chartRef.value)
  const dist = stats.value.scoreDistribution
  const categories = Object.keys(dist)
  const values = Object.values(dist)

  chart.setOption({
    title: { text: '分数分布', left: 'center' },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value', name: '人数' },
    series: [
      {
        type: 'bar',
        data: values,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#409eff' },
            { offset: 1, color: '#79bbff' },
          ]),
        },
      },
    ],
    tooltip: { trigger: 'axis' },
  })
}

onMounted(() => {
  loadStats()
})
</script>
