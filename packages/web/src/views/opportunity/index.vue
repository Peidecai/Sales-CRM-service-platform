<template>
  <div class="opportunity-page">
    <!-- Search bar -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索商机标题"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="阶段">
          <el-select
            v-model="searchForm.stage"
            placeholder="全部阶段"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="opt in stageOptions"
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
      <div class="toolbar-right">
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          新建商机
        </el-button>
      </div>
    </el-card>

    <!-- Table -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" row-key="id" stripe style="width: 100%">
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column prop="customerId" label="客户ID" min-width="90" />
        <el-table-column prop="stage" label="阶段" min-width="120">
          <template #default="{ row }">
            <el-tag :type="getStageTagType(row.stage)" size="small">
              {{ getStageLabel(row.stage) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" min-width="130">
          <template #default="{ row }">
            {{ formatAmount(row.amount) }}
          </template>
        </el-table-column>
        <el-table-column prop="expectedCloseDate" label="预计成交日期" min-width="140">
          <template #default="{ row }">
            {{ row.expectedCloseDate ?? '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="probability" label="成交概率" min-width="140">
          <template #default="{ row }">
            <el-progress
              :percentage="row.probability"
              :status="getProbabilityStatus(row.probability)"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
        <el-table-column prop="assignedUserId" label="负责人ID" min-width="100" />
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)"> 编辑 </el-button>
            <el-button type="warning" link size="small" @click="handleAdvanceStage(row)">
              推进阶段
            </el-button>
            <el-popconfirm
              title="确定要删除该商机吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="handleDelete(row.id)"
            >
              <template #reference>
                <el-button type="danger" link size="small"> 删除 </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-wrap">
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

    <!-- Create / Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="640px"
      :close-on-click-modal="false"
      @closed="handleDialogClosed"
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
            <el-form-item label="客户ID" prop="customerId">
              <el-input-number
                v-model="formData.customerId"
                :min="1"
                placeholder="请输入客户ID"
                style="width: 100%"
                controls-position="right"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责人ID" prop="assignedUserId">
              <el-input-number
                v-model="formData.assignedUserId"
                :min="1"
                placeholder="请输入负责人ID"
                style="width: 100%"
                controls-position="right"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="阶段" prop="stage">
              <el-select v-model="formData.stage" placeholder="请选择阶段" style="width: 100%">
                <el-option
                  v-for="opt in stageOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
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
        <el-button @click="dialogVisible = false"> 取消 </el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ isEdit ? '保存' : '创建' }}
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  opportunityApi,
  OpportunityStage,
  type OpportunityVO,
  type CreateOpportunityParams,
  type UpdateOpportunityParams,
} from '@/api/opportunity'

// ---- Stage helpers ----
interface StageOption {
  value: OpportunityStage
  label: string
}

const stageOptions: StageOption[] = [
  { value: OpportunityStage.LEAD, label: '线索' },
  { value: OpportunityStage.QUALIFIED, label: '意向客户' },
  { value: OpportunityStage.PROPOSAL, label: '方案报价' },
  { value: OpportunityStage.NEGOTIATION, label: '商务谈判' },
  { value: OpportunityStage.CLOSED_WON, label: '成交' },
  { value: OpportunityStage.CLOSED_LOST, label: '丢单' },
]

type TagType = 'info' | 'primary' | 'warning' | 'success' | 'danger' | ''

function getStageTagType(stage: OpportunityStage): TagType {
  const map: Record<OpportunityStage, TagType> = {
    [OpportunityStage.LEAD]: 'info',
    [OpportunityStage.QUALIFIED]: 'primary',
    [OpportunityStage.PROPOSAL]: 'warning',
    [OpportunityStage.NEGOTIATION]: 'warning',
    [OpportunityStage.CLOSED_WON]: 'success',
    [OpportunityStage.CLOSED_LOST]: 'danger',
  }
  return map[stage] ?? ''
}

function getStageLabel(stage: OpportunityStage): string {
  return stageOptions.find((o) => o.value === stage)?.label ?? stage
}

function getProbabilityStatus(probability: number): '' | 'success' | 'exception' {
  if (probability >= 100) return 'success'
  if (probability === 0) return 'exception'
  return ''
}

