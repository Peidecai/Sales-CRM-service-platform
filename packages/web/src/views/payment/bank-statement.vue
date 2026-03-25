<template>
  <div class="bank-statement">
    <h2>银行流水管理</h2>
    <el-card>
      <template #header>
        <div style="display: flex; gap: 12px; align-items: center">
          <el-button type="primary" @click="showImport = true">导入 CSV</el-button>
          <el-button @click="handleAutoMatch">自动匹配</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="transactionDate" label="交易日期" width="120" />
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">¥{{ Number(row.amount).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="payerName" label="付款方" />
        <el-table-column prop="reference" label="备注" />
        <el-table-column prop="matchStatus" label="匹配状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.matchStatus === 'unmatched' ? 'danger' : 'success'">
              {{ row.matchStatus }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="page"
        style="margin-top: 16px"
        :total="total"
        :page-size="20"
        @current-change="loadList"
      />
    </el-card>
    <el-dialog v-model="showImport" title="导入银行流水 CSV" width="500px">
      <el-input
        v-model="csvContent"
        type="textarea"
        :rows="10"
        placeholder="粘贴 CSV 内容（日期,金额,付款方,账号,备注）"
      />
      <template #footer>
        <el-button @click="showImport = false">取消</el-button>
        <el-button type="primary" @click="handleImport">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getBankStatements,
  importBankStatements,
  autoMatchStatements,
} from '@/api/payment-tracking'
const list = ref<Record<string, unknown>[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const showImport = ref(false)
const csvContent = ref('')
const loadList = async () => {
  loading.value = true
  try {
    const r = (await getBankStatements({ page: page.value, pageSize: 20 })) as unknown as {
      data: { list: Record<string, unknown>[]; total: number }
    }
    list.value = r.data?.list || []
    total.value = r.data?.total || 0
  } finally {
    loading.value = false
  }
}
const handleImport = async () => {
  try {
    const r = (await importBankStatements({ csvContent: csvContent.value })) as unknown as {
      data: { imported: number }
    }
    ElMessage.success(`导入 ${r.data?.imported || 0} 条`)
    showImport.value = false
    await loadList()
  } catch {
    ElMessage.error('导入失败')
  }
}
const handleAutoMatch = async () => {
  try {
    const r = (await autoMatchStatements()) as unknown as {
      data: { matched: number; total: number }
    }
    ElMessage.success(`匹配 ${r.data?.matched}/${r.data?.total}`)
    await loadList()
  } catch {
    ElMessage.error('匹配失败')
  }
}
onMounted(loadList)
</script>
