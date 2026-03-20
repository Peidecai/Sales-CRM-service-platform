<template>
  <div class="ai-playground-page">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header><span>AI 测试</span></template>
          <el-form label-position="top">
            <el-form-item label="模块">
              <el-select
                v-model="form.module"
                placeholder="选择模块 (默认 default)"
                clearable
                style="width: 100%"
              >
                <el-option v-for="m in modules" :key="m" :label="m" :value="m" />
              </el-select>
            </el-form-item>
            <el-form-item label="系统提示词">
              <el-input
                v-model="form.systemPrompt"
                type="textarea"
                :rows="4"
                placeholder="可选，覆盖默认系统提示词"
              />
            </el-form-item>
            <el-form-item label="用户提示词" required>
              <el-input
                v-model="form.prompt"
                type="textarea"
                :rows="6"
                placeholder="输入测试提示词..."
              />
            </el-form-item>
            <el-button
              type="primary"
              :loading="sending"
              :disabled="!form.prompt.trim()"
              @click="handleSend"
            >
              发送测试
            </el-button>
          </el-form>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><span>响应结果</span></template>
          <div v-if="result" class="result-area">
            <div class="result-meta">
              <el-tag size="small">模型: {{ result.model }}</el-tag>
              <el-tag size="small" type="info">延迟: {{ result.latencyMs }}ms</el-tag>
              <el-tag size="small" type="warning"
                >Token: {{ result.totalTokens }} (P:{{ result.promptTokens }} C:{{
                  result.completionTokens
                }})</el-tag
              >
            </div>
            <el-divider />
            <div class="result-content">{{ result.response }}</div>
          </div>
          <el-empty v-else description="发送测试后查看响应" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { aiConfigApi, type AiConfigVO, type PlaygroundResultVO } from '@/api/ai-config'

const modules = ref<string[]>([])
const sending = ref(false)
const result = ref<PlaygroundResultVO | null>(null)

const form = ref({
  module: '',
  systemPrompt: '',
  prompt: '',
})

async function loadModules() {
  try {
    const res = (await aiConfigApi.getAllConfigs()) as unknown as { data: AiConfigVO[] }
    modules.value = res.data.map((c) => c.module)
  } catch {
    /* handled */
  }
}

async function handleSend() {
  if (!form.value.prompt.trim()) {
    ElMessage.warning('请输入提示词')
    return
  }
  sending.value = true
  result.value = null
  try {
    const res = (await aiConfigApi.testPrompt({
      prompt: form.value.prompt,
      module: form.value.module || undefined,
      systemPrompt: form.value.systemPrompt || undefined,
    })) as unknown as { data: PlaygroundResultVO }
    result.value = res.data
  } catch {
    /* handled */
  } finally {
    sending.value = false
  }
}

onMounted(loadModules)
</script>

<style scoped>
.ai-playground-page {
  padding: 20px;
}
.result-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.result-content {
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  max-height: 500px;
  overflow-y: auto;
}
</style>
