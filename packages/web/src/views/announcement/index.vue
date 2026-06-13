<template>
  <div class="announcement-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>公告通知</span>
          <span class="unread">未读 {{ unreadCount }}</span>
        </div>
      </template>
      <el-tabs v-model="priorityTab" @tab-change="loadList">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="重要" name="important" />
        <el-tab-pane label="紧急" name="urgent" />
      </el-tabs>
      <el-table v-loading="loading" :data="list" stripe @row-click="openDetail">
        <el-table-column label="标题" prop="title" min-width="200" />
        <el-table-column label="优先级" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.priority === 'urgent'" type="danger" size="small">紧急</el-tag>
            <el-tag v-else-if="row.priority === 'important'" type="warning" size="small">
              重要
            </el-tag>
            <el-tag v-else type="info" size="small">普通</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="160">
          <template #default="{ row }">{{ formatDate(row.publishAt || row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="已读" width="80">
          <template #default="{ row }">
            <el-tag v-if="readSet.has(row.id)" type="success" size="small">已读</el-tag>
            <el-tag v-else type="info" size="small">未读</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="pagination"
        @current-change="loadList"
        @size-change="loadList"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { announcementApi, type AnnouncementVO } from '@/api/announcement'
import { formatDate } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const list = ref<AnnouncementVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const priorityTab = ref('all')
const unreadCount = ref(0)
const readSet = ref<Set<number>>(new Set())

const priorityFilter = computed(() => {
  if (priorityTab.value === 'important') return 'important'
  if (priorityTab.value === 'urgent') return 'urgent'
  return undefined
})

async function loadList() {
  loading.value = true
  try {
    const [res, countRes] = await Promise.all([
      announcementApi.list({
        page: page.value,
        pageSize: pageSize.value,
        priority: priorityFilter.value,
      }),
      announcementApi.getUnreadCount(),
    ])
    if (res?.data) {
      list.value = res.data.list ?? []
      total.value = res.data.total ?? 0
    }
    if (countRes?.data !== undefined && countRes.data !== null) unreadCount.value = countRes.data
    readSet.value = new Set()
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function openDetail(row: AnnouncementVO) {
  router.push({ name: 'AnnouncementDetail', params: { id: String(row.id) } })
}

onMounted(() => loadList())
</script>

<style scoped>
.announcement-page {
  padding: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.unread {
  font-size: 13px;
  color: #909399;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}

.el-table {
  cursor: pointer;
}
</style>
