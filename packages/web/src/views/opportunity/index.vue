<template>
  <div class="opportunity-page">
    <!-- Search bar -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="鎼滅储鍟嗘満鏍囬"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="闃舵">
          <el-select
            v-model="searchForm.stage"
            placeholder="鍏ㄩ儴闃舵"
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
          <el-button type="primary" @click="handleSearch"> 鎼滅储 </el-button>
          <el-button @click="handleReset"> 閲嶇疆 </el-button>
        </el-form-item>
      </el-form>
      <div class="toolbar-right">
        <!-- View Toggle -->
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="table">
            <el-icon><Grid /></el-icon>
            鍒楄〃
          </el-radio-button>
          <el-radio-button value="kanban">
            <el-icon><Operation /></el-icon>
            鐪嬫澘
          </el-radio-button>
        </el-radio-group>
        <el-button v-if="isAdminOrManager" :loading="exportLoading" @click="handleExport">
          <el-icon><Download /></el-icon>
          瀵煎嚭
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          鏂板缓鍟嗘満
        </el-button>
      </div>
    </el-card>

    <!-- ==================== TABLE VIEW ==================== -->
    <el-card v-if="viewMode === 'table'" shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" row-key="id" stripe style="width: 100%">
        <el-table-column prop="title" label="鏍囬" min-width="180" show-overflow-tooltip sortable>
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
        <el-table-column prop="customerId" label="鍏宠仈瀹㈡埛" min-width="120">
          <template #default="{ row }">
            <el-button
              v-if="customerMap[row.customerId]"
              type="primary"
              link
              size="small"
              @click="$router.push(`/customer/${row.customerId}`)"
            >
              {{ customerMap[row.customerId] }}
            </el-button>
            <span v-else>ID: {{ row.customerId }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="stage" label="闃舵" min-width="120" sortable>
          <template #default="{ row }">
            <el-tag :type="getStageTagType(row.stage)" size="small">
              {{ getStageLabel(row.stage) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="閲戦" min-width="130" sortable>
          <template #default="{ row }"> 楼{{ formatAmount(row.amount) }} </template>
        </el-table-column>
        <el-table-column
          prop="expectedCloseDate"
          label="棰勮鎴愪氦鏃ユ湡"
          min-width="140"
          sortable
        >
          <template #default="{ row }">
            {{ row.expectedCloseDate ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="probability" label="鎴愪氦姒傜巼" min-width="140" sortable>
          <template #default="{ row }">
            <el-progress
              :percentage="row.probability"
              :status="getProbabilityStatus(row.probability)"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
        <el-table-column label="鎿嶄綔" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="$router.push(`/opportunity/${row.id}`)"
            >
              璇︽儏
            </el-button>
            <el-button type="info" link size="small" @click="handleEdit(row)"> 缂栬緫 </el-button>
            <el-button type="warning" link size="small" @click="handleAdvanceStage(row)">
              鎺ㄨ繘
            </el-button>
            <el-popconfirm
              v-if="isAdminOrManager"
              title="纭畾瑕佸垹闄よ鍟嗘満鍚楋紵"
              confirm-button-text="纭畾"
              cancel-button-text="鍙栨秷"
              @confirm="handleDelete(row.id)"
            >
              <template #reference>
                <el-button type="danger" link size="small"> 鍒犻櫎 </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="鏆傛棤鍟嗘満鏁版嵁" :image-size="100">
            <el-button type="primary" @click="handleCreate"> 鏂板缓鍟嗘満 </el-button>
          </el-empty>
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

    <!-- ==================== KANBAN VIEW ==================== -->
    <div v-if="viewMode === 'kanban'" v-loading="kanbanLoading" class="kanban-container">
      <div v-for="col in kanbanColumns" :key="col.stage" class="kanban-column">
        <!-- Column Header -->
        <div class="kanban-column-header" :style="{ borderTopColor: col.color }">
          <div class="column-title">
            <el-tag :type="getStageTagType(col.stage)" size="small" effect="dark">
              {{ col.label }}
            </el-tag>
            <span class="column-count">{{ col.items.length }}</span>
          </div>
          <div class="column-amount">楼{{ formatAmount(col.totalAmount) }}</div>
        </div>

        <!-- Column Body (Cards) -->
        <div
          class="kanban-column-body"
          :data-stage="col.stage"
          @dragover.prevent
          @dragenter.prevent="onDragEnter($event, col.stage)"
          @dragleave="onDragLeave($event)"
          @drop="onDrop($event, col.stage)"
        >
          <div
            v-for="item in col.items"
            :key="item.id"
            class="kanban-card"
            :class="{ 'is-updating': isCardUpdating(item.id) }"
            :draggable="!isCardUpdating(item.id)"
            @dragstart="onDragStart($event, item)"
            @dragend="onDragEnd"
          >
            <div class="card-title" @click="$router.push(`/opportunity/${item.id}`)">
              {{ item.title }}
            </div>
            <div class="card-customer">
              <el-icon><User /></el-icon>
              <span>{{ customerMap[item.customerId] ?? `瀹㈡埛#${item.customerId}` }}</span>
            </div>
            <div class="card-meta">
              <span class="card-amount">楼{{ formatAmount(item.amount) }}</span>
              <el-progress
                :percentage="item.probability"
                :status="getProbabilityStatus(item.probability)"
                :stroke-width="6"
                :show-text="false"
                style="width: 60px"
              />
              <span class="card-probability">{{ item.probability }}%</span>
            </div>
            <div v-if="item.expectedCloseDate" class="card-date">
              <el-icon><Calendar /></el-icon>
              {{ item.expectedCloseDate }}
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="col.items.length === 0" class="kanban-empty">鏆傛棤鍟嗘満</div>
        </div>
      </div>
    </div>

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
            <el-form-item label="鏍囬" prop="title">
              <el-input
                v-model="formData.title"
                placeholder="请输入商机标题"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="鍏宠仈瀹㈡埛" prop="customerId">
              <el-select
                v-model="formData.customerId"
                filterable
                remote
                :remote-method="searchCustomers"
                placeholder="鎼滅储骞堕€夋嫨瀹㈡埛"
                style="width: 100%"
                :loading="customerSearchLoading"
              >
                <el-option
                  v-for="c in customerOptions"
                  :key="c.id"
                  :label="`${c.name}${c.company ? ' (' + c.company + ')' : ''}`"
                  :value="c.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="闃舵" prop="stage">
              <el-select v-model="formData.stage" placeholder="璇烽€夋嫨闃舵" style="width: 100%">
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
            <el-form-item label="閲戦" prop="amount">
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
            <el-form-item label="棰勮鎴愪氦鏃ユ湡" prop="expectedCloseDate">
              <el-date-picker
                v-model="formData.expectedCloseDate"
                type="date"
                placeholder="璇烽€夋嫨鏃ユ湡"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="鎴愪氦姒傜巼" prop="probability">
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
            <el-form-item label="鎻忚堪" prop="description">
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
        <el-button @click="dialogVisible = false"> 鍙栨秷 </el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ isEdit ? '淇濆瓨' : '鍒涘缓' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Advance Stage Dialog -->
    <el-dialog
      v-model="stageDialogVisible"
      title="鎺ㄨ繘闃舵"
      width="380px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="褰撳墠闃舵">
          <el-tag v-if="stageCurrentLabel" :type="getStageTagType(stageCurrentStage)" size="small">
            {{ stageCurrentLabel }}
          </el-tag>
        </el-form-item>
        <el-form-item label="鐩爣闃舵">
          <el-select v-model="targetStage" placeholder="璇烽€夋嫨闃舵" style="width: 100%">
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
        <el-button @click="stageDialogVisible = false"> 鍙栨秷 </el-button>
        <el-button type="primary" :loading="stageSubmitLoading" @click="handleStageSubmit">
          纭畾
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Download, Grid, Operation, User, Calendar } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  opportunityApi,
  OpportunityStage,
  type OpportunityVO,
  type CreateOpportunityParams,
  type UpdateOpportunityParams,
} from '@/api/opportunity'
import { customerApi, type CustomerVO } from '@/api/customer'
import { formatAmount } from '@/utils/format'
import { getStageTagType, getStageLabel } from '@/utils/tag-helpers'
import { usePermission } from '@/composables/usePermission'

const route = useRoute()
const userStore = useUserStore()
const { isAdminOrManager } = usePermission()

// ---- View Mode ----
const viewMode = ref<'table' | 'kanban'>('table')

// ---- Stage helpers ----
interface StageOption {
  value: OpportunityStage
  label: string
}

const stageOptions: StageOption[] = [
  { value: OpportunityStage.LEAD, label: '绾跨储' },
  { value: OpportunityStage.QUALIFIED, label: '鎰忓悜瀹㈡埛' },
  { value: OpportunityStage.PROPOSAL, label: '鏂规鎶ヤ环' },
  { value: OpportunityStage.NEGOTIATION, label: '鍟嗗姟璋堝垽' },
  { value: OpportunityStage.CLOSED_WON, label: '鎴愪氦' },
  { value: OpportunityStage.CLOSED_LOST, label: '涓㈠崟' },
]

const stageColors: Record<string, string> = {
  [OpportunityStage.LEAD]: '#909399',
  [OpportunityStage.QUALIFIED]: '#e6a23c',
  [OpportunityStage.PROPOSAL]: '#409eff',
  [OpportunityStage.NEGOTIATION]: '#e6a23c',
  [OpportunityStage.CLOSED_WON]: '#67c23a',
  [OpportunityStage.CLOSED_LOST]: '#f56c6c',
}

function getProbabilityStatus(probability: number): '' | 'success' | 'exception' {
  if (probability >= 100) return 'success'
  if (probability === 0) return 'exception'
  return ''
}

// ---- Customer Name Resolution ----
const customerMap = ref<Record<number, string>>({})

async function resolveCustomerNames(ids: number[]) {
  const uniqueIds = [...new Set(ids)].filter((id) => !(id in customerMap.value))
  if (uniqueIds.length === 0) return

  try {
    const res = await customerApi.getList({ page: 1, pageSize: 100 })
    if (res?.data) {
      for (const c of res.data.list) {
        customerMap.value[c.id] = c.name + (c.company ? ` (${c.company})` : '')
      }
    }
  } catch {
    // Silently fail
  }
}

// ---- Customer Search for Dialog ----
const customerSearchLoading = ref(false)
const customerOptions = ref<CustomerVO[]>([])

async function searchCustomers(query: string) {
  if (!query) {
    customerOptions.value = []
    return
  }
  customerSearchLoading.value = true
  try {
    const res = await customerApi.getList({ keyword: query, page: 1, pageSize: 20 })
    if (res?.data) {
      customerOptions.value = res.data.list
    }
  } catch {
    customerOptions.value = []
  } finally {
    customerSearchLoading.value = false
  }
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

let searchTimer: ReturnType<typeof setTimeout> | null = null

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
      const ids = res.data.list.map((o) => o.customerId)
      resolveCustomerNames(ids)
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.page = 1
    fetchList()
    if (viewMode.value === 'kanban') {
      fetchKanbanData()
    }
  }, 300)
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.stage = undefined
  pagination.page = 1
  fetchList()
  if (viewMode.value === 'kanban') {
    fetchKanbanData()
  }
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

// ==================== KANBAN LOGIC ====================

interface KanbanColumn {
  stage: OpportunityStage
  label: string
  color: string
  items: OpportunityVO[]
  totalAmount: number
}

const kanbanLoading = ref(false)
const kanbanAllItems = ref<OpportunityVO[]>([])

const kanbanColumns = computed<KanbanColumn[]>(() => {
  const activeStages = [
    OpportunityStage.LEAD,
    OpportunityStage.QUALIFIED,
    OpportunityStage.PROPOSAL,
    OpportunityStage.NEGOTIATION,
    OpportunityStage.CLOSED_WON,
    OpportunityStage.CLOSED_LOST,
  ]

  return activeStages.map((stage) => {
    const opt = stageOptions.find((o) => o.value === stage)
    const items = kanbanAllItems.value.filter((item) => item.stage === stage)
    const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return {
      stage,
      label: opt?.label ?? stage,
      color: stageColors[stage] ?? '#909399',
      items,
      totalAmount,
    }
  })
})

async function fetchKanbanData() {
  kanbanLoading.value = true
  try {
    // Fetch all opportunities (large page) for kanban board
    const res = await opportunityApi.getList({
      page: 1,
      pageSize: 500,
      keyword: searchForm.keyword || undefined,
    })
    if (res?.data) {
      kanbanAllItems.value = res.data.list
      const ids = res.data.list.map((o) => o.customerId)
      resolveCustomerNames(ids)
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    kanbanLoading.value = false
  }
}

// Drag-and-drop state
let dragItem: OpportunityVO | null = null
const kanbanUpdatingIds = ref<Set<number>>(new Set())

function isCardUpdating(id: number): boolean {
  return kanbanUpdatingIds.value.has(id)
}

function onDragStart(e: DragEvent, item: OpportunityVO) {
  if (isCardUpdating(item.id)) {
    e.preventDefault()
    return
  }

  dragItem = item
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(item.id))
  }
  // Add dragging class after a tick
  const target = e.target as HTMLElement
  requestAnimationFrame(() => {
    target.classList.add('is-dragging')
  })
}

function onDragEnd(e: DragEvent) {
  const target = e.target as HTMLElement
  target.classList.remove('is-dragging')
  dragItem = null
  // Remove all drag-over highlights
  document.querySelectorAll('.kanban-column-body.drag-over').forEach((el) => {
    el.classList.remove('drag-over')
  })
}

function onDragEnter(e: DragEvent, _stage: OpportunityStage) {
  const target = e.currentTarget as HTMLElement
  target.classList.add('drag-over')
}

function onDragLeave(e: DragEvent) {
  const target = e.currentTarget as HTMLElement
  // Only remove if actually leaving the container
  const related = e.relatedTarget as HTMLElement | null
  if (related && target.contains(related)) return
  target.classList.remove('drag-over')
}

async function onDrop(e: DragEvent, targetStage: OpportunityStage) {
  e.preventDefault()
  const target = e.currentTarget as HTMLElement
  target.classList.remove('drag-over')

  if (!dragItem || dragItem.stage === targetStage) return

  const itemId = dragItem.id
  const previousStage = dragItem.stage
  if (isCardUpdating(itemId)) {
    dragItem = null
    ElMessage.warning('当前商机正在更新，请稍后再试')
    return
  }

  // Optimistic update
  dragItem.stage = targetStage
  dragItem = null
  kanbanUpdatingIds.value.add(itemId)

  try {
    await opportunityApi.updateStage(itemId, { stage: targetStage })
    ElMessage.success(`商机阶段已更新为「${getStageLabel(targetStage)}」`)
    // Refresh table data too
    fetchList()
  } catch {
    // Revert on failure
    const item = kanbanAllItems.value.find((i) => i.id === itemId)
    if (item) {
      item.stage = previousStage
    }
  } finally {
    kanbanUpdatingIds.value.delete(itemId)
  }
}
// Watch view mode to load data
watch(viewMode, (mode) => {
  if (mode === 'kanban') {
    fetchKanbanData()
  }
})

// ---- Create / Edit Dialog ----
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const dialogTitle = ref('鏂板缓鍟嗘満')

interface OpportunityForm {
  title: string
  customerId: number | undefined
  stage: OpportunityStage
  amount: number
  expectedCloseDate: string
  probability: number
  description: string
}

const defaultForm = (): OpportunityForm => ({
  title: '',
  customerId: undefined,
  stage: OpportunityStage.LEAD,
  amount: 0,
  expectedCloseDate: '',
  probability: 10,
  description: '',
})

const formData = reactive<OpportunityForm>(defaultForm())

const formRules: FormRules = {
  title: [{ required: true, message: '请输入商机标题', trigger: 'blur' }],
  customerId: [{ required: true, message: '璇烽€夋嫨鍏宠仈瀹㈡埛', trigger: 'change' }],
}

function handleCreate() {
  isEdit.value = false
  editId.value = null
  dialogTitle.value = '鏂板缓鍟嗘満'
  const form = defaultForm()
  const createForCustomer = route.query.createForCustomer
  if (createForCustomer) {
    form.customerId = Number(createForCustomer)
  }
  Object.assign(formData, form)
  searchCustomers('')
  dialogVisible.value = true
}

function handleEdit(row: OpportunityVO) {
  isEdit.value = true
  editId.value = row.id
  dialogTitle.value = '缂栬緫鍟嗘満'
  Object.assign(formData, {
    title: row.title ?? '',
    customerId: row.customerId,
    stage: row.stage ?? OpportunityStage.LEAD,
    amount: Number(row.amount) || 0,
    expectedCloseDate: row.expectedCloseDate ?? '',
    probability: row.probability ?? 10,
    description: row.description ?? '',
  })
  customerApi
    .getDetail(row.customerId)
    .then((res) => {
      if (res?.data) {
        customerOptions.value = [res.data]
      }
    })
    .catch(() => {})
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
        description: formData.description || undefined,
      }
      await opportunityApi.update(editId.value, params)
      ElMessage.success('鍟嗘満鏇存柊鎴愬姛')
    } else {
      const params: CreateOpportunityParams = {
        title: formData.title,
        customerId: formData.customerId as number,
        stage: formData.stage,
        amount: formData.amount,
        expectedCloseDate: formData.expectedCloseDate || undefined,
        probability: formData.probability,
        assignedUserId: userStore.userInfo?.id ?? 1,
        description: formData.description || undefined,
      }
      await opportunityApi.create(params)
      ElMessage.success('鍟嗘満鍒涘缓鎴愬姛')
    }
    dialogVisible.value = false
    fetchList()
    if (viewMode.value === 'kanban') {
      fetchKanbanData()
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    submitLoading.value = false
  }
}

