<template>
  <el-card shadow="never" class="forecast-card">
    <template #header>
      <div class="card-header">
        <span class="card-title">销售预测</span>
        <div class="period-tabs">
          <el-radio-group v-model="periodType" size="small" @change="fetchForecasts">
            <el-radio-button value="1month">1 个月</el-radio-button>
            <el-radio-button value="3month">3 个月</el-radio-button>
            <el-radio-button value="6month">6 个月</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </template>

    <el-skeleton v-if="loading" :rows="4" animated />

    <template v-else-if="forecasts.length > 0">
      <div ref="chartRef" class="chart-container" />
      <div class="forecast-meta">
        <div class="meta-item">
          <span class="meta-label">预测金额</span>
          <span class="meta-value">{{ formatAmount(latestForecast?.forecastAmount ?? 0) }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">置信区间</span>
          <span class="meta-value">
            {{ formatAmount(latestForecast?.confidenceLow ?? 0) }} ~
            {{ formatAmount(latestForecast?.confidenceHigh ?? 0) }}
          </span>
        </div>
        <div class="meta-item">
          <span class="meta-label">更新时间</span>
          <span class="meta-value meta-time">{{
            latestForecast?.updatedAt ? formatDate(latestForecast.updatedAt) : '—'
          }}</span>
        </div>
      </div>
    </template>

    <div v-else class="no-data">
      <el-empty description="暂无预测数据" :image-size="64">
        <el-button type="primary" size="small" :loading="generating" @click="handleGenerate">
          生成预测
        </el-button>
      </el-empty>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, shallowRef, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts/core'
import { BarChart, CustomChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, MarkLineComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import {
  getSalesForecasts,
  generateSalesForecast,
  type SalesForecastVO,
  type ForecastPeriodType,
} from '@/api/ai'
import { formatDate, formatAmount } from '@/utils/format'

echarts.use([
  BarChart,
  CustomChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  CanvasRenderer,
])

const loading = ref(false)
const generating = ref(false)
const forecasts = ref<SalesForecastVO[]>([])
const periodType = ref<ForecastPeriodType>('1month')
const chartRef = ref<HTMLElement>()
const chart = shallowRef<echarts.ECharts>()

const latestForecast = computed(() => forecasts.value[0] ?? null)

async function fetchForecasts() {
  loading.value = true
  try {
    const res = (await getSalesForecasts({ periodType: periodType.value })) as {
      data: SalesForecastVO[]
    }
    forecasts.value = res?.data ?? []
    if (forecasts.value.length > 0) {
      await nextTick()
      renderChart()
    }
  } catch {
    // handled
  } finally {
    loading.value = false
  }
}

async function handleGenerate() {
  generating.value = true
  try {
    await generateSalesForecast({ periodType: periodType.value })
    ElMessage.success('预测任务已提交，请稍后刷新')
    setTimeout(() => fetchForecasts(), 3000)
  } catch {
    // handled
  } finally {
    generating.value = false
  }
}

function renderChart() {
  if (!chartRef.value || forecasts.value.length === 0) return

  if (chart.value) chart.value.dispose()
  chart.value = echarts.init(chartRef.value)

  const data = forecasts.value.slice(0, 6).reverse()
  const periods = data.map((f) => f.periodValue)
  const amounts = data.map((f) => Number(f.forecastAmount))
  const lows = data.map((f) => Number(f.confidenceLow))
  const highs = data.map((f) => Number(f.confidenceHigh))

  chart.value.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ name: string; value: number; seriesName: string }>) => {
        if (!params.length) return ''
        const idx = periods.indexOf(params[0].name)
        return `${params[0].name}<br/>
          预测: ￥${amounts[idx]?.toLocaleString() ?? '—'}<br/>
          区间: ￥${lows[idx]?.toLocaleString() ?? '—'} ~ ￥${highs[idx]?.toLocaleString() ?? '—'}`
      },
    },
    grid: { left: 60, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: periods },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(0)}万` : String(v)),
      },
    },
    series: [
      {
        name: '预测收入',
        type: 'bar',
        data: amounts,
        barWidth: '40%',
        itemStyle: { color: '#409eff', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '置信下限',
        type: 'bar',
        data: lows,
        barWidth: 0,
        itemStyle: { color: 'transparent' },
        emphasis: { itemStyle: { color: 'transparent' } },
      },
      {
        name: '置信上限',
        type: 'bar',
        data: highs,
        barWidth: 0,
        itemStyle: { color: 'transparent' },
        emphasis: { itemStyle: { color: 'transparent' } },
      },
    ],
  })
}

watch(periodType, () => fetchForecasts())
onMounted(() => fetchForecasts())
</script>

<style scoped>
.forecast-card {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.chart-container {
  width: 100%;
  height: 280px;
}

.forecast-meta {
  display: flex;
  gap: 24px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 12px;
  color: #909399;
}

.meta-value {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.meta-time {
  font-weight: 400;
  font-size: 13px;
}

.no-data {
  padding: 20px 0;
}
</style>
