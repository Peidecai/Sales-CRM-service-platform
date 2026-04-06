<template>
  <div class="cloud-call-settings">
    <el-card shadow="never" class="page-header-card">
      <div class="page-header">
        <span class="page-title">云呼设置</span>
        <span class="page-subtitle">管理云呼服务商配置、线路状态和通话统计</span>
      </div>
    </el-card>

    <!-- 服务商配置 -->
    <el-card shadow="never" class="content-card">
      <template #header>
        <div class="card-header">
          <span>服务商配置</span>
        </div>
      </template>
      <el-form
        ref="formRef"
        :model="settingsForm"
        :rules="formRules"
        label-width="120px"
        style="max-width: 600px"
      >
        <el-form-item label="当前服务商" prop="provider">
          <el-select v-model="settingsForm.provider" placeholder="请选择服务商" style="width: 100%">
            <el-option v-for="p in providers" :key="p.id" :label="p.label" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="AppKey" prop="appKey">
          <el-input v-model="settingsForm.appKey" placeholder="请输入 AppKey" />
        </el-form-item>
        <el-form-item label="AppSecret" prop="appSecret">
          <el-input
            v-model="settingsForm.appSecret"
            :type="showSecret ? 'text' : 'password'"
            placeholder="请输入 AppSecret"
          >
            <template #suffix>
              <el-icon class="secret-toggle" @click="showSecret = !showSecret">
                <View v-if="showSecret" />
                <Hide v-else />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="Webhook URL">
          <el-input :model-value="webhookUrl" readonly>
            <template #append>
              <el-button @click="copyWebhook">复制</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
          <el-button :loading="testing" @click="handleTestConnection">测试连接</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 线路状态 -->
    <el-card shadow="never" class="content-card">
      <template #header>
        <div class="card-header">
          <span>线路状态</span>
          <el-button text type="primary" :loading="lineLoading" @click="loadLineStatus">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      <div v-loading="lineLoading">
        <el-row :gutter="24" class="stat-row">
          <el-col :span="8">
            <el-statistic title="账户余额">
              <template #default>
                <span class="stat-value">{{ lineStatus.balance.toFixed(2) }}</span>
                <span class="stat-unit">{{ lineStatus.currency }}</span>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="8">
            <el-statistic title="已开通号码" :value="lineStatus.phoneNumbers.length" suffix="个" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="并发线路数" :value="lineStatus.concurrentLines" suffix="路" />
          </el-col>
        </el-row>
        <div v-if="lineStatus.phoneNumbers.length > 0" class="phone-list">
          <div class="phone-list-title">已开通号码列表</div>
          <el-tag
            v-for="phone in lineStatus.phoneNumbers"
            :key="phone"
            class="phone-tag"
            type="info"
          >
            {{ phone }}
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 通话统计 -->
    <el-card shadow="never" class="content-card">
      <template #header>
        <div class="card-header">
          <span>通话统计</span>
          <el-button text type="primary" :loading="statsLoading" @click="loadCallStats">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      <div v-loading="statsLoading">
        <el-row :gutter="24" class="stat-row">
          <el-col :span="8">
            <el-statistic title="今日通话" :value="callStats.today" suffix="通" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="本周通话" :value="callStats.week" suffix="通" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="本月通话" :value="callStats.month" suffix="通" />
          </el-col>
        </el-row>
        <el-row :gutter="24" class="stat-row" style="margin-top: 20px">
          <el-col :span="8">
            <el-statistic title="今日时长" :value="callStats.todayDuration" suffix="分钟" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="本周时长" :value="callStats.weekDuration" suffix="分钟" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="本月时长" :value="callStats.monthDuration" suffix="分钟" />
          </el-col>
        </el-row>
        <div ref="chartRef" class="cost-chart" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { View, Hide, Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import {
  getCloudCallSettings,
  updateCloudCallSettings,
  testCloudCallConnection,
  getLineStatus,
  getCallStats,
  type LineStatus,
  type CallStats,
} from '@/api/cloud-call'

const providers = [
  { id: 'aliyun', name: 'aliyun', label: '阿里云CCC' },
  { id: 'tianrun', name: 'tianrun', label: '天润融通' },
  { id: 'ronglian', name: 'ronglian', label: '容联七陌' },
]

const formRef = ref<FormInstance>()
const showSecret = ref(false)
const saving = ref(false)
const testing = ref(false)
const lineLoading = ref(false)
const statsLoading = ref(false)

const settingsForm = reactive({
  provider: '',
  appKey: '',
  appSecret: '',
})

const webhookUrl = ref('')

const formRules: FormRules = {
  provider: [{ required: true, message: '请选择服务商', trigger: 'change' }],
  appKey: [{ required: true, message: '请输入 AppKey', trigger: 'blur' }],
  appSecret: [{ required: true, message: '请输入 AppSecret', trigger: 'blur' }],
}

const lineStatus = reactive<LineStatus>({
  balance: 0,
  currency: '元',
  phoneNumbers: [],
  concurrentLines: 0,
})

const callStats = reactive<CallStats>({
  today: 0,
  week: 0,
  month: 0,
  todayDuration: 0,
  weekDuration: 0,
  monthDuration: 0,
  dailyCosts: [],
})

const chartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null

function copyWebhook() {
  if (webhookUrl.value) {
    navigator.clipboard
      .writeText(webhookUrl.value)
      .then(() => {
        ElMessage.success('已复制到剪贴板')
      })
      .catch(() => {
        ElMessage.warning('复制失败，请手动复制')
      })
  }
}

async function loadSettings() {
  try {
    const data = (await getCloudCallSettings()) as unknown as {
      provider: string
      appKey: string
      instanceId: string
      webhookUrl: string
      isActive: boolean
    }
    settingsForm.provider = data.provider ?? ''
    settingsForm.appKey = data.appKey ?? ''
    settingsForm.appSecret = ''
    webhookUrl.value = data.webhookUrl ?? ''
  } catch {
    // error handled by interceptor
  }
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    await updateCloudCallSettings({
      provider: settingsForm.provider,
      appKey: settingsForm.appKey,
      appSecret: settingsForm.appSecret,
    })
    ElMessage.success('配置已保存')
  } catch {
    // error handled by interceptor
  } finally {
    saving.value = false
  }
}

