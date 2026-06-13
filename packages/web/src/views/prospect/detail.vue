<template>
  <div class="prospect-detail-page">
    <el-page-header @back="$router.back()">
      <template #content>
        <span>线索详情</span>
      </template>
    </el-page-header>

    <div v-loading="loading" class="detail-content">
      <template v-if="prospect">
        <!-- 基本信息 -->
        <el-card class="info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>企业基本信息</span>
              <div>
                <el-tag :type="getStatusTagType(prospect.status)" size="default">
                  {{ getStatusLabel(prospect.status) }}
                </el-tag>
                <el-tag type="info" size="default" style="margin-left: 8px">
                  {{ getChannelLabel(prospect.channel) }}
                </el-tag>
              </div>
            </div>
          </template>

          <el-descriptions :column="3" border>
            <el-descriptions-item label="企业名称" :span="2">
              {{ prospect.companyName }}
            </el-descriptions-item>
            <el-descriptions-item label="法人代表">
              {{ prospect.legalPerson ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="统一社会信用代码" :span="2">
              {{ prospect.unifiedCreditCode ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="注册资本">
              {{ prospect.registeredCapital ? `${prospect.registeredCapital}万元` : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="成立日期">
              {{ prospect.establishDate ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="行业">
              {{ prospect.industry ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="员工人数">
              {{ prospect.employeeCount ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="省份">
              {{ prospect.province ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="城市">
              {{ prospect.city ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="公司网站">
              <template v-if="prospect.website">
                <el-link :href="prospect.website" target="_blank" type="primary">
                  {{ prospect.website }}
                </el-link>
              </template>
              <template v-else>-</template>
            </el-descriptions-item>
            <el-descriptions-item label="联系电话">
              {{ prospect.phone ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="邮箱">
              {{ prospect.email ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="地址" :span="3">
              {{ prospect.address ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="经营范围" :span="3">
              {{ prospect.businessScope ?? '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 状态时间线 -->
        <el-card class="timeline-card" shadow="never">
          <template #header>
            <span>状态信息</span>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="创建时间">
              {{ formatDate(prospect.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="更新时间">
              {{ formatDate(prospect.updatedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="搜索批次">
              {{ prospect.searchBatchId ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="分配用户ID">
              {{ prospect.assignedUserId ?? '未分配' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="prospect.status === 'converted'" label="转化时间">
              {{ prospect.convertedAt ? formatDate(prospect.convertedAt) : '-' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="prospect.convertedCustomerId" label="关联客户">
              <el-button
                type="primary"
                link
                @click="$router.push(`/customer/${prospect.convertedCustomerId}`)"
              >
                查看客户 #{{ prospect.convertedCustomerId }}
              </el-button>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 备注 -->
        <el-card class="remark-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>备注</span>
              <el-button text type="primary" size="small" @click="remarkEditing = !remarkEditing">
                {{ remarkEditing ? '取消' : '编辑' }}
              </el-button>
            </div>
          </template>
          <div v-if="!remarkEditing" class="remark-text">
            {{ prospect.remark || '暂无备注' }}
          </div>
          <div v-else>
            <el-input v-model="remarkText" type="textarea" :rows="4" placeholder="请输入备注" />
            <div style="margin-top: 12px; text-align: right">
              <el-button type="primary" :loading="remarkSaving" @click="handleSaveRemark">
                保存
              </el-button>
            </div>
          </div>
        </el-card>

        <!-- 操作栏 -->
        <el-card
          v-if="isAdminOrManager && prospect.status !== 'converted'"
          class="action-card"
          shadow="never"
        >
          <el-space>
            <el-button v-if="prospect.status !== 'rejected'" type="primary" @click="handleConvert">
              转化为客户
            </el-button>
            <el-button
              v-if="prospect.status !== 'rejected'"
              type="danger"
              plain
              @click="handleReject"
            >
              废弃
            </el-button>
            <el-button type="danger" @click="handleDelete">删除</el-button>
          </el-space>
        </el-card>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePermission } from '@/composables/usePermission'
import { prospectApi, ProspectStatus, type ProspectVO } from '@/api/prospect'
import { formatDate } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const { isAdminOrManager } = usePermission()

const loading = ref(false)
const prospect = ref<ProspectVO | null>(null)
const remarkEditing = ref(false)
const remarkText = ref('')
const remarkSaving = ref(false)

const prospectId = Number(route.params.id)

async function loadDetail() {
  loading.value = true
  try {
    const res = await prospectApi.getDetail(prospectId)
    if (res.data) {
      prospect.value = res.data
      remarkText.value = res.data.remark ?? ''
    }
  } catch {
    ElMessage.error('加载线索详情失败')
  } finally {
    loading.value = false
  }
}

async function handleSaveRemark() {
  remarkSaving.value = true
  try {
    await prospectApi.update(prospectId, { remark: remarkText.value })
    ElMessage.success('备注已保存')
    remarkEditing.value = false
    await loadDetail()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    remarkSaving.value = false
  }
}

async function handleConvert() {
  await ElMessageBox.confirm(
    `确定将「${prospect.value?.companyName}」转化为正式客户？`,
    '转化确认',
    { confirmButtonText: '转化', cancelButtonText: '取消', type: 'info' },
  )
  try {
    const res = await prospectApi.convert({ prospectIds: [prospectId] })
    if (res.data && res.data.customerIds.length > 0) {
      ElMessage.success('转化成功')
      router.push(`/customer/${res.data.customerIds[0]}`)
    }
  } catch {
    ElMessage.error('转化失败')
  }
}

async function handleReject() {
  await ElMessageBox.confirm('确定废弃此线索？', '废弃确认', {
    confirmButtonText: '废弃',
    cancelButtonText: '取消',
    type: 'warning',
  })
  try {
    await prospectApi.update(prospectId, { status: ProspectStatus.REJECTED })
    ElMessage.success('已废弃')
    await loadDetail()
  } catch {
    ElMessage.error('操作失败')
  }
}

async function handleDelete() {
  await ElMessageBox.confirm('确定删除此线索？删除后不可恢复。', '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  try {
    await prospectApi.remove(prospectId)
    ElMessage.success('已删除')
    router.push('/prospect')
  } catch {
    ElMessage.error('删除失败')
  }
}

/* ---- 工具方法 ---- */
function getStatusLabel(status: ProspectStatus): string {
  const map: Record<string, string> = {
    new: '新线索',
    contacted: '已联系',
    qualified: '已确认',
    converted: '已转化',
    rejected: '已废弃',
  }
  return map[status] ?? status
}

function getStatusTagType(
  status: ProspectStatus,
): 'success' | 'info' | 'warning' | 'danger' | undefined {
  const map: Record<string, 'success' | 'info' | 'warning' | 'danger' | undefined> = {
    new: 'success',
    contacted: 'info',
    qualified: 'warning',
    converted: undefined,
    rejected: 'danger',
  }
  return map[status] ?? 'info'
}

function getChannelLabel(channel: string): string {
  const map: Record<string, string> = {
    tianyancha: '天眼查',
    qichacha: '企查查',
    manual: '手动',
    mock: '模拟',
  }
  return map[channel] ?? channel
}

onMounted(loadDetail)
</script>

<style scoped>
.prospect-detail-page {
  padding: 20px;
}

.detail-content {
  margin-top: 20px;
}

.info-card,
.timeline-card,
.remark-card,
.action-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.remark-text {
  color: #666;
  line-height: 1.8;
  min-height: 60px;
  white-space: pre-wrap;
}
</style>
