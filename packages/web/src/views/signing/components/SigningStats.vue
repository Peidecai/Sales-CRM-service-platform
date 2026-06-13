<template><div ref="chartRef" style="width: 100%; height: 300px" /></template>
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
const props = defineProps<{
  data: { total: number; completed: number; conversionRate: number; totalAmount: number }
}>()
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
const render = () => {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  chart.setOption({
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: props.data.completed, name: '已完成' },
          { value: props.data.total - props.data.completed, name: '进行中' },
        ],
      },
    ],
  })
}
onMounted(render)
watch(() => props.data, render, { deep: true })
</script>