async function handleTestConnection() {
  testing.value = true
  try {
    const result = (await testCloudCallConnection()) as unknown as {
      success: boolean
      message: string
    }
    if (result.success) {
      ElMessage.success(result.message || '连接成功')
    } else {
      ElMessage.error(result.message || '连接失败')
    }
  } catch {
    // error handled by interceptor
  } finally {
    testing.value = false
  }
}

async function loadLineStatus() {
  lineLoading.value = true
  try {
    const data = (await getLineStatus()) as unknown as LineStatus
    lineStatus.balance = data.balance ?? 0
    lineStatus.currency = data.currency ?? '元'
    lineStatus.phoneNumbers = data.phoneNumbers ?? []
    lineStatus.concurrentLines = data.concurrentLines ?? 0
  } catch {
    // error handled by interceptor
  } finally {
    lineLoading.value = false
  }
}

async function loadCallStats() {
  statsLoading.value = true
  try {
    const data = (await getCallStats()) as unknown as CallStats
    callStats.today = data.today ?? 0
    callStats.week = data.week ?? 0
    callStats.month = data.month ?? 0
    callStats.todayDuration = data.todayDuration ?? 0
    callStats.weekDuration = data.weekDuration ?? 0
    callStats.monthDuration = data.monthDuration ?? 0
    callStats.dailyCosts = data.dailyCosts ?? []
    await nextTick()
    renderChart()
  } catch {
    // error handled by interceptor
  } finally {
    statsLoading.value = false
  }
}

function renderChart() {
  if (!chartRef.value) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  const dates = callStats.dailyCosts.map((d) => d.date)
  const costs = callStats.dailyCosts.map((d) => d.cost)

  chartInstance.setOption({
    title: { text: '每日通话费用', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', formatter: '{b}<br/>费用: {c} 元' },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', name: '费用 (元)' },
    series: [
      {
        type: 'bar',
        data: costs,
        itemStyle: { color: '#409eff' },
        barMaxWidth: 40,
      },
    ],
    grid: { left: 60, right: 20, bottom: 40, top: 50 },
  })
}

function handleResize() {
  chartInstance?.resize()
}

onMounted(() => {
  loadSettings()
  loadLineStatus()
  loadCallStats()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<style scoped>
.cloud-call-settings {
  padding: 20px;
}

.page-header-card {
  margin-bottom: 16px;
}

.page-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
}

.content-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.secret-toggle {
  cursor: pointer;
}

.stat-row {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #409eff;
}

.stat-unit {
  font-size: 14px;
  color: #909399;
  margin-left: 4px;
}

.phone-list {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.phone-list-title {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 12px;
}

.phone-tag {
  margin: 0 8px 8px 0;
}

.cost-chart {
  width: 100%;
  height: 350px;
  margin-top: 24px;
}
</style>
