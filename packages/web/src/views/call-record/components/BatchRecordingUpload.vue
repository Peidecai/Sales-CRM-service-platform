<template>
  <el-dialog
    v-model="visible"
    title="批量上传录音"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-upload
      ref="uploadRef"
      :auto-upload="false"
      :limit="10"
      accept=".mp3,.wav,.m4a,.amr"
      multiple
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
      :file-list="fileList"
    >
      <template #trigger>
        <el-button type="primary">选择文件</el-button>
      </template>
      <template #tip>
        <div class="el-upload__tip">支持 mp3/wav/m4a/amr 格式，每个最大 100MB，最多 10 个</div>
      </template>
    </el-upload>

    <div v-if="results.length > 0" style="margin-top: 16px">
      <el-alert title="上传结果" :closable="false">
        <div v-for="(r, i) in results" :key="i">
          <el-tag :type="r.success ? 'success' : 'danger'" size="small">
            {{ r.success ? '成功' : '失败' }}
          </el-tag>
          <span style="margin-left: 8px">{{ fileNames[i] || `文件 ${i + 1}` }}</span>
          <span v-if="r.error" style="color: #f56c6c; margin-left: 8px">{{ r.error }}</span>
        </div>
      </el-alert>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button
        type="primary"
        :loading="uploading"
        :disabled="files.length === 0"
        @click="handleSubmit"
      >
        {{
          uploading ? `上传中 (${uploadProgress}/${files.length})` : `上传 ${files.length} 个文件`
        }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { batchUploadRecording } from '@/api/recording'

const emit = defineEmits<{ (e: 'success'): void }>()

const visible = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const files = ref<File[]>([])
const fileList = ref<UploadFile[]>([])
const fileNames = ref<string[]>([])
const results = ref<Array<{ success: boolean; error?: string }>>([])

const open = () => {
  visible.value = true
  files.value = []
  fileList.value = []
  fileNames.value = []
  results.value = []
}

const handleFileChange = (file: UploadFile) => {
  if (file.raw) {
    if (file.raw.size > 100 * 1024 * 1024) {
      ElMessage.error(`${file.name} 超过 100MB 限制`)
      return
    }
    files.value.push(file.raw)
    fileNames.value.push(file.name)
  }
}

const handleFileRemove = (file: UploadFile) => {
  const idx = fileNames.value.indexOf(file.name)
  if (idx >= 0) {
    files.value.splice(idx, 1)
    fileNames.value.splice(idx, 1)
  }
}

const handleClose = () => {
  files.value = []
  fileList.value = []
  fileNames.value = []
  results.value = []
}

const handleSubmit = async () => {
  if (files.value.length === 0) return
  uploading.value = true
  uploadProgress.value = 0
  try {
    const res = await batchUploadRecording(files.value)
    results.value = (res as { data: Array<{ success: boolean; error?: string }> }).data || []
    const successCount = results.value.filter((r) => r.success).length
    ElMessage.success(`上传完成：${successCount}/${files.value.length} 个成功`)
    if (successCount > 0) emit('success')
  } catch {
    ElMessage.error('批量上传失败')
  } finally {
    uploading.value = false
  }
}

defineExpose({ open })
</script>
