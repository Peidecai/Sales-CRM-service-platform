<template>
  <div>
    <h2>回款计划</h2>
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between">
          <span>计划列表</span
          ><el-button type="primary" @click="showCreate = true">创建计划</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="planName" label="名称" />
        <el-table-column prop="contractId" label="合同ID" width="100" />
        <el-table-column prop="totalAmount" label="总金额" width="120">
          <template #default="{ row }">
            {{ Number(row.totalAmount).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="totalInstallments" label="期数" width="80" />
        <el-table-column prop="splitMethod" label="方式" width="80" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
      </el-table>
    </el-card>
    <el-dialog v-model="showCreate" title="创建回款计划" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="合同ID">
          <el-input-number v-model="form.contractId" :min="1" />
        </el-form-item>
        <el-form-item label="计划名称"><el-input v-model="form.planName" /></el-form-item>
        <el-form-item label="总金额">
          <el-input-number v-model="form.totalAmount" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="分期数">
          <el-input-number v-model="form.totalInstallments" :min="1" :max="60" />
        </el-form-item>
        <el-form-item label="分期方式">
          <el-select v-model="form.splitMethod">
            <el-option label="等额" value="equal" /><el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button
        ><el-button type="primary" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getPaymentPlans, createPaymentPlan } from '@/api/payment-tracking'
const list = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const showCreate = ref(false)
const form = reactive({
  contractId: 0,
  planName: '',
  totalAmount: 0,
  totalInstallments: 1,
  splitMethod: 'equal',
})
const load = async () => {
  loading.value = true
  try {
    const r = (await getPaymentPlans({ page: 1, pageSize: 50 })) as unknown as {
      data: { list: Record<string, unknown>[] }
    }
    list.value = r.data?.list || []
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}
const handleCreate = async () => {
  try {
    await createPaymentPlan(form)
    ElMessage.success('创建成功')
    showCreate.value = false
    await load()
  } catch {
    ElMessage.error('创建失败')
  }
}
onMounted(load)
</script>
