<template>
  <div class="ai-side-panel">
    <!-- Risk Alert -->
    <div class="panel-section">
      <div class="section-title">
        <el-icon><WarningFilled /></el-icon>
        AI 风险提示
      </div>
      <el-skeleton v-if="loading" :rows="2" animated />
      <template v-else-if="riskIntent">
        <div class="risk-indicator" :class="riskClass">
          <el-icon :size="32">
            <CircleCheckFilled v-if="riskIntent.riskLevel === '低风险'" />
            <WarningFilled v-else-if="riskIntent.riskLevel === '中风险'" />
            <CircleCloseFilled v-else />
          </el-icon>
          <span class="risk-label">{{ riskIntent.riskLevel ?? '未评估' }}</span>
        </div>
        <div v-if="riskIntent.riskText" class="risk-text">{{ riskIntent.riskText }}</div>
        <div v-if="riskIntent.riskAdvice" class="risk-advice">
          <el-icon><InfoFilled /></el-icon>
          {{ riskIntent.riskAdvice }}
        </div>
      </template>
      <el-empty v-else description="暂无风险评估" :image-size="40" />
    </div>

    <el-divider />

    <!-- Intent Analysis -->
    <div class="panel-section">
      <div class="section-title">
        <el-icon><TrendCharts /></el-icon>
        AI 意向分析
      </div>
      <template v-if="riskIntent">
        <el-tag v-if="riskIntent.intentLevel" :type="intentTagType" size="large" class="intent-tag">
          {{ riskIntent.intentLevel }}
        </el-tag>
        <div v-if="riskIntent.intentTags?.length" class="tag-list">
          <el-tag
            v-for="tag in riskIntent.intentTags"
            :key="tag"
            size="small"
            type="info"
            class="small-tag"
          >
            {{ tag }}
          </el-tag>
        </div>
      </template>
    </div>

    <el-divider />

    <!-- Customer Portrait -->
    <div class="panel-section">
      <div class="section-title">
        <el-icon><User /></el-icon>
        客户画像
      </div>
      <template v-if="riskIntent">
        <div v-if="riskIntent.occupationTags?.length" class="tag-list">
          <el-tag
            v-for="tag in riskIntent.occupationTags"
            :key="tag"
            size="small"
            class="small-tag"
          >
            {{ tag }}
          </el-tag>
        </div>
        <div v-if="riskIntent.wechatStatus" class="wechat-status">
          <span class="label">微信状态：</span>
          <el-tag :type="riskIntent.wechatStatus === '已加微' ? 'success' : 'info'" size="small">
            {{ riskIntent.wechatStatus }}
          </el-tag>
        </div>
      </template>
    </div>

    <el-divider />

    <div class="panel-actions">
      <el-button type="primary" size="small" :loading="loading" @click="refresh">
        刷新AI评估
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  WarningFilled,
  CircleCheckFilled,
  CircleCloseFilled,
  InfoFilled,
  TrendCharts,
  User,
} from '@element-plus/icons-vue'
import { getCustomerRiskIntent, type CustomerRiskIntentVO } from '@/api/ai'

const props = defineProps<{ customerId: number }>()

const loading = ref(false)
const riskIntent = ref<CustomerRiskIntentVO | null>(null)

const riskClass = computed(() => {
  if (!riskIntent.value?.riskLevel) return 'risk-unknown'
  if (riskIntent.value.riskLevel.includes('高')) return 'risk-high'
  if (riskIntent.value.riskLevel.includes('中')) return 'risk-medium'
  return 'risk-low'
})

const intentTagType = computed(() => {
  const level = riskIntent.value?.intentLevel
  if (!level) return 'info'
  if (level.includes('高')) return 'danger'
  if (level.includes('中')) return 'warning'
  return 'info'
})

async function refresh() {
  loading.value = true
  try {
    const res = await getCustomerRiskIntent(props.customerId)
    if (res?.data) {
      riskIntent.value = res.data as CustomerRiskIntentVO
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('加载风险意向数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
</script>

<style scoped>
.ai-side-panel {
  padding: 4px 0;
}

.panel-section {
  margin-bottom: 4px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.risk-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.risk-low {
  background: #f0f9eb;
  color: #67c23a;
}

.risk-medium {
  background: #fdf6ec;
  color: #e6a23c;
}

.risk-high {
  background: #fef0f0;
  color: #f56c6c;
}

.risk-unknown {
  background: #f5f7fa;
  color: #909399;
}

.risk-label {
  font-size: 16px;
  font-weight: 600;
}

.risk-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 6px;
}

.risk-advice {
  font-size: 12px;
  color: #409eff;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  background: #ecf5ff;
  padding: 8px;
  border-radius: 4px;
}

.intent-tag {
  margin-bottom: 8px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.small-tag {
  margin: 0;
}

.wechat-status {
  margin-top: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.wechat-status .label {
  color: #909399;
}

.panel-actions {
  text-align: center;
  padding-top: 4px;
}
</style>
