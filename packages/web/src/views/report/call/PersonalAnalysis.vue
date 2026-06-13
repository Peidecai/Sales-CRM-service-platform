<template>
  <div class="page-container">
    <el-card shadow="never" class="filter-card">
      <el-select
        v-model="selectedUserId"
        placeholder="选择员工"
        clearable
        style="width: 200px"
        @change="loadData"
      >
        <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
      </el-select>
    </el-card>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="通话总数" :value="metrics.callCount" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="接通率" :value="metrics.connectRate" suffix="%" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="平均时长(秒)" :value="metrics.avgDuration" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="总时长(秒)" :value="metrics.totalDuration" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { getCallPersonalAnalysis } from '@/api/report'
import type { ReportFilter } from '@/api/report'
import { userApi } from '@/api/user'

const props = defineProps<{ filter: ReportFilter }>()

const selectedUserId = ref<number | undefined>()
const users = ref<Array<{ id: number; name: string }>>([])

const metrics = ref({
  callCount: 0,
  connectRate: 0,
  avgDuration: 0,
  totalDuration: 0,
})

async function loadUsers() {
  try {
    const res = await userApi.getList({ page: 1, pageSize: 200 })
    const data = (res as unknown as { data: { list: Array<{ id: number; name: string }> } }).data
    users.value = data?.list ?? []
  } catch {
    // handled
  }
}

async function loadData() {
  const uid = selectedUserId.value
  if (!uid) return
  try {
    const res = await getCallPersonalAnalysis(uid, props.filter)
    const data = ((res as unknown as { data: Record<string, unknown> }).data ?? res) as Record<
      string,
      unknown
    >
    metrics.value = {
      callCount: Number(data['callCount'] ?? 0),
      connectRate: Number(data['connectRate'] ?? 0),
      avgDuration: Math.round(Number(data['avgDuration'] ?? 0)),
      totalDuration: Number(data['totalDuration'] ?? 0),
    }
  } catch {
    // handled
  }
}

onMounted(() => {
  loadUsers()
})

watch(() => props.filter, loadData, { deep: true })
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
}

.filter-card {
  margin-bottom: 0;
}
</style>