// ---- Export ----
const exportLoading = ref(false)

async function handleExport() {
  exportLoading.value = true
  try {
    const blob = await opportunityApi.exportCsv()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `opportunities_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success('瀵煎嚭鎴愬姛')
  } catch {
    // Error handled by request interceptor
  } finally {
    exportLoading.value = false
  }
}

// ---- Advance Stage Dialog ----
const stageDialogVisible = ref(false)
const stageSubmitLoading = ref(false)
const targetStage = ref<OpportunityStage>(OpportunityStage.LEAD)
const stageTargetId = ref<number | null>(null)
const stageCurrentStage = ref<OpportunityStage>(OpportunityStage.LEAD)

const stageCurrentLabel = computed(() => getStageLabel(stageCurrentStage.value))

function handleAdvanceStage(row: OpportunityVO) {
  stageTargetId.value = row.id
  stageCurrentStage.value = row.stage
  targetStage.value = row.stage
  stageDialogVisible.value = true
}

async function handleStageSubmit() {
  if (stageTargetId.value === null) return
  stageSubmitLoading.value = true
  try {
    await opportunityApi.updateStage(stageTargetId.value, { stage: targetStage.value })
    ElMessage.success('闃舵鏇存柊鎴愬姛')
    stageDialogVisible.value = false
    fetchList()
    if (viewMode.value === 'kanban') {
      fetchKanbanData()
    }
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
    ElMessage.success('鍒犻櫎鎴愬姛')
    if (tableData.value.length === 1 && pagination.page > 1) {
      pagination.page -= 1
    }
    fetchList()
    if (viewMode.value === 'kanban') {
      fetchKanbanData()
    }
  } catch {
    // Error handled by request interceptor
  }
}

// ---- Init ----
onMounted(() => {
  fetchList()
  if (route.query.createForCustomer) {
    handleCreate()
  }
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
  gap: 8px;
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

/* ==================== KANBAN STYLES ==================== */
.kanban-container {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  min-height: 500px;
}

.kanban-column {
  flex: 0 0 280px;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  border-radius: 8px;
  border-top: 3px solid #dcdfe6;
  min-height: 400px;
}

.kanban-column-header {
  padding: 12px 14px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
  border-radius: 8px 8px 0 0;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.column-count {
  font-size: 12px;
  color: #909399;
  background: #ebeef5;
  padding: 0 6px;
  border-radius: 10px;
  line-height: 18px;
}

.column-amount {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.kanban-column-body {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  max-height: calc(100vh - 280px);
  transition: background-color 0.2s;
}

.kanban-column-body.drag-over {
  background-color: #ecf5ff;
  border-radius: 0 0 8px 8px;
}

.kanban-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  cursor: grab;
  transition:
    box-shadow 0.2s,
    opacity 0.2s,
    transform 0.15s;
  border: 1px solid transparent;
}

.kanban-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  border-color: #c6e2ff;
}

.kanban-card.is-dragging {
  opacity: 0.5;
  transform: rotate(2deg);
  cursor: grabbing;
}

.kanban-card.is-updating {
  opacity: 0.7;
  cursor: not-allowed;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
  cursor: pointer;
  word-break: break-all;
}

.card-title:hover {
  color: #409eff;
}

.card-customer {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.card-customer .el-icon {
  font-size: 12px;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.card-amount {
  font-size: 13px;
  font-weight: 600;
  color: #e6a23c;
}

.card-probability {
  font-size: 11px;
  color: #909399;
}

.card-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 4px;
}

.card-date .el-icon {
  font-size: 12px;
}

.kanban-empty {
  text-align: center;
  padding: 32px 0;
  color: #c0c4cc;
  font-size: 13px;
}
</style>
