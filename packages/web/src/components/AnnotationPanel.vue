<template>
  <div class="annotation-panel">
    <div class="panel-header">
      <h4>话术标注</h4>
      <el-button type="primary" size="small" @click="showForm = true">
        <el-icon><Plus /></el-icon> 添加标注
      </el-button>
    </div>

    <div v-if="annotations.length === 0 && !loading" class="empty">
      <el-empty description="暂无标注" :image-size="60" />
    </div>

    <div v-for="ann in annotations" :key="ann.id" class="annotation-item">
      <div class="time-range">{{ formatTime(ann.startTime) }} - {{ formatTime(ann.endTime) }}</div>
      <div class="ann-text">{{ ann.text }}</div>
      <div class="ann-meta">
        <el-tag v-if="ann.template" size="small" type="info">{{ ann.template.title }}</el-tag>
        <el-tag
          v-if="ann.score"
          size="small"
          :type="ann.score >= 80 ? 'success' : ann.score >= 60 ? 'warning' : 'danger'"
        >
          {{ ann.score }}分
        </el-tag>
        <span v-if="ann.comment" class="comment">{{ ann.comment }}</span>
      </div>
      <div class="ann-actions">
        <el-button text size="small" type="danger" @click="handleDelete(ann.id)">删除</el-button>
      </div>
    </div>

    <!-- Add annotation form -->
    <el-dialog v-model="showForm" title="添加话术标注" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="开始时间">
          <el-input-number v-model="form.startTime" :min="0" />
          <span style="margin-left: 4px">秒</span>
        </el-form-item>
        <el-form-item label="结束时间">
          <el-input-number v-model="form.endTime" :min="0" />
          <span style="margin-left: 4px">秒</span>
        </el-form-item>
        <el-form-item label="标注文本">
          <el-input v-model="form.text" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="关联话术">
          <el-button size="small" @click="showSelector = true">
            {{ form.templateId ? '已选择' : '选择话术模板' }}
          </el-button>
        </el-form-item>
        <el-form-item label="评论">
          <el-input v-model="form.comment" maxlength="500" />
        </el-form-item>
        <el-form-item label="评分">
          <el-input-number v-model="form.score" :min="1" :max="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForm = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleCreate">保存</el-button>
      </template>
    </el-dialog>

    <SpeechSelector v-model:visible="showSelector" @select="handleSelectTemplate" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getAnnotations,
  createAnnotation,
  deleteAnnotation,
  type SpeechAnnotation,
} from '@/api/speech'
import SpeechSelector from './SpeechSelector.vue'

const props = defineProps<{ callRecordId: number }>()

const loading = ref(false)
const saving = ref(false)
const annotations = ref<SpeechAnnotation[]>([])
const showForm = ref(false)
const showSelector = ref(false)

const form = reactive({
  startTime: 0,
  endTime: 0,
  text: '',
  templateId: undefined as number | undefined,
  comment: '',
  score: undefined as number | undefined,
})

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

async function loadAnnotations() {
  loading.value = true
  try {
    annotations.value = (await getAnnotations(props.callRecordId)) as unknown as SpeechAnnotation[]
  } finally {
    loading.value = false
  }
}

function handleSelectTemplate(t: { id: number }) {
  form.templateId = t.id
  showSelector.value = false
}

async function handleCreate() {
  if (!form.text) {
    ElMessage.warning('请输入标注文本')
    return
  }
  saving.value = true
  try {
    await createAnnotation({
      callRecordId: props.callRecordId,
      templateId: form.templateId,
      startTime: form.startTime,
      endTime: form.endTime,
      text: form.text,
      comment: form.comment || undefined,
      score: form.score,
    })
    ElMessage.success('标注创建成功')
    showForm.value = false
    form.startTime = 0
    form.endTime = 0
    form.text = ''
    form.templateId = undefined
    form.comment = ''
    form.score = undefined
    loadAnnotations()
  } finally {
    saving.value = false
  }
}

async function handleDelete(id: number) {
  await ElMessageBox.confirm('确定删除该标注？', '提示', { type: 'warning' })
  await deleteAnnotation(id)
  ElMessage.success('删除成功')
  loadAnnotations()
}

watch(() => props.callRecordId, loadAnnotations)
onMounted(loadAnnotations)
</script>

<style scoped>
.annotation-panel {
  margin-top: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-header h4 {
  margin: 0;
}

.annotation-item {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 8px;
}

.time-range {
  font-size: 12px;
  color: var(--el-color-primary);
  font-weight: 600;
  margin-bottom: 4px;
}

.ann-text {
  margin-bottom: 8px;
  line-height: 1.6;
}

.ann-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.comment {
  font-size: 12px;
  color: #999;
}

.ann-actions {
  margin-top: 4px;
  text-align: right;
}

.empty {
  padding: 20px 0;
}
</style>
