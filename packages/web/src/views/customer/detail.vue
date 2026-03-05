<template>
  <div class="customer-detail-page">
    <!-- Breadcrumb & Back -->
    <div class="page-header">
      <el-button text @click="$router.push('/customer')">
        <el-icon><ArrowLeft /></el-icon>
        返回客户列表
      </el-button>
    </div>

    <!-- Loading skeleton -->
    <el-skeleton v-if="loading" :rows="8" animated />

    <!-- Main content -->
    <template v-else-if="customer">
      <!-- Basic Info Card -->
      <el-card shadow="never" class="info-card">
        <template #header>
          <div class="card-header">
            <span class="card-header-title">客户信息</span>
            <div class="card-header-actions">
              <el-button type="primary" size="small" @click="handleEdit">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-popconfirm
                title="确定要删除该客户吗？"
                confirm-button-text="确定"
                cancel-button-text="取消"
                @confirm="handleDelete"
              >
                <template #reference>
                  <el-button type="danger" size="small" plain>
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="姓名">
            {{ customer.name }}
          </el-descriptions-item>
          <el-descriptions-item label="公司">
            {{ customer.company ?? '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(customer.status)" size="small">
              {{ getStatusLabel(customer.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="手机">
            {{ customer.phone ?? '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">
            {{ customer.email ?? '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="行业">
            {{ customer.industry ?? '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="来源">
            {{ customer.source ?? '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="标签">
            <template v-if="customer.tags && customer.tags.length > 0">
              <el-tag v-for="tag in customer.tags" :key="tag" size="small" class="tag-item">
                {{ tag }}
              </el-tag>
            </template>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(customer.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="3">
            {{ customer.notes ?? '—' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Related Opportunities -->
      <el-card shadow="never" class="related-card">
        <template #header>
          <div class="card-header">
            <span class="card-header-title">
              关联商机
              <el-tag size="small" type="info" class="count-tag">{{ opportunities.length }}</el-tag>
            </span>
            <el-button type="primary" size="small" plain @click="handleCreateOpportunity">
              <el-icon><Plus /></el-icon>
              新建商机
            </el-button>
          </div>
        </template>
        <el-table
          v-if="opportunities.length > 0"
          :data="opportunities"
          stripe
          style="width: 100%"
          size="small"
        >
          <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <el-button
                type="primary"
                link
                size="small"
                @click="$router.push(`/opportunity/${row.id}`)"
              >
                {{ row.title }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="stage" label="阶段" min-width="100">
            <template #default="{ row }">
              <el-tag :type="getStageTagType(row.stage)" size="small">
                {{ getStageLabel(row.stage) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" min-width="120">
            <template #default="{ row }">
              {{ formatAmount(row.amount) }}
            </template>
          </el-table-column>
          <el-table-column prop="probability" label="概率" width="100">
            <template #default="{ row }">
              <el-progress :percentage="row.probability" :stroke-width="6" />
            </template>
          </el-table-column>
          <el-table-column prop="expectedCloseDate" label="预计成交" min-width="120">
            <template #default="{ row }">
              {{ row.expectedCloseDate ?? '—' }}
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无关联商机" :image-size="80" />
      </el-card>

      <!-- Related Call Records -->
      <el-card shadow="never" class="related-card">
        <template #header>
          <div class="card-header">
            <span class="card-header-title">
              通话记录
              <el-tag size="small" type="info" class="count-tag">{{ callRecords.length }}</el-tag>
            </span>
            <el-button type="primary" size="small" plain @click="handleCreateCallRecord">
              <el-icon><Plus /></el-icon>
              记录通话
            </el-button>
          </div>
        </template>
        <el-table
          v-if="callRecords.length > 0"
          :data="callRecords"
          stripe
          style="width: 100%"
          size="small"
        >
          <el-table-column prop="callAt" label="通话时间" min-width="160">
            <template #default="{ row }">
              {{ formatDate(row.callAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="时长" min-width="90">
            <template #default="{ row }">
              {{ formatDuration(row.duration) }}
            </template>
          </el-table-column>
          <el-table-column prop="notes" label="备注" min-width="200" show-overflow-tooltip />
          <el-table-column label="AI摘要" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.aiSummary" type="success" size="small"> 有摘要 </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无通话记录" :image-size="80" />
      </el-card>

      <!-- Edit Dialog -->
      <el-dialog
        v-model="editDialogVisible"
        title="编辑客户"
        width="600px"
        :close-on-click-modal="false"
        @closed="handleEditDialogClosed"
      >
        <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-width="80px"
          label-position="right"
        >
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="姓名" prop="name">
                <el-input v-model="formData.name" placeholder="请输入姓名" maxlength="100" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="公司" prop="company">
                <el-input v-model="formData.company" placeholder="请输入公司" maxlength="200" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="手机" prop="phone">
                <el-input v-model="formData.phone" placeholder="请输入手机号" maxlength="20" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="邮箱" prop="email">
                <el-input v-model="formData.email" placeholder="请输入邮箱" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态" prop="status">
                <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
                  <el-option
                    v-for="opt in statusOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="行业" prop="industry">
                <el-input v-model="formData.industry" placeholder="请输入行业" maxlength="50" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="来源" prop="source">
                <el-input v-model="formData.source" placeholder="请输入来源" maxlength="20" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="备注" prop="notes">
                <el-input
                  v-model="formData.notes"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入备注"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <template #footer>
          <el-button @click="editDialogVisible = false"> 取消 </el-button>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
            保存
          </el-button>
        </template>
      </el-dialog>
    </template>

    <!-- Not found -->
    <el-empty v-else description="客户不存在或已被删除" :image-size="120">
      <el-button type="primary" @click="$router.push('/customer')"> 返回客户列表 </el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { ArrowLeft, Edit, Delete, Plus } from '@element-plus/icons-vue'
import {
  customerApi,
  CustomerStatus,
  type CustomerVO,
  type UpdateCustomerParams,
} from '@/api/customer'
import { opportunityApi, type OpportunityVO } from '@/api/opportunity'
import { callRecordApi, type CallRecordVO } from '@/api/call-record'
import { formatDate, formatDuration, formatAmount } from '@/utils/format'
import {
  getStatusTagType,
  getStatusLabel,
  getStageTagType,
  getStageLabel,
} from '@/utils/tag-helpers'

const route = useRoute()
const router = useRouter()

// ---- State ----
const loading = ref(true)
const customer = ref<CustomerVO | null>(null)
const opportunities = ref<OpportunityVO[]>([])
const callRecords = ref<CallRecordVO[]>([])

const customerId = Number(route.params.id)

// ---- Helpers ----
const statusOptions = [
  { value: CustomerStatus.POTENTIAL, label: '潜在客户' },
  { value: CustomerStatus.FOLLOWING, label: '跟进中' },
  { value: CustomerStatus.NEGOTIATING, label: '谈判中' },
  { value: CustomerStatus.SIGNED, label: '已签约' },
  { value: CustomerStatus.LOST, label: '已流失' },
  { value: CustomerStatus.INACTIVE, label: '暂不合作' },
]

// ---- Data Fetching ----
async function fetchCustomer() {
  loading.value = true
  try {
    const [custRes, oppRes, callRes] = await Promise.all([
      customerApi.getDetail(customerId),
      opportunityApi.getList({ customerId, page: 1, pageSize: 100 }),
      callRecordApi.getList({ customerId, page: 1, pageSize: 100 }),
    ])
    if (custRes?.data) {
      customer.value = custRes.data
    }
    if (oppRes?.data) {
      opportunities.value = oppRes.data.list
    }
    if (callRes?.data) {
      callRecords.value = callRes.data.list
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    loading.value = false
  }
}

// ---- Edit Dialog ----
const editDialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

interface CustomerForm {
  name: string
  company: string
  phone: string
  email: string
  status: CustomerStatus
  notes: string
  industry: string
  source: string
}

const defaultForm = (): CustomerForm => ({
  name: '',
  company: '',
  phone: '',
  email: '',
  status: CustomerStatus.POTENTIAL,
  notes: '',
  industry: '',
  source: '',
})

const formData = reactive<CustomerForm>(defaultForm())

const formRules: FormRules = {
  name: [{ required: true, message: '请输入客户姓名', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的11位手机号', trigger: 'blur' }],
}

function handleEdit() {
  if (!customer.value) return
  Object.assign(formData, {
    name: customer.value.name ?? '',
    company: customer.value.company ?? '',
    phone: customer.value.phone ?? '',
    email: customer.value.email ?? '',
    status: customer.value.status ?? CustomerStatus.POTENTIAL,
    notes: customer.value.notes ?? '',
    industry: customer.value.industry ?? '',
    source: customer.value.source ?? '',
  })
  editDialogVisible.value = true
}

function handleEditDialogClosed() {
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    const params: UpdateCustomerParams = {
      name: formData.name,
      company: formData.company || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      status: formData.status,
      notes: formData.notes || undefined,
      industry: formData.industry || undefined,
      source: formData.source || undefined,
    }
    await customerApi.update(customerId, params)
    ElMessage.success('客户更新成功')
    editDialogVisible.value = false
    fetchCustomer()
  } catch {
    // Error handled by request interceptor
  } finally {
    submitLoading.value = false
  }
}

// ---- Delete ----
async function handleDelete() {
  try {
    await customerApi.remove(customerId)
    ElMessage.success('删除成功')
    router.push('/customer')
  } catch {
    // Error handled by request interceptor
  }
}

// ---- Quick Actions ----
function handleCreateOpportunity() {
  router.push({
    path: '/opportunity',
    query: { createForCustomer: String(customerId) },
  })
}

function handleCreateCallRecord() {
  router.push({
    path: '/call-record',
    query: { createForCustomer: String(customerId) },
  })
}

// ---- Init ----
onMounted(() => {
  if (isNaN(customerId)) {
    loading.value = false
    return
  }
  fetchCustomer()
})
</script>

<style scoped>
.customer-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.page-header {
  margin-bottom: 4px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header-actions {
  display: flex;
  gap: 8px;
}

.count-tag {
  border-radius: 10px;
}

.info-card :deep(.el-descriptions__cell) {
  padding: 12px 16px;
}

.tag-item {
  margin-right: 6px;
  margin-bottom: 4px;
}

.related-card {
  margin-bottom: 0;
}

.related-card :deep(.el-table) {
  border-radius: 0;
}
</style>
