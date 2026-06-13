<template>
  <el-timeline>
    <el-timeline-item
      v-for="step in steps"
      :key="step.status"
      :timestamp="step.time || ''"
      :type="step.active ? 'primary' : 'info'"
      :hollow="!step.active"
    >
      {{ step.label }}
    </el-timeline-item>
  </el-timeline>
</template>
<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  status: string
  sentAt?: string
  signedAt?: string
  completedAt?: string
  createdAt?: string
}>()
const allSteps = ['draft', 'internal_review', 'sent_to_customer', 'customer_signed', 'completed']
const labels: Record<string, string> = {
  draft: '草稿',
  internal_review: '内部审核',
  sent_to_customer: '已发客户',
  customer_signed: '客户已签',
  completed: '完成',
}
const steps = computed(() => {
  const idx = allSteps.indexOf(props.status)
  return allSteps.map((s, i) => ({
    status: s,
    label: labels[s],
    active: i <= idx,
    time:
      s === 'draft'
        ? props.createdAt
        : s === 'sent_to_customer'
          ? props.sentAt
          : s === 'customer_signed'
            ? props.signedAt
            : s === 'completed'
              ? props.completedAt
              : '',
  }))
})
</script>
