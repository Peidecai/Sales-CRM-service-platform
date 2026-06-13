<template>
  <div class="campaign-detail">
    <el-page-header :title="String(task?.name ?? '任务详情')" @back="$router.push('/campaign')" />
    <el-descriptions v-if="task" :column="2" border class="mt-4">
      <el-descriptions-item label="状态">{{ task.status }}</el-descriptions-item>
      <el-descriptions-item label="总数">{{ task.totalCount }}</el-descriptions-item>
      <el-descriptions-item label="完成数">{{ task.completedCount }}</el-descriptions-item>
      <el-descriptions-item label="成功数">{{ task.successCount }}</el-descriptions-item>
    </el-descriptions>
    <el-card header="外呼明细" class="mt-4">
      <el-table :data="items" stripe>
        <el-table-column prop="phone" label="号码" />
        <el-table-column prop="callStatus" label="状态" />
        <el-table-column prop="dialAt" label="拨打时间" />
      </el-table>
      <el-pagination
        v-model:current-page="itemPage"
        :total="itemTotal"
        :page-size="20"
        layout="prev, pager, next"
        @current-change="loadItems"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getApiBase } from '@/api/request'

const route = useRoute()
const userStore = useUserStore()
const task = ref<Record<string, unknown> | null>(null)
const items = ref<Record<string, unknown>[]>([])
const itemPage = ref(1)
const itemTotal = ref(0)
const campaignId = computed(() => Number(route.params.id))

async function loadTask() {
  const res = await fetch(`${getApiBase()}/campaigns/${campaignId.value}`, {
    headers: { Authorization: `Bearer ${userStore.token}` },
  })
  if (res.ok) task.value = await res.json()
}

async function loadItems() {
  const res = await fetch(
    `${getApiBase()}/campaigns/${campaignId.value}/items?page=${itemPage.value}&pageSize=20`,
    { headers: { Authorization: `Bearer ${userStore.token}` } },
  )
  if (res.ok) {
    const data = await res.json()
    items.value = data.list ?? []
    itemTotal.value = data.total ?? 0
  }
}

onMounted(() => {
  loadTask()
  loadItems()
})
</script>

<style scoped>
.campaign-detail {
  padding: 16px;
}
.mt-4 {
  margin-top: 16px;
}
</style>
