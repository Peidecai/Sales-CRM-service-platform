<template>
  <div v-loading="loading" class="service-detail">
    <el-page-header
      :title="'返回列表'"
      :content="record?.title ?? '服务记录详情'"
      @back="router.back()"
    />

    <template v-if="record">
      <!-- Basic info -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>基本信息</span>
            <div class="header-actions">
              <el-tag :type="statusTagType(record.status)" size="large">
                {{ statusLabel(record.status) }}
              </el-tag>
              <el-tag :type="priorityTagType(record.priority)" size="small" class="ml-8">
                {{ priorityLabel(record.priority) }}
              </el-tag>
            </div>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="工单ID">{{ record.id }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ typeLabel(record.type) }}</el-descriptions-item>
          <el-descriptions-item label="客户">
            {{ record.customer?.name ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(record.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ record.description }}
          </el-descriptions-item>
          <el-descriptions-item v-if="record.resolution" label="解决方案" :span="2">
            {{ record.resolution }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- SLA -->
      <el-card class="info-card" shadow="never">
        <template #header><span>SLA 信息</span></template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="响应期限">
            <span :class="slaClass(record.slaResponseDeadline, record.respondedAt)">
              {{ record.slaResponseDeadline ? formatDate(record.slaResponseDeadline) : '-' }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="已响应">
            {{ record.respondedAt ? formatDate(record.respondedAt) : '未响应' }}
          </el-descriptions-item>
          <el-descriptions-item label="解决期限">
            <span :class="slaClass(record.slaResolveDeadline, record.resolvedAt)">
              {{ record.slaResolveDeadline ? formatDate(record.slaResolveDeadline) : '-' }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="已解决">
            {{ record.resolvedAt ? formatDate(record.resolvedAt) : '未解决' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- Satisfaction -->
      <el-card v-if="record.satisfactionScore" class="info-card" shadow="never">
        <template #header><span>满意度评价</span></template>
        <el-rate v-model="record.satisfactionScore" disabled />
        <p v-if="record.satisfactionComment" class="satisfaction-comment">
          {{ record.satisfactionComment }}
        </p>
      </el-card>

      <!-- Actions -->
      <el-card class="info-card" shadow="never">
        <template #header><span>操作</span></template>
        <div class="actions">
          <el-button
            v-if="record.status === ServiceStatus.PENDING"
            type="primary"
            @click="changeStatus(ServiceStatus.PROCESSING)"
          >
            开始处理
          </el-button>
          <el-button
            v-if="record.status === ServiceStatus.PROCESSING"
            type="success"
            @click="changeStatus(ServiceStatus.RESOLVED)"
          >
            标记已解决
          </el-button>
          <el-button
            v-if="record.status === ServiceStatus.RESOLVED || isAdminOrManager"
            type="warning"
            :disabled="record.status === ServiceStatus.CLOSED"
            @click="showCloseDialog = true"
          >
            关闭工单
          </el-button>
          <el-button
            v-if="record.status === ServiceStatus.RESOLVED"
            @click="changeStatus(ServiceStatus.PROCESSING)"
          >
            重新处理
          </el-button>
        </div>
      </el-card>
    </template>

    <!-- Close dialog -->
    <el-dialog
      v-model="showCloseDialog"
      title="关闭工单 - 满意度评价"
      width="480px"
      destroy-on-close
    >
      <el-form :model="closeForm" label-width="80px">
        <el-form-item label="满意度" required>
          <el-rate v-model="closeForm.satisfactionScore" />
        </el-form-item>
        <el-form-item label="评价">
          <el-input
            v-model="closeForm.satisfactionComment"
            type="textarea"
            :rows="3"
            maxlength="500"
          />
        </el-form-item>
        <el-form-item label="解决方案">
          <el-input v-model="closeForm.resolution" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCloseDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleClose">确认关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { usePermission } from '@/composables/usePermission'
import { serviceRecordApi, ServiceStatus, type ServiceRecordVO } from '@/api/service-record'

const route = useRoute()
const router = useRouter()
const { isAdminOrManager } = usePermission()

const loading = ref(false)
const submitting = ref(false)
const record = ref<ServiceRecordVO | null>(null)
const showCloseDialog = ref(false)

const closeForm = reactive({
  satisfactionScore: 5,
  satisfactionComment: '',
  resolution: '',
})

const typeLabel = (t: string) =>
  ({ complaint: '投诉', consultation: '咨询', maintenance: '维护', return: '退货' })[t] ?? t
const statusLabel = (s: string) =>
  ({ pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' })[s] ?? s
const priorityLabel = (p: string) =>
  ({ low: '低', medium: '中', high: '高', urgent: '紧急' })[p] ?? p
type TagType = 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined

const statusTagType = (s: string): TagType => {
  const map: Record<string, TagType> = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    closed: 'info',
  }
  return map[s]
}
const priorityTagType = (p: string): TagType => {
  const map: Record<string, TagType> = {
    low: 'info',
    medium: undefined,
    high: 'warning',
    urgent: 'danger',
  }
  return map[p]
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN')
}

function slaClass(deadline: string | null, completedAt: string | null): string {
  if (!deadline) return ''
  const dl = new Date(deadline).getTime()
  if (completedAt) {
    return new Date(completedAt).getTime() <= dl ? 'sla-ok' : 'sla-breached'
  }
  const now = Date.now()
  if (now > dl) return 'sla-breached'
  if (dl - now < 3600000) return 'sla-warning'
  return 'sla-ok'
}

async function loadDetail() {
  const id = Number(route.params.id)
  if (!id) return
  loading.value = true
  try {
    record.value = (await serviceRecordApi.getDetail(id)) as unknown as ServiceRecordVO
  } catch {
    /* handled */
  } finally {
    loading.value = false
  }
}

async function changeStatus(status: ServiceStatus) {
  if (!record.value) return
  try {
    record.value = (await serviceRecordApi.updateStatus(
      record.value.id,
      status,
    )) as unknown as ServiceRecordVO
    ElMessage.success('状态更新成功')
  } catch {
    /* handled */
  }
}

async function handleClose() {
  if (!record.value || closeForm.satisfactionScore < 1) {
    ElMessage.warning('请评分')
    return
  }
  submitting.value = true
  try {
    record.value = (await serviceRecordApi.close(record.value.id, {
      satisfactionScore: closeForm.satisfactionScore,
      satisfactionComment: closeForm.satisfactionComment || undefined,
      resolution: closeForm.resolution || undefined,
    })) as unknown as ServiceRecordVO
    showCloseDialog.value = false
    ElMessage.success('工单已关闭')
  } catch {
    /* handled */
  } finally {
    submitting.value = false
  }
}

onMounted(loadDetail)
</script>

<style scoped>
.service-detail {
  padding: 20px;
}
.info-card {
  margin-top: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.ml-8 {
  margin-left: 8px;
}
.actions {
  display: flex;
  gap: 8px;
}
.sla-ok {
  color: #67c23a;
}
.sla-warning {
  color: #e6a23c;
  font-weight: 600;
}
.sla-breached {
  color: #f56c6c;
  font-weight: 600;
}
.satisfaction-comment {
  margin-top: 8px;
  color: #606266;
}
</style>
