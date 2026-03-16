<template>
  <div class="settings-page">
    <el-card shadow="never" class="page-header-card">
      <div class="page-header">
        <span class="page-title">系统设置</span>
        <span class="page-subtitle">管理数据源和搜索字段配置</span>
      </div>
    </el-card>

    <el-card shadow="never" class="content-card">
      <el-tabs v-model="activeTab" class="settings-tabs">
        <!-- ==================== TAB 1: 数据源配置 ==================== -->
        <el-tab-pane label="数据源配置" name="datasource">
          <div class="tab-toolbar">
            <el-button type="primary" @click="handleAddDataSource">
              <el-icon><Plus /></el-icon>
              添加数据源
            </el-button>
            <el-button :loading="dsLoading" @click="loadDataSources">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>

          <el-table
            v-loading="dsLoading"
            :data="dataSources"
            row-key="id"
            stripe
            style="width: 100%"
          >
            <el-table-column prop="name" label="名称" min-width="140" show-overflow-tooltip />
            <el-table-column prop="channel" label="渠道" width="120">
              <template #default="{ row }">
                <el-tag :type="getChannelTagType(row.channel)" size="small">
                  {{ getChannelLabel(row.channel) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="isEnabled" label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">
                  {{ row.isEnabled ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="dailyQuota" label="每日配额" width="100" align="right" />
            <el-table-column label="今日/累计" width="120" align="right">
              <template #default="{ row }"> {{ row.usedToday }} / {{ row.totalUsed }} </template>
            </el-table-column>
            <el-table-column prop="lastCalledAt" label="最后调用时间" min-width="170">
              <template #default="{ row }">
                {{ row.lastCalledAt ? formatDateTime(row.lastCalledAt) : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">{{ row.remark || '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  link
                  size="small"
                  :loading="testingIds.has(row.id)"
                  @click="handleTestDataSource(row)"
                >
                  测试
                </el-button>
                <el-button type="info" link size="small" @click="handleEditDataSource(row)">
                  编辑
                </el-button>
                <el-button type="danger" link size="small" @click="handleDeleteDataSource(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- ==================== TAB 2: 搜索字段配置 ==================== -->
        <el-tab-pane label="搜索字段配置" name="filter">
          <div v-loading="fcLoading" class="filter-config-panel">
            <!-- Enabled Filters -->
            <div class="section-block">
              <div class="section-title">启用的筛选字段</div>
              <div class="section-desc">勾选后该字段会显示在线索搜索筛选栏中（关键词始终启用）</div>
              <el-checkbox-group v-model="enabledFilters" class="filter-checkbox-group">
                <el-checkbox
                  v-for="field in allFilterFields"
                  :key="field.key"
                  :value="field.key"
                  :disabled="field.key === 'keyword'"
                >
                  {{ field.label }}
                </el-checkbox>
              </el-checkbox-group>
            </div>

            <!-- Custom Filters -->
            <div class="section-block">
              <div class="section-header">
                <div>
                  <div class="section-title">自定义筛选字段</div>
                  <div class="section-desc">添加业务专属的自定义筛选条件</div>
                </div>
                <el-button type="primary" size="small" @click="handleAddCustomFilter">
                  <el-icon><Plus /></el-icon>
                  添加自定义字段
                </el-button>
              </div>

              <el-table
                :data="customFilters"
                row-key="key"
                stripe
                style="width: 100%; margin-top: 12px"
              >
                <el-table-column prop="key" label="字段 Key" min-width="140" />
                <el-table-column prop="label" label="显示名称" min-width="140" />
                <el-table-column prop="type" label="类型" width="110">
                  <template #default="{ row }">
                    <el-tag size="small" type="info">{{ getFilterTypeLabel(row.type) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="options"
                  label="选项值"
                  min-width="200"
                  show-overflow-tooltip
                >
                  <template #default="{ row }">
                    <span v-if="row.type === 'select' && row.options?.length">
                      {{ row.options.join('、') }}
                    </span>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="130" fixed="right">
                  <template #default="{ row }">
                    <el-button type="info" link size="small" @click="handleEditCustomFilter(row)">
                      编辑
                    </el-button>
                    <el-button
                      type="danger"
                      link
                      size="small"
                      @click="handleDeleteCustomFilter(row)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- Save -->
            <div class="section-actions">
              <el-button type="primary" :loading="fcSaving" @click="handleSaveFilterConfig">
                保存配置
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- ==================== TAB 3: AI 运营分析配置 ==================== -->
        <el-tab-pane label="AI 运营分析配置" name="ai-analysis">
          <div v-loading="aiLoading" class="ai-config-panel">
            <!-- Section 1: AI 功能开关 -->
            <div class="section-block">
              <div class="section-title">AI 功能开关</div>
              <div class="section-desc">启用或关闭各项 AI 智能分析功能</div>
              <el-form label-width="160px" label-position="right" class="ai-switch-form">
                <el-form-item label="通话智能分析">
                  <el-switch
                    v-model="aiForm.callAnalysisEnabled"
                    active-text="启用"
                    inactive-text="关闭"
                  />
                </el-form-item>
                <el-form-item label="自动客户分类">
                  <el-switch
                    v-model="aiForm.customerClassifyEnabled"
                    active-text="启用"
                    inactive-text="关闭"
                  />
                </el-form-item>
                <el-form-item label="话术评分">
                  <el-switch
                    v-model="aiForm.speechScoringEnabled"
                    active-text="启用"
                    inactive-text="关闭"
                  />
                </el-form-item>
                <el-form-item label="知识库比对">
                  <el-switch
                    v-model="aiForm.knowledgeCompareEnabled"
                    active-text="启用"
                    inactive-text="关闭"
                  />
                </el-form-item>
                <el-form-item label="自动创建商机">
                  <el-switch
                    v-model="aiForm.autoCreateOpportunity"
                    active-text="启用"
                    inactive-text="关闭"
                  />
                </el-form-item>
              </el-form>
            </div>

            <!-- Section 2: AI 模型配置 -->
            <div class="section-block">
              <div class="section-title">AI 模型配置</div>
              <div class="section-desc">选择用于分析和向量化的模型</div>
              <el-form label-width="100px" label-position="right" class="ai-model-form">
                <el-form-item label="聊天模型">
                  <el-select v-model="aiForm.chatModel" style="width: 260px">
                    <el-option
                      v-for="opt in chatModelOptions"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="向量模型">
                  <el-select v-model="aiForm.embeddingModel" style="width: 260px">
                    <el-option
                      v-for="opt in embeddingModelOptions"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </el-form-item>
              </el-form>
            </div>

            <!-- Section 3: 提示词模板 -->
            <div class="section-block">
              <div class="section-title">提示词模板</div>
              <div class="section-desc">自定义 AI 分析使用的提示词，留空则使用系统默认</div>
              <el-form label-width="140px" label-position="top" class="ai-prompt-form">
                <el-form-item label="通话分析提示词">
                  <el-input
                    v-model="aiForm.callAnalysisPrompt"
                    type="textarea"
                    :rows="4"
                    placeholder="留空使用系统默认提示词"
                  />
                  <el-button
                    size="small"
                    style="margin-top: 6px"
                    @click="resetPrompt('callAnalysisPrompt')"
                  >
                    重置为默认
                  </el-button>
                </el-form-item>
                <el-form-item label="客户分类提示词">
                  <el-input
                    v-model="aiForm.customerClassifyPrompt"
                    type="textarea"
                    :rows="4"
                    placeholder="留空使用系统默认提示词"
                  />
                  <el-button
                    size="small"
                    style="margin-top: 6px"
                    @click="resetPrompt('customerClassifyPrompt')"
                  >
                    重置为默认
                  </el-button>
                </el-form-item>
                <el-form-item label="话术评分提示词">
                  <el-input
                    v-model="aiForm.speechScoringPrompt"
                    type="textarea"
                    :rows="4"
                    placeholder="留空使用系统默认提示词"
                  />
                  <el-button
                    size="small"
                    style="margin-top: 6px"
                    @click="resetPrompt('speechScoringPrompt')"
                  >
                    重置为默认
                  </el-button>
                </el-form-item>
              </el-form>
            </div>

            <!-- Section 4: 分类规则映射 -->
            <div class="section-block">
              <div class="section-header">
                <div>
                  <div class="section-title">分类规则映射</div>
                  <div class="section-desc">定义 AI 分类结果与客户状态的映射关系</div>
                </div>
                <el-button type="primary" size="small" @click="handleAddClassifyRule">
                  <el-icon><Plus /></el-icon>
                  添加规则
                </el-button>
              </div>

              <el-table :data="aiForm.classifyRules" stripe style="width: 100%; margin-top: 12px">
                <el-table-column label="分类名" min-width="140">
                  <template #default="{ row }">
                    <el-input v-model="row.label" placeholder="分类名称" size="small" />
                  </template>
                </el-table-column>
                <el-table-column label="客户状态" min-width="150">
                  <template #default="{ row }">
                    <el-select v-model="row.customerStatus" size="small" style="width: 100%">
                      <el-option
                        v-for="opt in customerStatusOptions"
                        :key="opt.value"
                        :label="opt.label"
                        :value="opt.value"
                      />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="创建商机" width="100" align="center">
                  <template #default="{ row }">
                    <el-switch v-model="row.createOpportunity" />
                  </template>
                </el-table-column>
                <el-table-column label="标签（逗号分隔）" min-width="200">
                  <template #default="{ row }">
                    <el-input
                      :model-value="row.tags.join(',')"
                      placeholder="多个标签用英文逗号分隔"
                      size="small"
                      @update:model-value="
                        (v: string) => {
                          row.tags = v
                            .split(',')
                            .map((t: string) => t.trim())
                            .filter(Boolean)
                        }
                      "
                    />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="80" fixed="right">
                  <template #default="{ $index }">
                    <el-button
                      type="danger"
                      link
                      size="small"
                      @click="handleDeleteClassifyRule($index)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- Save -->
            <div class="section-actions">
              <el-button type="primary" :loading="aiSaving" @click="saveAiConfig">
                保存配置
              </el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- ==================== Data Source Dialog ==================== -->
    <el-dialog
      v-model="dsDialogVisible"
      :title="dsDialogMode === 'create' ? '添加数据源' : '编辑数据源'"
      width="560px"
      :close-on-click-modal="false"
      @closed="resetDsForm"
    >
      <el-form
        ref="dsFormRef"
        :model="dsForm"
        :rules="dsFormRules"
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="名称" prop="name">
          <el-input v-model="dsForm.name" placeholder="请输入数据源名称" maxlength="64" />
        </el-form-item>
        <el-form-item label="渠道" prop="channel">
          <el-select v-model="dsForm.channel" placeholder="请选择渠道" style="width: 100%">
            <el-option
              v-for="opt in channelOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="API Key" prop="apiKey">
          <el-input
            v-model="dsForm.apiKey"
            type="password"
            show-password
            :placeholder="dsDialogMode === 'edit' ? '留空保持不变' : '请输入 API Key'"
            autocomplete="new-password"
          />
        </el-form-item>
        <el-form-item label="API Secret">
          <el-input
            v-model="dsForm.apiSecret"
            type="password"
            show-password
            placeholder="选填"
            autocomplete="new-password"
          />
        </el-form-item>
        <el-form-item label="API Endpoint">
          <el-input v-model="dsForm.apiEndpoint" placeholder="选填，留空使用默认地址" clearable />
        </el-form-item>
        <el-form-item label="每日配额" prop="dailyQuota">
          <el-input-number
            v-model="dsForm.dailyQuota"
            :min="0"
            :max="100000"
            :step="100"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="dsForm.isEnabled" active-text="启用" inactive-text="禁用" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="dsForm.remark"
            type="textarea"
            :rows="2"
            placeholder="选填"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <!-- Test result alert -->
      <el-alert
        v-if="testResult"
        :type="testResult.success ? 'success' : 'error'"
        :title="testResult.success ? '连接成功' : '连接失败'"
        :description="testResult.message"
        :closable="true"
        show-icon
        style="margin-bottom: 12px"
        @close="testResult = null"
      />

      <template #footer>
        <div class="dialog-footer">
          <el-button
            v-if="dsDialogMode === 'edit'"
            :loading="testingDialog"
            @click="handleTestInDialog"
          >
            测试连接
          </el-button>
          <el-button @click="dsDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="dsSaving" @click="handleSubmitDataSource">
            {{ dsDialogMode === 'create' ? '添加' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ==================== Custom Filter Dialog ==================== -->
    <el-dialog
      v-model="cfDialogVisible"
      :title="cfDialogMode === 'create' ? '添加自定义字段' : '编辑自定义字段'"
      width="480px"
      :close-on-click-modal="false"
      @closed="resetCfForm"
    >
      <el-form
        ref="cfFormRef"
        :model="cfForm"
        :rules="cfFormRules"
        label-width="90px"
        label-position="right"
      >
        <el-form-item label="字段 Key" prop="key">
          <el-input
            v-model="cfForm.key"
            placeholder="英文标识，如 industry_type"
            maxlength="64"
            :disabled="cfDialogMode === 'edit'"
          />
        </el-form-item>
        <el-form-item label="显示名称" prop="label">
          <el-input v-model="cfForm.label" placeholder="用户看到的名称" maxlength="32" />
        </el-form-item>
        <el-form-item label="字段类型" prop="type">
          <el-select v-model="cfForm.type" placeholder="请选择" style="width: 100%">
            <el-option
              v-for="opt in filterTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="cfForm.type === 'select'" label="选项值" prop="optionsStr">
          <el-input
            v-model="cfForm.optionsStr"
            type="textarea"
            :rows="3"
            placeholder="多个选项用英文逗号分隔，如：科技,金融,制造"
          />
          <div class="form-hint">多个选项用英文逗号（,）分隔</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="cfDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitCustomFilter">
          {{ cfDialogMode === 'create' ? '添加' : '保存' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { ProspectChannel, CustomerStatus } from '@crm/shared'
import {
  dataSourceApi,
  filterConfigApi,
  type DataSourceVO,
  type DataSourcePayload,
  type CustomFilterVO,
} from '@/api/prospect-config'
import { analysisConfigApi, type AiAnalysisConfigVO, type ClassifyRule } from '@/api/ai-analysis'

// ==================== Tab ====================

const activeTab = ref<'datasource' | 'filter' | 'ai-analysis'>('datasource')

// ==================== Helpers ====================

function formatDateTime(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ==================== Channel options (exclude MOCK and MANUAL) ====================

interface SelectOption<T = string> {
  value: T
  label: string
}

const channelOptions: SelectOption<ProspectChannel>[] = [
  { value: ProspectChannel.TIANYANCHA, label: '天眼查' },
  { value: ProspectChannel.QICHACHA, label: '企查查' },
]

const channelLabelMap: Record<string, string> = {
  [ProspectChannel.TIANYANCHA]: '天眼查',
  [ProspectChannel.QICHACHA]: '企查查',
  [ProspectChannel.MANUAL]: '手动录入',
  [ProspectChannel.MOCK]: '模拟数据',
}

type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

function getChannelLabel(channel: ProspectChannel): string {
  return channelLabelMap[channel] ?? channel
}

function getChannelTagType(channel: ProspectChannel): TagType {
  const map: Record<string, TagType> = {
    [ProspectChannel.TIANYANCHA]: 'primary',
    [ProspectChannel.QICHACHA]: 'success',
    [ProspectChannel.MANUAL]: 'warning',
    [ProspectChannel.MOCK]: 'info',
  }
  return map[channel] ?? 'info'
}

// ==================== Filter type options ====================

const filterTypeOptions: SelectOption[] = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'select', label: '下拉选择' },
  { value: 'dateRange', label: '日期范围' },
]

function getFilterTypeLabel(type: string): string {
  return filterTypeOptions.find((o) => o.value === type)?.label ?? type
}

// ==================== AI Analysis Config — model options ====================

interface AiSelectOption {
  value: string
  label: string
}

const chatModelOptions: AiSelectOption[] = [
  { value: 'qwen-plus', label: 'Qwen Plus' },
  { value: 'qwen-turbo', label: 'Qwen Turbo' },
  { value: 'qwen-max', label: 'Qwen Max' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
]

const embeddingModelOptions: AiSelectOption[] = [
  { value: 'text-embedding-v3', label: 'text-embedding-v3' },
  { value: 'text-embedding-v2', label: 'text-embedding-v2' },
]

const customerStatusOptions: AiSelectOption[] = [
  { value: CustomerStatus.LEAD, label: '线索' },
  { value: CustomerStatus.POTENTIAL, label: '潜在客户' },
  { value: CustomerStatus.INTENTION, label: '有意向' },
  { value: CustomerStatus.OPPORTUNITY, label: '商机客户' },
  { value: CustomerStatus.DEAL, label: '成交客户' },
  { value: CustomerStatus.MAINTAIN, label: '维护期' },
  { value: CustomerStatus.INVALID, label: '无效客户' },
  { value: CustomerStatus.LOST, label: '已流失' },
]

// ==================== AI Analysis Config — reactive state ====================

interface AiFormState {
  callAnalysisEnabled: boolean
  customerClassifyEnabled: boolean
  speechScoringEnabled: boolean
  knowledgeCompareEnabled: boolean
  autoCreateOpportunity: boolean
  chatModel: string
  embeddingModel: string
  callAnalysisPrompt: string
  customerClassifyPrompt: string
  speechScoringPrompt: string
  classifyRules: ClassifyRule[]
}

const aiLoading = ref(false)
const aiSaving = ref(false)
const aiConfigLoaded = ref(false)

const aiForm = reactive<AiFormState>({
  callAnalysisEnabled: false,
  customerClassifyEnabled: false,
  speechScoringEnabled: false,
  knowledgeCompareEnabled: false,
  autoCreateOpportunity: false,
  chatModel: 'qwen-plus',
  embeddingModel: 'text-embedding-v3',
  callAnalysisPrompt: '',
  customerClassifyPrompt: '',
  speechScoringPrompt: '',
  classifyRules: [],
})

function applyAiConfig(config: AiAnalysisConfigVO) {
  aiForm.callAnalysisEnabled = config.callAnalysisEnabled
  aiForm.customerClassifyEnabled = config.customerClassifyEnabled
  aiForm.speechScoringEnabled = config.speechScoringEnabled
  aiForm.knowledgeCompareEnabled = config.knowledgeCompareEnabled
  aiForm.autoCreateOpportunity = config.autoCreateOpportunity
  aiForm.chatModel = config.chatModel
  aiForm.embeddingModel = config.embeddingModel
  aiForm.callAnalysisPrompt = config.callAnalysisPrompt ?? ''
  aiForm.customerClassifyPrompt = config.customerClassifyPrompt ?? ''
  aiForm.speechScoringPrompt = config.speechScoringPrompt ?? ''
  aiForm.classifyRules = (config.classifyRules ?? []).map((r) => ({ ...r, tags: [...r.tags] }))
}

async function loadAiConfig() {
  aiLoading.value = true
  try {
    const res = await analysisConfigApi.get()
    if (res.code === 0 && res.data) {
      applyAiConfig(res.data)
      aiConfigLoaded.value = true
    }
  } catch {
    // handled by request interceptor
  } finally {
    aiLoading.value = false
  }
}

async function saveAiConfig() {
  aiSaving.value = true
  try {
    const payload: Partial<AiAnalysisConfigVO> = {
      callAnalysisEnabled: aiForm.callAnalysisEnabled,
      customerClassifyEnabled: aiForm.customerClassifyEnabled,
      speechScoringEnabled: aiForm.speechScoringEnabled,
      knowledgeCompareEnabled: aiForm.knowledgeCompareEnabled,
      autoCreateOpportunity: aiForm.autoCreateOpportunity,
      chatModel: aiForm.chatModel,
      embeddingModel: aiForm.embeddingModel,
      callAnalysisPrompt: aiForm.callAnalysisPrompt || null,
      customerClassifyPrompt: aiForm.customerClassifyPrompt || null,
      speechScoringPrompt: aiForm.speechScoringPrompt || null,
      classifyRules: aiForm.classifyRules.map((r) => ({ ...r, tags: [...r.tags] })),
    }
    const res = await analysisConfigApi.update(payload)
    if (res.code === 0) {
      ElMessage.success('AI 分析配置已保存')
      if (res.data) {
        applyAiConfig(res.data)
      }
    }
  } catch {
    // handled by request interceptor
  } finally {
    aiSaving.value = false
  }
}

async function resetPrompt(
  field: 'callAnalysisPrompt' | 'customerClassifyPrompt' | 'speechScoringPrompt',
) {
  try {
    const res = await analysisConfigApi.getDefaultPrompts()
    if (res.code === 0 && res.data) {
      aiForm[field] = res.data[field]
      ElMessage.success('已重置为默认提示词')
    }
  } catch {
    // handled by request interceptor
  }
}

function handleAddClassifyRule() {
  aiForm.classifyRules.push({
    label: '',
    customerStatus: CustomerStatus.LEAD,
    createOpportunity: false,
    tags: [],
  })
}

function handleDeleteClassifyRule(index: number) {
  aiForm.classifyRules.splice(index, 1)
}

// Load AI config when tab is switched to ai-analysis
watch(activeTab, (tab) => {
  if (tab === 'ai-analysis' && !aiConfigLoaded.value && !aiLoading.value) {
    void loadAiConfig()
  }
})

// ==================== All standard filter fields ====================

interface FilterFieldDef {
  key: string
  label: string
}

const allFilterFields: FilterFieldDef[] = [
  { key: 'keyword', label: '关键词（始终启用）' },
  { key: 'industry', label: '行业' },
  { key: 'province', label: '省份' },
  { key: 'city', label: '城市' },
  { key: 'registeredCapital', label: '注册资本范围' },
  { key: 'employeeCount', label: '员工规模范围' },
  { key: 'establishDate', label: '成立日期范围' },
  { key: 'businessStatus', label: '经营状态' },
]

// ==================== Data Sources ====================

const dsLoading = ref(false)
const dataSources = ref<DataSourceVO[]>([])
const testingIds = ref(new Set<number>())

async function loadDataSources() {
  dsLoading.value = true
  try {
    const res = await dataSourceApi.getAll()
    if (res.code === 0 && res.data) {
      dataSources.value = res.data
    }
  } catch {
    // error already handled by request interceptor
  } finally {
    dsLoading.value = false
  }
}

async function handleTestDataSource(row: DataSourceVO) {
  testingIds.value.add(row.id)
  try {
    const res = await dataSourceApi.test(row.id)
    if (res.code === 0 && res.data) {
      if (res.data.success) {
        ElMessage.success(`[${row.name}] 连接测试成功`)
      } else {
        ElMessage.error(`[${row.name}] 测试失败：${res.data.message}`)
      }
    }
  } catch {
    // handled by interceptor
  } finally {
    testingIds.value.delete(row.id)
  }
}

async function handleDeleteDataSource(row: DataSourceVO) {
  try {
    await ElMessageBox.confirm(`确定要删除数据源「${row.name}」吗？删除后无法恢复。`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    const res = await dataSourceApi.remove(row.id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      await loadDataSources()
    }
  } catch {
    // handled by interceptor
  }
}

// ==================== Data Source Dialog ====================

const dsDialogVisible = ref(false)
const dsDialogMode = ref<'create' | 'edit'>('create')
const dsSaving = ref(false)
const testingDialog = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)
const dsFormRef = ref<FormInstance>()
const editingDsId = ref<number | null>(null)

interface DsFormState {
  name: string
  channel: ProspectChannel | ''
  apiKey: string
  apiSecret: string
  apiEndpoint: string
  dailyQuota: number
  isEnabled: boolean
  remark: string
}

const dsForm = reactive<DsFormState>({
  name: '',
  channel: '',
  apiKey: '',
  apiSecret: '',
  apiEndpoint: '',
  dailyQuota: 1000,
  isEnabled: true,
  remark: '',
})

const dsFormRules: FormRules = {
  name: [{ required: true, message: '请输入数据源名称', trigger: 'blur' }],
  channel: [{ required: true, message: '请选择渠道', trigger: 'change' }],
  apiKey: [
    {
      validator: (_rule, value: string, callback) => {
        if (dsDialogMode.value === 'create' && !value) {
          callback(new Error('请输入 API Key'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  dailyQuota: [{ required: true, message: '请设置每日配额', trigger: 'blur' }],
}

function handleAddDataSource() {
  dsDialogMode.value = 'create'
  editingDsId.value = null
  testResult.value = null
  dsDialogVisible.value = true
}

function handleEditDataSource(row: DataSourceVO) {
  dsDialogMode.value = 'edit'
  editingDsId.value = row.id
  testResult.value = null
  dsForm.name = row.name
  dsForm.channel = row.channel
  dsForm.apiKey = '' // don't pre-fill masked key — user must re-enter to change
  dsForm.apiSecret = ''
  dsForm.apiEndpoint = row.apiEndpoint ?? ''
  dsForm.dailyQuota = row.dailyQuota
  dsForm.isEnabled = row.isEnabled
  dsForm.remark = row.remark ?? ''
  dsDialogVisible.value = true
}

function resetDsForm() {
  dsForm.name = ''
  dsForm.channel = ''
  dsForm.apiKey = ''
  dsForm.apiSecret = ''
  dsForm.apiEndpoint = ''
  dsForm.dailyQuota = 1000
  dsForm.isEnabled = true
  dsForm.remark = ''
  testResult.value = null
  editingDsId.value = null
  dsFormRef.value?.clearValidate()
}

async function handleTestInDialog() {
  if (editingDsId.value === null) return
  testingDialog.value = true
  testResult.value = null
  try {
    const res = await dataSourceApi.test(editingDsId.value)
    if (res.code === 0 && res.data) {
      testResult.value = res.data
    }
  } catch {
    testResult.value = { success: false, message: '请求失败，请检查网络' }
  } finally {
    testingDialog.value = false
  }
}

async function handleSubmitDataSource() {
  const valid = await dsFormRef.value?.validate().catch(() => false)
  if (!valid) return

  const payload: DataSourcePayload = {
    name: dsForm.name,
    channel: dsForm.channel as ProspectChannel,
    apiEndpoint: dsForm.apiEndpoint || null,
    dailyQuota: dsForm.dailyQuota,
    isEnabled: dsForm.isEnabled,
    remark: dsForm.remark || null,
  }
  // Only include apiKey/apiSecret if user actually entered new values
  if (dsForm.apiKey) payload.apiKey = dsForm.apiKey
  if (dsForm.apiSecret) payload.apiSecret = dsForm.apiSecret
  // For create, apiKey is always required (validated by form rules)

  dsSaving.value = true
  try {
    if (dsDialogMode.value === 'create') {
      const res = await dataSourceApi.create(payload)
      if (res.code === 0) {
        ElMessage.success('数据源添加成功')
        dsDialogVisible.value = false
        await loadDataSources()
      }
    } else if (editingDsId.value !== null) {
      const res = await dataSourceApi.update(editingDsId.value, payload)
      if (res.code === 0) {
        ElMessage.success('数据源更新成功')
        dsDialogVisible.value = false
        await loadDataSources()
      }
    }
  } catch {
    // handled by interceptor
  } finally {
    dsSaving.value = false
  }
}

// ==================== Filter Config ====================

const fcLoading = ref(false)
const fcSaving = ref(false)
const enabledFilters = ref<string[]>(['keyword'])
const customFilters = ref<CustomFilterVO[]>([])

async function loadFilterConfig() {
  fcLoading.value = true
  try {
    const res = await filterConfigApi.get()
    if (res.code === 0 && res.data) {
      // keyword is always enabled
      const filters = res.data.enabledFilters.includes('keyword')
        ? res.data.enabledFilters
        : ['keyword', ...res.data.enabledFilters]
      enabledFilters.value = filters
      customFilters.value = res.data.customFilters ?? []
    }
  } catch {
    // handled by interceptor
  } finally {
    fcLoading.value = false
  }
}

async function handleSaveFilterConfig() {
  // Ensure keyword is always present
  const filters = enabledFilters.value.includes('keyword')
    ? enabledFilters.value
    : ['keyword', ...enabledFilters.value]

  fcSaving.value = true
  try {
    const res = await filterConfigApi.update({
      enabledFilters: filters,
      customFilters: customFilters.value,
    })
    if (res.code === 0) {
      ElMessage.success('筛选字段配置已保存')
      // Sync back the response if available
      if (res.data) {
        enabledFilters.value = res.data.enabledFilters.includes('keyword')
          ? res.data.enabledFilters
          : ['keyword', ...res.data.enabledFilters]
        customFilters.value = res.data.customFilters ?? []
      }
    }
  } catch {
    // handled by interceptor
  } finally {
    fcSaving.value = false
  }
}

// ==================== Custom Filter Dialog ====================

const cfDialogVisible = ref(false)
const cfDialogMode = ref<'create' | 'edit'>('create')
const cfFormRef = ref<FormInstance>()
const editingCfKey = ref<string | null>(null)

interface CfFormState {
  key: string
  label: string
  type: CustomFilterVO['type'] | ''
  optionsStr: string
}

const cfForm = reactive<CfFormState>({
  key: '',
  label: '',
  type: '',
  optionsStr: '',
})

const cfFormRules: FormRules = {
  key: [
    { required: true, message: '请输入字段 Key', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      message: '只允许英文字母、数字和下划线，且不以数字开头',
      trigger: 'blur',
    },
  ],
  label: [{ required: true, message: '请输入显示名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择字段类型', trigger: 'change' }],
  optionsStr: [
    {
      validator: (_rule, value: string, callback) => {
        if (cfForm.type === 'select' && !value.trim()) {
          callback(new Error('下拉类型必须填写至少一个选项'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

function handleAddCustomFilter() {
  cfDialogMode.value = 'create'
  editingCfKey.value = null
  cfDialogVisible.value = true
}

function handleEditCustomFilter(row: CustomFilterVO) {
  cfDialogMode.value = 'edit'
  editingCfKey.value = row.key
  cfForm.key = row.key
  cfForm.label = row.label
  cfForm.type = row.type
  cfForm.optionsStr = row.options?.join(',') ?? ''
  cfDialogVisible.value = true
}

function resetCfForm() {
  cfForm.key = ''
  cfForm.label = ''
  cfForm.type = ''
  cfForm.optionsStr = ''
  editingCfKey.value = null
  cfFormRef.value?.clearValidate()
}

async function handleDeleteCustomFilter(row: CustomFilterVO) {
  try {
    await ElMessageBox.confirm(`确定要删除自定义字段「${row.label}」吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  customFilters.value = customFilters.value.filter((f) => f.key !== row.key)
  ElMessage.success('已删除，点击"保存配置"后生效')
}

async function handleSubmitCustomFilter() {
  const valid = await cfFormRef.value?.validate().catch(() => false)
  if (!valid) return

  const newFilter: CustomFilterVO = {
    key: cfForm.key,
    label: cfForm.label,
    type: cfForm.type as CustomFilterVO['type'],
    options:
      cfForm.type === 'select' && cfForm.optionsStr.trim()
        ? cfForm.optionsStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
  }

  if (cfDialogMode.value === 'create') {
    const exists = customFilters.value.some((f) => f.key === newFilter.key)
    if (exists) {
      ElMessage.error(`字段 Key "${newFilter.key}" 已存在`)
      return
    }
    customFilters.value.push(newFilter)
    ElMessage.success('已添加，点击"保存配置"后生效')
  } else {
    const idx = customFilters.value.findIndex((f) => f.key === editingCfKey.value)
    if (idx !== -1) {
      customFilters.value[idx] = newFilter
    }
    ElMessage.success('已更新，点击"保存配置"后生效')
  }

  cfDialogVisible.value = false
}

// ==================== Init ====================

onMounted(async () => {
  await Promise.all([loadDataSources(), loadFilterConfig()])
})
</script>

<style scoped>
.settings-page {
  padding: 0;
}

.page-header-card {
  margin-bottom: 16px;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.page-subtitle {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.content-card {
  min-height: 500px;
}

.settings-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.tab-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-config-panel {
  max-width: 900px;
}

.section-block {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.section-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 12px;
}

.filter-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
}

.filter-checkbox-group :deep(.el-checkbox) {
  margin-right: 0;
}

.section-actions {
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  margin-top: 24px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.form-hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-top: 4px;
  line-height: 1.4;
}

.ai-config-panel {
  max-width: 900px;
}

.ai-switch-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.ai-model-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.ai-prompt-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.ai-prompt-form :deep(.el-form-item__label) {
  font-weight: 500;
  margin-bottom: 6px;
}
</style>
