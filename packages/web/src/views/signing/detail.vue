<template>
  <div class="signing-detail-page">
    <el-page-header content="签约详情" @back="$router.back()" />

    <el-card v-loading="loading" class="detail-card">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="签约ID">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusType" size="small">{{ statusLabel }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="商机">
          {{ detail.opportunity?.name ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="金额">
          ¥{{ Number(detail.amount ?? 0).toLocaleString() }}
        </el-descriptions-item>
        <el-descriptions-item label="销售">{{ detail.salesUserId }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detail.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="发送时间">{{ detail.sentAt ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="签署时间">{{ detail.signedAt ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="完成时间">
          {{ detail.completedAt ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="外部签署ID">
          {{ detail.externalSignId ?? '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="detail.contract" class="section">
        <h4>关联合同</h4>
        <el-button type="primary" link @click="$router.push(`/contract/${detail.contract.id}`)">
          {{ detail.contract.contractNo ?? `合同 #${detail.contract.id}` }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getSigningDetail } from '@/api/signing'

interface SigningDetailVO {
  id: number
  status: string
  amount: number
  salesUserId: number
  opportunityId: number
  opportunity?: { id: number; name: string }
  contract?: { id: number; contractNo: string }
  externalSignId?: string
  sentAt?: string
  signedAt?: string
  completedAt?: string
  createdAt: string
}

const route = useRoute()
const loading = ref(false)
const detail = ref<Partial<SigningDetailVO>>({})

const statusLabels: Record<string, string> = {
  draft: '草稿',
  internal_review: '内部审核',
  sent_to_customer: '已发客户',
  customer_signed: '客户已签',
  completed: '已完成',
  cancelled: '已取消',
}

type TagType = 'success' | 'primary' | 'warning' | 'danger' | 'info'
const statusTypeMap: Record<string, TagType> = {
  draft: 'info',
  internal_review: 'warning',
  sent_to_customer: 'primary',
  customer_signed: 'success',
  completed: 'success',
  cancelled: 'danger',
}

const statusLabel = computed(
  () => statusLabels[detail.value.status as string] ?? detail.value.status ?? '-',
)
const statusType = computed(() => statusTypeMap[detail.value.status as string] ?? 'info')

async function loadDetail() {
  const id = Number(route.params.id)
  if (!id) return
  loading.value = true
  try {
    const res = await getSigningDetail(id)
    if (res.data) {
      detail.value = res.data as unknown as SigningDetailVO
    }
  } catch {
    ElMessage.error('加载签约详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadDetail)
</script>

<style scoped>
.signing-detail-page {
  padding: 16px;
}
.detail-card {
  margin-top: 16px;
}
.section {
  margin-top: 24px;
}
.section h4 {
  margin-bottom: 8px;
  color: #333;
}
</style>
