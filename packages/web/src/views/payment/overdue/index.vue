<template>
  <div class="overdue-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>逾期回款</span>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="回款编号" prop="paymentNo" width="180" />
        <el-table-column label="计划金额" width="130" align="right">
          <template #default="{ row }">{{ formatCurrency(row.plannedAmount) }}</template>
        </el-table-column>
        <el-table-column label="计划日期" prop="plannedDate" width="120" />
        <el-table-column label="逾期天数" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="danger" size="small">{{ row.overdueDays }}天</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="客户ID" prop="customerId" width="100" />
        <el-table-column label="负责人ID" prop="ownerId" width="100" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="warning" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { paymentApi, type PaymentVO } from '@/api/payment'

const loading = ref(false)
const list = ref<PaymentVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

function formatCurrency(val: number | null): string {
  return val != null ? `¥${Number(val).toLocaleString()}` : '—'
}

async function loadData() {
  loading.value = true
  try {
    const res = await paymentApi.getOverdue({ page: page.value, pageSize: pageSize.value })
    if (res.code === 0 && res.data) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch {
    ElMessage.error('加载逾期回款列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.overdue-page {
  padding: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
