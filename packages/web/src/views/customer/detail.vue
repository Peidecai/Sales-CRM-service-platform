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
              <el-button v-if="isAdminOrManager" type="primary" size="small" @click="handleEdit">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-popconfirm
                v-if="isAdminOrManager"
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

      <!-- AI Customer Profile Tab -->
      <el-card shadow="never" class="related-card">
        <template #header>
          <div class="card-header">
            <span class="card-header-title">客户画像</span>
          </div>
        </template>
        <CustomerProfileTab :customer-id="customerId" />
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

      <!-- Follow-up Records -->
      <el-card shadow="never" class="related-card">
        <template #header>
          <div class="card-header">
            <span class="card-header-title">
              跟进记录
              <el-tag size="small" type="info" class="count-tag">{{ followUpTotal }}</el-tag>
            </span>
            <el-button type="primary" size="small" plain @click="openFollowUpDialog()">
              <el-icon><Plus /></el-icon>
              新建跟进
            </el-button>
          </div>
        </template>

        <div v-if="followUps.length > 0" class="follow-up-timeline">
          <el-timeline>
            <el-timeline-item
              v-for="item in followUps"
              :key="item.id"
              :timestamp="formatDate(item.createdAt)"
              placement="top"
            >
              <el-card shadow="never" class="follow-up-item">
                <div class="follow-up-header">
                  <el-tag :type="getFollowUpTypeTag(item.type)" size="small">
                    {{ getFollowUpTypeLabel(item.type) }}
                  </el-tag>
                  <span class="follow-up-user">{{
                    item.user?.realName || item.user?.username || `用户 ${item.userId}`
                  }}</span>
                  <div class="follow-up-actions">
                    <el-button type="primary" link size="small" @click="openFollowUpDialog(item)">
                      编辑
                    </el-button>
                    <el-popconfirm
                      title="确定要删除该跟进记录吗？"
                      confirm-button-text="确定"
                      cancel-button-text="取消"
                      @confirm="handleDeleteFollowUp(item.id)"
                    >
                      <template #reference>
                        <el-button type="danger" link size="small">删除</el-button>
                      </template>
                    </el-popconfirm>
                  </div>
                </div>
                <div class="follow-up-content">{{ item.content }}</div>
                <div v-if="item.nextFollowUpDate" class="follow-up-next">
                  <el-icon><Calendar /></el-icon>
                  下次跟进：{{ item.nextFollowUpDate }}
                  <span v-if="item.nextFollowUpNote" class="follow-up-next-note"
                  >— {{ item.nextFollowUpNote }}</span
                  >
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
          <div v-if="followUpTotal > followUps.length" class="load-more">
            <el-button text :loading="followUpLoading" @click="loadMoreFollowUps">
              加载更多
            </el-button>
          </div>
        </div>
        <el-empty v-else description="暂无跟进记录" :image-size="80" />
      </el-card>

      <!-- Follow-up Dialog -->
      <el-dialog
        v-model="followUpDialogVisible"
        :title="followUpEditId ? '编辑跟进记录' : '新建跟进记录'"
        width="520px"
        :close-on-click-modal="false"
        @closed="handleFollowUpDialogClosed"
      >
        <el-form
          ref="followUpFormRef"
          :model="followUpForm"
          :rules="followUpRules"
          label-width="90px"
        >
          <el-form-item label="跟进方式" prop="type">
            <el-select v-model="followUpForm.type" placeholder="请选择" style="width: 100%">
              <el-option
                v-for="opt in followUpTypeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="跟进内容" prop="content">
            <el-input
              v-model="followUpForm.content"
              type="textarea"
              :rows="4"
              placeholder="请输入本次跟进内容"
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="下次跟进日" prop="nextFollowUpDate">
            <el-date-picker
              v-model="followUpForm.nextFollowUpDate"
              type="date"
              placeholder="选择日期（可选）"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="下次备注" prop="nextFollowUpNote">
            <el-input
              v-model="followUpForm.nextFollowUpNote"
              placeholder="下次跟进备注（可选）"
              maxlength="500"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="followUpDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="followUpSubmitLoading" @click="handleFollowUpSubmit">
            {{ followUpEditId ? '保存' : '创建' }}
          </el-button>
        </template>
      </el-dialog>

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
import { ElMessage, type FormInstance, type FormRules, type TagProps } from 'element-plus'
import { ArrowLeft, Edit, Delete, Plus, Calendar } from '@element-plus/icons-vue'
import CustomerProfileTab from './components/CustomerProfileTab.vue'
import {
  customerApi,
  CustomerStatus,
  type CustomerVO,
  type UpdateCustomerParams,
} from '@/api/customer'
import { opportunityApi, type OpportunityVO } from '@/api/opportunity'
import { callRecordApi, type CallRecordVO } from '@/api/call-record'
import {
  followUpApi,
  FollowUpType,
  type FollowUpVO,
  type CreateFollowUpParams,
} from '@/api/follow-up'
import { formatDate, formatDuration, formatAmount } from '@/utils/format'
import {
  getStatusTagType,
  getStatusLabel,
  getStageTagType,
  getStageLabel,
} from '@/utils/tag-helpers'
import { usePermission } from '@/composables/usePermission'

