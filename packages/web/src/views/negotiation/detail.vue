<template>
  <div class="negotiation-detail" style="padding: 20px">
    <el-page-header style="margin-bottom: 20px" @back="router.back()">
      <template #content>
        <span>谈判分析 #{{ analysis?.id }}</span>
        <el-tag :type="statusTagType(analysis?.status ?? '')" style="margin-left: 12px">
          {{ statusLabel(analysis?.status ?? '') }}
        </el-tag>
      </template>
    </el-page-header>

    <div v-loading="loading">
      <!-- Summary Card -->
      <el-row :gutter="16" style="margin-bottom: 20px">
        <el-col :span="8">
          <el-card>
            <template #header>基本信息</template>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="通话记录">
                #{{ analysis?.callRecordId }}
              </el-descriptions-item>
              <el-descriptions-item label="客户ID">
                {{ analysis?.customerId ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="综合评分">
                <el-progress
                  v-if="analysis?.overallScore"
                  :percentage="analysis.overallScore"
                  :color="scoreColor(analysis.overallScore)"
                  :stroke-width="16"
                  :text-inside="true"
                  style="width: 200px"
                />
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="谈判策略">
                {{ strategyLabel(analysis?.strategy ?? null) }}
              </el-descriptions-item>
              <el-descriptions-item label="结果">
                <el-tag :type="outcomeTagType(analysis?.outcome ?? null)">
                  {{ outcomeLabel(analysis?.outcome ?? null) }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
        <el-col :span="16">
          <el-card>
            <template #header>分析摘要</template>
            <p style="line-height: 1.8; color: #333">
              {{ analysis?.summary ?? '暂无摘要' }}
            </p>
          </el-card>
        </el-col>
      </el-row>

      <!-- Key Moments Timeline -->
      <el-card v-if="sortedKeyMoments.length > 0" style="margin-bottom: 20px">
        <template #header>关键时刻</template>
        <el-timeline>
          <el-timeline-item
            v-for="(moment, idx) in sortedKeyMoments"
            :key="idx"
            :timestamp="formatTime(moment.time)"
            placement="top"
          >
            <el-card shadow="never">
              <h4 style="margin: 0 0 8px 0">{{ moment.event }}</h4>
              <p style="margin: 0; color: #666">{{ moment.analysis }}</p>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </el-card>

      <!-- Concessions -->
      <el-card
        v-if="analysis?.concessions && analysis.concessions.length > 0"
        style="margin-bottom: 20px"
      >
        <template #header>让步记录</template>
        <el-table :data="analysis.concessions" stripe>
          <el-table-column label="时间" width="100">
            <template #default="{ row }">{{ formatTime(row.time) }}</template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="100" />
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="impact" label="影响" width="100">
            <template #default="{ row }">
              <el-tag
                :type="
                  row.impact === '正面' ? 'success' : row.impact === '负面' ? 'danger' : 'info'
                "
                size="small"
              >
                {{ row.impact }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- Strengths / Weaknesses -->
      <el-row :gutter="16" style="margin-bottom: 20px">
        <el-col :span="12">
          <el-card>
            <template #header>
              <span style="color: #67c23a">优势</span>
            </template>
            <ul
              v-if="analysis?.strengths && analysis.strengths.length > 0"
              style="padding-left: 20px; margin: 0"
            >
              <li
                v-for="(s, i) in analysis.strengths"
                :key="i"
                style="margin-bottom: 8px; color: #333"
              >
                {{ s }}
              </li>
            </ul>
            <el-empty v-else description="暂无数据" :image-size="60" />
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <template #header>
              <span style="color: #f56c6c">劣势</span>
            </template>
            <ul
              v-if="analysis?.weaknesses && analysis.weaknesses.length > 0"
              style="padding-left: 20px; margin: 0"
            >
              <li
                v-for="(w, i) in analysis.weaknesses"
                :key="i"
                style="margin-bottom: 8px; color: #333"
              >
                {{ w }}
              </li>
            </ul>
            <el-empty v-else description="暂无数据" :image-size="60" />
          </el-card>
        </el-col>
      </el-row>

      <!-- Re-negotiation Advice -->
      <el-card>
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>再谈判建议</span>
            <el-button
              v-if="analysis?.status === 'completed'"
              type="primary"
              size="small"
              :loading="adviceLoading"
              @click="handleGenerateAdvice"
            >
              {{ analysis?.reNegotiationAdvice ? '重新生成' : '生成建议' }}
            </el-button>
          </div>
        </template>
        <div
          v-if="analysis?.reNegotiationAdvice"
          style="white-space: pre-wrap; line-height: 1.8; color: #333"
        >
          {{ analysis.reNegotiationAdvice }}
        </div>
        <el-empty v-else description="点击上方按钮生成再谈判建议" :image-size="60" />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getNegotiationDetail,
  generateReNegotiationAdvice,
  type NegotiationAnalysis,
  type NegotiationKeyMoment,
} from '@/api/negotiation'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const adviceLoading = ref(false)
const analysis = ref<NegotiationAnalysis | null>(null)

const sortedKeyMoments = computed(() => {
  if (!analysis.value?.keyMoments) return []
  return [...analysis.value.keyMoments].sort(
    (a: NegotiationKeyMoment, b: NegotiationKeyMoment) => a.time - b.time,
  )
})

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function scoreColor(score: number): string {
  if (score >= 70) return '#67c23a'
  if (score >= 40) return '#e6a23c'
  return '#f56c6c'
}

function strategyLabel(s: string | null): string {
  const map: Record<string, string> = {
    competitive: '竞争型',
    collaborative: '合作型',
    compromise: '妥协型',
    avoidant: '回避型',
  }
  return s ? (map[s] ?? s) : '-'
}

function outcomeLabel(o: string | null): string {
  const map: Record<string, string> = {
    won: '赢单',
    lost: '丢单',
    pending: '待定',
    unknown: '未知',
  }
  return o ? (map[o] ?? o) : '-'
}

function outcomeTagType(o: string | null): 'success' | 'danger' | 'warning' | 'info' | undefined {
  const map: Record<string, 'success' | 'danger' | 'warning' | 'info' | undefined> = {
    won: 'success',
    lost: 'danger',
    pending: 'warning',
    unknown: 'info',
  }
  return o ? (map[o] ?? undefined) : 'info'
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  }
  return map[s] ?? s
}

function statusTagType(s: string): 'success' | 'warning' | 'danger' | 'info' | undefined {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | undefined> = {
    pending: 'info',
    processing: 'warning',
    completed: 'success',
    failed: 'danger',
  }
  return map[s] ?? undefined
}

async function loadDetail() {
  const id = Number(route.params.id)
  if (!id) return
  loading.value = true
  try {
    const res = await getNegotiationDetail(id)
    analysis.value = res as unknown as NegotiationAnalysis
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

async function handleGenerateAdvice() {
  if (!analysis.value) return
  adviceLoading.value = true
  try {
    const res = await generateReNegotiationAdvice(analysis.value.id)
    analysis.value = res as unknown as NegotiationAnalysis
    ElMessage.success('建议已生成')
  } catch {
    // handled by interceptor
  } finally {
    adviceLoading.value = false
  }
}

onMounted(loadDetail)
</script>
