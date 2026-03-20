<template><div ref="chartRef" style="width: 100%; height: 300px" /></template>
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
const props = defineProps<{ data: Record<string, number> }>()
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
const render = () => {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  const d = props.data
  chart.setOption({
    title: { text: '账龄分布', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['当期', '1-30天', '31-60天', '61-90天', '90+天'] },
    yAxis: { type: 'value', name: '金额(元)' },
    series: [
      {
        type: 'bar',
        data: [d.current || 0, d['1_30'] || 0, d['31_60'] || 0, d['61_90'] || 0, d['90_plus'] || 0],
        itemStyle: {
          color: (p: { dataIndex: number }) =>
            ['#67c23a', '#e6a23c', '#f56c6c', '#f56c6c', '#909399'][p.dataIndex],
        },
      },
    ],
  })
}
onMounted(render)
watch(() => props.data, render, { deep: true })
</script>
