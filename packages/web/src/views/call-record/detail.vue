<template>
  <div class="call-record-detail-page">
    <!-- Breadcrumb & Back -->
    <div class="page-header">
      <el-button text @click="$router.push('/call-record')">
        <el-icon><ArrowLeft /></el-icon>
        返回通话列表
      </el-button>
    </div>

    <!-- Loading skeleton -->
    <el-skeleton v-if="loading" :rows="8" animated />

    <!-- Main content -->
    <template v-else-if="record">
      <!-- Basic Info Card -->
      <el-card shadow="never" class="info-card">
        <template #header>
          <div class="card-header">
            <span class="card-header-title">通话详情</span>
            <div class="card-header-actions">
              <el-button
                v-if="record.notes && !record.aiSummary && !summarizing"
                type="success"
                size="small"
                @click="handleSummarize"
              >
                <el-icon><MagicStick /></el-icon>
                生成AI摘要
              </el-button>
              <el-button type="primary" size="small" @click="handleEdit">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-popconfirm
                title="确定要删除该通话记录吗？"
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
          <el-descriptions-item label="关联客户">
            <el-button
              v-if="customerName"
              type="primary"
              link
              @click="$router.push(`/customer/${record.customerId}`)"
            >
              {{ customerName }}
            </el-button>
            <span v-else>ID: {{ record.customerId }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="关联商机">
            <el-button
              v-if="record.opportunityId && opportunityTitle"
              type="primary"
              link
              @click="$router.push(`/opportunity/${record.opportunityId}`)"
            >
              {{ opportunityTitle }}
            </el-button>
            <el-button
              v-else-if="record.opportunityId"
              type="primary"
              link
              @click="$router.push(`/opportunity/${record.opportunityId}`)"
            >
              商机 #{{ record.opportunityId }}
            </el-button>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="通话时间">
            {{ formatDate(record.callAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="通话时长">
            <el-tag type="info" size="small">
              {{ formatDuration(record.duration) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="记录人">
            {{ userName ?? `ID: ${record.userId}` }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(record.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="record.recordingUrl" label="录音" :span="3">
            <el-link type="primary" :href="record.recordingUrl" target="_blank">
              <el-icon><Headset /></el-icon>
              播放录音
            </el-link>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Notes Card -->
      <el-card shadow="never" class="content-card">
        <template #header>
          <div class="card-header">
            <span class="card-header-title">通话备注</span>
          </div>
        </template>
        <div v-if="record.notes" class="notes-content">
          {{ record.notes }}
        </div>
        <el-empty v-else description="暂无备注" :image-size="60" />
      </el-card>

      <!-- AI Summary Card -->
      <el-card shadow="never" class="content-card">
        <template #header>
          <div class="card-header">
            <span class="card-header-title">
              <el-icon><MagicStick /></el-icon>
              AI 智能摘要
            </span>
            <el-tag v-if="summarizing" type="warning" size="small">
              <el-icon class="is-loading">
                <Loading />
              </el-icon>
              生成中...
            </el-tag>
          </div>
        </template>
        <div v-if="record.aiSummary" class="ai-summary-content">
          {{ record.aiSummary }}
        </div>
        <el-empty v-else-if="!summarizing" description="暂无AI摘要" :image-size="60">
          <el-button v-if="record.notes" type="primary" size="small" @click="handleSummarize">
            生成AI摘要
          </el-button>
        </el-empty>
        <div v-else class="summarizing-placeholder">
          <el-skeleton :rows="3" animated />
        </div>
      </el-card>

      <!-- AI Analysis Card -->
      <el-card shadow="never" class="content-card">
        <template #header>
          <div class="card-header">
            <span class="card-header-title">
              <el-icon><DataAnalysis /></el-icon>
              AI 智能分析
            </span>
            <div class="card-header-actions">
              <el-tag
                v-if="analysisResult"
                :type="
                  analysisResult.status === AnalysisStatus.COMPLETED
                    ? 'success'
                    : analysisResult.status === AnalysisStatus.FAILED
                      ? 'danger'
                      : analysisResult.status === AnalysisStatus.APPLIED
                        ? 'info'
                        : 'warning'
                "
                size="small"
              >
                {{
                  analysisResult.status === AnalysisStatus.COMPLETED
                    ? '已完成'
                    : analysisResult.status === AnalysisStatus.FAILED
                      ? '分析失败'
                      : analysisResult.status === AnalysisStatus.APPLIED
                        ? '已应用'
                        : '分析中'
                }}
              </el-tag>
              <el-button type="primary" size="small" :loading="analyzing" @click="triggerAnalysis">
                <el-icon v-if="!analyzing"><Promotion /></el-icon>
                触发分析
              </el-button>
            </div>
          </div>
        </template>

        <!-- Analysis Results -->
        <template v-if="analysisResult">
          <el-descriptions :column="2" border size="small" class="analysis-descriptions">
            <!-- Customer category -->
            <el-descriptions-item v-if="analysisResult.customerClassify" label="客户分类">
              <el-tag type="primary" size="small">{{ analysisResult.customerClassify }}</el-tag>
              <span v-if="analysisResult.classifyConfidence != null" class="confidence-text">
                {{ Math.round(analysisResult.classifyConfidence * 100) }}% 置信度
              </span>
            </el-descriptions-item>

            <!-- Suggested status -->
            <el-descriptions-item v-if="analysisResult.suggestedStatus" label="建议状态">
              <span>{{ analysisResult.suggestedStatus }}</span>
              <el-tag
                v-if="analysisResult.appliedAt"
                type="success"
                size="small"
                class="applied-tag"
              >
                <el-icon><Check /></el-icon>
                已应用
              </el-tag>
            </el-descriptions-item>

            <!-- Suggested tags -->
            <el-descriptions-item
              v-if="analysisResult.suggestedTags && analysisResult.suggestedTags.length"
              label="建议标签"
              :span="2"
            >
              <el-tag
                v-for="tag in analysisResult.suggestedTags"
                :key="tag"
                size="small"
                class="tag-item"
              >
                {{ tag }}
              </el-tag>
            </el-descriptions-item>

            <!-- Auto opportunity -->
            <el-descriptions-item v-if="analysisResult.opportunityCreated" label="自动商机">
              <el-link type="primary" @click="$router.push('/opportunity')">
                <el-icon><Connection /></el-icon>
                已自动创建商机
              </el-link>
            </el-descriptions-item>
          </el-descriptions>

          <!-- Speech score -->
          <template v-if="analysisResult.speechScore != null">
            <el-divider content-position="left" class="section-divider">话术评分</el-divider>
            <div class="score-section">
              <div class="score-label">
                <span>评分</span>
                <strong>{{ analysisResult.speechScore }} / 100</strong>
              </div>
              <el-progress
                :percentage="analysisResult.speechScore"
                :color="
                  analysisResult.speechScore >= 80
                    ? '#67c23a'
                    : analysisResult.speechScore >= 60
                      ? '#e6a23c'
                      : '#f56c6c'
                "
                :stroke-width="10"
              />
            </div>
            <div v-if="analysisResult.speechFeedback" class="feedback-block">
              {{ analysisResult.speechFeedback }}
            </div>
          </template>

          <!-- Knowledge coverage -->
          <template v-if="analysisResult.knowledgeMatchRate != null">
            <el-divider content-position="left" class="section-divider">知识库匹配</el-divider>
            <div class="score-section">
              <div class="score-label">
                <span>覆盖率</span>
                <strong>{{ Math.round(analysisResult.knowledgeMatchRate * 100) }}%</strong>
              </div>
              <el-progress
                :percentage="Math.round(analysisResult.knowledgeMatchRate * 100)"
                :color="
                  analysisResult.knowledgeMatchRate >= 0.8
                    ? '#67c23a'
                    : analysisResult.knowledgeMatchRate >= 0.5
                      ? '#e6a23c'
                      : '#f56c6c'
                "
                :stroke-width="10"
              />
            </div>
            <div
              v-if="analysisResult.knowledgeGaps && analysisResult.knowledgeGaps.length"
              class="knowledge-gaps"
            >
              <span class="gaps-label">未覆盖知识点：</span>
              <el-tag
                v-for="gap in analysisResult.knowledgeGaps"
                :key="gap"
                type="warning"
                size="small"
                class="tag-item"
              >
                {{ gap }}
              </el-tag>
            </div>
          </template>

          <!-- AI summary -->
          <template v-if="analysisResult.summary">
            <el-divider content-position="left" class="section-divider">AI分析摘要</el-divider>
            <div class="analysis-summary-block">{{ analysisResult.summary }}</div>
          </template>

          <el-divider />

          <!-- Manual note & apply -->
          <div class="manual-section">
            <div class="manual-section-title">销售手动备注</div>
            <el-input
              v-model="manualNote"
              type="textarea"
              :rows="3"
              placeholder="请输入手动备注..."
              class="manual-note-input"
            />
            <div class="manual-section-actions">
              <el-button size="small" @click="saveNote">保存备注</el-button>
              <el-button
                v-if="
                  isAdminOrManager &&
                  analysisResult.status === AnalysisStatus.COMPLETED &&
                  !analysisResult.appliedAt
                "
                type="primary"
                size="small"
                @click="applyResult"
              >
                手动应用
              </el-button>
            </div>
          </div>
        </template>

        <el-empty v-else-if="!analyzing" description="暂无AI分析结果" :image-size="60">
          <el-button type="primary" size="small" @click="triggerAnalysis">触发分析</el-button>
        </el-empty>
        <div v-else class="summarizing-placeholder">
          <el-skeleton :rows="4" animated />
        </div>
      </el-card>

      <!-- Edit Dialog -->
      <el-dialog
        v-model="editDialogVisible"
        title="编辑通话记录"
        width="600px"
        :close-on-click-modal="false"
        @closed="handleEditDialogClosed"
      >
        <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-width="90px"
          label-position="right"
        >
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="关联客户" prop="customerId">
                <el-select
                  v-model="formData.customerId"
                  filterable
                  remote
                  :remote-method="searchCustomers"
                  placeholder="搜索并选择客户"
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
              <el-form-item label="关联商机" prop="opportunityId">
                <el-select
                  v-model="formData.opportunityId"
                  filterable
                  remote
                  :remote-method="searchOpportunities"
                  placeholder="搜索并选择商机（可选）"
                  clearable
                  style="width: 100%"
                  :loading="opportunitySearchLoading"
                >
                  <el-option
                    v-for="o in opportunityOptions"
                    :key="o.id"
                    :label="o.title"
                    :value="o.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="通话时间" prop="callAt">
                <el-date-picker
                  v-model="formData.callAt"
                  type="datetime"
                  placeholder="请选择通话时间"
                  value-format="YYYY-MM-DDTHH:mm:ss"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="分钟" prop="durationMin">
                <el-input-number
                  v-model="formData.durationMin"
                  :min="0"
                  :max="999"
                  :controls="false"
                  style="width: 100%"
                  placeholder="分钟"
                />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="秒" prop="durationSec">
                <el-input-number
                  v-model="formData.durationSec"
                  :min="0"
                  :max="59"
                  :controls="false"
                  style="width: 100%"
                  placeholder="秒"
                />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="备注" prop="notes">
                <el-input
                  v-model="formData.notes"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入通话备注"
                />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="录音链接" prop="recordingUrl">
                <el-input
                  v-model="formData.recordingUrl"
                  placeholder="请输入录音文件URL（可选）"
                  maxlength="500"
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
    <el-empty v-else description="通话记录不存在或已被删除" :image-size="120">
      <el-button type="primary" @click="$router.push('/call-record')"> 返回通话列表 </el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  ArrowLeft,
  Edit,
  Delete,
  MagicStick,
  Headset,
  Loading,
  DataAnalysis,
  Promotion,
  Check,
  Connection,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { callRecordApi, type CallRecordVO, type UpdateCallRecordParams } from '@/api/call-record'
import { customerApi, type CustomerVO } from '@/api/customer'
import { opportunityApi, type OpportunityVO } from '@/api/opportunity'
import { formatDate, formatDuration } from '@/utils/format'
import { callAnalysisApi, type CallAnalysisResultVO } from '@/api/ai-analysis'
import { AnalysisStatus } from '@crm/shared'
import { usePermission } from '@/composables/usePermission'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { isAdminOrManager } = usePermission()

// ---- State ----
const loading = ref(true)
const record = ref<CallRecordVO | null>(null)
const customerName = ref('')
const opportunityTitle = ref('')
const userName = ref('')

const recordId = computed(() => Number(route.params.id))

// ---- Data Fetching ----
async function fetchRecord() {
  loading.value = true
  try {
    const res = await callRecordApi.getDetail(recordId.value)
    if (res?.data) {
      record.value = res.data
      // Resolve related names
      await resolveRelatedNames(res.data)
    }
  } catch {
    // Error handled by request interceptor
  } finally {
    loading.value = false
  }
}

async function resolveRelatedNames(data: CallRecordVO) {
  const tasks: Promise<void>[] = []

  // Resolve customer name
  tasks.push(
    customerApi
      .getDetail(data.customerId)
      .then((res) => {
        if (res?.data) {
          customerName.value = res.data.name + (res.data.company ? ` (${res.data.company})` : '')
        }
      })
      .catch(() => {
        // Silently fail
      }),
  )

  // Resolve opportunity title
  if (data.opportunityId) {
    if (data.opportunity?.title) {
      opportunityTitle.value = data.opportunity.title
    } else {
      tasks.push(
        opportunityApi
          .getDetail(data.opportunityId)
          .then((res) => {
            if (res?.data) {
              opportunityTitle.value = res.data.title
            }
          })
          .catch(() => {
            // Silently fail
          }),
      )
    }
  }

  // Resolve user name
  userName.value = userStore.userInfo?.name ?? ''

  await Promise.all(tasks)
}

// ---- AI Summary ----
const summarizing = ref(false)
let summaryTimerId: ReturnType<typeof setTimeout> | null = null

async function handleSummarize() {
  if (!record.value) return
  try {
    summarizing.value = true
    await callRecordApi.summarize(record.value.id)
    ElMessage.success('AI 摘要生成任务已提交，正在等待结果...')
    pollForSummary(record.value.id)
  } catch {
    summarizing.value = false
  }
}

async function pollForSummary(id: number, attempt = 0) {
  const delays = [3000, 5000, 8000, 12000, 18000]
  const maxAttempts = delays.length

  if (attempt >= maxAttempts) {
    summarizing.value = false
    ElMessage.warning('AI 摘要生成较慢，请稍后手动刷新查看结果')
    return
  }

  summaryTimerId = setTimeout(async () => {
    try {
      const res = await callRecordApi.getDetail(id)
      if (res?.data?.aiSummary) {
        summarizing.value = false
        if (record.value) {
          record.value = { ...record.value, aiSummary: res.data.aiSummary }
        }
        ElMessage.success('AI 摘要已生成')
      } else {
        pollForSummary(id, attempt + 1)
      }
    } catch {
      pollForSummary(id, attempt + 1)
    }
  }, delays[attempt])
}

// ---- Edit Dialog ----
const editDialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

interface CallRecordForm {
  customerId: number | undefined
  opportunityId: number | undefined
  callAt: string
  durationMin: number
  durationSec: number
  notes: string
  recordingUrl: string
}

const defaultForm = (): CallRecordForm => ({
  customerId: undefined,
  opportunityId: undefined,
  callAt: '',
  durationMin: 0,
  durationSec: 0,
  notes: '',
  recordingUrl: '',
})

const formData = reactive<CallRecordForm>(defaultForm())

const formRules: FormRules = {
  customerId: [{ required: true, message: '请选择关联客户', trigger: 'change' }],
  callAt: [{ required: true, message: '请选择通话时间', trigger: 'change' }],
}

// ---- Customer Search ----
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

// ---- Opportunity Search ----
const opportunitySearchLoading = ref(false)
const opportunityOptions = ref<OpportunityVO[]>([])

async function searchOpportunities(query: string) {
  if (!query) {
    opportunityOptions.value = []
    return
  }
  opportunitySearchLoading.value = true
  try {
    const res = await opportunityApi.getList({ keyword: query, page: 1, pageSize: 20 })
    if (res?.data) {
      opportunityOptions.value = res.data.list
    }
  } catch {
    opportunityOptions.value = []
  } finally {
    opportunitySearchLoading.value = false
  }
}

function handleEdit() {
  if (!record.value) return
  const totalSec = record.value.duration ?? 0
  Object.assign(formData, {
    customerId: record.value.customerId,
    opportunityId: record.value.opportunityId ?? undefined,
    callAt: record.value.callAt ? record.value.callAt.replace(' ', 'T').slice(0, 19) : '',
    durationMin: Math.floor(totalSec / 60),
    durationSec: totalSec % 60,
    notes: record.value.notes ?? '',
    recordingUrl: record.value.recordingUrl ?? '',
  })
  // Pre-set customer option
  if (customerName.value) {
    customerOptions.value = [
      {
        id: record.value.customerId,
        name: customerName.value,
      },
    ] as CustomerVO[]
  }
  // Pre-set opportunity option
  if (record.value.opportunityId && opportunityTitle.value) {
    opportunityOptions.value = [
      {
        id: record.value.opportunityId,
        title: opportunityTitle.value,
      },
    ] as OpportunityVO[]
  }
  editDialogVisible.value = true
}

function handleEditDialogClosed() {
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  if (!formRef.value || !record.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const duration = (formData.durationMin ?? 0) * 60 + (formData.durationSec ?? 0)

  submitLoading.value = true
  try {
    const params: UpdateCallRecordParams = {
      customerId: formData.customerId,
      opportunityId: formData.opportunityId || undefined,
      userId: userStore.userInfo?.id ?? 1,
      callAt: formData.callAt,
      duration,
      notes: formData.notes || undefined,
      recordingUrl: formData.recordingUrl || undefined,
    }
    await callRecordApi.update(recordId.value, params)
    ElMessage.success('通话记录更新成功')
    editDialogVisible.value = false
    fetchRecord()
  } catch {
    // Error handled by request interceptor
  } finally {
    submitLoading.value = false
  }
}

// ---- AI Analysis ----
const analysisResult = ref<CallAnalysisResultVO | null>(null)
const analyzing = ref(false)
const manualNote = ref('')
let analysisTimerId: ReturnType<typeof setTimeout> | null = null

async function loadAnalysisResult() {
  try {
    const res = await callAnalysisApi.getResult(recordId.value)
    if (res?.data) {
      analysisResult.value = res.data
      manualNote.value = res.data.manualNote ?? ''
    }
  } catch (err: unknown) {
    // 404 means no analysis yet — handle gracefully
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status !== 404) {
      // Re-throw unexpected errors so the request interceptor can log them
      throw err
    }
  }
}

async function triggerAnalysis() {
  if (!record.value) return
  analyzing.value = true
  try {
    await callAnalysisApi.trigger(record.value.id)
    ElMessage.success('AI 分析任务已提交，正在等待结果...')
    pollForAnalysis(record.value.id)
  } catch {
    analyzing.value = false
  }
}

async function pollForAnalysis(id: number, attempt = 0) {
  const delays = [3000, 5000, 8000, 12000, 18000]
  const maxAttempts = delays.length

  if (attempt >= maxAttempts) {
    analyzing.value = false
    ElMessage.warning('AI 分析较慢，请稍后手动刷新查看结果')
    return
  }

  analysisTimerId = setTimeout(async () => {
    try {
      const res = await callAnalysisApi.getResult(id)
      if (res?.data) {
        const result = res.data
        if (
          result.status === AnalysisStatus.COMPLETED ||
          result.status === AnalysisStatus.APPLIED ||
          result.status === AnalysisStatus.FAILED
        ) {
          analyzing.value = false
          analysisResult.value = result
          manualNote.value = result.manualNote ?? ''
          if (result.status === AnalysisStatus.FAILED) {
            ElMessage.error('AI 分析失败，请稍后重试')
          } else {
            ElMessage.success('AI 分析已完成')
          }
        } else {
          pollForAnalysis(id, attempt + 1)
        }
      } else {
        pollForAnalysis(id, attempt + 1)
      }
    } catch {
      pollForAnalysis(id, attempt + 1)
    }
  }, delays[attempt])
}

async function saveNote() {
  if (!analysisResult.value) return
  try {
    const res = await callAnalysisApi.addNote(analysisResult.value.id, manualNote.value)
    if (res?.data) {
      analysisResult.value = res.data
    }
    ElMessage.success('备注已保存')
  } catch {
    // Error handled by request interceptor
  }
}

async function applyResult() {
  if (!analysisResult.value) return
  try {
    await ElMessageBox.confirm('确定要将AI分析建议应用到该通话记录吗？', '确认应用', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const res = await callAnalysisApi.apply(analysisResult.value.id)
    if (res?.data) {
      analysisResult.value = res.data
    }
    ElMessage.success('AI 分析建议已应用')
  } catch {
    // Cancelled or error handled by request interceptor
  }
}

// ---- Delete ----
async function handleDelete() {
  try {
    await callRecordApi.remove(recordId.value)
    ElMessage.success('删除成功')
    router.push('/call-record')
  } catch {
    // Error handled by request interceptor
  }
}

// ---- Init ----
onMounted(() => {
  if (isNaN(recordId.value)) {
    loading.value = false
    return
  }
  fetchRecord()
  loadAnalysisResult()
})

onBeforeUnmount(() => {
  if (summaryTimerId) clearTimeout(summaryTimerId)
  if (analysisTimerId) clearTimeout(analysisTimerId)
})
</script>

<style scoped>
.call-record-detail-page {
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

.info-card :deep(.el-descriptions__cell) {
  padding: 12px 16px;
}

.content-card {
  margin-bottom: 0;
}

.notes-content {
  font-size: 14px;
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-summary-content {
  font-size: 14px;
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f5f7fa;
  padding: 16px;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}

.summarizing-placeholder {
  padding: 12px 0;
}

.analysis-descriptions {
  margin-bottom: 8px;
}

.confidence-text {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}

.applied-tag {
  margin-left: 8px;
}

.tag-item {
  margin-right: 6px;
  margin-bottom: 4px;
}

.section-divider {
  margin: 16px 0 12px;
}

.score-section {
  margin-bottom: 12px;
}

.score-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
  color: #606266;
}

.score-label strong {
  color: #303133;
}

.feedback-block {
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  margin-top: 8px;
}

.knowledge-gaps {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.gaps-label {
  font-size: 13px;
  color: #606266;
}

.analysis-summary-block {
  font-size: 14px;
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f0f9eb;
  padding: 14px;
  border-radius: 6px;
  border-left: 3px solid #67c23a;
}

.manual-section {
  margin-top: 4px;
}

.manual-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}

.manual-note-input {
  margin-bottom: 10px;
}

.manual-section-actions {
  display: flex;
  gap: 8px;
}
</style>
