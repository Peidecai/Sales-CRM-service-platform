<template>
  <div class="audit-log-page">
    <!-- Search bar -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="资源类型">
          <el-select
            v-model="searchForm.resource"
            placeholder="全部"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="opt in resourceOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="searchForm.action" placeholder="全部" clearable style="width: 130px">
            <el-option
              v-for="opt in actionOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch"> 搜索 </el-button>
          <el-button @click="handleReset"> 重置 </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Table -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" row-key="id" stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="username" label="操作人" min-width="100" />
        <el-table-column prop="action" label="操作" min-width="90">
          <template #default="{ row }">
            <el-tag :type="getActionTagType(row.action)" size="small">
              {{ getActionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="resource" label="资源类型" min-width="110">
          <template #default="{ row }">
            {{ getResourceLabel(row.resource) }}
          </template>
        </el-table-column>
        <el-table-column prop="resourceId" label="资源ID" width="90" />
        <el-table-column prop="ip" label="IP" min-width="130" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="操作时间" min-width="170">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="详情" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="showDetail(row)"> 查看 </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无审计日志" :image-size="100" />
        </template>
      </el-table>

      <!-- Pagination -->
      <div v-if="pagination.total > 0" class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Detail Drawer -->
    <el-drawer v-model="drawerVisible" title="审计日志详情" size="500px">
      <template v-if="currentRow">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="ID">
            {{ currentRow.id }}
          </el-descriptions-item>
          <el-descriptions-item label="操作人">
            {{ currentRow.username }} (UID: {{ currentRow.userId }})
          </el-descriptions-item>
          <el-descriptions-item label="操作类型">
            <el-tag :type="getActionTagType(currentRow.action)" size="small">
              {{ getActionLabel(currentRow.action) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="资源类型">
            {{ getResourceLabel(currentRow.resource) }}
          </el-descriptions-item>
          <el-descriptions-item label="资源ID">
            {{ currentRow.resourceId }}
          </el-descriptions-item>
          <el-descriptions-item label="IP">
            {{ currentRow.ip }}
          </el-descriptions-item>
          <el-descriptions-item label="操作时间">
            {{ formatDate(currentRow.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <template v-if="currentRow.before">
          <h4 style="margin: 16px 0 8px">变更前</h4>
          <el-input
            type="textarea"
            :model-value="formatJson(currentRow.before)"
            :autosize="{ minRows: 3, maxRows: 12 }"
            readonly
          />
        </template>

        <template v-if="currentRow.after">
          <h4 style="margin: 16px 0 8px">变更后</h4>
          <el-input
            type="textarea"
            :model-value="formatJson(currentRow.after)"
            :autosize="{ minRows: 3, maxRows: 12 }"
            readonly
          />
        </template>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { auditLogApi, AuditAction, type AuditLogVO } from '@/api/audit-log'
import { formatDate } from '@/utils/format'

// ---- Options ----
const resourceOptions = [
  { value: 'customer', label: '客户' },
  { value: 'opportunity', label: '商机' },
  { value: 'call-record', label: '通话记录' },
  { value: 'knowledge', label: '知识库' },
  { value: 'user', label: '用户' },
]

const actionOptions = [
  { value: AuditAction.CREATE, label: '新建' },
  { value: AuditAction.UPDATE, label: '更新' },
  { value: AuditAction.DELETE, label: '删除' },
]

type TagType = 'info' | 'primary' | 'warning' | 'success' | 'danger'

function getActionTagType(action: AuditAction): TagType {
  const map: Record<AuditAction, TagType> = {
    [AuditAction.CREATE]: 'success',
    [AuditAction.UPDATE]: 'warning',
    [AuditAction.DELETE]: 'danger',
  }
  return map[action] ?? 'info'
}

function getActionLabel(action: AuditAction): string {
  return actionOptions.find((o) => o.value === action)?.label ?? action
}

function getResourceLabel(resource: string): string {
  return resourceOptions.find((o) => o.value === resource)?.label ?? resource
}

function formatJson(obj: Record<string, unknown> | null): string {
  if (!obj) return ''
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

// ---- Search ----
const searchForm = reactive({
  resource: undefined as string | undefined,
  action: undefined as AuditAction | undefined,
})

// ---- Table data ----
const loading = ref(false)
const tableData = ref<AuditLogVO[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

async function fetchList() {
  loading.value = true
  try {
    const res = await auditLogApi.getList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      resource: searchForm.resource || undefined,
      action: searchForm.action || undefined,
    })
    if (res && res.data) {
      tableData.value = res.data.list
      pagination.total = res.data.total
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchList()
}

function handleReset() {
  searchForm.resource = undefined
  searchForm.action = undefined
  pagination.page = 1
  fetchList()
}

function handlePageChange(page: number) {
  pagination.page = page
  fetchList()
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  fetchList()
}

// ---- Detail drawer ----
const drawerVisible = ref(false)
const currentRow = ref<AuditLogVO | null>(null)

function showDetail(row: AuditLogVO) {
  currentRow.value = row
  drawerVisible.value = true
}

// ---- Init ----
onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.audit-log-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.search-card :deep(.el-card__body) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
}

.search-form {
  flex: 1;
}

.table-card :deep(.el-card__body) {
  padding: 0;
}

.table-card :deep(.el-table) {
  border-radius: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px;
}
</style>
