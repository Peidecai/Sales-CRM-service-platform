<template>
  <div class="customer-profile-tab">
    <!-- Loading -->
    <el-skeleton v-if="loading" :rows="6" animated />

    <!-- No data -->
    <div v-else-if="!profile" class="no-data">
      <el-empty description="暂无客户画像">
        <el-button type="primary" :loading="generating" @click="handleGenerate">
          生成客户画像
        </el-button>
      </el-empty>
    </div>

    <!-- Profile content -->
    <template v-else>
      <el-row :gutter="16">
        <!-- DISC Radar Chart -->
        <el-col :xs="24" :md="12">
          <el-card shadow="never" class="profile-card">
            <template #header>
              <span class="card-title">DISC 性格分析</span>
              <el-tag v-if="profile.discType" type="primary" size="small" class="disc-tag">
                {{ profile.discType }} 型
              </el-tag>
            </template>
            <div ref="radarChartRef" class="chart-container" />
          </el-card>
        </el-col>

        <!-- Health Score Gauge -->
        <el-col :xs="24" :md="12">
          <el-card shadow="never" class="profile-card">
            <template #header>
              <span class="card-title">健康度评分</span>
            </template>
            <div ref="gaugeChartRef" class="chart-container" />
          </el-card>
        </el-col>
      </el-row>

      <!-- Communication Style -->
      <el-card shadow="never" class="profile-card" style="margin-top: 16px">
        <template #header>
          <span class="card-title">沟通建议</span>
        </template>
        <p class="comm-style">{{ profile.communicationStyle ?? '暂无沟通建议' }}</p>
      </el-card>

      <!-- Pain Points -->
      <el-card
        v-if="profile.painPoints && profile.painPoints.length > 0"
        shadow="never"
        class="profile-card"
        style="margin-top: 16px"
      >
        <template #header>
          <span class="card-title">客户痛点</span>
        </template>
        <div class="pain-points">
          <el-tag
            v-for="(point, idx) in profile.painPoints"
            :key="idx"
            type="warning"
            effect="plain"
            class="pain-tag"
          >
            {{ point }}
          </el-tag>
        </div>
      </el-card>

      <!-- Refresh button -->
      <div class="refresh-row">
        <el-button text type="primary" :loading="generating" @click="handleGenerate">
          重新生成
        </el-button>
        <span class="update-time"> 更新于 {{ formatDate(profile.updatedAt) }} </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, shallowRef } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts/core'
import { RadarChart, GaugeChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { getCustomerProfile, generateCustomerProfile, type CustomerProfileVO } from '@/api/ai'
import { formatDate } from '@/utils/format'

echarts.use([
  RadarChart,
  GaugeChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
])

const props = defineProps<{
  customerId: number
}>()

const loading = ref(true)
const generating = ref(false)
const profile = ref<CustomerProfileVO | null>(null)
const radarChartRef = ref<HTMLElement>()
const gaugeChartRef = ref<HTMLElement>()
const radarChart = shallowRef<echarts.ECharts>()
const gaugeChart = shallowRef<echarts.ECharts>()

async function fetchProfile() {
  loading.value = true
  try {
    const res = (await getCustomerProfile(props.customerId)) as { data: CustomerProfileVO | null }
    profile.value = res?.data ?? null
    if (profile.value) {
      await nextTick()
      renderCharts()
    }
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

async function handleGenerate() {
  generating.value = true
  try {
    await generateCustomerProfile(props.customerId)
    ElMessage.success('画像生成任务已提交，请稍后刷新')
    // Poll after 3s
    setTimeout(() => fetchProfile(), 3000)
  } catch {
    // handled by interceptor
  } finally {
    generating.value = false
  }
}

function renderCharts() {
  if (!profile.value) return

  // Radar chart
  if (radarChartRef.value) {
    if (radarChart.value) radarChart.value.dispose()
    radarChart.value = echarts.init(radarChartRef.value)

    const scores = profile.value.discScores ?? { D: 0, I: 0, S: 0, C: 0 }
    radarChart.value.setOption({
      tooltip: {},
      radar: {
        indicator: [
          { name: 'D (支配型)', max: 100 },
          { name: 'I (影响型)', max: 100 },
          { name: 'S (稳健型)', max: 100 },
          { name: 'C (谨慎型)', max: 100 },
        ],
        shape: 'circle',
        radius: '65%',
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: [scores.D, scores.I, scores.S, scores.C],
              name: 'DISC 得分',
              areaStyle: { opacity: 0.2 },
            },
          ],
          emphasis: { lineStyle: { width: 3 } },
        },
      ],
    })
  }

  // Gauge chart
  if (gaugeChartRef.value) {
    if (gaugeChart.value) gaugeChart.value.dispose()
    gaugeChart.value = echarts.init(gaugeChartRef.value)

    const score = profile.value.healthScore ?? 0
    gaugeChart.value.setOption({
      series: [
        {
          type: 'gauge',
          min: 0,
          max: 100,
          progress: { show: true, width: 18 },
          axisLine: { lineStyle: { width: 18 } },
          axisTick: { show: false },
          splitLine: { length: 10, lineStyle: { width: 2, color: '#999' } },
          axisLabel: { distance: 25, color: '#999', fontSize: 12 },
          anchor: { show: true, size: 20, itemStyle: { borderWidth: 2 } },
          title: { fontSize: 14, offsetCenter: [0, '70%'] },
          detail: {
            valueAnimation: true,
            fontSize: 28,
            offsetCenter: [0, '40%'],
            formatter: '{value}',
            color: score >= 70 ? '#67c23a' : score >= 40 ? '#e6a23c' : '#f56c6c',
          },
          data: [{ value: score, name: '健康度' }],
        },
      ],
    })
  }
}

onMounted(() => fetchProfile())

watch(
  () => props.customerId,
  () => fetchProfile(),
)
</script>

<style scoped>
.customer-profile-tab {
  padding: 16px 0;
}

.no-data {
  padding: 40px 0;
}

.profile-card :deep(.el-card__header) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.disc-tag {
  margin-left: auto;
}

.chart-container {
  width: 100%;
  height: 280px;
}

.comm-style {
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
  margin: 0;
  white-space: pre-wrap;
}

.pain-points {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pain-tag {
  font-size: 13px;
}

.refresh-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.update-time {
  font-size: 12px;
  color: #909399;
}
</style>
