<template>
  <div class="call-log-page">
    <el-card>
      <template #header>
        <span>通话记录</span>
      </template>

      <!-- Filters -->
      <el-form :inline="true" class="filter-form" @submit.prevent="handleSearch">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="方向">
          <el-select v-model="query.direction" placeholder="全部" clearable style="width: 120px">
            <el-option label="呼入" value="inbound" />
            <el-option label="呼出" value="outbound" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="已接通" value="CONNECTED" />
            <el-option label="已结束" value="ENDED" />
            <el-option label="未接通" value="RINGING" />
          </el-select>
        </el-form-item>
        <el-form-item label="搜索">
          <el-input
            v-model="query.keyword"
            placeholder="电话号码/客户名"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- Table -->
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="方向" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.direction === 'inbound' ? 'success' : 'primary'" size="small">
              {{ row.direction === 'inbound' ? '呼入' : '呼出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="主叫号码" prop="callerNumber" width="140" />
        <el-table-column label="被叫号码" prop="calleeNumber" width="140" />
        <el-table-column label="客户" prop="customerName" width="150">
          <template #default="{ row }">{{ row.customerName || '未匹配' }}</template>
        </el-table-column>
        <el-table-column label="坐席" prop="agentName" width="100" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'CONNECTED' || row.status === 'ENDED' ? 'success' : 'info'"
              size="small"
            >
              {{ statusLabels[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="通话时长" width="100" align="center">
          <template #default="{ row }">{{ formatDuration(row.duration) }}</template>
        </el-table-column>
        <el-table-column label="开始时间" prop="startTime" width="170" />
        <el-table-column label="录音" width="100" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.recordingUrl"
              type="primary"
              link
              size="small"
              @click="playRecording(row.recordingUrl)"
            >
              播放
            </el-button>
            <span v-else class="text-muted">无</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- Audio player dialog -->
    <el-dialog v-model="audioDialogVisible" title="播放录音" width="500px" destroy-on-close>
      <audio :src="audioUrl" controls autoplay style="width: 100%" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { callCenterApi, type CallLogVO } from '@/api/call-center'

const statusLabels: Record<string, string> = {
  RINGING: '振铃中',
  CONNECTED: '已接通',
  ON_HOLD: '保持中',
  ENDED: '已结束',
}

const loading = ref(false)
const list = ref<CallLogVO[]>([])
const total = ref(0)
const dateRange = ref<[string, string] | null>(null)
const audioDialogVisible = ref(false)
const audioUrl = ref('')

const query = reactive({
  page: 1,
  pageSize: 20,
  direction: '',
  status: '',
  keyword: '',
  startDate: '',
  endDate: '',
})

function formatDuration(seconds: number): string {
  if (!seconds) return '0s'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m${s}s` : `${s}s`
}

function playRecording(url: string) {
  audioUrl.value = url
  audioDialogVisible.value = true
}

async function loadData() {
  loading.value = true
  try {
    if (dateRange.value) {
      query.startDate = dateRange.value[0]
      query.endDate = dateRange.value[1]
    }
    const res = await callCenterApi.getCallLogs(query)
    if (res.code === 0 && res.data) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch {
    ElMessage.error('加载通话记录失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadData()
}
function handleReset() {
  Object.assign(query, {
    page: 1,
    pageSize: 20,
    direction: '',
    status: '',
    keyword: '',
    startDate: '',
    endDate: '',
  })
  dateRange.value = null
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.call-log-page {
  padding: 16px;
}
.filter-form {
  margin-bottom: 16px;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.text-muted {
  color: #c0c4cc;
  font-size: 13px;
}
</style>
