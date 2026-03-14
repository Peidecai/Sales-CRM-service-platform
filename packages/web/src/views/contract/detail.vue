<template>
  <div class="contract-detail">
    <el-page-header content="合同详情" style="margin-bottom: 16px" @back="$router.back()" />

    <el-card v-loading="loading">
      <el-descriptions v-if="contract" :column="3" border>
        <el-descriptions-item label="合同编号">{{ contract.contractNo }}</el-descriptions-item>
        <el-descriptions-item label="合同名称">{{ contract.title }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag>{{ contract.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="合同金额"
        >
          ¥{{ Number(contract.totalAmount).toLocaleString() }}
        </el-descriptions-item
        >
        <el-descriptions-item label="已回款"
        >
          ¥{{ Number(contract.paidAmount).toLocaleString() }}
        </el-descriptions-item
        >
        <el-descriptions-item label="合同类型">{{ contract.contractType }}</el-descriptions-item>
        <el-descriptions-item label="开始日期">{{ contract.startDate }}</el-descriptions-item>
        <el-descriptions-item label="结束日期">{{ contract.endDate }}</el-descriptions-item>
        <el-descriptions-item label="签署日期">
          {{
            contract.signDate || '未签署'
          }}
        </el-descriptions-item>
        <el-descriptions-item label="我方主体" :span="3">
          {{
            contract.ourEntity
          }}
        </el-descriptions-item>
        <el-descriptions-item label="客户主体" :span="3">
          {{
            contract.customerEntity
          }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { contractApi, type ContractVO } from '@/api/contract'

const route = useRoute()
const loading = ref(false)
const contract = ref<ContractVO | null>(null)

async function loadDetail() {
  const id = Number(route.params.id)
  if (!id) return
  loading.value = true
  try {
    const res = await contractApi.getDetail(id)
    if (res.code === 0) contract.value = res.data
  } catch {
    ElMessage.error('加载合同详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadDetail)
</script>

<style scoped>
.contract-detail {
  padding: 16px;
}
</style>
