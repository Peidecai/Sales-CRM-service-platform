<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { previewMerge, executeMerge } from '@/api/customer'

const props = defineProps<{
  visible: boolean
  primaryId: number
  secondaryId: number
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'success'): void
}>()

const loading = ref(false)
const merging = ref(false)
const previewData = ref<Record<string, unknown> | null>(null)
const primaryCustomer = computed(
  () => (previewData.value?.primary ?? {}) as Record<string, unknown>,
)
const secondaryCustomer = computed(
  () => (previewData.value?.secondary ?? {}) as Record<string, unknown>,
)
const mergeStats = computed(() => (previewData.value?.mergeStats ?? {}) as Record<string, number>)

watch(
  () => props.visible,
  async (val) => {
    if (val && props.primaryId && props.secondaryId) {
      loading.value = true
      try {
        const res = await previewMerge(props.primaryId, props.secondaryId)
        previewData.value = res.data as Record<string, unknown>
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '加载合并预览失败'
        ElMessage.error(message)
      } finally {
        loading.value = false
      }
    }
  },
)

const handleMerge = async () => {
  try {
    await ElMessageBox.confirm(
      '合并后副客户将被删除，相关联系人、跟进记录、商机将归并到主客户。此操作不可撤销，确定继续？',
      '确认合并',
      { type: 'warning' },
    )
  } catch {
    return
  }

  merging.value = true
  try {
    await executeMerge(props.primaryId, props.secondaryId)
    ElMessage.success('客户合并成功')
    emit('success')
    emit('update:visible', false)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '合并失败'
    ElMessage.error(message)
  } finally {
    merging.value = false
  }
}

const close = () => emit('update:visible', false)
</script>

<template>
  <el-dialog
    title="客户合并预览"
    :model-value="visible"
    width="900px"
    destroy-on-close
    @update:model-value="close"
  >
    <div v-loading="loading">
      <template v-if="previewData">
        <el-row :gutter="24">
          <!-- Primary Customer -->
          <el-col :span="12">
            <el-card shadow="hover">
              <template #header>
                <div style="display: flex; align-items: center; gap: 8px">
                  <el-tag type="success">主客户</el-tag>
                  <span style="font-weight: bold">{{ primaryCustomer.name }}</span>
                </div>
              </template>
              <el-descriptions :column="1" size="small" border>
                <el-descriptions-item label="公司">{{
                  primaryCustomer.company || '-'
                }}</el-descriptions-item>
                <el-descriptions-item label="手机">{{
                  primaryCustomer.phone || '-'
                }}</el-descriptions-item>
                <el-descriptions-item label="邮箱">{{
                  primaryCustomer.email || '-'
                }}</el-descriptions-item>
                <el-descriptions-item label="状态">{{
                  primaryCustomer.status || '-'
                }}</el-descriptions-item>
                <el-descriptions-item label="行业">{{
                  primaryCustomer.industry || '-'
                }}</el-descriptions-item>
                <el-descriptions-item label="区域">{{
                  primaryCustomer.region || '-'
                }}</el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
          <!-- Secondary Customer -->
          <el-col :span="12">
            <el-card shadow="hover">
              <template #header>
                <div style="display: flex; align-items: center; gap: 8px">
                  <el-tag type="danger">副客户（将删除）</el-tag>
                  <span style="font-weight: bold">{{ secondaryCustomer.name }}</span>
                </div>
              </template>
              <el-descriptions :column="1" size="small" border>
                <el-descriptions-item label="公司">{{
                  secondaryCustomer.company || '-'
                }}</el-descriptions-item>
                <el-descriptions-item label="手机">{{
                  secondaryCustomer.phone || '-'
                }}</el-descriptions-item>
                <el-descriptions-item label="邮箱">{{
                  secondaryCustomer.email || '-'
                }}</el-descriptions-item>
                <el-descriptions-item label="状态">{{
                  secondaryCustomer.status || '-'
                }}</el-descriptions-item>
                <el-descriptions-item label="行业">{{
                  secondaryCustomer.industry || '-'
                }}</el-descriptions-item>
                <el-descriptions-item label="区域">{{
                  secondaryCustomer.region || '-'
                }}</el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
        </el-row>

        <!-- Merge Stats -->
        <el-card style="margin-top: 16px" shadow="never">
          <template #header>
            <span style="font-weight: bold">归并统计</span>
          </template>
          <el-row :gutter="24" style="text-align: center">
            <el-col :span="8">
              <el-statistic title="联系人" :value="mergeStats.contactCount ?? 0" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="跟进记录" :value="mergeStats.followUpCount ?? 0" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="商机" :value="mergeStats.opportunityCount ?? 0" />
            </el-col>
          </el-row>
          <p style="color: #909399; margin-top: 12px; text-align: center; font-size: 13px">
            以上数据将全部归并到主客户下，副客户将被软删除
          </p>
        </el-card>
      </template>
    </div>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="merging" :disabled="!previewData" @click="handleMerge">
        确认合并
      </el-button>
    </template>
  </el-dialog>
</template>
