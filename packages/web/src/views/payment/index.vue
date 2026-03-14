<template>
  <div class="payment-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>回款管理</span>
          <el-button type="primary" @click="showCreateDialog = true">新建回款计划</el-button>
        </div>
      </template>

      <el-form :inline="true" class="filter-form">
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
            <el-option label="计划中" value="planned" />
            <el-option label="待确认" value="pending_confirm" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="已取消" value="cancelled" />
            <el-option label="坏账" value="bad_debt" />
          </el-select>
        </el-form-item>
        <el-form-item label="仅逾期">
          <el-switch v-model="onlyOverdue" @change="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" stripe :row-class-name="rowClassName">
        <el-table-column label="回款编号" prop="paymentNo" width="180" />
        <el-table-column label="计划金额" width="130" align="right">
          <template #default="{ row }"
          >
            ¥{{ Number(row.plannedAmount || 0).toLocaleString() }}
          </template
          >
        </el-table-column>
        <el-table-column label="实际到账" width="130" align="right">
          <template #default="{ row }">
            <span :class="{ 'text-success': row.actualAmount }">
              {{ row.actualAmount ? '¥' + Number(row.actualAmount).toLocaleString() : '—' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="计划日期" prop="plannedDate" width="120" />
        <el-table-column label="到账日期" prop="actualDate" width="120">
          <template #default="{ row }">{{ row.actualDate || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{
                statusLabels[row.status]
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="逾期" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isOverdue" type="danger" size="small">{{ row.overdueDays }}天</el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'planned' || row.status === 'pending_confirm'"
              type="success"
              link
              size="small"
              @click="showConfirmDialog(row)"
            >
              确认到账
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

    <!-- Confirm payment dialog -->
    <el-dialog v-model="confirmDialogVisible" title="确认到账" width="500px">
      <el-form :model="confirmForm" label-width="100px">
        <el-form-item label="实际到账金额">
          <el-input-number
            v-model="confirmForm.actualAmount"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="到账日期">
          <el-date-picker
            v-model="confirmForm.actualDate"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="付款方式">
          <el-select v-model="confirmForm.paymentMethod" style="width: 100%">
            <el-option label="银行转账" value="bank_transfer" />
            <el-option label="支票" value="check" />
            <el-option label="现金" value="cash" />
            <el-option label="信用卡" value="credit_card" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="银行流水号">
          <el-input v-model="confirmForm.bankTransactionNo" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="confirmDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="confirming" @click="handleConfirm">确认到账</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { paymentApi, type PaymentVO, PaymentMethod } from '@/api/payment'

const statusLabels: Record<string, string> = {
  planned: '计划中',
  pending_confirm: '待确认',
  confirmed: '已确认',
  cancelled: '已取消',
  bad_debt: '坏账',
}

type TagType = 'success' | 'primary' | 'warning' | 'danger' | 'info'
function getStatusType(status: string): TagType {
  const map: Record<string, TagType> = {
    planned: 'info',
    pending_confirm: 'warning',
    confirmed: 'success',
    cancelled: 'danger',
    bad_debt: 'danger',
  }
  return map[status] || 'info'
}

function rowClassName({ row }: { row: PaymentVO }) {
  return row.isOverdue ? 'overdue-row' : ''
}

const loading = ref(false)
const confirming = ref(false)
const list = ref<PaymentVO[]>([])
const total = ref(0)
const onlyOverdue = ref(false)
const showCreateDialog = ref(false)
const confirmDialogVisible = ref(false)
const currentPaymentId = ref(0)

const query = reactive({
  page: 1,
  pageSize: 20,
  status: '',
  contractId: undefined as number | undefined,
})
const confirmForm = reactive({
  actualAmount: 0,
  actualDate: '',
  paymentMethod: 'bank_transfer',
  bankTransactionNo: '',
})

async function loadData() {
  loading.value = true
  try {
    const params: Record<string, unknown> = { ...query }
    if (onlyOverdue.value) params.isOverdue = true
    const res = await paymentApi.getList(params as Parameters<typeof paymentApi.getList>[0])
    if (res.code === 0 && res.data) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch {
    ElMessage.error('加载回款列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadData()
}

function showConfirmDialog(row: PaymentVO) {
  currentPaymentId.value = row.id
  confirmForm.actualAmount = Number(row.plannedAmount) || 0
  confirmForm.actualDate = new Date().toISOString().slice(0, 10)
  confirmForm.paymentMethod = 'bank_transfer'
  confirmForm.bankTransactionNo = ''
  confirmDialogVisible.value = true
}

async function handleConfirm() {
  confirming.value = true
  try {
    await paymentApi.confirm(currentPaymentId.value, {
      actualAmount: confirmForm.actualAmount,
      actualDate: confirmForm.actualDate,
      paymentMethod: confirmForm.paymentMethod as PaymentMethod,
      bankTransactionNo: confirmForm.bankTransactionNo,
    })
    ElMessage.success('确认到账成功')
    confirmDialogVisible.value = false
    loadData()
  } catch {
    ElMessage.error('确认失败')
  } finally {
    confirming.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.payment-page {
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
.text-success {
  color: #67c23a;
  font-weight: 600;
}
:deep(.overdue-row) {
  background-color: #fef0f0 !important;
}
</style>
