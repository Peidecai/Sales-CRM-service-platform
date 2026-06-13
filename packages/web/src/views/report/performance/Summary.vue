<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>业绩汇总表</template>
      <el-table :data="tableData" stripe border>
        <el-table-column prop="userName" label="姓名" width="120" />
        <el-table-column prop="contractCount" label="合同数" sortable />
        <el-table-column prop="contractAmount" label="合同金额" sortable>
          <template #default="{ row }">
            ¥{{ Number(row.contractAmount).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="paymentAmount" label="回款金额" sortable>
          <template #default="{ row }">
            ¥{{ Number(row.paymentAmount).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="targetAmount" label="目标金额" sortable>
          <template #default="{ row }"> ¥{{ Number(row.targetAmount).toLocaleString() }} </template>
        </el-table-column>
        <el-table-column prop="completionRate" label="完成率" sortable width="150">
          <template #default="{ row }">
            <el-progress
              :percentage="Math.min(row.completionRate, 100)"
              :color="getProgressColor(row.completionRate)"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { getPerformanceSummary } from '@/api/report'
import type { ReportFilter } from '@/api/report'

const props = defineProps<{ filter: ReportFilter }>()
const tableData = ref<Array<Record<string, unknown>>>([])

function getProgressColor(rate: number): string {
  if (rate >= 100) return '#67c23a'
  if (rate >= 60) return '#409eff'
  return '#e6a23c'
}

async function loadData() {
  try {
    const res = await getPerformanceSummary(props.filter)
    tableData.value = ((res as unknown as { data: Array<Record<string, unknown>> }).data ??
      res) as Array<Record<string, unknown>>
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
