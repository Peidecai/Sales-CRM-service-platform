<template>
  <div class="employee-profile-page">
    <el-page-header @back="$router.back()">
      <template #content>
        <span>员工画像</span>
      </template>
    </el-page-header>

    <el-skeleton v-if="loading" :rows="12" animated />

    <template v-else>
      <!-- Radar Chart -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <span>五维能力雷达图</span>
        </template>
        <div ref="radarChartRef" class="chart-container" />
      </el-card>

      <!-- Growth Curve -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="card-header-row">
            <span>成长曲线</span>
            <el-select
              v-model="growthMonths"
              size="small"
              style="width: 120px"
              @change="loadGrowth"
            >
              <el-option :value="3" label="近3个月" />
              <el-option :value="6" label="近6个月" />
              <el-option :value="12" label="近12个月" />
            </el-select>
          </div>
        </template>
        <div ref="growthChartRef" class="chart-container" />
      </el-card>

      <!-- Benchmark Comparison -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <span>团队对比</span>
        </template>
        <div v-if="benchmark" class="benchmark-grid">
          <div v-for="dim in dimensions" :key="dim.key" class="benchmark-item">
            <div class="dim-label">{{ dim.label }}</div>
            <div class="dim-bars">
              <div class="bar-row">
                <span class="bar-label">个人</span>
                <el-progress
                  :percentage="(benchmark.user as Record<string, number>)[dim.key]"
                  :stroke-width="16"
                  :color="'#409eff'"
                  :format="(val: number) => `${val}`"
                />
              </div>
              <div class="bar-row">
                <span class="bar-label">团队</span>
                <el-progress
                  :percentage="(benchmark.teamAverage as Record<string, number>)[dim.key]"
                  :stroke-width="16"
                  :color="'#e6a23c'"
                  :format="(val: number) => `${val}`"
                />
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import * as echarts from 'echarts'
import {
  getEmployeeProfile,
  getEmployeeGrowth,
  getEmployeeBenchmark,
  type EmployeeRadarProfileVO,
  type GrowthPointVO,
  type BenchmarkComparisonVO,
} from '@/api/ai'

const route = useRoute()
const userId = Number(route.params.id)

const loading = ref(true)
const profile = ref<EmployeeRadarProfileVO | null>(null)
const growthData = ref<GrowthPointVO[]>([])
const benchmark = ref<BenchmarkComparisonVO | null>(null)
const growthMonths = ref(6)

const radarChartRef = ref<HTMLDivElement>()
const growthChartRef = ref<HTMLDivElement>()

const dimensions = [
  { key: 'communication', label: '沟通能力' },
  { key: 'professionalism', label: '专业度' },
  { key: 'execution', label: '执行力' },
  { key: 'satisfaction', label: '客户满意度' },
  { key: 'closeRate', label: '成单率' },
]

async function loadProfile() {
  try {
    const res = await getEmployeeProfile(userId)
    profile.value = (res as { data?: EmployeeRadarProfileVO })?.data ?? null
  } catch {
    // handled by interceptor
  }
}

async function loadGrowth() {
  try {
    const res = await getEmployeeGrowth(userId, growthMonths.value)
    growthData.value = ((res as { data?: GrowthPointVO[] })?.data ?? []) as GrowthPointVO[]
    await nextTick()
    renderGrowthChart()
  } catch {
    // handled
  }
}

async function loadBenchmark() {
  try {
    const res = await getEmployeeBenchmark(userId)
    benchmark.value = (res as { data?: BenchmarkComparisonVO })?.data ?? null
  } catch {
    // handled
  }
}

function renderRadarChart() {
  if (!radarChartRef.value || !profile.value) return
  const chart = echarts.init(radarChartRef.value)
  chart.setOption({
    radar: {
      indicator: dimensions.map((d) => ({ name: d.label, max: 100 })),
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: dimensions.map(
              (d) => (profile.value as unknown as Record<string, number>)[d.key],
            ),
            name: '能力值',
            areaStyle: { opacity: 0.3 },
          },
        ],
      },
    ],
    tooltip: {},
  })
}

function renderGrowthChart() {
  if (!growthChartRef.value || growthData.value.length === 0) return
  const chart = echarts.init(growthChartRef.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: dimensions.map((d) => d.label) },
    xAxis: {
      type: 'category',
      data: growthData.value.map((p) => p.month),
    },
    yAxis: { type: 'value', max: 100 },
    series: dimensions.map((d) => ({
      name: d.label,
      type: 'line',
      smooth: true,
      data: growthData.value.map((p) => (p as unknown as Record<string, number>)[d.key]),
    })),
  })
}

onMounted(async () => {
  loading.value = true
  await Promise.all([loadProfile(), loadGrowth(), loadBenchmark()])
  loading.value = false
  await nextTick()
  renderRadarChart()
  renderGrowthChart()
})
</script>

<style scoped>
.employee-profile-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-card {
  width: 100%;
}

.chart-container {
  width: 100%;
  height: 400px;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.benchmark-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.benchmark-item {
  padding: 12px;
}

.dim-label {
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}

.dim-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-label {
  width: 36px;
  font-size: 12px;
  color: #909399;
}
</style>
