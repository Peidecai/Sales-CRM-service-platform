<template>
  <div class="funnel-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>销售漏斗分析</span>
          <el-button type="primary" :icon="Refresh" :loading="loading" @click="loadFunnel"
            >刷新</el-button
          >
        </div>
      </template>

      <!-- Summary stats row -->
      <el-row :gutter="20" class="summary-row">
        <el-col :span="8">
          <el-statistic title="商机总金额" :value="funnelData?.totalAmount || 0" prefix="¥" />
        </el-col>
        <el-col :span="8">
          <el-statistic
            title="赢单率"
            :value="Number(((funnelData?.winRate || 0) * 100).toFixed(1))"
            suffix="%"
          />
        </el-col>
        <el-col :span="8">
          <el-statistic title="商机总数" :value="totalCount" />
        </el-col>
      </el-row>

      <!-- Funnel chart using CSS -->
      <div class="funnel-chart">
        <div
          v-for="(item, index) in funnelData?.stages || []"
          :key="item.stage"
          class="funnel-stage"
          :style="{ width: getStageWidth(index) + '%' }"
        >
          <div class="stage-bar" :class="'stage-' + item.stage">
            <span class="stage-label">{{ stageLabels[item.stage] || item.stage }}</span>
            <span class="stage-count">{{ item.count }} 个</span>
            <span class="stage-amount">¥{{ formatAmount(item.amount) }}</span>
          </div>
          <div v-if="index < (funnelData?.stages?.length || 0) - 1" class="conversion-rate">
            转化率: {{ (item.conversionRate * 100).toFixed(1) }}%
          </div>
        </div>
      </div>

      <!-- Detail table -->
      <el-table :data="funnelData?.stages || []" style="margin-top: 24px">
        <el-table-column label="阶段" prop="stage">
          <template #default="{ row }">{{ stageLabels[row.stage] || row.stage }}</template>
        </el-table-column>
        <el-table-column label="商机数" prop="count" align="center" />
        <el-table-column label="金额" prop="amount" align="right">
          <template #default="{ row }">¥{{ formatAmount(row.amount) }}</template>
        </el-table-column>
        <el-table-column label="转化率" prop="conversionRate" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="row.conversionRate > 0"
              :type="row.conversionRate > 0.5 ? 'success' : 'warning'"
            >
              {{ (row.conversionRate * 100).toFixed(1) }}%
            </el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { opportunityApi } from '@/api/opportunity'
import type { FunnelData } from '@/api/opportunity'

const stageLabels: Record<string, string> = {
  lead: '初步接触',
  qualified: '需求确认',
  proposal: '方案提报',
  negotiation: '商务谈判',
  closed_won: '赢单',
  closed_lost: '丢单',
}

const loading = ref(false)
const funnelData = ref<FunnelData | null>(null)

const totalCount = computed(() => {
  return funnelData.value?.stages.reduce((sum, s) => sum + s.count, 0) || 0
})

function getStageWidth(index: number): number {
  const stages = funnelData.value?.stages || []
  if (stages.length === 0) return 100
  const maxCount = Math.max(...stages.map((s) => s.count), 1)
  return Math.max(20, (stages[index].count / maxCount) * 100)
}

function formatAmount(val: number): string {
  return val >= 10000 ? (val / 10000).toFixed(1) + '万' : val.toFixed(2)
}

async function loadFunnel() {
  loading.value = true
  try {
    const res = await opportunityApi.getFunnel()
    if (res.code === 0) {
      funnelData.value = res.data as FunnelData
    }
  } catch {
    ElMessage.error('加载漏斗数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadFunnel)
</script>

<style scoped>
.funnel-container {
  padding: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.summary-row {
  margin-bottom: 24px;
}
.funnel-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 24px 0;
}
.funnel-stage {
  text-align: center;
  transition: width 0.3s;
}
.stage-bar {
  padding: 12px 16px;
  border-radius: 4px;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 48px;
}
.stage-lead {
  background: #409eff;
}
.stage-qualified {
  background: #67c23a;
}
.stage-proposal {
  background: #e6a23c;
}
.stage-negotiation {
  background: #f56c6c;
}
.stage-closed_won {
  background: #529b2e;
}
.stage-closed_lost {
  background: #909399;
}
.conversion-rate {
  font-size: 12px;
  color: #909399;
  margin: 4px 0;
}
.stage-label {
  font-weight: 600;
}
.stage-count {
  font-size: 14px;
}
.stage-amount {
  font-size: 13px;
  opacity: 0.9;
}
</style>
