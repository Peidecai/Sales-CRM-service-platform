<template>
  <div class="ai-config-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>AI 模型配置</span>
          <el-button type="primary" size="small" @click="loadConfigs">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="configs" stripe>
        <el-table-column prop="module" label="模块" width="160">
          <template #default="{ row }">
            <span class="module-name">{{ MODULE_LABELS[row.module] ?? row.module }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="provider" label="提供商" width="160">
          <template #default="{ row }">
            <el-tag
              :type="(PROVIDER_TAG_TYPE[row.provider] ?? 'info') as TagType"
              size="small"
              effect="plain"
            >
              {{ PROVIDER_LABELS[row.provider] ?? row.provider }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="model" label="模型" width="200">
          <template #default="{ row }">
            {{ getModelLabel(row.provider, row.model) }}
          </template>
        </el-table-column>
        <el-table-column prop="temperature" label="温度" width="80" />
        <el-table-column prop="maxTokens" label="最大Token" width="110" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Edit Drawer -->
    <el-drawer v-model="drawerVisible" title="编辑模型配置" size="500px">
      <el-form v-if="editForm" label-width="120px" label-position="top">
        <el-form-item label="模块">
          <el-input :model-value="MODULE_LABELS[editForm.module] ?? editForm.module" disabled />
        </el-form-item>

        <el-form-item label="AI 提供商">
          <el-select v-model="editForm.provider" style="width: 100%" @change="onProviderChange">
            <el-option v-for="p in PROVIDERS" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="模型">
          <el-select
            v-model="editForm.model"
            filterable
            allow-create
            default-first-option
            style="width: 100%"
            placeholder="选择模型或输入自定义模型名"
          >
            <el-option
              v-for="m in currentModels"
              :key="m.value"
              :label="`${m.label}  (${m.value})`"
              :value="m.value"
            />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">参数调优</el-divider>

        <el-form-item label="温度 (Temperature)">
          <el-slider v-model="editForm.temperature" :min="0" :max="2" :step="0.01" show-input />
        </el-form-item>
        <el-form-item label="最大 Token 数">
          <el-input-number
            v-model="editForm.maxTokens"
            :min="1"
            :max="128000"
            :step="100"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="Top P">
          <el-slider v-model="editForm.topP" :min="0" :max="1" :step="0.01" show-input />
        </el-form-item>
        <el-form-item label="频率惩罚">
          <el-slider
            v-model="editForm.frequencyPenalty"
            :min="-2"
            :max="2"
            :step="0.01"
            show-input
          />
        </el-form-item>
        <el-form-item label="存在惩罚">
          <el-slider
            v-model="editForm.presencePenalty"
            :min="-2"
            :max="2"
            :step="0.01"
            show-input
          />
        </el-form-item>

        <el-divider content-position="left">备用与状态</el-divider>

        <el-form-item label="备用模型">
          <el-input v-model="editForm.fallbackModel" placeholder="留空表示无备用" clearable />
        </el-form-item>
        <el-form-item label="备用阈值 (失败次数)">
          <el-input-number v-model="editForm.fallbackThreshold" :min="1" :max="100" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="editForm.isActive" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="saveConfig">保存</el-button>
          <el-button @click="drawerVisible = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { aiConfigApi, type AiConfigVO } from '@/api/ai-config'

/* ───── Provider & Model Presets ───── */

const PROVIDERS = [
  { label: '阿里云 DashScope (通义千问)', value: 'dashscope' },
  { label: 'Anthropic (Claude)', value: 'anthropic' },
  { label: 'OpenAI (GPT)', value: 'openai' },
  { label: 'DeepSeek (深度求索)', value: 'deepseek' },
  { label: '智谱 AI (GLM)', value: 'zhipu' },
  { label: 'Moonshot AI (Kimi)', value: 'moonshot' },
  { label: '零一万物 (Yi)', value: 'lingyiwanwu' },
  { label: '百川智能 (Baichuan)', value: 'baichuan' },
  { label: '字节跳动 (豆包)', value: 'doubao' },
  { label: '自定义', value: 'custom' },
] as const

const PROVIDER_LABELS: Record<string, string> = Object.fromEntries(
  PROVIDERS.map((p) => [p.value, p.label]),
)

type TagType = 'success' | 'warning' | 'info' | 'primary' | 'danger' | undefined

const PROVIDER_TAG_TYPE: Record<string, TagType> = {
  dashscope: 'warning',
  anthropic: undefined,
  openai: 'success',
  deepseek: 'primary',
  zhipu: 'info',
  moonshot: 'danger',
  lingyiwanwu: 'warning',
  baichuan: 'info',
  doubao: 'primary',
}

const PROVIDER_MODELS: Record<string, { label: string; value: string }[]> = {
  dashscope: [
    { label: 'Qwen-Plus', value: 'qwen-plus' },
    { label: 'Qwen-Turbo', value: 'qwen-turbo' },
    { label: 'Qwen-Max', value: 'qwen-max' },
    { label: 'Qwen-Long', value: 'qwen-long' },
    { label: 'Qwen-VL-Plus (视觉)', value: 'qwen-vl-plus' },
    { label: 'Qwen-Audio-Turbo (语音)', value: 'qwen-audio-turbo' },
  ],
  anthropic: [
    { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
    { label: 'Claude Opus 4', value: 'claude-opus-4-20250514' },
    { label: 'Claude Haiku 3.5', value: 'claude-3-5-haiku-20241022' },
  ],
  openai: [
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4.1', value: 'gpt-4.1' },
    { label: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
    { label: 'GPT-4.1 Nano', value: 'gpt-4.1-nano' },
    { label: 'o3-mini', value: 'o3-mini' },
  ],
  deepseek: [
    { label: 'DeepSeek-V3', value: 'deepseek-chat' },
    { label: 'DeepSeek-R1 (推理)', value: 'deepseek-reasoner' },
  ],
  zhipu: [
    { label: 'GLM-4-Plus', value: 'glm-4-plus' },
    { label: 'GLM-4-Flash (免费)', value: 'glm-4-flash' },
    { label: 'GLM-4-Long', value: 'glm-4-long' },
    { label: 'GLM-4V-Plus (视觉)', value: 'glm-4v-plus' },
  ],
  moonshot: [
    { label: 'Moonshot-v1-8K', value: 'moonshot-v1-8k' },
    { label: 'Moonshot-v1-32K', value: 'moonshot-v1-32k' },
    { label: 'Moonshot-v1-128K', value: 'moonshot-v1-128k' },
  ],
  lingyiwanwu: [
    { label: 'Yi-Lightning', value: 'yi-lightning' },
    { label: 'Yi-Large', value: 'yi-large' },
    { label: 'Yi-Medium', value: 'yi-medium' },
  ],
  baichuan: [
    { label: 'Baichuan4', value: 'Baichuan4' },
    { label: 'Baichuan3-Turbo', value: 'Baichuan3-Turbo' },
  ],
  doubao: [
    { label: '豆包-Pro-32K', value: 'doubao-pro-32k' },
    { label: '豆包-Lite-32K', value: 'doubao-lite-32k' },
  ],
  custom: [],
}

const MODULE_LABELS: Record<string, string> = {
  default: '默认配置',
  call_analysis: '通话分析',
  customer_profile: '客户画像',
  intent_prediction: '意向预测',
  employee_portrait: '员工画像',
  knowledge_qa: '知识库问答',
  deal_analysis: '成交分析',
  communication_brief: '沟通简报',
  risk_assessment: '风险评估',
}

/* ───── State ───── */

const loading = ref(false)
const saving = ref(false)
const drawerVisible = ref(false)
const configs = ref<AiConfigVO[]>([])

interface EditForm {
  module: string
  provider: string
  model: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  isActive: boolean
  fallbackModel: string
  fallbackThreshold: number
}

const editForm = ref<EditForm | null>(null)

const currentModels = computed(() => {
  if (!editForm.value) return []
  return PROVIDER_MODELS[editForm.value.provider] ?? []
})

/* ───── Helpers ───── */

function getModelLabel(provider: string, model: string): string {
  const models = PROVIDER_MODELS[provider]
  if (!models) return model
  const found = models.find((m) => m.value === model)
  return found ? `${found.label} (${model})` : model
}

function onProviderChange(newProvider: string) {
  if (!editForm.value) return
  const models = PROVIDER_MODELS[newProvider]
  if (models && models.length > 0) {
    editForm.value.model = models[0].value
  } else {
    editForm.value.model = ''
  }
}

/* ───── CRUD ───── */

async function loadConfigs() {
  loading.value = true
  try {
    const res = (await aiConfigApi.getAllConfigs()) as unknown as { data: AiConfigVO[] }
    configs.value = res.data
  } catch {
    /* handled by interceptor */
  } finally {
    loading.value = false
  }
}

function openEdit(row: AiConfigVO) {
  editForm.value = {
    module: row.module,
    provider: row.provider,
    model: row.model,
    temperature: Number(row.temperature),
    maxTokens: row.maxTokens,
    topP: Number(row.topP),
    frequencyPenalty: Number(row.frequencyPenalty),
    presencePenalty: Number(row.presencePenalty),
    isActive: row.isActive,
    fallbackModel: row.fallbackModel ?? '',
    fallbackThreshold: row.fallbackThreshold,
  }
  drawerVisible.value = true
}

async function saveConfig() {
  if (!editForm.value) return
  saving.value = true
  try {
    await aiConfigApi.updateConfig(editForm.value.module, {
      provider: editForm.value.provider,
      model: editForm.value.model,
      temperature: editForm.value.temperature,
      maxTokens: editForm.value.maxTokens,
      topP: editForm.value.topP,
      frequencyPenalty: editForm.value.frequencyPenalty,
      presencePenalty: editForm.value.presencePenalty,
      isActive: editForm.value.isActive,
      fallbackModel: editForm.value.fallbackModel || null,
      fallbackThreshold: editForm.value.fallbackThreshold,
    })
    ElMessage.success('配置已保存')
    drawerVisible.value = false
    await loadConfigs()
  } catch {
    /* handled */
  } finally {
    saving.value = false
  }
}

onMounted(loadConfigs)
</script>

<style scoped>
.ai-config-page {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.module-name {
  font-weight: 500;
}
</style>
