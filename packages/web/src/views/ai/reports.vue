<template>
  <div class="reports-page">
    <div class="page-header">
      <h2 class="page-title">报告中心</h2>
      <el-button type="primary" @click="showGenerateDialog = true"> 生成报告 </el-button>
    </div>

    <!-- Filters -->
    <div class="filters">
      <el-select
        v-model="filterType"
        placeholder="报告类型"
        clearable
        style="width: 140px"
        @change="fetchReports"
      >
        <el-option label="周报" value="weekly" />
        <el-option label="月报" value="monthly" />
      </el-select>
    </div>

    <el-table v-loading="loading" :data="reports" stripe style="width: 100%">
      <el-table-column prop="reportType" label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="row.reportType === 'weekly' ? 'primary' : 'success'" size="small">
            {{ row.reportType === 'weekly' ? '周报' : '月报' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="periodValue" label="期间" width="140" />
      <el-table-column prop="createdAt" label="生成时间" width="170">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleView(row)"> 查看 </el-button>
          <el-button
            v-if="row.fileUrl"
            type="success"
            link
            size="small"
            @click="handleDownload(row.fileUrl)"
          >
            下载
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > pageSize"
      class="pagination"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="page"
      @current-change="handlePageChange"
    />

    <!-- View dialog -->
    <el-dialog v-model="viewDialogVisible" title="报告详情" width="700px">
      <template v-if="viewingReport">
        <div class="report-meta">
          <el-tag
            :type="viewingReport.reportType === 'weekly' ? 'primary' : 'success'"
            size="small"
          >
            {{ viewingReport.reportType === 'weekly' ? '周报' : '月报' }}
          </el-tag>
          <span>{{ viewingReport.periodValue }}</span>
          <span class="meta-time">{{ formatDate(viewingReport.createdAt) }}</span>
        </div>
        <div class="report-content">
          <template v-if="viewingReport.content">
            <div v-if="reportContent">
              <div v-if="reportContent.summary" class="section">
                <h4>摘要</h4>
                <p>{{ reportContent.summary }}</p>
              </div>
              <div v-if="Array.isArray(reportContent.highlights)" class="section">
                <h4>亮点</h4>
                <ul>
                  <li v-for="(h, i) in reportContent.highlights as string[]" :key="i">{{ h }}</li>
                </ul>
              </div>
              <div v-if="Array.isArray(reportContent.recommendations)" class="section">
                <h4>建议</h4>
                <ul>
                  <li v-for="(r, i) in reportContent.recommendations as string[]" :key="i">
                    {{ r }}
                  </li>
                </ul>
              </div>
            </div>
            <pre v-else class="report-raw">{{
              JSON.stringify(viewingReport.content, null, 2)
            }}</pre>
          </template>
          <el-empty v-else description="报告内容为空" :image-size="80" />
        </div>
      </template>
    </el-dialog>

    <!-- Generate dialog -->
    <el-dialog v-model="showGenerateDialog" title="生成报告" width="420px">
      <el-form label-width="80px">
        <el-form-item label="报告类型">
          <el-select v-model="genType" style="width: 100%">
            <el-option label="周报" value="weekly" />
            <el-option label="月报" value="monthly" />
          </el-select>
        </el-form-item>
        <el-form-item label="期间">
          <el-input v-model="genPeriod" placeholder="如 2026-W10 或 2026-03" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGenerateDialog = false">取消</el-button>
        <el-button type="primary" :loading="genLoading" @click="handleGenerate"> 生成 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getReports, generateReport, type AiReportVO, type ReportType } from '@/api/ai'
import { formatDate } from '@/utils/format'

const loading = ref(false)
const reports = ref<AiReportVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const filterType = ref<ReportType | ''>('')

const viewDialogVisible = ref(false)
const viewingReport = ref<AiReportVO | null>(null)
const reportContent = computed(() => {
  const c = viewingReport.value?.content
  return typeof c === 'object' && c !== null ? (c as Record<string, unknown>) : null
})

const showGenerateDialog = ref(false)
const genType = ref<ReportType>('weekly')
const genPeriod = ref('')
const genLoading = ref(false)

async function fetchReports() {
  loading.value = true
  try {
    const params: Record<string, unknown> = { page: page.value, pageSize }
    if (filterType.value) params['reportType'] = filterType.value

    const res = (await getReports(params as Parameters<typeof getReports>[0])) as {
      data: { list: AiReportVO[]; total: number }
    }
    if (res?.data) {
      reports.value = res.data.list
      total.value = res.data.total
    }
  } catch {
    // handled
  } finally {
    loading.value = false
  }
}

function handleView(report: AiReportVO) {
  viewingReport.value = report
  viewDialogVisible.value = true
}

function handleDownload(url: string) {
  window.open(url, '_blank')
}

async function handleGenerate() {
  if (!genPeriod.value) {
    ElMessage.warning('请输入期间')
    return
  }
  genLoading.value = true
  try {
    await generateReport({ reportType: genType.value, periodValue: genPeriod.value })
    ElMessage.success('报告生成任务已提交，请稍后刷新')
    showGenerateDialog.value = false
    setTimeout(() => fetchReports(), 3000)
  } catch {
    // handled
  } finally {
    genLoading.value = false
  }
}

function handlePageChange(newPage: number) {
  page.value = newPage
  fetchReports()
}

onMounted(() => fetchReports())
</script>

<style scoped>
.reports-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.filters {
  display: flex;
  gap: 12px;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}

.report-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.meta-time {
  color: #909399;
  font-size: 13px;
}

.report-content {
  font-size: 14px;
  color: #303133;
  line-height: 1.8;
}

.section {
  margin-bottom: 16px;
}

.section h4 {
  margin: 0 0 8px;
  font-size: 15px;
  color: #303133;
}

.section ul {
  padding-left: 20px;
  margin: 0;
}

.section li {
  margin-bottom: 4px;
}

.report-raw {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
  overflow: auto;
  max-height: 400px;
}
</style>
