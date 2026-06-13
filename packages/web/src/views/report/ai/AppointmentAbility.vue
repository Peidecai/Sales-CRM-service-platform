<template>
  <div class="page-container">
    <el-card shadow="hover">
      <template #header>邀约能力排行</template>
      <el-table v-loading="loading" :data="tableData" stripe size="small" style="width: 100%">
        <el-table-column label="排名" width="60" align="center">
          <template #default="{ $index }">
            <el-tag
              v-if="$index < 3"
              :type="$index === 0 ? 'danger' : $index === 1 ? 'warning' : 'success'"
              size="small"
              round
            >
              {{ $index + 1 }}
            </el-tag>
            <span v-else>{{ $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="userName" label="销售人员" min-width="120" />
        <el-table-column label="总通话" width="100" align="right">
          <template #default="{ row }">{{ Number(row.totalCalls) }}</template>
        </el-table-column>
        <el-table-column label="邀约数" width="100" align="right">
          <template #default="{ row }">{{ Number(row.appointmentCount) }}</template>
        </el-table-column>
        <el-table-column label="转化率" width="120" align="right">
          <template #default="{ row }">
            <el-progress
              :percentage="Number(row.conversionRate)"
              :stroke-width="6"
              :color="
                Number(row.conversionRate) >= 30
                  ? '#67c23a'
                  : Number(row.conversionRate) >= 15
                    ? '#e6a23c'
                    : '#f56c6c'
              "
              style="width: 90px; display: inline-flex"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getAiAppointmentAbility, type ReportFilter } from '@/api/report'

const props = defineProps<{ filter: ReportFilter }>()

const loading = ref(false)
const tableData = ref<Array<Record<string, unknown>>>([])

async function loadData() {
  loading.value = true
  try {
    const res = await getAiAppointmentAbility(props.filter)
    const data = (res as unknown as { data: unknown }).data ?? res
    tableData.value = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>
  } catch (e) {
    console.error(e)
    ElMessage.error('加载邀约能力数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
watch(() => props.filter, loadData, { deep: true })
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
}
</style>
