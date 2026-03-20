<template>
  <div class="ai-reminder-page">
    <div class="page-header">
      <h2>AI 助手</h2>
      <div class="header-actions">
        <el-button type="primary" :disabled="summary.total === 0" @click="handleMarkAllRead">
          全部已读
        </el-button>
        <el-button @click="fetchReminders">刷新</el-button>
      </div>
    </div>

    <!-- Summary cards -->
    <el-row :gutter="16" class="summary-row">
      <el-col :span="4">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-value">{{ summary.total ?? 0 }}</div>
          <div class="summary-label">未读总数</div>
        </el-card>
      </el-col>
      <el-col v-for="item in typeSummary" :key="item.type" :span="4">
        <el-card shadow="hover" class="summary-card clickable" @click="filterByType(item.type)">
          <div class="summary-value">{{ item.count }}</div>
          <div class="summary-label">{{ item.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Filters -->
    <el-card class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="类型">
          <el-select v-model="filters.type" placeholder="全部" clearable @change="fetchReminders">
            <el-option label="评分变化" value="score_change" />
            <el-option label="风险预警" value="risk_alert" />
            <el-option label="下一步行动" value="next_action" />
            <el-option label="竞品提及" value="competitor_mention" />
            <el-option label="跟进安排" value="follow_up_schedule" />
            <el-option label="停滞提醒" value="stagnant" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select
            v-model="filters.priority"
            placeholder="全部"
            clearable
            @change="fetchReminders"
          >
            <el-option label="紧急" value="urgent" />
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="readFilter" placeholder="全部" clearable @change="fetchReminders">
            <el-option label="未读" :value="false" />
            <el-option label="已读" :value="true" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Reminder list -->
    <el-card class="list-card">
      <el-table v-loading="loading" :data="reminders" stripe>
        <el-table-column width="60">
          <template #default="{ row }">
            <el-badge is-dot :hidden="row.isRead" type="danger" />
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="typeTagMap[row.type] ?? 'info'" size="small">
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="90">
          <template #default="{ row }">
            <el-tag :type="priorityTagMap[row.priority] ?? 'info'" size="small">
              {{ priorityLabel(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="反馈" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.feedback" size="small" type="success">
              {{ row.feedback }}
            </el-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.isRead"
              text
              type="primary"
              size="small"
              @click="handleMarkRead(row)"
            >
              标为已读
            </el-button>
            <el-button text type="primary" size="small" @click="handleExpand(row)">
              详情
            </el-button>
            <el-dropdown
              v-if="!row.feedback"
              trigger="click"
              @command="(cmd: string) => handleFeedback(row, cmd)"
            >
              <el-button text type="primary" size="small">反馈</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="helpful">有帮助</el-dropdown-item>
                  <el-dropdown-item command="not_helpful">没帮助</el-dropdown-item>
                  <el-dropdown-item command="acted_on">已采纳</el-dropdown-item>
                  <el-dropdown-item command="dismissed">忽略</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchReminders"
          @current-change="fetchReminders"
        />
      </div>
    </el-card>

    <!-- Detail drawer -->
    <el-drawer v-model="drawerVisible" title="提醒详情" size="480px">
      <template v-if="selectedReminder">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="类型">
            {{ typeLabel(selectedReminder.type) }}
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            {{ priorityLabel(selectedReminder.priority) }}
          </el-descriptions-item>
          <el-descriptions-item label="标题">
            {{ selectedReminder.title }}
          </el-descriptions-item>
          <el-descriptions-item label="内容">
            <div class="reminder-content">{{ selectedReminder.content }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="商机 ID">
            {{ selectedReminder.opportunityId ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="客户 ID">
            {{ selectedReminder.customerId ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(selectedReminder.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="反馈">
            {{ selectedReminder.feedback ?? '未反馈' }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getReminders,
  getReminderSummary,
  markReminderRead,
  markAllRemindersRead,
  submitReminderFeedback,
  type AiReminderItem,
  type ReminderSummary,
} from '@/api/ai-reminder'
import { AiReminderType, AiReminderFeedback } from '@crm/shared'

const loading = ref(false)
const reminders = ref<AiReminderItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const summary = ref<ReminderSummary>({ total: 0 })
const drawerVisible = ref(false)
const selectedReminder = ref<AiReminderItem | null>(null)
const readFilter = ref<boolean | undefined>(undefined)

const filters = reactive({
  type: undefined as AiReminderType | undefined,
  priority: undefined as string | undefined,
})

type TagType = 'success' | 'warning' | 'danger' | 'info' | 'primary'

const typeTagMap: Record<string, TagType> = {
  score_change: 'warning',
  risk_alert: 'danger',
  next_action: 'success',
  competitor_mention: 'danger',
  follow_up_schedule: 'info',
  stagnant: 'warning',
}

const priorityTagMap: Record<string, TagType> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'info',
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    score_change: '评分变化',
    risk_alert: '风险预警',
    next_action: '下一步',
    competitor_mention: '竞品提及',
    follow_up_schedule: '跟进安排',
    stagnant: '停滞提醒',
  }
  return map[type] ?? type
}

function priorityLabel(priority: string): string {
  const map: Record<string, string> = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低',
  }
  return map[priority] ?? priority
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const typeSummary = computed(() => {
  const types = [
    { type: 'score_change', label: '评分变化' },
    { type: 'risk_alert', label: '风险预警' },
    { type: 'next_action', label: '下一步' },
    { type: 'competitor_mention', label: '竞品提及' },
    { type: 'stagnant', label: '停滞提醒' },
  ]
  return types.map((t) => ({
    ...t,
    count: summary.value[t.type] ?? 0,
  }))
})

async function fetchReminders() {
  loading.value = true
  try {
    const res = (await getReminders({
      type: filters.type,
      priority: filters.priority,
      isRead: readFilter.value,
      page: page.value,
      pageSize: pageSize.value,
    })) as unknown as { list: AiReminderItem[]; total: number }
    reminders.value = res.list
    total.value = res.total
  } catch {
    // error handled by interceptor
  } finally {
    loading.value = false
  }
}

async function fetchSummary() {
  try {
    const res = (await getReminderSummary()) as unknown as ReminderSummary
    summary.value = res
  } catch {
    // silent
  }
}

function filterByType(type: string) {
  filters.type = type as AiReminderType
  page.value = 1
  fetchReminders()
}

async function handleMarkRead(row: AiReminderItem) {
  try {
    await markReminderRead(row.id)
    row.isRead = true
    fetchSummary()
  } catch {
    // error handled by interceptor
  }
}

async function handleMarkAllRead() {
  try {
    await markAllRemindersRead()
    ElMessage.success('已全部标为已读')
    fetchReminders()
    fetchSummary()
  } catch {
    // error handled by interceptor
  }
}

function handleExpand(row: AiReminderItem) {
  selectedReminder.value = row
  drawerVisible.value = true
  if (!row.isRead) {
    handleMarkRead(row)
  }
}

async function handleFeedback(row: AiReminderItem, feedback: string) {
  try {
    await submitReminderFeedback(row.id, feedback as AiReminderFeedback)
    row.feedback = feedback as AiReminderFeedback
    ElMessage.success('反馈已提交')
  } catch {
    // error handled by interceptor
  }
}

onMounted(() => {
  fetchReminders()
  fetchSummary()
})
</script>

<style scoped>
.ai-reminder-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
}

.summary-row {
  margin-bottom: 16px;
}

.summary-card {
  text-align: center;
  cursor: default;
}

.summary-card.clickable {
  cursor: pointer;
}

.summary-card.clickable:hover {
  border-color: var(--el-color-primary);
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--el-color-primary);
}

.summary-label {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

.filter-card {
  margin-bottom: 16px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.list-card {
  margin-bottom: 16px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.text-muted {
  color: #ccc;
}

.reminder-content {
  white-space: pre-wrap;
  line-height: 1.6;
}
</style>
