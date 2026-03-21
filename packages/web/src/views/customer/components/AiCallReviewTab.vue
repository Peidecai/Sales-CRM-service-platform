<template>
  <div class="ai-call-review">
    <el-skeleton v-if="summaryLoading" :rows="6" animated />
    <template v-else>
      <el-row :gutter="16">
        <!-- Left: 4 sections -->
        <el-col :span="14">
          <!-- 1. Summary stats -->
          <el-card shadow="never" class="section-card">
            <template #header><span class="section-title">历史摘要</span></template>
            <div class="stats-row">
              <el-statistic title="总通话" :value="summary?.totalCalls ?? 0" />
              <el-statistic title="已分析" :value="summary?.totalAnalyzed ?? 0" />
              <template v-if="summary?.avgSpeechScore != null">
                <el-statistic title="平均话术评分" :value="summary.avgSpeechScore" />
              </template>
              <div v-else class="stat-placeholder">
                <div class="stat-placeholder-title">平均话术评分</div>
                <div class="stat-placeholder-value">—</div>
              </div>
              <template v-if="summary?.avgKnowledgeMatchRate != null">
                <el-statistic
                  title="知识覆盖率"
                  :value="Math.round(summary.avgKnowledgeMatchRate * 100)"
                  suffix="%"
                />
              </template>
              <div v-else class="stat-placeholder">
                <div class="stat-placeholder-title">知识覆盖率</div>
                <div class="stat-placeholder-value">—</div>
              </div>
            </div>
            <div v-if="summary?.overallSummary" class="overall-summary">
              {{ summary.overallSummary }}
            </div>
            <el-empty v-else description="暂无分析摘要" :image-size="40" />
          </el-card>

          <!-- 2. Performance charts -->
          <el-card shadow="never" class="section-card">
            <template #header><span class="section-title">对话表现</span></template>
            <div v-if="hasChartData" ref="chartRef" class="chart-container" />
            <el-empty v-else description="暂无趋势数据" :image-size="40" />
            <div v-if="summary && summary.topClassifications.length > 0" class="classify-tags">
              <span class="classify-label">客户分类分布：</span>
              <el-tag
                v-for="item in summary.topClassifications"
                :key="item.label"
                size="small"
                class="classify-tag"
              >
                {{ item.label }} ({{ item.count }})
              </el-tag>
            </div>
          </el-card>

          <!-- 3. Leader reviews -->
          <el-card shadow="never" class="section-card">
            <template #header><span class="section-title">批注消息</span></template>
            <div v-if="reviews.length > 0">
              <el-timeline>
                <el-timeline-item
                  v-for="r in reviews"
                  :key="r.id"
                  :timestamp="formatDate(r.createdAt)"
                  placement="top"
                >
                  {{ r.content }}
                </el-timeline-item>
              </el-timeline>
              <div v-if="reviewTotal > reviews.length" class="load-more">
                <el-button text :loading="reviewLoading" @click="loadMoreReviews"
                  >加载更多</el-button
                >
              </div>
            </div>
            <el-empty v-else description="暂无批注" :image-size="40" />
          </el-card>

          <!-- 4. Call records timeline -->
          <el-card shadow="never" class="section-card">
            <template #header><span class="section-title">通话记录</span></template>
            <div v-if="callRecordsList.length > 0">
              <el-timeline>
                <el-timeline-item
                  v-for="cr in callRecordsList"
                  :key="cr.id"
                  :timestamp="formatDate(cr.callAt)"
                  placement="top"
                >
                  <div
                    class="call-item"
                    :class="{ active: selectedCallId === cr.id }"
                    @click="selectCall(cr)"
                  >
                    <span>时长 {{ formatDuration(cr.duration) }}</span>
                    <el-tag v-if="cr.aiSummary" type="success" size="small">AI</el-tag>
                    <el-tag v-if="cr.recordingUrl" type="info" size="small">录音</el-tag>
                  </div>
                </el-timeline-item>
              </el-timeline>
            </div>
            <el-empty v-else description="暂无通话记录" :image-size="40" />
          </el-card>
        </el-col>

        <!-- Right: Selected call detail -->
        <el-col :span="10">
          <div class="right-panel">
            <template v-if="selectedCall">
              <!-- Audio player -->
              <el-card shadow="never" class="section-card">
                <template #header><span class="section-title">录音播放</span></template>
                <audio
                  v-if="selectedCall.recordingUrl"
                  controls
                  preload="none"
                  :src="selectedCall.recordingUrl"
                  style="width: 100%"
                />
                <el-empty v-else description="暂无录音" :image-size="40" />
              </el-card>

              <!-- AI analysis text -->
              <el-card shadow="never" class="section-card">
                <template #header><span class="section-title">AI 分析内容</span></template>
                <el-skeleton v-if="analysisLoading" :rows="4" animated />
                <template v-else-if="selectedAnalysis">
                  <div v-if="selectedAnalysis.summary" class="analysis-section">
                    <div class="analysis-label">摘要</div>
                    <div class="analysis-text">{{ selectedAnalysis.summary }}</div>
                  </div>
                  <div v-if="selectedAnalysis.speechFeedback" class="analysis-section">
                    <div class="analysis-label">话术反馈</div>
                    <div class="analysis-text">{{ selectedAnalysis.speechFeedback }}</div>
                  </div>
                  <div v-if="selectedAnalysis.speechScore != null" class="analysis-section">
                    <div class="analysis-label">话术评分</div>
                    <el-progress :percentage="selectedAnalysis.speechScore" :stroke-width="10" />
                  </div>
                  <div
                    v-if="
                      selectedAnalysis.knowledgeGaps && selectedAnalysis.knowledgeGaps.length > 0
                    "
                    class="analysis-section"
                  >
                    <div class="analysis-label">知识盲区</div>
                    <ul class="gap-list">
                      <li v-for="(gap, i) in selectedAnalysis.knowledgeGaps" :key="i">{{ gap }}</li>
                    </ul>
                  </div>
                </template>
                <el-empty v-else description="该通话暂无 AI 分析" :image-size="40" />
              </el-card>
            </template>
            <el-empty v-else description="请选择左侧通话记录" :image-size="60" />
          </div>
        </el-col>
      </el-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import type { CallRecordVO } from '@/api/call-record'
