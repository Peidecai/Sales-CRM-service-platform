<template>
  <div class="portrait-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>客户画像</span>
          <el-select
            v-model="selectedCustomerId"
            placeholder="选择客户"
            filterable
            style="width: 300px"
            @change="loadPortrait"
          >
            <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </div>
      </template>

      <el-empty v-if="!portrait" description="请选择一个客户查看画像" />

      <template v-else>
        <el-row :gutter="20">
          <!-- Basic Info -->
          <el-col :span="8">
            <el-card shadow="never">
              <template #header><span>基本信息</span></template>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="客户名称">
                  {{
                    portrait.customerName
                  }}
                </el-descriptions-item>
                <el-descriptions-item label="行业">
                  {{
                    portrait.industry || '未知'
                  }}
                </el-descriptions-item>
                <el-descriptions-item label="意向评分">
                  <el-progress
                    :percentage="portrait.intentScore"
                    :color="getScoreColor(portrait.intentScore)"
                  />
                </el-descriptions-item>
                <el-descriptions-item label="成交概率"
                >
                  {{ portrait.dealProbability }}%
                </el-descriptions-item
                >
                <el-descriptions-item label="生成时间">
                  {{
                    portrait.generatedAt
                  }}
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>

          <!-- Tags Cloud -->
          <el-col :span="8">
            <el-card shadow="never">
              <template #header><span>标签云</span></template>
              <div class="tags-cloud">
                <el-tag
                  v-for="tag in portrait.tags"
                  :key="tag"
                  :type="getTagType(tag)"
                  size="large"
                  class="tag-item"
                  effect="plain"
                >
                  {{ tag }}
                </el-tag>
              </div>
            </el-card>
          </el-col>

          <!-- AI Summary -->
          <el-col :span="8">
            <el-card shadow="never">
              <template #header><span>AI 分析摘要</span></template>
              <p class="ai-summary">{{ portrait.summary }}</p>
              <div v-if="portrait.suggestions?.length" style="margin-top: 12px">
                <h4>跟进建议</h4>
                <ul class="suggestions-list">
                  <li v-for="(s, i) in portrait.suggestions" :key="i">{{ s }}</li>
                </ul>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- Interaction Timeline -->
        <el-card shadow="never" style="margin-top: 16px">
          <template #header><span>交互时间线</span></template>
          <el-timeline>
            <el-timeline-item
              v-for="event in portrait.timeline"
              :key="event.id"
              :timestamp="event.date"
              :type="getTimelineType(event.type)"
              placement="top"
            >
              <h4>{{ event.title }}</h4>
              <p>{{ event.content }}</p>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-if="!portrait.timeline?.length" description="暂无交互记录" />
        </el-card>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

interface CustomerOption {
  id: number
  name: string
}
interface TimelineEvent {
  id: number
  date: string
  type: string
  title: string
  content: string
}
interface PortraitData {
  customerName: string
  industry: string
  intentScore: number
  dealProbability: number
  generatedAt: string
  tags: string[]
  summary: string
  suggestions: string[]
  timeline: TimelineEvent[]
}

const selectedCustomerId = ref<number | null>(null)
const customers = ref<CustomerOption[]>([])
const portrait = ref<PortraitData | null>(null)
const loading = ref(false)

const tagTypes = ['', 'success', 'warning', 'danger', 'info'] as const
function getTagType(tag: string): 'success' | 'warning' | 'danger' | 'info' | undefined {
  const t = tagTypes[tag.length % tagTypes.length]
  return t === '' ? undefined : t
}
function getScoreColor(score: number) {
  return score >= 70 ? '#67C23A' : score >= 40 ? '#E6A23C' : '#F56C6C'
}
function getTimelineType(type: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger'> = {
    call: 'primary',
    visit: 'success',
    email: 'warning',
    deal: 'danger',
  }
  return map[type] || 'info'
}

async function loadCustomers() {
  try {
    const res = (await request.get('/customers', {
      params: { page: 1, pageSize: 100 },
    })) as unknown as { code: number; data: { list: CustomerOption[] } }
    if (res.code === 0 && res.data) customers.value = res.data.list
  } catch {
    /* ignore */
  }
}

async function loadPortrait() {
  if (!selectedCustomerId.value) return
  loading.value = true
  try {
    const res = (await request.get(
      `/ai/customer-profile/${selectedCustomerId.value}`,
    )) as unknown as { code: number; data: PortraitData }
    if (res.code === 0 && res.data) portrait.value = res.data
  } catch {
    ElMessage.warning('未找到该客户的 AI 画像数据')
  } finally {
    loading.value = false
  }
}

onMounted(loadCustomers)
</script>

<style scoped>
.portrait-page {
  padding: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-item {
  margin: 2px;
}
.ai-summary {
  line-height: 1.8;
  color: #606266;
}
.suggestions-list {
  padding-left: 20px;
  line-height: 2;
}
</style>
