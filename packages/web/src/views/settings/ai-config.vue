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
        <el-table-column prop="module" label="模块" width="150" />
        <el-table-column prop="provider" label="提供商" width="120" />
        <el-table-column prop="model" label="模型" width="180" />
        <el-table-column prop="temperature" label="温度" width="100" />
        <el-table-column prop="maxTokens" label="最大Token" width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Edit Drawer -->
    <el-drawer v-model="drawerVisible" title="编辑模型配置" size="480px">
      <el-form v-if="editForm" label-width="100px" label-position="top">
        <el-form-item label="模块">
          <el-input :model-value="editForm.module" disabled />
        </el-form-item>
        <el-form-item label="提供商">
          <el-input v-model="editForm.provider" />
        </el-form-item>
        <el-form-item label="模型">
          <el-input v-model="editForm.model" />
        </el-form-item>
        <el-form-item label="温度 (Temperature)">
          <el-slider v-model="editForm.temperature" :min="0" :max="2" :step="0.01" show-input />
        </el-form-item>
        <el-form-item label="最大 Token 数">
          <el-input-number v-model="editForm.maxTokens" :min="1" :max="128000" :step="100" />
        </el-form-item>
        <el-form-item label="Top P">
          <el-slider v-model="editForm.topP" :min="0" :max="1" :step="0.01" show-input />
        </el-form-item>
        <el-form-item label="频率惩罚 (Frequency Penalty)">
          <el-slider
            v-model="editForm.frequencyPenalty"
            :min="-2"
            :max="2"
            :step="0.01"
            show-input
          />
        </el-form-item>
        <el-form-item label="存在惩罚 (Presence Penalty)">
          <el-slider
            v-model="editForm.presencePenalty"
            :min="-2"
            :max="2"
            :step="0.01"
            show-input
          />
        </el-form-item>
        <el-form-item label="备用模型">
          <el-input v-model="editForm.fallbackModel" placeholder="留空表示无备用" clearable />
        </el-form-item>
        <el-form-item label="备用阈值">
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
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { aiConfigApi, type AiConfigVO } from '@/api/ai-config'

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
</style>
