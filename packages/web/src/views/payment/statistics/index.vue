<template>
  <div class="statistics-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>回款统计</span>
          <el-form :inline="true" class="filter-form">
            <el-form-item label="开始日期">
              <el-date-picker
                v-model="filter.startDate"
                type="date"
                value-format="YYYY-MM-DD"
                clearable
              />
            </el-form-item>
            <el-form-item label="结束日期">
              <el-date-picker
                v-model="filter.endDate"
                type="date"
                value-format="YYYY-MM-DD"
                clearable
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadStats">查询</el-button>
            </el-form-item>
          </el-form>
        </div>
      </template>

      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-statistic title="计划回款总额" :value="stats.totalPlanned" prefix="¥" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="已回款总额" :value="stats.totalReceived" prefix="¥" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="逾期金额" :value="stats.overdueAmount" prefix="¥" />
        </el-col>
        <el-col :span="3">
          <el-statistic title="回款率" :value="stats.collectionRate" suffix="%" />
        </el-col>
        <el-col :span="3">
          <el-statistic title="逾期率" :value="stats.overdueRate" suffix="%" />
        </el-col>
      </el-row>

      <div ref="chartRef" style="width: 100%; height: 400px; margin-top: 24px" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { paymentApi, type PaymentStatisticsVO } from '@/api/payment'

const filter = reactive({ startDate: '', endDate: '' })
const stats = ref<PaymentStatisticsVO>({
  totalPlanned: 0,
  totalReceived: 0,
  overdueAmount: 0,
  overdueRate: 0,
  collectionRate: 0,
})

async function loadStats() {
  try {
    const res = await paymentApi.getStatistics({
      startDate: filter.startDate || undefined,
      endDate: filter.endDate || undefined,
    })
    if (res.code === 0 && res.data) {
      stats.value = res.data
    }
  } catch {
    ElMessage.error('加载统计数据失败')
  }
}

onMounted(loadStats)
</script>

<style scoped>
.statistics-page {
  padding: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.filter-form {
  margin: 0;
}
.stats-row {
  margin-bottom: 16px;
}
</style>