function formatAmount(amount: number): string {
  if (amount == null) return '0'
  return Number(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// ---- Search ----
const searchForm = reactive({
  keyword: '',
  stage: undefined as OpportunityStage | undefined,
})

// ---- Table data ----
const loading = ref(false)
const tableData = ref<OpportunityVO[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

async function fetchList() {
  loading.value = true
  try {
    const res = await opportunityApi.getList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      stage: searchForm.stage || undefined,
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
  searchForm.keyword = ''
  searchForm.stage = undefined
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

// ---- Create / Edit Dialog ----
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const dialogTitle = ref('新建商机')

interface OpportunityForm {
  title: string
  customerId: number | undefined
  stage: OpportunityStage
  amount: number
  expectedCloseDate: string
  probability: number
  assignedUserId: number | undefined
  description: string
}

const defaultForm = (): OpportunityForm => ({
  title: '',
  customerId: undefined,
  stage: OpportunityStage.LEAD,
  amount: 0,
  expectedCloseDate: '',
  probability: 10,
  assignedUserId: undefined,
  description: '',
})

const formData = reactive<OpportunityForm>(defaultForm())

const formRules: FormRules = {
  title: [{ required: true, message: '请输入商机标题', trigger: 'blur' }],
  customerId: [{ required: true, message: '请输入客户ID', trigger: 'blur' }],
  assignedUserId: [{ required: true, message: '请输入负责人ID', trigger: 'blur' }],
}

function handleCreate() {
  isEdit.value = false
  editId.value = null
  dialogTitle.value = '新建商机'
  Object.assign(formData, defaultForm())
  dialogVisible.value = true
}

function handleEdit(row: OpportunityVO) {
  isEdit.value = true
  editId.value = row.id
  dialogTitle.value = '编辑商机'
  Object.assign(formData, {
    title: row.title ?? '',
    customerId: row.customerId,
    stage: row.stage ?? OpportunityStage.LEAD,
    amount: Number(row.amount) ?? 0,
    expectedCloseDate: row.expectedCloseDate ?? '',
    probability: row.probability ?? 10,
    assignedUserId: row.assignedUserId,
    description: row.description ?? '',
  })
  dialogVisible.value = true
}

function handleDialogClosed() {
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    if (isEdit.value && editId.value !== null) {
      const params: UpdateOpportunityParams = {
        title: formData.title,
        customerId: formData.customerId,
        stage: formData.stage,
        amount: formData.amount,
        expectedCloseDate: formData.expectedCloseDate || undefined,
        probability: formData.probability,
        assignedUserId: formData.assignedUserId,
        description: formData.description || undefined,
      }
      await opportunityApi.update(editId.value, params)
      ElMessage.success('商机更新成功')
    } else {
      const params: CreateOpportunityParams = {
        title: formData.title,
        customerId: formData.customerId as number,
        stage: formData.stage,
        amount: formData.amount,
        expectedCloseDate: formData.expectedCloseDate || undefined,
        probability: formData.probability,
        assignedUserId: formData.assignedUserId as number,
        description: formData.description || undefined,
      }
      await opportunityApi.create(params)
      ElMessage.success('商机创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch {
    // Error handled by request interceptor
  } finally {
    submitLoading.value = false
  }
}

// ---- Advance Stage Dialog ----
const stageDialogVisible = ref(false)
const stageSubmitLoading = ref(false)
const targetStage = ref<OpportunityStage>(OpportunityStage.LEAD)
const stageTargetId = ref<number | null>(null)

function handleAdvanceStage(row: OpportunityVO) {
  stageTargetId.value = row.id
  targetStage.value = row.stage
  stageDialogVisible.value = true
}

async function handleStageSubmit() {
  if (stageTargetId.value === null) return
  stageSubmitLoading.value = true
  try {
    await opportunityApi.updateStage(stageTargetId.value, { stage: targetStage.value })
    ElMessage.success('阶段更新成功')
    stageDialogVisible.value = false
    fetchList()
  } catch {
    // Error handled by request interceptor
  } finally {
    stageSubmitLoading.value = false
  }
}

// ---- Delete ----
async function handleDelete(id: number) {
  try {
    await opportunityApi.remove(id)
    ElMessage.success('删除成功')
    if (tableData.value.length === 1 && pagination.page > 1) {
      pagination.page -= 1
    }
    fetchList()
  } catch {
    // Error handled by request interceptor
  }
}

// ---- Init ----
onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.opportunity-page {
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

.toolbar-right {
  display: flex;
  align-items: center;
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
