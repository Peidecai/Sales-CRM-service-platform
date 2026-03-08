<template>
  <div class="opportunity-detail-page">
    <!-- Breadcrumb & Back -->
    <div class="page-header">
      <el-button text @click="$router.push('/opportunity')">
        <el-icon><ArrowLeft /></el-icon>
        返回商机列表
      </el-button>
    </div>

    <!-- Loading -->
    <el-skeleton v-if="loading" :rows="8" animated />

    <!-- Main content -->
    <template v-else-if="opportunity">
      <!-- Stage Timeline -->
      <el-card shadow="never" class="stage-timeline-card">
        <div class="stage-timeline">
          <div
            v-for="(stageOpt, index) in stageOptions"
            :key="stageOpt.value"
            class="stage-step"
            :class="{
              'stage-active': stageOpt.value === opportunity.stage,
              'stage-passed': getStageIndex(opportunity.stage) > index,
              'stage-won':
                opportunity.stage === OpportunityStage.CLOSED_WON &&
                stageOpt.value === OpportunityStage.CLOSED_WON,
              'stage-lost':
                opportunity.stage === OpportunityStage.CLOSED_LOST &&
                stageOpt.value === OpportunityStage.CLOSED_LOST,
            }"
          >
            <div class="stage-step-dot" />
            <div class="stage-step-label">
              {{ stageOpt.label }}
            </div>
          </div>
        </div>
      </el-card>

      <!-- Basic Info Card -->
      <el-card shadow="never" class="info-card">
        <template #header>
          <div class="card-header">
            <span class="card-header-title">商机信息</span>
            <div class="card-header-actions">
              <el-button
                v-if="isAdminOrManager"
                type="warning"
                size="small"
                @click="handleAdvanceStage"
              >
                推进阶段
              </el-button>
              <el-button v-if="isAdminOrManager" type="primary" size="small" @click="handleEdit">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-popconfirm
                v-if="isAdminOrManager"
                title="确定要删除该商机吗？"
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
          <el-descriptions-item label="标题">
            {{ opportunity.title }}
          </el-descriptions-item>
          <el-descriptions-item label="阶段">
            <el-tag :type="getStageTagType(opportunity.stage)" size="small">
              {{ getStageLabel(opportunity.stage) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="金额">
            <span class="amount-value">¥ {{ formatAmount(opportunity.amount) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="成交概率">
            <el-progress
              :percentage="opportunity.probability"
              :stroke-width="10"
              style="width: 120px"
            />
          </el-descriptions-item>
          <el-descriptions-item label="预计成交日期">
            {{ opportunity.expectedCloseDate ?? '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(opportunity.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="关联客户">
            <el-button
              v-if="customerInfo"
              type="primary"
              link
              @click="$router.push(`/customer/${customerInfo.id}`)"
            >
              {{ customerInfo.name }}
              <template v-if="customerInfo.company"> ({{ customerInfo.company }}) </template>
            </el-button>
            <span v-else>ID: {{ opportunity.customerId }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ opportunity.description ?? '—' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Related Call Records -->
      <el-card shadow="never" class="related-card">
        <template #header>
          <div class="card-header">
            <span class="card-header-title">
              通话记录
              <el-tag size="small" type="info" class="count-tag">{{ callRecords.length }}</el-tag>
            </span>
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

      <!-- Advance Stage Dialog -->
      <el-dialog
        v-model="stageDialogVisible"
        title="推进阶段"
        width="380px"
        :close-on-click-modal="false"
      >
        <el-form label-width="80px">
          <el-form-item label="当前阶段">
            <el-tag :type="getStageTagType(opportunity.stage)" size="small">
              {{ getStageLabel(opportunity.stage) }}
            </el-tag>
          </el-form-item>
          <el-form-item label="目标阶段">
            <el-select v-model="targetStage" placeholder="请选择阶段" style="width: 100%">
              <el-option
                v-for="opt in stageOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="stageDialogVisible = false"> 取消 </el-button>
          <el-button type="primary" :loading="stageSubmitLoading" @click="handleStageSubmit">
            确定
          </el-button>
        </template>
      </el-dialog>

      <!-- Edit Dialog -->
      <el-dialog
        v-model="editDialogVisible"
        title="编辑商机"
        width="640px"
        :close-on-click-modal="false"
        @closed="handleEditDialogClosed"
      >
        <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-width="100px"
          label-position="right"
        >
          <el-row :gutter="16">
            <el-col :span="24">
              <el-form-item label="标题" prop="title">
                <el-input
                  v-model="formData.title"
                  placeholder="请输入商机标题"
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="金额" prop="amount">
                <el-input-number
                  v-model="formData.amount"
                  :min="0"
                  :precision="2"
                  placeholder="请输入金额"
                  style="width: 100%"
                  controls-position="right"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="预计成交日期" prop="expectedCloseDate">
                <el-date-picker
                  v-model="formData.expectedCloseDate"
                  type="date"
                  placeholder="请选择日期"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="成交概率" prop="probability">
                <el-input-number
                  v-model="formData.probability"
                  :min="0"
                  :max="100"
                  placeholder="0-100"
                  style="width: 100%"
                  controls-position="right"
                />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="描述" prop="description">
                <el-input
                  v-model="formData.description"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入商机描述"
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
    <el-empty v-else description="商机不存在或已被删除" :image-size="120">
      <el-button type="primary" @click="$router.push('/opportunity')"> 返回商机列表 </el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules, type TagProps } from 'element-plus'
import { ArrowLeft, Edit, Delete, Plus, Calendar } from '@element-plus/icons-vue'
import {
  opportunityApi,
  OpportunityStage,
  type OpportunityVO,
  type UpdateOpportunityParams,
} from '@/api/opportunity'
import { customerApi, type CustomerVO } from '@/api/customer'
import { callRecordApi, type CallRecordVO } from '@/api/call-record'
import {
  followUpApi,
  FollowUpType,
  type FollowUpVO,
  type CreateFollowUpParams,
} from '@/api/follow-up'
import { formatDate, formatDuration } from '@/utils/format'
import { getStageTagType, getStageLabel } from '@/utils/tag-helpers'
import { usePermission } from '@/composables/usePermission'

const route = useRoute()
const router = useRouter()
const { isAdminOrManager } = usePermission()

// ---- State ----
const loading = ref(true)
const opportunity = ref<OpportunityVO | null>(null)
const customerInfo = ref<CustomerVO | null>(null)
const callRecords = ref<CallRecordVO[]>([])
const followUps = ref<FollowUpVO[]>([])
const followUpTotal = ref(0)
const followUpPage = ref(1)
const followUpLoading = ref(false)

const opportunityId = Number(route.params.id)

// ---- Stage Options ----
const stageOptions = [
  { value: OpportunityStage.LEAD, label: '线索' },
  { value: OpportunityStage.QUALIFIED, label: '意向客户' },
  { value: OpportunityStage.PROPOSAL, label: '方案报价' },
  { value: OpportunityStage.NEGOTIATION, label: '商务谈判' },
  { value: OpportunityStage.CLOSED_WON, label: '成交' },
  { value: OpportunityStage.CLOSED_LOST, label: '丢单' },
]

function getStageIndex(stage: OpportunityStage): number {
  return stageOptions.findIndex((o) => o.value === stage)
}

function formatAmount(amount: number): string {
  if (amount == null) return '0'
  return Number(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// ---- Data Fetching ----
async function fetchOpportunity() {
  loading.value = true
  try {
    const res = await opportunityApi.getDetail(opportunityId)
    if (res?.data) {
      opportunity.value = res.data

      // Fetch related data in parallel
      const [custRes, callRes, followUpRes] = await Promise.all([
        customerApi.getDetail(res.data.customerId).catch(() => null),
        callRecordApi
          .getList({
            opportunityId: opportunityId,
            page: 1,
            pageSize: 100,
          })
          .catch(() => null),
        followUpApi
          .getList({ customerId: res.data.customerId, page: 1, pageSize: 20 })
          .catch(() => null),
      ])
      if (custRes?.data) {
        customerInfo.value = custRes.data
      }
      if (callRes?.data) {
        callRecords.value = callRes.data.list
      }
      if (followUpRes?.data) {
        followUps.value = followUpRes.data.list
        followUpTotal.value = followUpRes.data.total
        followUpPage.value = 1
      }
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    loading.value = false
  }
}

// ---- Advance Stage ----
const stageDialogVisible = ref(false)
const stageSubmitLoading = ref(false)
const targetStage = ref<OpportunityStage>(OpportunityStage.LEAD)

function handleAdvanceStage() {
  if (!opportunity.value) return
  targetStage.value = opportunity.value.stage
  stageDialogVisible.value = true
}

async function handleStageSubmit() {
  stageSubmitLoading.value = true
  try {
    await opportunityApi.updateStage(opportunityId, { stage: targetStage.value })
    ElMessage.success('阶段更新成功')
    stageDialogVisible.value = false
    fetchOpportunity()
  } catch {
    // Error handled by request interceptor
  } finally {
    stageSubmitLoading.value = false
  }
}

// ---- Edit Dialog ----
const editDialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

interface OpportunityForm {
  title: string
  amount: number
  expectedCloseDate: string
  probability: number
  description: string
}

const formData = reactive<OpportunityForm>({
  title: '',
  amount: 0,
  expectedCloseDate: '',
  probability: 10,
  description: '',
})

const formRules: FormRules = {
  title: [{ required: true, message: '请输入商机标题', trigger: 'blur' }],
}

function handleEdit() {
  if (!opportunity.value) return
  Object.assign(formData, {
    title: opportunity.value.title ?? '',
    amount: Number(opportunity.value.amount) || 0,
    expectedCloseDate: opportunity.value.expectedCloseDate ?? '',
    probability: opportunity.value.probability ?? 10,
    description: opportunity.value.description ?? '',
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
    const params: UpdateOpportunityParams = {
      title: formData.title,
      amount: formData.amount,
      expectedCloseDate: formData.expectedCloseDate || undefined,
      probability: formData.probability,
      description: formData.description || undefined,
    }
    await opportunityApi.update(opportunityId, params)
    ElMessage.success('商机更新成功')
    editDialogVisible.value = false
    fetchOpportunity()
  } catch {
    // Error handled by request interceptor
  } finally {
    submitLoading.value = false
  }
}

// ---- Delete ----
async function handleDelete() {
  try {
    await opportunityApi.remove(opportunityId)
    ElMessage.success('删除成功')
    router.push('/opportunity')
  } catch {
    // Error handled by request interceptor
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
  if (!opportunity.value) return
  followUpLoading.value = true
  try {
    const res = await followUpApi.getList({
      customerId: opportunity.value.customerId,
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
  if (!followUpFormRef.value || !opportunity.value) return
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
        customerId: opportunity.value.customerId,
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
    const res = await followUpApi.getList({
      customerId: opportunity.value.customerId,
      page: 1,
      pageSize: 20,
    })
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

// ---- Init ----
onMounted(() => {
  if (isNaN(opportunityId)) {
    loading.value = false
    return
  }
  fetchOpportunity()
})
</script>

<style scoped>
.opportunity-detail-page {
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

.amount-value {
  font-weight: 600;
  color: #f56c6c;
  font-size: 15px;
}

/* Stage Timeline */
.stage-timeline-card :deep(.el-card__body) {
  padding: 20px 24px;
}

.stage-timeline {
  display: flex;
  align-items: center;
  gap: 0;
}

.stage-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
}

.stage-step::after {
  content: '';
  position: absolute;
  top: 8px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #e4e7ed;
  z-index: 0;
}

.stage-step:last-child::after {
  display: none;
}

.stage-step-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e4e7ed;
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px #e4e7ed;
  z-index: 1;
  transition: all 0.3s;
}

.stage-step-label {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.stage-passed .stage-step-dot {
  background: #67c23a;
  box-shadow: 0 0 0 2px #67c23a;
}

.stage-passed .stage-step-label {
  color: #67c23a;
}

.stage-passed::after {
  background: #67c23a;
}

.stage-active .stage-step-dot {
  background: #409eff;
  box-shadow: 0 0 0 2px #409eff;
  width: 22px;
  height: 22px;
}

.stage-active .stage-step-label {
  color: #409eff;
  font-weight: 600;
}

.stage-won .stage-step-dot {
  background: #67c23a;
  box-shadow: 0 0 0 2px #67c23a;
  width: 22px;
  height: 22px;
}

.stage-won .stage-step-label {
  color: #67c23a;
  font-weight: 600;
}

.stage-lost .stage-step-dot {
  background: #f56c6c;
  box-shadow: 0 0 0 2px #f56c6c;
  width: 22px;
  height: 22px;
}

.stage-lost .stage-step-label {
  color: #f56c6c;
  font-weight: 600;
}

.info-card :deep(.el-descriptions__cell) {
  padding: 12px 16px;
}

.related-card :deep(.el-table) {
  border-radius: 0;
}

.follow-up-timeline {
  padding: 8px 0;
}

.follow-up-item {
  border: none;
  background: #f8f9fa;
}

.follow-up-item :deep(.el-card__body) {
  padding: 12px 16px;
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
  margin-bottom: 8px;
}

.follow-up-next {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.follow-up-next-note {
  color: #606266;
}

.load-more {
  text-align: center;
  padding: 8px 0;
}
</style>
