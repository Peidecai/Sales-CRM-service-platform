<template>
  <div class="page-container">
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="总营收" :value="overview.totalRevenue" prefix="¥" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="合同数" :value="overview.totalContracts" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="平均单价" :value="overview.avgDealSize" prefix="¥" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { getPerformanceOverview } from '@/api/report'
import type { ReportFilter } from '@/api/report'

const props = defineProps<{ filter: ReportFilter }>()

const overview = ref({ totalRevenue: 0, totalContracts: 0, avgDealSize: 0 })

async function loadData() {
  try {
    const res = await getPerformanceOverview(props.filter)
    const data = ((res as unknown as { data: Record<string, unknown> }).data ??
      res) as typeof overview.value
    overview.value = {
      totalRevenue: Number(data.totalRevenue ?? 0),
      totalContracts: Number(data.totalContracts ?? 0),
      avgDealSize: Number(data.avgDealSize ?? 0),
    }
  } catch {
    // handled
  }
}

onMounted(loadData)
watch(() => props.filter, loadData, { deep: true })
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
