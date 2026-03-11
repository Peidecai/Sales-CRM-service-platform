<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import {
  downloadImportTemplate,
  getSystemFields,
  parseExcelHeaders,
  importCustomers,
} from '@/api/customer'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'success'): void
}>()

const currentStep = ref(0)
const file = ref<File | null>(null)
const excelHeaders = ref<string[]>([])
const systemFields = ref<Array<{ key: string; label: string; required: boolean }>>([])
const mappingRows = ref<Array<{ excelColumn: string; systemField: string }>>([])
const previewData = ref<Array<Record<string, string>>>([])
const importResult = ref<{ successCount: number; failCount: number; logId: number } | null>(null)
const loading = ref(false)
const importing = ref(false)

const canNext = computed(() => {
  if (currentStep.value === 0) return !!file.value
  if (currentStep.value === 1) {
    // At least name mapping required
    return mappingRows.value.some((r) => r.systemField === 'name')
  }
  return true
})

const handleFileChange = (uploadFile: { raw?: File }) => {
  file.value = uploadFile.raw ?? null
}

const handleDownloadTemplate = async () => {
  try {
    const res = await downloadImportTemplate()
    const blob = new Blob([res as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'customer_import_template.xlsx'
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('下载模板失败')
  }
}

const nextStep = async () => {
  if (currentStep.value === 0 && file.value) {
    // Parse headers and get system fields
    loading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file.value)
      const [headersRes, fieldsRes] = await Promise.all([
        parseExcelHeaders(formData),
        getSystemFields(),
      ])
      // Response interceptor unwraps to .data, so headersRes is { code, message, data }
      const hRes = headersRes as unknown as { data: string[] }
      const fRes = fieldsRes as unknown as {
        data: Array<{ key: string; label: string; required: boolean }>
      }
      excelHeaders.value = hRes.data
      systemFields.value = fRes.data
      // Initialize mapping rows
      mappingRows.value = excelHeaders.value.map((col) => ({
        excelColumn: col,
        systemField: autoMapField(col),
      }))
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || '解析文件失败'
      ElMessage.error(message)
      return
    } finally {
      loading.value = false
    }
  }

  if (currentStep.value === 1) {
    // Build preview from mapping
    const mapped = mappingRows.value.filter((r) => r.systemField)
    previewData.value = mapped.map((r) => ({
      excelColumn: r.excelColumn,
      systemField: systemFields.value.find((f) => f.key === r.systemField)?.label || r.systemField,
    }))
  }

  currentStep.value++
}

const prevStep = () => {
  if (currentStep.value > 0) currentStep.value--
}

const startImport = async () => {
  if (!file.value) return
  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', file.value)
    const mapping: Record<string, string> = {}
    for (const row of mappingRows.value) {
      if (row.systemField) {
        mapping[row.excelColumn] = row.systemField
      }
    }
    formData.append('mapping', JSON.stringify(mapping))
    const res = await importCustomers(formData)
    const parsed = res as unknown as {
      data: { successCount: number; failCount: number; logId: number }
    }
    importResult.value = parsed.data
    currentStep.value = 3
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message || '导入失败'
    ElMessage.error(message)
  } finally {
    importing.value = false
  }
}

const autoMapField = (header: string): string => {
  const map: Record<string, string> = {
    客户名称: 'name',
    姓名: 'name',
    公司: 'company',
    手机: 'phone',
    手机号: 'phone',
    邮箱: 'email',
    状态: 'status',
    行业: 'industry',
    来源: 'source',
    区域: 'region',
    备注: 'notes',
  }
  return map[header] || ''
}

const close = () => {
  currentStep.value = 0
  file.value = null
  excelHeaders.value = []
  mappingRows.value = []
  previewData.value = []
  importResult.value = null
  emit('update:visible', false)
}

const finish = () => {
  emit('success')
  close()
}
</script>

<template>
  <el-dialog
    title="导入客户"
    :model-value="visible"
    width="800px"
    destroy-on-close
    @update:model-value="close"
  >
    <el-steps :active="currentStep" finish-status="success" style="margin-bottom: 24px">
      <el-step title="上传文件" />
      <el-step title="字段映射" />
      <el-step title="确认预览" />
      <el-step title="导入结果" />
    </el-steps>

    <!-- Step 1: Upload -->
    <div v-if="currentStep === 0">
      <el-upload
        drag
        :auto-upload="false"
        accept=".xlsx,.xls"
        :on-change="handleFileChange"
        :limit="1"
      >
        <el-icon style="font-size: 48px; color: #c0c4cc"><UploadFilled /></el-icon>
        <div style="margin-top: 8px">点击或拖拽上传 Excel 文件</div>
        <template #tip>
          <div style="color: #909399; margin-top: 8px">仅支持 .xlsx / .xls 格式</div>
        </template>
      </el-upload>
      <el-button style="margin-top: 12px" @click="handleDownloadTemplate">下载导入模板</el-button>
    </div>

    <!-- Step 2: Mapping -->
    <div v-if="currentStep === 1" v-loading="loading">
      <el-alert
        title="请将 Excel 列映射到系统字段，至少需要映射「客户名称」"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      />
      <el-table :data="mappingRows" max-height="400">
        <el-table-column prop="excelColumn" label="Excel 列名" width="200" />
        <el-table-column label="系统字段">
          <template #default="{ row }">
            <el-select v-model="row.systemField" clearable placeholder="选择对应字段">
              <el-option
                v-for="f in systemFields"
                :key="f.key"
                :label="`${f.label}${f.required ? '(必填)' : ''}`"
                :value="f.key"
              />
            </el-select>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Step 3: Preview -->
    <div v-if="currentStep === 2">
      <el-alert title="字段映射预览" type="success" :closable="false" style="margin-bottom: 16px" />
      <el-table :data="previewData" border>
        <el-table-column prop="excelColumn" label="Excel 列" />
        <el-table-column prop="systemField" label="映射到系统字段" />
      </el-table>
    </div>

    <!-- Step 4: Result -->
    <div v-if="currentStep === 3">
      <el-result
        :icon="importResult && importResult.failCount === 0 ? 'success' : 'warning'"
        :title="
          importResult
            ? `导入任务已提交：共 ${(importResult.successCount || 0) + (importResult.failCount || 0)} 行数据`
            : '导入任务已提交'
        "
        :sub-title="
          importResult?.logId ? `任务编号: ${importResult.logId}，处理进度将通过通知推送` : ''
        "
      />
    </div>

    <template #footer>
      <el-button v-if="currentStep > 0 && currentStep < 3" @click="prevStep">上一步</el-button>
      <el-button
        v-if="currentStep < 2"
        type="primary"
        :disabled="!canNext"
        :loading="loading"
        @click="nextStep"
      >
        下一步
      </el-button>
      <el-button v-if="currentStep === 2" type="primary" :loading="importing" @click="startImport">
        开始导入
      </el-button>
      <el-button v-if="currentStep === 3" type="primary" @click="finish">完成</el-button>
    </template>
  </el-dialog>
</template>
