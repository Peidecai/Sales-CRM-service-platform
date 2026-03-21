<template>
  <div class="page-container">
    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>标签分布</template>
          <div ref="pieRef" style="height: 350px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>标签明细</template>
          <el-table :data="tagData" stripe size="small" style="width: 100%">
            <el-table-column prop="callResult" label="标签" min-width="120" />
            <el-table-column prop="count" label="数量" width="100" align="right">
              <template #default="{ row }">
                {{ Number(row.count) }}
              </template>
            </el-table-column>
            <el-table-column label="占比" width="120" align="right">
              <template #default="{ row }">
                {{ totalCount > 0 ? ((Number(row.count) / totalCount) * 100).toFixed(1) : 0 }}%
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { getAiTagStatistics } from '@/api/report'
import type { ReportFilter } from '@/api/report'

const props = defineProps<{ filter: ReportFilter }>()

const pieRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
const tagData = ref<Array<{ callResult: string; count: string }>>([])

const totalCount = computed(() => tagData.value.reduce((sum, r) => sum + Number(r.count), 0))

async function loadData() {
  try {
    const res = await getAiTagStatistics(props.filter)
    const data = ((res as unknown as { data: unknown }).data ?? res) as Array<{
      callResult: string
      count: string
    }>
    tagData.value = data

    if (chart) {
      chart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { orient: 'vertical', left: 'left' },
        series: [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            label: { show: true, formatter: '{b}: {d}%' },
            data: data.map((d) => ({ name: d.callResult || '未标记', value: Number(d.count) })),
          },
        ],
      })
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('加载标签统计失败')
  }
}

const handleResize = () => chart?.resize()

onMounted(() => {
  if (pieRef.value) chart = echarts.init(pieRef.value)
  window.addEventListener('resize', handleResize)
  loadData()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})

watch(() => props.filter, loadData, { deep: true })
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
}
</style>
