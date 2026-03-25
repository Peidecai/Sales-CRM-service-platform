<template>
  <div class="ai-prompts-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>提示词模板管理</span>
          <el-button type="primary" size="small" @click="openCreate">新增模板</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="templates" stripe>
        <el-table-column prop="name" label="名称" width="180" />
        <el-table-column prop="module" label="模块" width="120" />
        <el-table-column prop="scene" label="场景" width="120" />
        <el-table-column prop="version" label="版本" width="80" align="center" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button type="info" link size="small" @click="openHistory(row)">历史</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑模板' : '新增模板'"
      width="700px"
      destroy-on-close
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="模块" required>
              <el-input v-model="form.module" :disabled="isEdit" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="场景" required>
              <el-input v-model="form.scene" :disabled="isEdit" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="系统提示词" required>
          <el-input v-model="form.systemPrompt" type="textarea" :rows="8" />
        </el-form-item>
        <el-form-item label="用户模板">
          <el-input
            v-model="form.userPromptTemplate"
            type="textarea"
            :rows="4"
            placeholder="可使用 {{variable}} 占位符"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item v-if="isEdit" label="变更说明">
          <el-input v-model="form.changeNote" placeholder="描述此次修改的原因" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- History Dialog -->
    <el-dialog v-model="historyVisible" title="版本历史" width="700px" destroy-on-close>
      <el-timeline v-if="histories.length">
        <el-timeline-item
          v-for="h in histories"
          :key="h.id"
          :timestamp="`v${h.version} - ${h.createdAt}`"
          placement="top"
        >
          <el-card shadow="never">
            <p v-if="h.changeNote" class="change-note">{{ h.changeNote }}</p>
            <el-text type="info" size="small">
              系统提示词: {{ h.systemPrompt.substring(0, 200)
              }}{{ h.systemPrompt.length > 200 ? '...' : '' }}
            </el-text>
            <div style="margin-top: 8px">
              <el-button type="warning" size="small" @click="handleRollback(h.version)">
                回滚到此版本
              </el-button>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无历史记录" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { aiConfigApi, type AiPromptTemplateVO, type AiPromptHistoryVO } from '@/api/ai-config'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const historyVisible = ref(false)
const isEdit = ref(false)
const templates = ref<AiPromptTemplateVO[]>([])
const histories = ref<AiPromptHistoryVO[]>([])
let currentEditId = 0
let currentHistoryId = 0

const form = ref({
  name: '',
  module: '',
  scene: '',
  systemPrompt: '',
  userPromptTemplate: '',
  description: '',
  changeNote: '',
  isActive: true,
})

async function loadTemplates() {
  loading.value = true
  try {
    const res = (await aiConfigApi.getAllPrompts()) as unknown as { data: AiPromptTemplateVO[] }
    templates.value = res.data
  } catch {
    /* handled */
  } finally {
    loading.value = false
  }
}

function openCreate() {
  isEdit.value = false
  currentEditId = 0
  form.value = {
    name: '',
    module: '',
    scene: '',
    systemPrompt: '',
    userPromptTemplate: '',
    description: '',
    changeNote: '',
    isActive: true,
  }
  dialogVisible.value = true
}

function openEdit(row: AiPromptTemplateVO) {
  isEdit.value = true
  currentEditId = row.id
  form.value = {
    name: row.name,
    module: row.module,
    scene: row.scene,
    systemPrompt: row.systemPrompt,
    userPromptTemplate: row.userPromptTemplate ?? '',
    description: row.description ?? '',
    changeNote: '',
    isActive: row.isActive,
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.module || !form.value.scene || !form.value.systemPrompt) {
    ElMessage.warning('请填写必填字段')
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await aiConfigApi.updatePrompt(currentEditId, {
        name: form.value.name,
        systemPrompt: form.value.systemPrompt,
        userPromptTemplate: form.value.userPromptTemplate || null,
        description: form.value.description || null,
        changeNote: form.value.changeNote || undefined,
        isActive: form.value.isActive,
      })
    } else {
      await aiConfigApi.createPrompt({
        name: form.value.name,
        module: form.value.module,
        scene: form.value.scene,
        systemPrompt: form.value.systemPrompt,
        userPromptTemplate: form.value.userPromptTemplate || null,
        description: form.value.description || null,
      })
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    await loadTemplates()
  } catch {
    /* handled */
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: AiPromptTemplateVO) {
  await ElMessageBox.confirm(`确定删除模板「${row.name}」？`, '提示', { type: 'warning' })
  try {
    await aiConfigApi.deletePrompt(row.id)
    ElMessage.success('已删除')
    await loadTemplates()
  } catch {
    /* handled */
  }
}

async function openHistory(row: AiPromptTemplateVO) {
  currentHistoryId = row.id
  try {
    const res = (await aiConfigApi.getPromptHistory(row.id)) as unknown as {
      data: AiPromptHistoryVO[]
    }
    histories.value = res.data
    historyVisible.value = true
  } catch {
    /* handled */
  }
}

async function handleRollback(version: number) {
  await ElMessageBox.confirm(`确定回滚到版本 v${version}？`, '提示', { type: 'warning' })
  try {
    await aiConfigApi.rollbackPrompt(currentHistoryId, version)
    ElMessage.success('回滚成功')
    historyVisible.value = false
    await loadTemplates()
  } catch {
    /* handled */
  }
}

onMounted(loadTemplates)
</script>

<style scoped>
.ai-prompts-page {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.change-note {
  margin: 0 0 8px 0;
  color: #606266;
  font-weight: 500;
}
</style>
