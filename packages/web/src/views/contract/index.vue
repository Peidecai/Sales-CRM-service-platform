<template>
  <div class="contract-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>合同管理</span>
          <el-button type="primary" @click="showCreateDialog = true">新建合同</el-button>
        </div>
      </template>

      <!-- Filters -->
      <el-form :inline="true" class="filter-form">
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
            <el-option
              v-for="(label, key) in statusLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="搜索">
          <el-input
            v-model="query.keyword"
            placeholder="合同编号/名称"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="合同编号" prop="contractNo" width="180" />
        <el-table-column label="合同名称" prop="title" min-width="200" show-overflow-tooltip />
        <el-table-column label="合同金额" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.totalAmount).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="已回款" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.paidAmount).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{
                statusLabels[row.status] || row.status
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="开始日期" prop="startDate" width="120" />
        <el-table-column label="结束日期" prop="endDate" width="120" />
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goDetail(row.id)">详情</el-button>
            <el-button
              v-if="row.status === 'approved' || row.status === 'pending_sign'"
              type="success"
              link
              size="small"
              @click="confirmSign(row.id)"
            >
              签署
            </el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { contractApi, type ContractVO, type ContractQueryParams } from '@/api/contract'

const router = useRouter()
const loading = ref(false)
const list = ref<ContractVO[]>([])
const total = ref(0)
const showCreateDialog = ref(false)
const query = reactive({ page: 1, pageSize: 20, status: '', keyword: '' })

const statusLabels: Record<string, string> = {
  draft: '草稿',
  pending_approval: '待审批',
  approved: '已审批',
  rejected: '已驳回',
  pending_sign: '待签署',
  signed: '已签署',
  executing: '执行中',
  completed: '已完成',
  terminated: '已终止',
  cancelled: '已取消',
}

type TagType = 'success' | 'primary' | 'warning' | 'danger' | 'info'
function getStatusType(status: string): TagType {
  const map: Record<string, TagType> = {
    draft: 'info',
    pending_approval: 'warning',
    approved: 'primary',
    rejected: 'danger',
    signed: 'success',
    executing: 'success',
    completed: 'success',
    terminated: 'danger',
  }
  return map[status] || 'info'
}

async function loadData() {
  loading.value = true
  try {
    const res = await contractApi.getList({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status ? (query.status as ContractQueryParams['status']) : undefined,
      keyword: query.keyword || undefined,
    })
    if (res.code === 0 && res.data) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch {
    ElMessage.error('加载合同列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadData()
}
function goDetail(id: number) {
  router.push(`/contract/${id}`)
}

async function confirmSign(id: number) {
  try {
    await ElMessageBox.confirm('确认该合同已签署？', '签署确认', { type: 'info' })
    await contractApi.confirmSign(id)
    ElMessage.success('签署确认成功')
    loadData()
  } catch {
    /* cancelled */
  }
}

onMounted(loadData)
</script>

<style scoped>
.contract-page {
  padding: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filter-form {
  margin-bottom: 16px;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
