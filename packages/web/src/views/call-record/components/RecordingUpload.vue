<template>
  <el-dialog
    v-model="visible"
    title="上传录音"
    width="560px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="录音文件" prop="file">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          accept=".mp3,.wav,.m4a,.amr"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
        >
          <template #trigger>
            <el-button type="primary">选择文件</el-button>
          </template>
          <template #tip>
            <div class="el-upload__tip">支持 mp3/wav/m4a/amr 格式，最大 100MB</div>
          </template>
        </el-upload>
      </el-form-item>

      <el-form-item label="关联客户">
        <el-input v-model.number="form.customerId" placeholder="客户 ID（可选）" />
      </el-form-item>

      <el-form-item label="关联商机">
        <el-input v-model.number="form.opportunityId" placeholder="商机 ID（可选）" />
      </el-form-item>

      <el-form-item label="对方号码">
        <el-input
          v-model="form.counterpartPhone"
          placeholder="对方电话号码（可选）"
          maxlength="20"
        />
      </el-form-item>

      <el-form-item label="通话时间">
        <el-date-picker
          v-model="form.actualCallTime"
          type="datetime"
          placeholder="实际通话时间"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="通话时长">
        <el-input-number v-model="form.duration" :min="0" placeholder="秒" />
        <span style="margin-left: 8px; color: #999">秒</span>
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="form.notes" type="textarea" :rows="3" maxlength="500" show-word-limit />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="uploading" @click="handleSubmit">
        {{ uploading ? '上传中...' : '上传' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { uploadRecording } from '@/api/recording'

const emit = defineEmits<{ (e: 'success'): void }>()

const visible = ref(false)
const uploading = ref(false)
const selectedFile = ref<File | null>(null)

const form = reactive({
  customerId: undefined as number | undefined,
  opportunityId: undefined as number | undefined,
  counterpartPhone: '',
  actualCallTime: '',
  duration: 0,
  notes: '',
})

const rules = {
  file: [{ required: true, message: '请选择录音文件', trigger: 'change' }],
}

const open = () => {
  visible.value = true
  resetForm()
}

const resetForm = () => {
  selectedFile.value = null
  form.customerId = undefined
  form.opportunityId = undefined
  form.counterpartPhone = ''
  form.actualCallTime = ''
  form.duration = 0
  form.notes = ''
}

const handleFileChange = (file: UploadFile) => {
  if (file.raw) {
    if (file.raw.size > 100 * 1024 * 1024) {
      ElMessage.error('文件大小不能超过 100MB')
      return
    }
    selectedFile.value = file.raw
  }
}

const handleFileRemove = () => {
  selectedFile.value = null
}

const handleClose = () => {
  resetForm()
}

const handleSubmit = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请选择录音文件')
    return
  }
  uploading.value = true
  try {
    const data: Record<string, unknown> = {}
    if (form.customerId) data.customerId = form.customerId
    if (form.opportunityId) data.opportunityId = form.opportunityId
    if (form.counterpartPhone) data.counterpartPhone = form.counterpartPhone
    if (form.actualCallTime) data.actualCallTime = form.actualCallTime
    if (form.duration > 0) data.duration = form.duration
    if (form.notes) data.notes = form.notes

    await uploadRecording(selectedFile.value, data)
    ElMessage.success('录音上传成功，已触发 AI 转写分析')
    visible.value = false
    emit('success')
  } catch {
    ElMessage.error('上传失败，请重试')
  } finally {
    uploading.value = false
  }
}

defineExpose({ open })
</script>
