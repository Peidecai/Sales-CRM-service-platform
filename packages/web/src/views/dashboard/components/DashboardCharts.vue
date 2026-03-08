<template>
  <el-row :gutter="16">
    <el-col :xs="24" :md="14">
      <el-card shadow="never" class="stage-card">
        <template #header>
          <span class="card-header-title">{{ text.pipelineTitle }}</span>
        </template>
        <el-skeleton :loading="statsLoading" animated :rows="6">
          <template #default>
            <div v-if="stageStats.length === 0" class="empty-tip">{{ text.emptyOpportunity }}</div>
            <v-chart v-else :option="funnelChartOption" class="echart-box" autoresize />
          </template>
        </el-skeleton>
      </el-card>
    </el-col>
    <el-col :xs="24" :md="10">
      <el-card shadow="never" class="funnel-card">
        <template #header>
          <span class="card-header-title">{{ text.customerStatusTitle }}</span>
        </template>
        <el-skeleton :loading="statsLoading" animated :rows="6">
          <template #default>
            <div v-if="customerStatusData.length === 0" class="empty-tip">{{ text.emptyData }}</div>
            <v-chart v-else :option="pieChartOption" class="echart-box" autoresize />
          </template>
        </el-skeleton>
      </el-card>
    </el-col>
  </el-row>

  <el-row :gutter="16">
    <el-col :span="24">
      <el-card shadow="never" class="stage-card">
        <template #header>
          <span class="card-header-title">{{ text.stageAmountTitle }}</span>
        </template>
        <el-skeleton :loading="statsLoading" animated :rows="4">
          <template #default>
            <div v-if="stageStats.length === 0" class="empty-tip">{{ text.emptyOpportunity }}</div>
            <v-chart v-else :option="barChartOption" class="echart-box" autoresize />
          </template>
        </el-skeleton>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { FunnelChart, PieChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { OpportunityStage, type OpportunityStageStats } from '@/api/opportunity'

type PieDatum = { name: string; value: number }

const props = defineProps<{
  statsLoading: boolean
  stageStats: OpportunityStageStats[]
  customerStatusData: PieDatum[]
  stageLabel: (stage: string) => string
}>()

use([
  CanvasRenderer,
  FunnelChart,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const stageColorArray = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#529b2e', '#c0c4cc']
const pieColorArray = ['#409eff', '#e6a23c', '#f56c6c', '#67c23a', '#909399', '#c0c4cc']

const funnelChartOption = computed(() => {
  const funnelStages = [
    OpportunityStage.LEAD,
    OpportunityStage.QUALIFIED,
    OpportunityStage.PROPOSAL,
    OpportunityStage.NEGOTIATION,
    OpportunityStage.CLOSED_WON,
  ]

  const data = funnelStages.map((stage, idx) => {
    const found = props.stageStats.find((s) => s.stage === stage)
    return {
      name: props.stageLabel(stage),
      value: found?.count ?? 0,
      itemStyle: { color: stageColorArray[idx] },
    }
  })

  return {
    tooltip: {
      trigger: 'item' as const,
      formatter: '{b}: {c}\u4E2A ({d}%)',
    },
    series: [
      {
        type: 'funnel',
        left: '10%',
        top: 20,
        bottom: 20,
        width: '80%',
        min: 0,
        max: Math.max(...data.map((d) => d.value), 1),
        minSize: '20%',
        maxSize: '100%',
        sort: 'descending',
        gap: 4,
        label: {
          show: true,
          position: 'inside',
          formatter: '{b}: {c}',
          fontSize: 13,
        },
        data,
      },
    ],
  }
})

const pieChartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c}\u4E2A ({d}%)',
  },
  legend: {
    orient: 'vertical',
    right: 10,
    top: 'center',
    textStyle: { fontSize: 12 },
  },
  series: [
    {
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' },
      },
      data: props.customerStatusData.map((item, index) => ({
        ...item,
        itemStyle: { color: pieColorArray[index % pieColorArray.length] },
      })),
    },
  ],
}))

const barChartOption = computed(() => {
  const allStages = [
    OpportunityStage.LEAD,
    OpportunityStage.QUALIFIED,
    OpportunityStage.PROPOSAL,
    OpportunityStage.NEGOTIATION,
    OpportunityStage.CLOSED_WON,
    OpportunityStage.CLOSED_LOST,
  ]

  const categories = allStages.map((stage) => props.stageLabel(stage))
  const countData = allStages.map((stage) => {
    const found = props.stageStats.find((s) => s.stage === stage)
    return found?.count ?? 0
  })
  const amountData = allStages.map((stage) => {
    const found = props.stageStats.find((s) => s.stage === stage)
    return Number(((found?.totalAmount ?? 0) / 10000).toFixed(1))
  })

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: [text.opportunityCountLegend, text.amountLegend],
      top: 0,
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { fontSize: 12 },
    },
    yAxis: [
      { type: 'value', name: text.countAxisLabel, position: 'left' },
      { type: 'value', name: text.amountAxisLabel, position: 'right' },
    ],
    series: [
      {
        name: text.opportunityCountLegend,
        type: 'bar',
        data: countData.map((value, index) => ({
          value,
          itemStyle: { color: stageColorArray[index] ?? '#409eff' },
        })),
        barWidth: '35%',
        yAxisIndex: 0,
      },
      {
        name: text.amountLegend,
        type: 'bar',
        data: amountData.map((value, index) => ({
          value,
          itemStyle: {
            color: stageColorArray[index] ?? '#409eff',
            opacity: 0.6,
          },
        })),
        barWidth: '35%',
        yAxisIndex: 1,
      },
    ],
  }
})

const text = {
  pipelineTitle: '\u5546\u673A\u7BA1\u9053\u6F0F\u6597',
  customerStatusTitle: '\u5BA2\u6237\u72B6\u6001\u5206\u5E03',
  stageAmountTitle: '\u5546\u673A\u9636\u6BB5\u91D1\u989D\u5206\u5E03',
  emptyOpportunity: '\u6682\u65E0\u5546\u673A\u6570\u636E',
  emptyData: '\u6682\u65E0\u6570\u636E',
  opportunityCountLegend: '\u5546\u673A\u6570\u91CF',
  amountLegend: '\u91D1\u989D(\u4E07\u5143)',
  countAxisLabel: '\u6570\u91CF',
  amountAxisLabel: '\u4E07\u5143',
} as const
</script>

<style scoped>
.stage-card :deep(.el-card__body) {
  padding: 20px;
}

.funnel-card :deep(.el-card__body) {
  padding: 20px;
}

.card-header-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.empty-tip {
  text-align: center;
  padding: 32px 0;
  color: #909399;
  font-size: 14px;
}

.echart-box {
  width: 100%;
  height: 320px;
}
</style>
