<template>
  <div class="post-loan-page">
    <!-- Stats Panel -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="贷后总数" :value="statsData.totalLoans" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <el-statistic title="贷款总额" :value="statsData.totalAmount" prefix="¥" />
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover">
          <el-statistic title="正常" :value="statsData.normalCount" />
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover">
          <el-statistic title="逾期" :value="statsData.overdueCount" />
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover">
          <el-statistic title="已结清" :value="statsData.settledCount" />
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 16px">
      <template #header>
        <div class="card-header">
          <span>贷后管理</span>
          <el-button type="primary" @click="createDialogVisible = true">新建贷后</el-button>
        </div>
      </template>

      <el-form :inline="true" class="filter-form">
        <el-form-item label="状态">
          <el-select
            v-model="query.status"
            placeholder="全部"
            clearable
            style="width: 140px"
            @change="handleSearch"
          >
            <el-option label="正常" value="normal" />
            <el-option label="逾期" value="overdue" />
            <el-option label="已结清" value="settled" />
            <el-option label="坏账" value="bad_debt" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="合同ID" prop="contractId" width="100" />
        <el-table-column label="客户ID" prop="customerId" width="100" />
        <el-table-column label="贷款金额" width="150" align="right">
          <template #default="{ row }">¥{{ Number(row.loanAmount).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="放款日期" width="120">
          <template #default="{ row }">{{ row.disbursedAt?.slice(0, 10) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ statusLabels[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="信用评级" prop="creditRating" width="100" align="center">
          <template #default="{ row }">{{ row.creditRating || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="showRepaymentPlans(row.id)">
              还款计划
            </el-button>
            <el-button type="warning" link size="small" @click="openRatingDialog(row)">
              评级
            </el-button>
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

    <!-- Create Dialog -->
    <el-dialog v-model="createDialogVisible" title="新建贷后记录" width="500px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="合同ID" required>
          <el-input-number v-model="createForm.contractId" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="贷款金额" required>
          <el-input-number
            v-model="createForm.loanAmount"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="还款期数" required>
          <el-input-number v-model="createForm.repaymentCount" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="放款日期" required>
          <el-date-picker
            v-model="createForm.disbursedAt"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- Repayment Plans Dialog -->
    <el-dialog v-model="plansDialogVisible" title="还款计划" width="700px">
      <el-table :data="repaymentPlans" stripe>
        <el-table-column label="期数" prop="period" width="80" />
        <el-table-column label="到期日" prop="dueDate" width="120" />
        <el-table-column label="应还金额" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.amount).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="已还金额" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.paidAmount).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getPlanStatusType(row.status)" size="small">
              {{ planStatusLabels[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending' || row.status === 'partial'"
              type="success"
              link
              size="small"
              @click="openConfirmRepayment(row)"
            >
              确认还款
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- Confirm Repayment Dialog -->
    <el-dialog v-model="confirmRepaymentVisible" title="确认还款" width="400px">
      <el-form label-width="100px">
        <el-form-item label="应还金额">
          <span>¥{{ Number(selectedPlan?.amount ?? 0).toLocaleString() }}</span>
        </el-form-item>
        <el-form-item label="还款金额" required>
          <el-input-number
            v-model="repaymentForm.paidAmount"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="还款日期" required>
          <el-date-picker
            v-model="repaymentForm.paidAt"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="confirmRepaymentVisible = false">取消</el-button>
        <el-button type="primary" :loading="confirmingRepayment" @click="handleConfirmRepayment">
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- Credit Rating Dialog -->
    <el-dialog v-model="ratingDialogVisible" title="更新信用评级" width="400px">
      <el-form label-width="100px">
        <el-form-item label="信用评级">
          <el-select v-model="ratingForm.creditRating" style="width: 100%">
            <el-option label="AAA" value="AAA" />
            <el-option label="AA" value="AA" />
            <el-option label="A" value="A" />
            <el-option label="BBB" value="BBB" />
            <el-option label="BB" value="BB" />
            <el-option label="B" value="B" />
            <el-option label="C" value="C" />
            <el-option label="D" value="D" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ratingDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateRating">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  postLoanApi,
  type PostLoanVO,
  type RepaymentPlanVO,
  type PostLoanStatisticsVO,
} from '@/api/post-loan'

const loading = ref(false)
const creating = ref(false)
const list = ref<PostLoanVO[]>([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 20, status: '' })

const statusLabels: Record<string, string> = {
  normal: '正常',
  overdue: '逾期',
  settled: '已结清',
  bad_debt: '坏账',
}
const planStatusLabels: Record<string, string> = {
  pending: '待还',
  paid: '已还',
  overdue: '逾期',
  partial: '部分还款',
}

type TagType = 'success' | 'primary' | 'warning' | 'danger' | 'info'
function getStatusType(status: string): TagType {
  const map: Record<string, TagType> = {
    normal: 'success',
    overdue: 'danger',
    settled: 'info',
    bad_debt: 'danger',
  }
  return map[status] || 'info'
}
function getPlanStatusType(status: string): TagType {
  const map: Record<string, TagType> = {
    pending: 'warning',
    paid: 'success',
    overdue: 'danger',
    partial: 'primary',
  }
  return map[status] || 'info'
}

// Stats
const statsData = ref<PostLoanStatisticsVO>({
  totalLoans: 0,
  totalAmount: 0,
  normalCount: 0,
  overdueCount: 0,
  settledCount: 0,
})

async function loadStats() {
  try {
    const res = await postLoanApi.getStatistics()
    if (res.code === 0 && res.data) statsData.value = res.data
  } catch {
    /* ignore */
  }
}

// List
async function loadData() {
  loading.value = true
  try {
    const params = {
      page: query.page,
      pageSize: query.pageSize,
      status: query.status || undefined,
    } as Parameters<typeof postLoanApi.getList>[0]
    const res = await postLoanApi.getList(params)
    if (res.code === 0 && res.data) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch {
    ElMessage.error('加载列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadData()
}

// Create
const createDialogVisible = ref(false)
const createForm = reactive({ contractId: 0, loanAmount: 0, repaymentCount: 12, disbursedAt: '' })

async function handleCreate() {
  if (!createForm.contractId || !createForm.loanAmount || !createForm.disbursedAt) {
    ElMessage.warning('请填写完整信息')
    return
  }
  creating.value = true
  try {
    await postLoanApi.create(createForm)
    ElMessage.success('创建成功')
    createDialogVisible.value = false
    loadData()
    loadStats()
  } catch {
    ElMessage.error('创建失败')
  } finally {
    creating.value = false
  }
}

// Repayment Plans
const plansDialogVisible = ref(false)
const repaymentPlans = ref<RepaymentPlanVO[]>([])
const selectedPlanPostLoanId = ref(0)

async function showRepaymentPlans(postLoanId: number) {
  selectedPlanPostLoanId.value = postLoanId
  try {
    const res = await postLoanApi.getRepaymentPlans(postLoanId)
    if (res.code === 0 && res.data) {
      repaymentPlans.value = res.data
    }
    plansDialogVisible.value = true
  } catch {
    ElMessage.error('加载还款计划失败')
  }
}

// Confirm Repayment
const confirmRepaymentVisible = ref(false)
const confirmingRepayment = ref(false)
const selectedPlan = ref<RepaymentPlanVO | null>(null)
const repaymentForm = reactive({ paidAmount: 0, paidAt: '' })

function openConfirmRepayment(plan: RepaymentPlanVO) {
  selectedPlan.value = plan
  repaymentForm.paidAmount = plan.amount
  repaymentForm.paidAt = new Date().toISOString().slice(0, 10)
  confirmRepaymentVisible.value = true
}

async function handleConfirmRepayment() {
  if (!selectedPlan.value) return
  confirmingRepayment.value = true
  try {
    await postLoanApi.confirmRepayment(selectedPlan.value.id, repaymentForm)
    ElMessage.success('还款确认成功')
    confirmRepaymentVisible.value = false
    showRepaymentPlans(selectedPlanPostLoanId.value)
    loadData()
    loadStats()
  } catch {
    ElMessage.error('还款确认失败')
  } finally {
    confirmingRepayment.value = false
  }
}

// Credit Rating
const ratingDialogVisible = ref(false)
const ratingTarget = ref<PostLoanVO | null>(null)
const ratingForm = reactive({ creditRating: '' })

function openRatingDialog(row: PostLoanVO) {
  ratingTarget.value = row
  ratingForm.creditRating = row.creditRating ?? ''
  ratingDialogVisible.value = true
}

async function handleUpdateRating() {
  if (!ratingTarget.value || !ratingForm.creditRating) return
  try {
    await postLoanApi.updateCreditRating(ratingTarget.value.id, ratingForm.creditRating)
    ElMessage.success('评级更新成功')
    ratingDialogVisible.value = false
    loadData()
  } catch {
    ElMessage.error('评级更新失败')
  }
}

onMounted(() => {
  loadData()
  loadStats()
})
</script>

<style scoped>
.post-loan-page {
  padding: 16px;
}
.stats-row {
  margin-bottom: 0;
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
