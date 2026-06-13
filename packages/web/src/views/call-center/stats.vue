<template>
  <div class="call-stats-page">
    <el-page-header title="通话统计" @back="$router.push('/')" />
    <el-row :gutter="16" class="stats-cards">
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>今日通话量</template>
          <div class="stat-value">{{ overview.todayCallCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>今日总时长(秒)</template>
          <div class="stat-value">{{ overview.todayDuration }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>在线坐席</template>
          <div class="stat-value">{{ overview.onlineAgents }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>排队数</template>
          <div class="stat-value">{{ overview.queueCount }}</div>
        </el-card>
      </el-col>
    </el-row>
    <el-card header="趋势图" shadow="never" class="mt-4">
      <el-empty description="近7天/30天通话量、接通率图表（需对接 GET /api/v1/call/stats/trend）" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { getApiBase } from '@/api/request'

const userStore = useUserStore()
const overview = ref({
  onlineAgents: 0,
  todayCallCount: 0,
  todayDuration: 0,
  queueCount: 0,
})

onMounted(async () => {
  try {
    const res = await fetch(`${getApiBase()}/call/stats/overview`, {
      headers: { Authorization: `Bearer ${userStore.token}` },
    })
    if (res.ok) overview.value = await res.json()
  } catch {
    // use defaults
  }
})
</script>

<style scoped>
.call-stats-page {
  padding: 16px;
}
.stats-cards {
  margin-top: 16px;
}
.stat-value {
  font-size: 24px;
  font-weight: 600;
}
.mt-4 {
  margin-top: 16px;
}
</style>
