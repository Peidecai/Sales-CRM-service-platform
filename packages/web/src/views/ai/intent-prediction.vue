<template>
  <div class="prediction-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>购买意向预测</span>
          <el-button type="primary" :loading="predicting" @click="triggerBatchPredict"
          >
            批量重新预测
          </el-button
          >
        </div>
      </template>

      <el-table v-loading="loading" :data="predictions" stripe>
        <el-table-column label="排名" type="index" width="70" align="center" />
        <el-table-column label="客户名称" prop="customerName" min-width="150" />
        <el-table-column label="意向评分" width="200" align="center">
          <template #default="{ row }">
            <el-progress
              :percentage="row.intentScore"
              :color="getScoreColor(row.intentScore)"
              :stroke-width="16"
              :text-inside="true"
            />
          </template>
        </el-table-column>
        <el-table-column label="成交概率" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="
                row.dealProbability >= 70
                  ? 'success'
                  : row.dealProbability >= 40
                    ? 'warning'
                    : 'danger'
              "
            >
              {{ row.dealProbability }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预测依据" prop="reason" min-width="200" show-overflow-tooltip />
        <el-table-column label="预测时间" prop="predictedAt" width="170" />
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="repredictOne(row.customerId)"
            >
              重新预测
            </el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadPredictions"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

interface PredictionVO {
  id: number
  customerId: number
  customerName: string
  intentScore: number
  dealProbability: number
  reason: string
  predictedAt: string
}

const loading = ref(false)
const predicting = ref(false)
const predictions = ref<PredictionVO[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

function getScoreColor(score: number) {
  return score >= 70 ? '#67C23A' : score >= 40 ? '#E6A23C' : '#F56C6C'
}

async function loadPredictions() {
  loading.value = true
  try {
    const res = (await request.get('/ai/intent-predictions', {
      params: { page: page.value, pageSize: pageSize.value },
    })) as unknown as { code: number; data: { list: PredictionVO[]; total: number } }
    if (res.code === 0 && res.data) {
      predictions.value = res.data.list
      total.value = res.data.total
    }
  } catch {
    ElMessage.error('加载预测数据失败')
  } finally {
    loading.value = false
  }
}

async function repredictOne(customerId: number) {
  try {
    await request.post(`/ai/intent-predictions/${customerId}/refresh`)
    ElMessage.success('已触发重新预测')
    loadPredictions()
  } catch {
    ElMessage.error('触发预测失败')
  }
}

async function triggerBatchPredict() {
  predicting.value = true
  try {
    await request.post('/ai/intent-predictions/batch-refresh')
    ElMessage.success('批量预测任务已提交')
    setTimeout(loadPredictions, 3000)
  } catch {
    ElMessage.error('批量预测失败')
  } finally {
    predicting.value = false
  }
}

onMounted(loadPredictions)
</script>

<style scoped>
.prediction-page {
  padding: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
