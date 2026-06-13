<template>
  <div class="deal-analysis-tab">
    <el-skeleton v-if="loading" :rows="4" animated />
    <template v-else-if="dealData && dealData.analyses.length > 0">
      <!-- Summary Stats -->
      <el-row :gutter="16" style="margin-bottom: 16px">
        <el-col :span="8">
          <el-statistic title="分析次数" :value="dealData.summary.total" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="平均话术评分" :value="dealData.summary.avgSpeechScore ?? 0" />
        </el-col>
        <el-col :span="8">
          <el-statistic
            title="平均置信度"
            :value="
              dealData.summary.avgConfidence != null
                ? Math.round(dealData.summary.avgConfidence * 100)
                : 0
            "
          />
        </el-col>
      </el-row>

      <!-- Intent Trend Chart -->
      <el-card shadow="never" style="margin-bottom: 16px">
        <template #header>意向变化趋势</template>
        <div ref="chartRef" style="height: 250px" />
      </el-card>

      <!-- Analysis List -->
      <el-table :data="dealData.analyses" stripe size="small" style="width: 100%">
        <el-table-column label="日期" width="110">
          <template #default="{ row }">
            {{ row.createdAt?.slice(0, 10) }}
          </template>
        </el-table-column>
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.customerClassify" size="small">{{ row.customerClassify }}</el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="摘要" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.summary ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="评分" width="80" align="center">
          <template #default="{ row }">{{ row.speechScore ?? '—' }}</template>
        </el-table-column>
      </el-table>
    </template>
    <el-empty v-else description="暂无谈单分析数据" :image-size="60" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { callAnalysisApi, type DealAnalysisVO } from '@/api/ai-analysis'

const props = defineProps<{ opportunityId: number }>()

const loading = ref(false)
const dealData = ref<DealAnalysisVO | null>(null)
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const classifyMap: Record<string, number> = {
  高意向: 4,
  中意向: 3,
  低意向: 2,
  无意向: 1,
}

async function loadData() {
  loading.value = true
  try {
    const res = await callAnalysisApi.getDealAnalysis(props.opportunityId)
    if (res?.data) {
      dealData.value = res.data
      await nextTick()
      renderChart()
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('加载成交分析失败')
  } finally {
    loading.value = false
  }
}

function renderChart() {
  if (!chartRef.value || !dealData.value?.intentTrend.length) return
  if (!chart) chart = echarts.init(chartRef.value)

  const trend = dealData.value.intentTrend
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: trend.map((t) => t.date) },
    yAxis: [
      {
        type: 'value',
        name: '意向等级',
        min: 0,
        max: 5,
        axisLabel: {
          formatter: (v: number) => ['', '无意向', '低意向', '中意向', '高意向', ''][v] ?? '',
        },
      },
      { type: 'value', name: '置信度', min: 0, max: 1 },
    ],
    series: [
      {
        name: '意向等级',
        type: 'line',
        data: trend.map((t) => classifyMap[t.classify ?? ''] ?? 0),
        smooth: true,
        areaStyle: { opacity: 0.2 },
      },
      {
        name: '置信度',
        type: 'line',
        yAxisIndex: 1,
        data: trend.map((t) => t.confidence),
        smooth: true,
        lineStyle: { type: 'dashed' },
      },
    ],
  })
}

const handleResize = () => chart?.resize()

onMounted(() => {
  window.addEventListener('resize', handleResize)
  loadData()
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.deal-analysis-tab {
  padding: 8px 0;
}
</style>
