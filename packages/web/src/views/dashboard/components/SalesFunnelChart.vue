<template>
  <el-card shadow="never" class="funnel-chart-card">
    <template #header>
      <span class="card-header-title">销售漏斗分析</span>
    </template>
    <el-skeleton :loading="loading" animated :rows="6">
      <template #default>
        <div v-if="!funnelData" class="empty-tip">暂无漏斗数据</div>
        <template v-else>
          <el-row :gutter="16">
            <el-col :xs="24" :md="14">
              <v-chart :option="funnelOption" class="echart-box" autoresize />
            </el-col>
            <el-col :xs="24" :md="10">
              <div class="funnel-summary">
                <div class="summary-item">
                  <span class="summary-label">活跃商机总额</span>
                  <span class="summary-value amount">{{
                    formatDisplayAmount(funnelData.totalAmount)
                  }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">赢单率</span>
                  <span class="summary-value win-rate"
                    >{{ (funnelData.winRate * 100).toFixed(1) }}%</span
                  >
                </div>
                <el-divider />
                <div class="conversion-list">
                  <div class="conversion-title">阶段转化率</div>
                  <div v-for="item in activeStages" :key="item.stage" class="conversion-item">
                    <span class="conversion-stage">{{ stageLabel(item.stage) }}</span>
                    <div class="conversion-bar-wrap">
                      <div
                        class="conversion-bar"
                        :style="{ width: item.conversionRate * 100 + '%' }"
                      />
                    </div>
                    <span class="conversion-rate"
                      >{{ (item.conversionRate * 100).toFixed(1) }}%</span
                    >
                  </div>
                </div>
              </div>
            </el-col>
          </el-row>
        </template>
      </template>
    </el-skeleton>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { FunnelChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { OpportunityStage, type FunnelData } from '@/api/opportunity'
import { formatAmount } from '@/utils/format'

const props = defineProps<{
  loading: boolean
  funnelData: FunnelData | null
}>()

use([CanvasRenderer, FunnelChart, TitleComponent, TooltipComponent, LegendComponent])

const stageColorMap: Record<string, string> = {
  [OpportunityStage.LEAD]: '#409eff',
  [OpportunityStage.QUALIFIED]: '#67c23a',
  [OpportunityStage.PROPOSAL]: '#e6a23c',
  [OpportunityStage.NEGOTIATION]: '#f56c6c',
  [OpportunityStage.CLOSED_WON]: '#529b2e',
}

const stageLabelMap: Record<string, string> = {
  [OpportunityStage.LEAD]: '线索',
  [OpportunityStage.QUALIFIED]: '意向客户',
  [OpportunityStage.PROPOSAL]: '方案报价',
  [OpportunityStage.NEGOTIATION]: '商务谈判',
  [OpportunityStage.CLOSED_WON]: '成交',
}

function stageLabel(stage: string): string {
  return stageLabelMap[stage] ?? stage
}

function formatDisplayAmount(value: number): string {
  if (value >= 10000) {
    return `¥${(value / 10000).toFixed(1)}万`
  }
  return `¥${formatAmount(value)}`
}

const activeStages = computed(() => {
  if (!props.funnelData) return []
  return props.funnelData.stages.filter((s) => s.stage !== OpportunityStage.CLOSED_LOST)
})

const funnelOption = computed(() => {
  if (!props.funnelData) return {}

  const stages = activeStages.value
  const data = stages.map((item) => ({
    name: stageLabel(item.stage),
    value: item.count,
    amount: item.amount,
    conversionRate: item.conversionRate,
    itemStyle: { color: stageColorMap[item.stage] ?? '#409eff' },
  }))

  return {
    tooltip: {
      trigger: 'item' as const,
      formatter: (params: {
        name: string
        value: number
        data: { amount: number; conversionRate: number }
      }) => {
        const { name, value, data: d } = params
        const amountStr = formatDisplayAmount(d.amount)
        const rateStr = (d.conversionRate * 100).toFixed(1)
        return `${name}<br/>数量: ${value}个<br/>金额: ${amountStr}<br/>转化率: ${rateStr}%`
      },
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
          formatter: (params: { name: string; value: number; data: { amount: number } }) => {
            const amountStr = formatDisplayAmount(params.data.amount)
            return `${params.name}\n${params.value}个 | ${amountStr}`
          },
          fontSize: 12,
          lineHeight: 18,
        },
        data,
      },
    ],
  }
})
</script>

<style scoped>
.funnel-chart-card :deep(.el-card__body) {
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

.funnel-summary {
  padding: 8px 0;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.summary-label {
  font-size: 14px;
  color: #606266;
}

.summary-value {
  font-size: 20px;
  font-weight: 700;
}

.summary-value.amount {
  color: #e6a23c;
}

.summary-value.win-rate {
  color: #67c23a;
}

.conversion-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.conversion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.conversion-stage {
  font-size: 13px;
  color: #606266;
  width: 70px;
  flex-shrink: 0;
}

.conversion-bar-wrap {
  flex: 1;
  height: 8px;
  background: #f0f2f5;
  border-radius: 4px;
  overflow: hidden;
}

.conversion-bar {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  border-radius: 4px;
  transition: width 0.3s;
  min-width: 2px;
}

.conversion-rate {
  font-size: 13px;
  color: #303133;
  font-weight: 600;
  width: 50px;
  text-align: right;
  flex-shrink: 0;
}
</style>
