<template>
  <el-card shadow="never" class="ai-score-panel">
    <template #header>
      <div class="card-header">
        <span class="card-header-title">AI 商机评分</span>
        <el-button type="primary" size="small" plain :loading="scoring" @click="handleRescore">
          重新评分
        </el-button>
      </div>
    </template>

    <el-skeleton v-if="loading" :rows="4" animated />

    <template v-else-if="latestScore">
      <!-- Score gauge + dimensions -->
      <div class="score-overview">
        <div class="gauge-wrap">
          <el-progress
            type="dashboard"
            :percentage="latestScore.score"
            :width="130"
            :stroke-width="10"
            :color="gaugeColor"
          >
            <template #default="{ percentage }">
              <div class="gauge-inner">
                <span class="gauge-value">{{ percentage }}</span>
                <span class="gauge-label">综合评分</span>
              </div>
            </template>
          </el-progress>
        </div>

        <div class="dimensions">
          <div v-for="dim in dimensionList" :key="dim.key" class="dim-item">
            <span class="dim-label">{{ dim.label }}</span>
            <el-progress
              :percentage="dim.value"
              :stroke-width="8"
              :color="dim.value >= 70 ? '#67c23a' : dim.value >= 40 ? '#e6a23c' : '#f56c6c'"
            />
          </div>
        </div>
      </div>

      <!-- AI Reasoning -->
      <div v-if="latestScore.aiReasoning" class="ai-reasoning">
        <div class="reasoning-title">AI 分析</div>
        <div class="reasoning-text">{{ latestScore.aiReasoning }}</div>
      </div>

      <!-- Score Trend -->
      <ScoreTrend :opportunity-id="opportunityId" />
    </template>

    <el-empty v-else description="暂无评分数据，点击上方按钮进行评分" :image-size="60" />
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getScoreHistory, enqueueScoring, type OpportunityScore } from '@/api/ai-reminder'
import ScoreTrend from '@/views/ai-reminder/components/ScoreTrend.vue'

const props = defineProps<{
  opportunityId: number
}>()

const loading = ref(false)
const scoring = ref(false)
const latestScore = ref<OpportunityScore | null>(null)

const gaugeColor = computed(() => {
  const s = latestScore.value?.score ?? 0
  if (s >= 70) return '#67c23a'
  if (s >= 40) return '#e6a23c'
  return '#f56c6c'
})

const dimensionList = computed(() => {
  const d = latestScore.value?.dimensions
  if (!d) return []
  return [
    { key: 'customerFit', label: '客户匹配', value: d.customerFit },
    { key: 'engagementLevel', label: '参与度', value: d.engagementLevel },
    { key: 'stageProgress', label: '阶段进展', value: d.stageProgress },
    { key: 'sentimentTrend', label: '情绪趋势', value: d.sentimentTrend },
    { key: 'competitorRisk', label: '竞品风险', value: d.competitorRisk },
  ]
})

async function fetchLatest() {
  loading.value = true
  try {
    const res = (await getScoreHistory({
      opportunityId: props.opportunityId,
      page: 1,
      pageSize: 1,
    })) as unknown as { list: OpportunityScore[]; total: number }
    latestScore.value = res.list[0] ?? null
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

async function handleRescore() {
  scoring.value = true
  try {
    await enqueueScoring(props.opportunityId)
    ElMessage.success('已提交评分任务，请稍后刷新')
  } catch {
    // handled by interceptor
  } finally {
    scoring.value = false
  }
}

watch(() => props.opportunityId, fetchLatest)

onMounted(fetchLatest)
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.score-overview {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.gauge-wrap {
  flex-shrink: 0;
}

.gauge-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gauge-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}

.gauge-label {
  font-size: 12px;
  color: #909399;
}

.dimensions {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dim-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dim-label {
  width: 70px;
  font-size: 13px;
  color: #606266;
  flex-shrink: 0;
}

.dim-item :deep(.el-progress) {
  flex: 1;
}

.ai-reasoning {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.reasoning-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.reasoning-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
