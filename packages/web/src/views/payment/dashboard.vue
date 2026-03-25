<template>
  <div class="payment-dashboard">
    <h2>回款仪表盘</h2>
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="应收总额" :value="data.totalDue" :precision="2" prefix="¥" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="已收总额" :value="data.totalPaid" :precision="2" prefix="¥" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="逾期金额" :value="data.overdueAmount" :precision="2" prefix="¥" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="回款率" :value="data.collectionRate" suffix="%" />
        </el-card>
      </el-col>
    </el-row>
    <el-card><AgingChart :data="aging" /></el-card>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getPaymentDashboard, getAgingAnalysis } from '@/api/payment-tracking'
import AgingChart from './components/AgingChart.vue'
const data = reactive({ totalDue: 0, totalPaid: 0, overdueAmount: 0, collectionRate: 0 })
const aging = ref<Record<string, number>>({})
onMounted(async () => {
  try {
    const r = (await getPaymentDashboard()) as unknown as { data: typeof data }
    Object.assign(data, r.data || {})
  } catch {
    /* ignore */
  }
  try {
    const r = (await getAgingAnalysis()) as unknown as { data: Record<string, number> }
    aging.value = r.data || {}
  } catch {
    /* ignore */
  }
})
</script>
