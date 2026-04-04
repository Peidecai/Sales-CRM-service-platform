<template>
  <div class="campaign-page">
    <el-page-header title="外呼任务" @back="$router.push('/')" />
    <div class="toolbar">
      <el-button type="primary" @click="$router.push('/campaign/create')">创建任务</el-button>
    </div>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="name" label="任务名称" min-width="160" />
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column prop="totalCount" label="总数" width="80" />
      <el-table-column prop="completedCount" label="完成数" width="80" />
      <el-table-column prop="successCount" label="成功数" width="80" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="$router.push(`/campaign/${row.id}`)">
            详情
          </el-button>
          <el-button v-if="row.status === 'draft'" link type="primary" @click="handleStart(row.id)">
            开始
          </el-button>
          <el-button v-if="row.status === 'running'" link @click="handlePause(row.id)">
            暂停
          </el-button>
          <el-button v-if="row.status === 'paused'" link @click="handleResume(row.id)">
            恢复
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, sizes, prev, pager, next"
      @current-change="loadList"
      @size-change="loadList"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { getApiBase } from '@/api/request'

const userStore = useUserStore()
const loading = ref(false)
const list = ref<Record<string, unknown>[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

async function loadList() {
  loading.value = true
  try {
    const res = await fetch(
      `${getApiBase()}/campaigns?page=${page.value}&pageSize=${pageSize.value}`,
      { headers: { Authorization: `Bearer ${userStore.token}` } },
    )
    if (res.ok) {
      const data = await res.json()
      list.value = data.list ?? []
      total.value = data.total ?? 0
    }
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

async function handleStart(id: number) {
  await fetch(`${getApiBase()}/campaigns/${id}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userStore.token}` },
  })
  loadList()
}
async function handlePause(id: number) {
  await fetch(`${getApiBase()}/campaigns/${id}/pause`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userStore.token}` },
  })
  loadList()
}
async function handleResume(id: number) {
  await fetch(`${getApiBase()}/campaigns/${id}/resume`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userStore.token}` },
  })
  loadList()
}

onMounted(loadList)
</script>

<style scoped>
.campaign-page {
  padding: 16px;
}
.toolbar {
  margin-bottom: 16px;
}
</style>
