<template>
  <div class="signing-page">
    <h2>签约促成</h2>
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="6"
        ><el-card shadow="hover"><el-statistic title="总签约数" :value="stats.total" /></el-card
      ></el-col>
      <el-col :span="6"
        ><el-card shadow="hover"><el-statistic title="已完成" :value="stats.completed" /></el-card
      ></el-col>
      <el-col :span="6"
        ><el-card shadow="hover"
          ><el-statistic title="转化率" :value="stats.conversionRate" suffix="%" /></el-card
      ></el-col>
      <el-col :span="6"
        ><el-card shadow="hover"
          ><el-statistic title="平均周期" :value="stats.avgCycleDays" suffix="天" /></el-card
      ></el-col>
    </el-row>

    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>签约流程列表</span>
          <el-button type="primary" @click="showCreate = true">创建签约</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="opportunityId" label="商机ID" width="100" />
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">{{ Number(row.amount).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="140">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="salesUserId" label="负责人" width="100" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/signing/${row.id}`)"
              >详情</el-button
            >
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="page"
        style="margin-top: 16px"
        :total="total"
        :page-size="20"
        @current-change="loadList"
      />
    </el-card>

    <el-dialog v-model="showCreate" title="创建签约流程" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="商机ID"
          ><el-input-number v-model="form.opportunityId" :min="1"
        /></el-form-item>
        <el-form-item label="金额"
          ><el-input-number v-model="form.amount" :min="0" :precision="2"
        /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSigningList, createSigning, getSigningStatistics } from '@/api/signing'

const list = ref<Record<string, unknown>[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const showCreate = ref(false)
const stats = reactive({ total: 0, completed: 0, conversionRate: 0, avgCycleDays: 0 })
const form = reactive({ opportunityId: 0, amount: 0 })

const statusLabels: Record<string, string> = {
  draft: '草稿',
  internal_review: '内部审核',
  sent_to_customer: '已发客户',
  customer_signed: '客户已签',
  completed: '完成',
  cancelled: '已取消',
}
const statusTypes: Record<string, string> = {
  draft: 'info',
  internal_review: 'warning',
  sent_to_customer: 'primary',
  customer_signed: 'success',
  completed: 'success',
  cancelled: 'danger',
}
const statusLabel = (s: string) => statusLabels[s] || s
const statusType = (s: string) =>
  (statusTypes[s] || 'info') as 'success' | 'primary' | 'warning' | 'info' | 'danger'

const loadList = async () => {
  loading.value = true
  try {
    const res = (await getSigningList({ page: page.value, pageSize: 20 })) as unknown as {
      data: { list: Record<string, unknown>[]; total: number }
    }
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const res = (await getSigningStatistics()) as unknown as { data: typeof stats }
    Object.assign(stats, res.data || {})
  } catch {
    /* ignore */
  }
}

const handleCreate = async () => {
  try {
    await createSigning(form)
    ElMessage.success('签约流程已创建')
    showCreate.value = false
    await loadList()
  } catch {
    ElMessage.error('创建失败')
  }
}

onMounted(() => {
  loadList()
  loadStats()
})
</script>