const route = useRoute()
const router = useRouter()
const { isAdminOrManager } = usePermission()

// ---- State ----
const loading = ref(true)
const customer = ref<CustomerVO | null>(null)
const opportunities = ref<OpportunityVO[]>([])
const callRecords = ref<CallRecordVO[]>([])
const followUps = ref<FollowUpVO[]>([])
const followUpTotal = ref(0)
const followUpPage = ref(1)
const followUpLoading = ref(false)

const customerId = Number(route.params.id)

// ---- Helpers ----
const statusOptions = [
  { value: CustomerStatus.LEAD, label: '线索' },
  { value: CustomerStatus.POTENTIAL, label: '潜在客户' },
  { value: CustomerStatus.INTENTION, label: '有意向' },
  { value: CustomerStatus.OPPORTUNITY, label: '商机客户' },
  { value: CustomerStatus.DEAL, label: '成交客户' },
  { value: CustomerStatus.MAINTAIN, label: '维护期' },
  { value: CustomerStatus.INVALID, label: '无效客户' },
  { value: CustomerStatus.LOST, label: '已流失' },
]

// ---- Data Fetching ----
async function fetchCustomer() {
  loading.value = true
  try {
    const [custRes, oppRes, callRes, followUpRes] = await Promise.all([
      customerApi.getDetail(customerId),
      opportunityApi.getList({ customerId, page: 1, pageSize: 100 }),
      callRecordApi.getList({ customerId, page: 1, pageSize: 100 }),
      followUpApi.getList({ customerId, page: 1, pageSize: 20 }),
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
    if (followUpRes?.data) {
      followUps.value = followUpRes.data.list
      followUpTotal.value = followUpRes.data.total
      followUpPage.value = 1
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

// ---- Follow-up Helpers ----
const followUpTypeOptions = [
  { value: FollowUpType.CALL, label: '电话' },
  { value: FollowUpType.VISIT, label: '拜访' },
  { value: FollowUpType.EMAIL, label: '邮件' },
  { value: FollowUpType.WECHAT, label: '微信' },
  { value: FollowUpType.OTHER, label: '其他' },
]

function getFollowUpTypeLabel(type: FollowUpType): string {
  return followUpTypeOptions.find((o) => o.value === type)?.label ?? type
}

function getFollowUpTypeTag(type: FollowUpType): TagProps['type'] {
  const map: Record<FollowUpType, TagProps['type']> = {
    [FollowUpType.CALL]: 'primary',
    [FollowUpType.VISIT]: 'success',
    [FollowUpType.EMAIL]: 'info',
    [FollowUpType.WECHAT]: 'warning',
    [FollowUpType.OTHER]: undefined,
  }
  return map[type]
}

async function loadMoreFollowUps() {
  followUpLoading.value = true
  try {
    const res = await followUpApi.getList({
      customerId,
      page: followUpPage.value + 1,
      pageSize: 20,
    })
    if (res?.data) {
      followUps.value.push(...res.data.list)
      followUpPage.value += 1
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    followUpLoading.value = false
  }
}

// ---- Follow-up Dialog ----
const followUpDialogVisible = ref(false)
const followUpSubmitLoading = ref(false)
const followUpEditId = ref<number | null>(null)
const followUpFormRef = ref<FormInstance>()

interface FollowUpForm {
  type: FollowUpType
  content: string
  nextFollowUpDate: string | null
  nextFollowUpNote: string
}

const defaultFollowUpForm = (): FollowUpForm => ({
  type: FollowUpType.CALL,
  content: '',
  nextFollowUpDate: null,
  nextFollowUpNote: '',
})

const followUpForm = reactive<FollowUpForm>(defaultFollowUpForm())

const followUpRules = {
  type: [{ required: true, message: '请选择跟进方式', trigger: 'change' }],
  content: [{ required: true, message: '请输入跟进内容', trigger: 'blur' }],
}

function openFollowUpDialog(item?: FollowUpVO) {
  if (item) {
    followUpEditId.value = item.id
    Object.assign(followUpForm, {
      type: item.type,
      content: item.content,
      nextFollowUpDate: item.nextFollowUpDate ?? null,
      nextFollowUpNote: item.nextFollowUpNote ?? '',
    })
  } else {
    followUpEditId.value = null
    Object.assign(followUpForm, defaultFollowUpForm())
  }
  followUpDialogVisible.value = true
}

function handleFollowUpDialogClosed() {
  followUpFormRef.value?.clearValidate()
}

async function handleFollowUpSubmit() {
  if (!followUpFormRef.value) return
  const valid = await followUpFormRef.value.validate().catch(() => false)
  if (!valid) return

  followUpSubmitLoading.value = true
  try {
    if (followUpEditId.value) {
      await followUpApi.update(followUpEditId.value, {
        type: followUpForm.type,
        content: followUpForm.content,
        nextFollowUpDate: followUpForm.nextFollowUpDate ?? undefined,
        nextFollowUpNote: followUpForm.nextFollowUpNote || undefined,
      })
      ElMessage.success('跟进记录更新成功')
    } else {
      const params: CreateFollowUpParams = {
        customerId,
        type: followUpForm.type,
        content: followUpForm.content,
        nextFollowUpDate: followUpForm.nextFollowUpDate ?? undefined,
        nextFollowUpNote: followUpForm.nextFollowUpNote || undefined,
      }
      await followUpApi.create(params)
      ElMessage.success('跟进记录创建成功')
    }
    followUpDialogVisible.value = false
    // Refresh follow-up list
    const res = await followUpApi.getList({ customerId, page: 1, pageSize: 20 })
    if (res?.data) {
      followUps.value = res.data.list
      followUpTotal.value = res.data.total
      followUpPage.value = 1
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    followUpSubmitLoading.value = false
  }
}

async function handleDeleteFollowUp(id: number) {
  try {
    await followUpApi.remove(id)
    ElMessage.success('删除成功')
    followUps.value = followUps.value.filter((f) => f.id !== id)
    followUpTotal.value -= 1
  } catch {
    // Error handled by request interceptor
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

/* Follow-up Timeline */
.follow-up-timeline {
  padding: 16px;
}

.follow-up-item {
  border: none;
  background: #f8f9fa;
}

.follow-up-item :deep(.el-card__body) {
  padding: 12px;
}

.follow-up-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.follow-up-user {
  font-size: 13px;
  color: #606266;
  flex: 1;
}

.follow-up-actions {
  display: flex;
  gap: 4px;
}

.follow-up-content {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
  white-space: pre-wrap;
}

.follow-up-next {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  color: #e6a23c;
}

.follow-up-next-note {
  color: #909399;
}

.load-more {
  text-align: center;
  padding: 8px 0;
}
</style>