import {
  callAnalysisApi,
  type CallAnalysisResultVO,
  type CustomerCallSummaryVO,
} from '@/api/ai-analysis'
import { leaderReviewApi, type LeaderReviewVO } from '@/api/leader-review'
import { formatDate, formatDuration } from '@/utils/format'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const props = defineProps<{
  customerId: number
  /** Call records already loaded by parent — avoids duplicate fetch (M1). */
  callRecords: CallRecordVO[]
}>()

// State
const summaryLoading = ref(true)
const summary = ref<CustomerCallSummaryVO | null>(null)
const callRecordsList = computed(() => props.callRecords)
const reviews = ref<LeaderReviewVO[]>([])
const reviewTotal = ref(0)
const reviewPage = ref(1)
const reviewLoading = ref(false)
const selectedCallId = ref<number | null>(null)
const selectedCall = ref<CallRecordVO | null>(null)
const selectedAnalysis = ref<CallAnalysisResultVO | null>(null)
const analysisLoading = ref(false)
const chartRef = ref<HTMLElement>()

const hasChartData = computed(
  () =>
    (summary.value?.speechScoreTrend?.length ?? 0) > 0 ||
    (summary.value?.knowledgeCoverageTrend?.length ?? 0) > 0,
)

// Fetch summary + reviews (call records come from prop)
async function fetchData() {
  summaryLoading.value = true
  try {
    const [summaryRes, reviewRes] = await Promise.all([
      callAnalysisApi.getCustomerCallSummary(props.customerId),
      leaderReviewApi.getByCustomer(props.customerId, { page: 1, pageSize: 10 }),
    ])
    summary.value = summaryRes?.data ?? null
    reviews.value = reviewRes?.data?.list ?? []
    reviewTotal.value = reviewRes?.data?.total ?? 0

    // Auto-select first call
    if (callRecordsList.value.length > 0) {
      selectCall(callRecordsList.value[0])
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('加载通话复盘数据失败')
  } finally {
    summaryLoading.value = false
  }
}

async function selectCall(cr: CallRecordVO) {
  selectedCallId.value = cr.id
  selectedCall.value = cr
  analysisLoading.value = true
  try {
    const res = await callAnalysisApi.getResult(cr.id)
    selectedAnalysis.value = res?.data ?? null
  } catch (e) {
    console.error(e)
    selectedAnalysis.value = null
  } finally {
    analysisLoading.value = false
  }
}

async function loadMoreReviews() {
  reviewLoading.value = true
  try {
    const res = await leaderReviewApi.getByCustomer(props.customerId, {
      page: reviewPage.value + 1,
      pageSize: 10,
    })
    if (res?.data) {
      reviews.value.push(...res.data.list)
      reviewPage.value += 1
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('加载领导点评失败')
  } finally {
    reviewLoading.value = false
  }
}

// Chart rendering
let chartInstance: echarts.ECharts | null = null

function renderChart() {
  if (!chartRef.value || !summary.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartRef.value)

  const speechTrend = summary.value.speechScoreTrend ?? []
  const knowledgeTrend = summary.value.knowledgeCoverageTrend ?? []

  // Merge dates
  const allDates = [
    ...new Set([...speechTrend.map((d) => d.date), ...knowledgeTrend.map((d) => d.date)]),
  ].sort()

  const speechMap = new Map(speechTrend.map((d) => [d.date, d.score]))
  const knowledgeMap = new Map(knowledgeTrend.map((d) => [d.date, d.rate]))

  chartInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['话术评分', '知识覆盖率'] },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: allDates },
    yAxis: [
      { type: 'value', name: '评分', min: 0, max: 100 },
      { type: 'value', name: '覆盖率', min: 0, max: 1 },
    ],
    series: [
      {
        name: '话术评分',
        type: 'line',
        smooth: true,
        data: allDates.map((d) => speechMap.get(d) ?? null),
      },
      {
        name: '知识覆盖率',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: allDates.map((d) => knowledgeMap.get(d) ?? null),
      },
    ],
  })
}

function handleResize() {
  chartInstance?.resize()
}

watch(hasChartData, async (val) => {
  if (val) {
    await nextTick()
    renderChart()
  }
})

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  chartInstance?.dispose()
  chartInstance = null
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.ai-call-review {
  min-height: 200px;
}

.section-card {
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
}

.stats-row {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}

.stat-placeholder {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-placeholder-title {
  font-size: 12px;
  color: #909399;
}

.stat-placeholder-value {
  font-size: 24px;
  font-weight: 600;
  color: #c0c4cc;
}

.overall-summary {
  white-space: pre-wrap;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.chart-container {
  height: 240px;
  width: 100%;
}

.classify-tags {
  margin-top: 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.classify-label {
  font-size: 13px;
  color: #909399;
}

.classify-tag {
  margin: 0;
}

.call-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.call-item:hover {
  background: #ecf5ff;
}

.call-item.active {
  background: #d9ecff;
  font-weight: 600;
}

.load-more {
  text-align: center;
  padding: 4px 0;
}

.right-panel {
  position: sticky;
  top: 16px;
}

.analysis-section {
  margin-bottom: 12px;
}

.analysis-label {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.analysis-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
}

.gap-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #e6a23c;
}
</style>
