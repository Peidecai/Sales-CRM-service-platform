<template>
  <el-timeline>
    <el-timeline-item
      v-for="item in items"
      :key="item.installmentNo"
      :type="typeOf(item.status)"
      :timestamp="`第 ${item.installmentNo} 期 · ${item.dueDate}`"
    >
      <div>
        ¥{{ Number(item.amount).toLocaleString() }}
        <el-tag :type="tagType(item.status)" size="small">{{ item.status }}</el-tag>
      </div>
      <div v-if="Number(item.paidAmount) > 0" style="color: #67c23a; font-size: 12px">
        已收 ¥{{ Number(item.paidAmount).toLocaleString() }}
      </div>
    </el-timeline-item>
  </el-timeline>
</template>
<script setup lang="ts">
defineProps<{
  items: Array<{
    installmentNo: number
    dueDate: string
    amount: number
    paidAmount: number
    status: string
  }>
}>()
const typeOf = (s: string) =>
  s === 'paid' ? 'success' : s === 'overdue' || s === 'bad_debt' ? 'danger' : 'primary'
const tagType = (s: string) =>
  s === 'paid' ? 'success' : s === 'overdue' ? 'danger' : s === 'partial' ? 'warning' : 'info'
</script>
