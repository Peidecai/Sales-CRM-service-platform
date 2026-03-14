<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import {
  getPoolList,
  claimCustomer,
  batchClaimCustomers,
  assignCustomer,
} from '@/api/customer-pool'
import { usePermission } from '@/composables/usePermission'

const { isAdminOrManager } = usePermission()

const loading = ref(false)
const tableData = ref<Record<string, unknown>[]>([])
const total = ref(0)
const selectedIds = ref<number[]>([])

const query = reactive({
  keyword: '',
  industry: '',
  region: '',
  page: 1,
  pageSize: 20,
})

const assignDialogVisible = ref(false)
const assignTargetCustomerId = ref(0)
const assignToUserId = ref<number>()

const fetchList = async () => {
  loading.value = true
  try {
    const res = (await getPoolList(query)) as unknown as Record<string, unknown>
    const data = res.data as Record<string, unknown>
    tableData.value = (data.list as Record<string, unknown>[]) || []
    total.value = (data.total as number) || 0
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

const handleSearch = () => {
  query.page = 1
  fetchList()
}

const handleReset = () => {
  query.keyword = ''
  query.industry = ''
  query.region = ''
  query.page = 1
  fetchList()
}

const handleClaim = async (customerId: number) => {
  await ElMessageBox.confirm('确定领取该客户？', '提示')
  try {
    await claimCustomer(customerId)
    ElMessage.success('领取成功')
    fetchList()
  } catch {
    /* handled */
  }
}

const handleBatchClaim = async () => {
  if (selectedIds.value.length === 0) return
  await ElMessageBox.confirm(`确定领取选中的 ${selectedIds.value.length} 个客户？`, '提示')
  try {
    await batchClaimCustomers(selectedIds.value)
    ElMessage.success('批量领取完成')
    fetchList()
  } catch {
    /* handled */
  }
}

const openAssign = (customerId: number) => {
  assignTargetCustomerId.value = customerId
  assignToUserId.value = undefined
  assignDialogVisible.value = true
}

const handleAssign = async () => {
  if (!assignToUserId.value) return
  try {
    await assignCustomer(assignTargetCustomerId.value, assignToUserId.value)
    ElMessage.success('分配成功')
    assignDialogVisible.value = false
    fetchList()
  } catch {
    /* handled */
  }
}

const handleSelectionChange = (rows: Record<string, unknown>[]) => {
  selectedIds.value = rows.map((r) => r.id as number)
}

const handlePageChange = (page: number) => {
  query.page = page
  fetchList()
}
</script>

<template>
  <div class="customer-pool-page">
    <!-- Search Bar -->
    <el-card shadow="never" style="margin-bottom: 16px">
      <el-form :inline="true" :model="query">
        <el-form-item label="关键字">
          <el-input
            v-model="query.keyword"
            placeholder="公司名/客户名"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="行业">
          <el-input v-model="query.industry" placeholder="行业" clearable />
        </el-form-item>
        <el-form-item label="区域">
          <el-input v-model="query.region" placeholder="区域" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Action Bar -->
    <div style="margin-bottom: 12px">
      <el-button type="primary" :disabled="selectedIds.length === 0" @click="handleBatchClaim">
        批量领取 ({{ selectedIds.length }})
      </el-button>
    </div>

    <!-- Table -->
    <el-table
      v-loading="loading"
      :data="tableData"
      border
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="name" label="客户名称" min-width="120" />
      <el-table-column prop="company" label="公司" min-width="150" />
      <el-table-column prop="industry" label="行业" width="100" />
      <el-table-column prop="region" label="区域" width="100" />
      <el-table-column prop="status" label="状态" width="80" />
      <el-table-column prop="poolEnterTime" label="进入公海时间" width="170" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="handleClaim(row.id)">领取</el-button>
          <el-button
            v-if="isAdminOrManager"
            size="small"
            type="warning"
            link
            @click="openAssign(row.id)"
          >
            分配
          </el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top: 16px; justify-content: flex-end"
      :current-page="query.page"
      :page-size="query.pageSize"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="handlePageChange"
    />

    <!-- Assign Dialog -->
    <el-dialog v-model="assignDialogVisible" title="分配客户" width="400px">
      <el-form label-width="100px">
        <el-form-item label="目标销售ID">
          <el-input-number v-model="assignToUserId" :min="1" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAssign">确认分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>
