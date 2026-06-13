<template>
  <el-collapse v-model="activeNames" class="ai-brief-collapse">
    <el-collapse-item title="AI 沟通简报" name="brief">
      <el-skeleton v-if="loading" :rows="3" animated />
      <template v-else-if="latestAnalysis">
        <div class="brief-meta">
          <el-tag
            :type="latestAnalysis.customerClassify?.includes('高') ? 'danger' : 'info'"
            size="small"
          >
            {{ latestAnalysis.customerClassify ?? '未分类' }}
          </el-tag>
          <span class="brief-date">{{ formatDate(latestAnalysis.createdAt) }}</span>
          <el-tag v-if="latestAnalysis.speechScore != null" size="small" type="success">
            话术 {{ latestAnalysis.speechScore }}分
          </el-tag>
        </div>
        <div v-if="latestAnalysis.summary" class="brief-summary">
          {{ latestAnalysis.summary }}
        </div>
        <div class="brief-actions">
          <el-button
            type="primary"
            link
            size="small"
            @click="$router.push(`/call-record/${latestAnalysis.callRecordId}`)"
          >
            查看完整通话详情 →
          </el-button>
        </div>
      </template>
      <el-empty v-else description="暂无AI分析记录" :image-size="40" />
    </el-collapse-item>
  </el-collapse>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { callAnalysisApi, type CallAnalysisResultVO } from '@/api/ai-analysis'
import { formatDate } from '@/utils/format'

const props = defineProps<{ customerId: number }>()

const $router = useRouter()
const loading = ref(false)
const latestAnalysis = ref<CallAnalysisResultVO | null>(null)
const activeNames = ref(['brief'])

async function loadLatest() {
  loading.value = true
  try {
    const res = await callAnalysisApi.getLatestByCustomer(props.customerId)
    if (res?.data) {
      latestAnalysis.value = res.data
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('加载沟通摘要失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadLatest)
</script>

<style scoped>
.ai-brief-collapse {
  border: none;
}

.ai-brief-collapse :deep(.el-collapse-item__header) {
  font-weight: 600;
  font-size: 14px;
}

.brief-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.brief-date {
  font-size: 12px;
  color: #909399;
}

.brief-summary {
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  border-left: 3px solid #409eff;
  white-space: pre-wrap;
}

.brief-actions {
  margin-top: 8px;
  text-align: right;
}
</style>
