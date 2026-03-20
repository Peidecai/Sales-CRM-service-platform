<template>
  <view class="status-tag" :style="tagStyle">
    <text class="status-text">{{ label }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CustomerStatus, OpportunityStage } from '@crm/shared'

const props = withDefaults(defineProps<{
  status: string
  type?: 'customer' | 'opportunity' | 'custom'
  color?: string
  backgroundColor?: string
}>(), {
  type: 'custom',
  color: '',
  backgroundColor: '',
})

const customerStatusMap: Record<string, { label: string; color: string; bg: string }> = {
  [CustomerStatus.LEAD]: { label: '线索', color: '#409EFF', bg: '#ECF5FF' },
  [CustomerStatus.POTENTIAL]: { label: '潜在', color: '#409EFF', bg: '#ECF5FF' },
  [CustomerStatus.INTENTION]: { label: '有意向', color: '#E6A23C', bg: '#FDF6EC' },
  [CustomerStatus.OPPORTUNITY]: { label: '商机', color: '#E6A23C', bg: '#FDF6EC' },
  [CustomerStatus.DEAL]: { label: '成交', color: '#67C23A', bg: '#F0F9EB' },
  [CustomerStatus.MAINTAIN]: { label: '维护', color: '#67C23A', bg: '#F0F9EB' },
  [CustomerStatus.INVALID]: { label: '无效', color: '#909399', bg: '#F4F4F5' },
  [CustomerStatus.LOST]: { label: '流失', color: '#F56C6C', bg: '#FEF0F0' },
}

const opportunityStageMap: Record<string, { label: string; color: string; bg: string }> = {
  [OpportunityStage.LEAD]: { label: '线索', color: '#909399', bg: '#F4F4F5' },
  [OpportunityStage.QUALIFIED]: { label: '已确认', color: '#409EFF', bg: '#ECF5FF' },
  [OpportunityStage.PROPOSAL]: { label: '方案', color: '#E6A23C', bg: '#FDF6EC' },
  [OpportunityStage.NEGOTIATION]: { label: '谈判', color: '#E6A23C', bg: '#FDF6EC' },
  [OpportunityStage.CLOSED_WON]: { label: '成交', color: '#67C23A', bg: '#F0F9EB' },
  [OpportunityStage.CLOSED_LOST]: { label: '丢单', color: '#F56C6C', bg: '#FEF0F0' },
}

const resolved = computed(() => {
  if (props.type === 'customer') {
    return customerStatusMap[props.status] ?? { label: props.status, color: '#909399', bg: '#F4F4F5' }
  }
  if (props.type === 'opportunity') {
    return opportunityStageMap[props.status] ?? { label: props.status, color: '#909399', bg: '#F4F4F5' }
  }
  return { label: props.status, color: props.color || '#909399', bg: props.backgroundColor || '#F4F4F5' }
})

const label = computed(() => resolved.value.label)

const tagStyle = computed(() => ({
  color: props.color || resolved.value.color,
  backgroundColor: props.backgroundColor || resolved.value.bg,
}))
</script>

<style scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40rpx;
  padding: 0 16rpx;
  border-radius: 8rpx;
}

.status-text {
  font-size: 22rpx;
  line-height: 40rpx;
  white-space: nowrap;
}
</style>
